"""
Example usage of the Qwen 3D Camera Client.
"""

from qwen_3d_client import Qwen3DCameraClient


def example_basic_prompt_update():
    """Example: Update prompt based on camera angles."""
    print("=" * 60)
    print("Example 1: Update Prompt from Sliders")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    # Set camera angles
    azimuth = 45.0  # Horizontal rotation
    elevation = 30.0  # Vertical angle
    distance = 1.2  # Camera distance (max: 1.4)
    
    prompt = client.update_prompt_from_sliders(
        azimuth=azimuth,
        elevation=elevation,
        distance=distance
    )
    
    print(f"Camera angles: azimuth={azimuth}, elevation={elevation}, distance={distance}")
    print(f"Generated prompt: {prompt}\n")


def example_sync_3d_to_sliders():
    """Example: Sync 3D control to sliders."""
    print("=" * 60)
    print("Example 2: Sync 3D Control to Sliders")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    # Example camera value (would come from 3D control)
    camera_value = '{"azimuth": 30, "elevation": 15, "distance": 1.0}'
    
    azimuth, elevation, distance, prompt = client.sync_3d_to_sliders(camera_value)
    
    print(f"3D camera value: {camera_value}")
    print(f"Synced to sliders:")
    print(f"  Azimuth: {azimuth}")
    print(f"  Elevation: {elevation}")
    print(f"  Distance: {distance}")
    print(f"  Prompt: {prompt}\n")


def example_sync_sliders_to_3d():
    """Example: Sync sliders to 3D control."""
    print("=" * 60)
    print("Example 3: Sync Sliders to 3D Control")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    azimuth = 60.0
    elevation = 45.0
    distance = 1.3
    
    camera_value = client.sync_sliders_to_3d(
        azimuth=azimuth,
        elevation=elevation,
        distance=distance
    )
    
    print(f"Slider values: azimuth={azimuth}, elevation={elevation}, distance={distance}")
    print(f"3D camera value: {camera_value}\n")


def example_get_dimensions():
    """Example: Get recommended dimensions for an image."""
    print("=" * 60)
    print("Example 4: Update Dimensions on Upload")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    # Using a sample image URL
    image_url = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"
    
    width, height = client.update_dimensions_on_upload(image_url)
    
    print(f"Image URL: {image_url}")
    print(f"Recommended dimensions: {int(width)} x {int(height)}\n")


def example_camera_edit():
    """Example: Edit camera angle of an image."""
    print("=" * 60)
    print("Example 5: Infer Camera Edit")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    # Using a sample image URL
    image_url = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"
    
    output_image, seed, prompt = client.infer_camera_edit(
        image=image_url,
        azimuth=30.0,
        elevation=20.0,
        distance=1.2,
        randomize_seed=True,
        guidance_scale=1.0,
        num_inference_steps=4,
        height=1024,
        width=1024
    )
    
    print(f"Input image: {image_url}")
    print(f"Camera settings: azimuth=30, elevation=20, distance=1.2")
    print(f"Inference steps: 4, Guidance scale: 1.0")
    print(f"Output seed: {seed}")
    print(f"Generated prompt: {prompt}")
    print(f"Output image path: {output_image['path']}\n")


def example_get_default_state():
    """Example: Get default 3D camera state."""
    print("=" * 60)
    print("Example 6: Get Default 3D State")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    default_state = client.get_default_3d_state()
    
    print(f"Default 3D camera state: {default_state}\n")


def example_update_3d_image():
    """Example: Update 3D component with an image."""
    print("=" * 60)
    print("Example 7: Update 3D Image")
    print("=" * 60)
    
    client = Qwen3DCameraClient()
    
    # Using a sample image URL
    image_url = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"
    
    camera_value = client.update_3d_image(image_url)
    
    print(f"Image URL: {image_url}")
    print(f"3D component value: {camera_value}\n")


if __name__ == "__main__":
    print("\nQwen 3D Camera Client - Usage Examples\n")
    
    # Run examples:
    
    example_basic_prompt_update()
    example_sync_3d_to_sliders()
    example_sync_sliders_to_3d()
    example_get_default_state()
    
    print("\n✓ Examples completed successfully!")
