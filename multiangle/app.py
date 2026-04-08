"""
FastAPI backend for the Multi-Angle camera editor.
Serves the React frontend and exposes generation APIs.
"""

from __future__ import annotations

import base64
import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from qwen_3d_client import Qwen3DCameraClient


ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT / "frontend" / "dist"
TEMP_DIR = ROOT / ".runtime"
TEMP_DIR.mkdir(exist_ok=True)


client: Qwen3DCameraClient | None = None
client_init_error = ""


class CameraPreviewRequest(BaseModel):
    azimuth: float = 0
    elevation: float = 0
    distance: float = 1.0


def get_client() -> Qwen3DCameraClient:
    """Initialize the remote model client lazily."""
    global client, client_init_error

    if client is not None:
        return client

    try:
        client = Qwen3DCameraClient()
        client_init_error = ""
        return client
    except Exception as exc:
        client_init_error = str(exc)
        raise RuntimeError(
            "The remote Qwen backend is not reachable right now. "
            f"Details: {client_init_error}"
        ) from exc


def build_local_prompt(azimuth: float, elevation: float, distance: float) -> str:
    """Build the camera prompt locally to match the visual editor."""
    azimuth = float(azimuth) % 360.0
    elevation = max(0.0, min(80.0, float(elevation)))
    distance = max(0.1, min(1.4, float(distance)))

    if azimuth < 22.5 or azimuth > 337.5:
        azimuth_text = "front view"
    elif azimuth < 67.5:
        azimuth_text = "front-right view"
    elif azimuth < 112.5:
        azimuth_text = "right side view"
    elif azimuth < 157.5:
        azimuth_text = "back-right view"
    elif azimuth < 202.5:
        azimuth_text = "back view"
    elif azimuth < 247.5:
        azimuth_text = "back-left view"
    elif azimuth < 292.5:
        azimuth_text = "left side view"
    else:
        azimuth_text = "front-left view"

    if elevation < 10:
        elevation_text = "eye-level shot"
    elif elevation < 30:
        elevation_text = "low angle shot"
    elif elevation < 55:
        elevation_text = "elevated shot"
    else:
        elevation_text = "top-down view"

    if distance < 0.5:
        distance_text = "close-up shot"
    elif distance < 0.9:
        distance_text = "medium-close shot"
    elif distance < 1.2:
        distance_text = "medium shot"
    else:
        distance_text = "wide shot"

    return f"<sks> {azimuth_text} {elevation_text} {distance_text}"


def format_camera_position(azimuth: float, elevation: float, distance: float) -> str:
    return (
        f"Azimuth: {float(azimuth):.0f} deg, "
        f"Elevation: {float(elevation):.0f} deg, "
        f"Distance: {float(distance):.2f}"
    )


async def save_upload_to_temp(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "upload.png").suffix or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TEMP_DIR) as temp_file:
        temp_file.write(await upload.read())
        return Path(temp_file.name)


def get_image_dimensions(image_path: Path) -> tuple[int, int]:
    with Image.open(image_path) as image:
        img_width, img_height = image.size

    if not img_width or not img_height:
        return 1024, 1024

    max_side = 1024
    if img_width >= img_height:
        out_width = max_side
        out_height = max(256, round((img_height / img_width) * max_side / 64) * 64)
    else:
        out_height = max_side
        out_width = max(256, round((img_width / img_height) * max_side / 64) * 64)

    return int(out_width), int(out_height)


def convert_output_image(output_image: Any) -> dict[str, str]:
    if isinstance(output_image, dict):
        if output_image.get("url"):
            return {"type": "url", "value": output_image["url"]}
        if output_image.get("path"):
            output_image = output_image["path"]

    if isinstance(output_image, str) and output_image.startswith(("http://", "https://")):
        return {"type": "url", "value": output_image}

    image_path = Path(str(output_image))
    if not image_path.exists():
        raise RuntimeError(f"Generated image was not found: {output_image}")

    encoded = base64.b64encode(image_path.read_bytes()).decode("utf-8")
    mime = "image/png"
    if image_path.suffix.lower() in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    if image_path.suffix.lower() == ".webp":
        mime = "image/webp"

    return {"type": "data", "value": f"data:{mime};base64,{encoded}"}


app = FastAPI(title="Multi-Angle Camera Studio")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/preview")
def preview_camera(request: CameraPreviewRequest):
    return {
        "prompt": build_local_prompt(request.azimuth, request.elevation, request.distance),
        "camera": format_camera_position(request.azimuth, request.elevation, request.distance),
    }


@app.post("/api/dimensions")
async def detect_dimensions(image: UploadFile = File(...)):
    image_path = await save_upload_to_temp(image)
    width, height = get_image_dimensions(image_path)
    return {"width": width, "height": height}


@app.post("/api/generate")
async def generate_image(
    image: UploadFile = File(...),
    azimuth: float = Form(0),
    elevation: float = Form(0),
    distance: float = Form(1.0),
    seed: int = Form(0),
    randomize_seed: bool = Form(True),
    guidance_scale: float = Form(1.0),
    num_steps: int = Form(4),
    height: int = Form(1024),
    width: int = Form(1024),
):
    image_path = await save_upload_to_temp(image)

    try:
        remote_client = get_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        output_image, output_seed, prompt = remote_client.infer_camera_edit(
            image=str(image_path),
            azimuth=float(azimuth),
            elevation=float(elevation),
            distance=float(distance),
            seed=int(seed) if not randomize_seed else 0,
            randomize_seed=bool(randomize_seed),
            guidance_scale=float(guidance_scale),
            num_inference_steps=int(num_steps),
            height=int(height),
            width=int(width),
        )
        output_payload = convert_output_image(output_image)
        return {
            "image": output_payload,
            "seed": int(output_seed),
            "prompt": prompt,
            "camera": format_camera_position(azimuth, elevation, distance),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc


if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    def serve_frontend_app(full_path: str):
        requested = FRONTEND_DIST / full_path
        if requested.exists() and requested.is_file():
            return FileResponse(requested)
        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=7861, reload=False)
