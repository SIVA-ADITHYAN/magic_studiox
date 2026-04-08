"""
Python client for multimodalart/qwen-image-multiple-angles-3d-camera Gradio API.
Provides a convenient wrapper around all 11 API endpoints.
"""

from typing import Tuple, Dict, Any, Optional
from gradio_client import Client, handle_file


class Qwen3DCameraClient:
    """Client for interacting with Qwen Image 3D Camera Edit API."""
    
    def __init__(self, space_url: str = "multimodalart/qwen-image-multiple-angles-3d-camera"):
        """
        Initialize the client.
        
        Args:
            space_url: Hugging Face Space URL (default: multimodalart/qwen-image-multiple-angles-3d-camera)
        """
        self.client = Client(space_url)
        self.space_url = space_url
    
    # Prompt Update Endpoints
    
    def update_prompt_from_sliders(
        self, 
        azimuth: float = 0, 
        elevation: float = 0, 
        distance: float = 1,
        endpoint_index: int = 0
    ) -> str:
        """
        Update prompt preview when sliders change.
        
        Args:
            azimuth: Horizontal rotation angle (default: 0)
            elevation: Vertical angle (default: 0)
            distance: Camera distance (default: 1)
            endpoint_index: Which endpoint to use (0, 1, or 2)
        
        Returns:
            Generated prompt string
        """
        api_name = f"/update_prompt_from_sliders{'_' + str(endpoint_index) if endpoint_index > 0 else ''}"
        result = self.client.predict(
            azimuth=azimuth,
            elevation=elevation,
            distance=distance,
            api_name=api_name
        )
        return result
    
    # 3D Control Sync Endpoints
    
    def sync_3d_to_sliders(self, camera_value: str) -> Tuple[float, float, float, str]:
        """
        Sync 3D control changes to sliders.
        
        Args:
            camera_value: Camera control value (JSON serialized)
        
        Returns:
            Tuple of (azimuth, elevation, distance, generated_prompt)
        """
        result = self.client.predict(
            camera_value=camera_value,
            api_name="/sync_3d_to_sliders"
        )
        return result
    
    def sync_sliders_to_3d(
        self, 
        azimuth: float = 0, 
        elevation: float = 0, 
        distance: float = 1,
        endpoint_index: int = 0
    ) -> str:
        """
        Sync slider changes to 3D control.
        
        Args:
            azimuth: Horizontal rotation angle (default: 0)
            elevation: Vertical angle (default: 0)
            distance: Camera distance (default: 1)
            endpoint_index: Which endpoint to use (0, 1, or 2)
        
        Returns:
            Camera control 3D component value
        """
        api_name = f"/sync_sliders_to_3d{'_' + str(endpoint_index) if endpoint_index > 0 else ''}"
        result = self.client.predict(
            azimuth=azimuth,
            elevation=elevation,
            distance=distance,
            api_name=api_name
        )
        return result
    
    # Main Inference Endpoint
    
    def infer_camera_edit(
        self,
        image: str,
        azimuth: float = 0,
        elevation: float = 0,
        distance: float = 1,
        seed: int = 0,
        randomize_seed: bool = True,
        guidance_scale: float = 1.0,
        num_inference_steps: int = 4,
        height: int = 1024,
        width: int = 1024
    ) -> Tuple[Dict[str, Any], float, str]:
        """
        Edit the camera angle of an image using Qwen Image Edit.
        
        Args:
            image: Path to local file or URL
            azimuth: Horizontal rotation angle
            elevation: Vertical angle
            distance: Camera distance
            seed: Random seed (0 for random)
            randomize_seed: Whether to randomize the seed
            guidance_scale: Guidance scale for generation
            num_inference_steps: Number of inference steps
            height: Output image height
            width: Output image width
        
        Returns:
            Tuple of (output_image_dict, seed, generated_prompt)
        """
        result = self.client.predict(
            image=handle_file(image),
            azimuth=azimuth,
            elevation=elevation,
            distance=distance,
            seed=seed,
            randomize_seed=randomize_seed,
            guidance_scale=guidance_scale,
            num_inference_steps=num_inference_steps,
            height=height,
            width=width,
            api_name="/infer_camera_edit"
        )
        return result
    
    # Utility Endpoints
    
    def update_dimensions_on_upload(self, image: str) -> Tuple[float, float]:
        """
        Compute recommended dimensions preserving aspect ratio.
        
        Args:
            image: Path to local file or URL
        
        Returns:
            Tuple of (width, height)
        """
        result = self.client.predict(
            image=handle_file(image),
            api_name="/update_dimensions_on_upload"
        )
        return result
    
    def update_3d_image(self, image: str) -> str:
        """
        Update the 3D component with the uploaded image.
        
        Args:
            image: Path to local file or URL
        
        Returns:
            Camera control 3D component value
        """
        result = self.client.predict(
            image=handle_file(image),
            api_name="/update_3d_image"
        )
        return result
    
    def get_default_3d_state(self) -> str:
        """
        Get the default 3D camera state.
        
        Returns:
            Default camera control value
        """
        result = self.client.predict(api_name="/lambda")
        return result
