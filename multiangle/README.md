# Qwen 3D Camera Client

A Python client library for the [multimodalart/qwen-image-multiple-angles-3d-camera](https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera) Gradio Space.

## Features

- Easy-to-use Python API wrapper around all 11 endpoints
- Type hints for better IDE support
- Handles file uploads and image processing
- Comprehensive examples included

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Quick Start

```python
from qwen_3d_client import Qwen3DCameraClient

# Initialize client
client = Qwen3DCameraClient()

# Update prompt based on camera angles
prompt = client.update_prompt_from_sliders(
    azimuth=45.0,
    elevation=30.0,
    distance=1.5
)
print(f"Generated prompt: {prompt}")
```

## API Endpoints

### 1. Prompt Update Endpoints

#### `update_prompt_from_sliders(azimuth, elevation, distance, endpoint_index=0)`
Update prompt preview when sliders change.

**Parameters:**
- `azimuth` (float, default=0): Horizontal rotation angle
- `elevation` (float, default=0): Vertical angle  
- `distance` (float, default=1): Camera distance
- `endpoint_index` (int, default=0): Which endpoint variant to use (0, 1, or 2)

**Returns:** Generated prompt string

### 2. 3D Control Sync Endpoints

#### `sync_3d_to_sliders(camera_value)`
Sync 3D control changes to sliders.

**Parameters:**
- `camera_value` (str): Serialized camera control value

**Returns:** Tuple of (azimuth, elevation, distance, generated_prompt)

#### `sync_sliders_to_3d(azimuth, elevation, distance, endpoint_index=0)`
Sync slider changes to 3D control.

**Parameters:**
- `azimuth` (float, default=0): Horizontal rotation angle
- `elevation` (float, default=0): Vertical angle
- `distance` (float, default=1): Camera distance
- `endpoint_index` (int, default=0): Which endpoint variant to use (0, 1, or 2)

**Returns:** Camera control 3D component value

### 3. Main Inference Endpoint

#### `infer_camera_edit(image, azimuth, elevation, distance, seed, randomize_seed, guidance_scale, num_inference_steps, height, width)`
Edit the camera angle of an image using Qwen Image Edit with multi-angles LoRA.

**Parameters:**
- `image` (str, required): Path to local file or URL
- `azimuth` (float, default=0): Horizontal rotation angle
- `elevation` (float, default=0): Vertical angle
- `distance` (float, default=1): Camera distance
- `seed` (int, default=0): Random seed
- `randomize_seed` (bool, default=True): Randomize the seed
- `guidance_scale` (float, default=1.0): Guidance scale
- `num_inference_steps` (int, default=4): Number of inference steps
- `height` (int, default=1024): Output image height
- `width` (int, default=1024): Output image width

**Returns:** Tuple of (output_image_dict, seed, generated_prompt)

### 4. Utility Endpoints

#### `update_dimensions_on_upload(image)`
Compute recommended dimensions preserving aspect ratio.

**Parameters:**
- `image` (str, required): Path to local file or URL

**Returns:** Tuple of (width, height)

#### `update_3d_image(image)`
Update the 3D component with the uploaded image.

**Parameters:**
- `image` (str, required): Path to local file or URL

**Returns:** Camera control 3D component value

#### `get_default_3d_state()`
Get the default 3D camera state.

**Returns:** Default camera control value

## Examples

See [examples.py](examples.py) for detailed usage examples of all endpoints.

Run examples:

```bash
python examples.py
```

## Requirements

- Python 3.7+
- gradio_client >= 1.4.0
- pillow >= 9.0.0

## API Documentation

For complete API documentation, visit:
https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera

## License

This client library is provided as-is. Please refer to the original Space's license for terms of use.
