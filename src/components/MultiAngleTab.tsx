import { startTransition, useEffect, useState } from "react";
import CameraEditor from "./CameraEditor";
import { DEFAULT_CAMERA, CameraState } from "../lib/cameraUtils";

// API base: set VITE_MULTIANGLE_API_URL env var to point to your backend,
// or leave empty to use the Vite dev-server proxy at /multiangle-api.
const MULTIANGLE_API = ((import.meta.env.VITE_MULTIANGLE_API_URL as string) ?? "").replace(/\/$/, "") || "/multiangle-api";

const DEFAULT_SETTINGS = {
  seed: 0,
  randomizeSeed: true,
  guidanceScale: 1,
  numSteps: 4,
  width: 1024,
  height: 1024,
};

type Settings = typeof DEFAULT_SETTINGS;

export default function MultiAngleTab() {
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string>("");
  const [usedSeed, setUsedSeed] = useState<number | null>(null);
  const [status, setStatus] = useState("Upload an image and drag the camera bubbles to craft a new angle.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSizing, setIsSizing] = useState(false);

  useEffect(() => {
    if (!sourceFile) {
      setSourcePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(sourceFile);
    setSourcePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [sourceFile]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    startTransition(() => {
      setSourceFile(file);
      setGeneratedImage("");
      setUsedSeed(null);
      setStatus(`Loaded ${file.name}. Fetching recommended output size...`);
    });

    const formData = new FormData();
    formData.append("image", file);

    setIsSizing(true);
    try {
      const response = await fetch(`${MULTIANGLE_API}/dimensions`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Unable to calculate dimensions.");
      const payload = await response.json();
      startTransition(() => {
        setSettings((current) => ({ ...current, width: payload.width, height: payload.height }));
        setStatus("Image ready. Adjust the bubbles, then generate a new angle.");
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Image loaded, but auto-sizing failed.";
      setStatus(message);
    } finally {
      setIsSizing(false);
    }
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!sourceFile) {
      setStatus("Upload an image first so the model has a source to transform.");
      return;
    }

    const formData = new FormData();
    formData.append("image", sourceFile);
    formData.append("azimuth", String(camera.azimuth));
    formData.append("elevation", String(camera.elevation));
    formData.append("distance", String(camera.distance));
    formData.append("seed", String(settings.seed));
    formData.append("randomize_seed", String(settings.randomizeSeed));
    formData.append("guidance_scale", String(settings.guidanceScale));
    formData.append("num_steps", String(settings.numSteps));
    formData.append("width", String(settings.width));
    formData.append("height", String(settings.height));

    setIsGenerating(true);
    setStatus("Generating your new camera angle...");

    try {
      const response = await fetch(`${MULTIANGLE_API}/generate`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Generation failed.");
      startTransition(() => {
        setGeneratedImage(payload.image.value);
        setUsedSeed(payload.seed);
        setStatus(`Finished. ${payload.camera}`);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setStatus(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="ma-workspace-grid">
      {/* ─── Main editor column ─────────────────────────────── */}
      <section className="ma-workspace-main">
        <div className="ma-section-title">
          <span className="ma-section-kicker">Live Editor</span>
          <h2>Compose the angle visually</h2>
        </div>

        <CameraEditor camera={camera} imageSrc={sourcePreview} onChange={setCamera} />

        <div className="ma-preview-grid">
          <article className="ma-sticker-card ma-media-card">
            <div className="ma-card-icon ma-accent-green">IN</div>
            <h3>Source Image</h3>
            {sourcePreview ? (
              <img className="ma-media-frame" src={sourcePreview} alt="Uploaded source" />
            ) : (
              <div className="ma-empty-media">Your uploaded image appears here.</div>
            )}
          </article>

          <article className="ma-sticker-card ma-media-card ma-featured-card">
            <div className="ma-card-icon ma-accent-pink">OUT</div>
            <h3>Generated View</h3>
            {generatedImage ? (
              <img className="ma-media-frame" src={generatedImage} alt="Generated output" />
            ) : (
              <div className="ma-empty-media">The generated perspective will land here.</div>
            )}
          </article>
        </div>
      </section>

      {/* ─── Sidebar controls ───────────────────────────────── */}
      <aside className="ma-workspace-sidebar">
        <form className="ma-controls-stack" onSubmit={handleGenerate}>
          <article className="ma-sticker-card ma-control-card">
            <div className="ma-card-icon ma-accent-violet">1</div>
            <h3>Upload</h3>
            <label className="ma-field">
              <span>Source Image</span>
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>
            <p className="ma-field-note">
              {isSizing ? "Checking the aspect ratio for you..." : "PNG, JPG, or WEBP all work well."}
            </p>
          </article>

          <article className="ma-sticker-card ma-control-card">
            <div className="ma-card-icon ma-accent-yellow">2</div>
            <h3>Camera</h3>
            <label className="ma-field">
              <span>Azimuth &nbsp;<strong>{camera.azimuth}°</strong></span>
              <input
                type="range" min="0" max="360" step="1"
                value={camera.azimuth}
                onChange={(e) => setCamera((c) => ({ ...c, azimuth: Number(e.target.value) }))}
              />
            </label>
            <label className="ma-field">
              <span>Elevation &nbsp;<strong>{camera.elevation}°</strong></span>
              <input
                type="range" min="0" max="80" step="1"
                value={camera.elevation}
                onChange={(e) => setCamera((c) => ({ ...c, elevation: Number(e.target.value) }))}
              />
            </label>
            <label className="ma-field">
              <span>Distance &nbsp;<strong>{camera.distance.toFixed(2)}</strong></span>
              <input
                type="range" min="0.1" max="1.4" step="0.05"
                value={camera.distance}
                onChange={(e) => setCamera((c) => ({ ...c, distance: Number(e.target.value) }))}
              />
            </label>
          </article>

          <article className="ma-sticker-card ma-control-card">
            <div className="ma-card-icon ma-accent-green">3</div>
            <h3>Generation Settings</h3>
            <div className="ma-field-grid">
              <label className="ma-field">
                <span>Seed</span>
                <input
                  type="number"
                  value={settings.seed}
                  onChange={(e) => updateSetting("seed", Number(e.target.value))}
                />
              </label>
              <label className="ma-field ma-field-checkbox">
                <span>Randomize Seed</span>
                <input
                  type="checkbox"
                  checked={settings.randomizeSeed}
                  onChange={(e) => updateSetting("randomizeSeed", e.target.checked)}
                />
              </label>
              <label className="ma-field">
                <span>Guidance &nbsp;<strong>{settings.guidanceScale.toFixed(1)}</strong></span>
                <input
                  type="range" min="0.6" max="3" step="0.1"
                  value={settings.guidanceScale}
                  onChange={(e) => updateSetting("guidanceScale", Number(e.target.value))}
                />
              </label>
              <label className="ma-field">
                <span>Steps &nbsp;<strong>{settings.numSteps}</strong></span>
                <input
                  type="range" min="1" max="20" step="1"
                  value={settings.numSteps}
                  onChange={(e) => updateSetting("numSteps", Number(e.target.value))}
                />
              </label>
              <label className="ma-field">
                <span>Width</span>
                <input
                  type="number" min="256" max="2048" step="64"
                  value={settings.width}
                  onChange={(e) => updateSetting("width", Number(e.target.value))}
                />
              </label>
              <label className="ma-field">
                <span>Height</span>
                <input
                  type="number" min="256" max="2048" step="64"
                  value={settings.height}
                  onChange={(e) => updateSetting("height", Number(e.target.value))}
                />
              </label>
            </div>
          </article>

          <article className="ma-sticker-card ma-control-card ma-status-card">
            <div className="ma-card-icon ma-accent-pink">4</div>
            <h3>Generate</h3>
            <p className="ma-field-note">{status}</p>
            {usedSeed !== null && <p className="ma-status-seed">Used seed: {usedSeed}</p>}
            <button className="ma-candy-button" type="submit" disabled={isGenerating}>
              <span>{isGenerating ? "Generating..." : "Generate New View"}</span>
              <span className="ma-button-bubble" aria-hidden="true">→</span>
            </button>
          </article>
        </form>
      </aside>
    </div>
  );
}
