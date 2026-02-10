"""Image processing utilities for Rolodex."""

from __future__ import annotations

import io
from typing import List, Tuple

import httpx
from PIL import Image


def extract_color_palette(image_url: str, num_colors: int = 5) -> List[str]:
    """Extract dominant colors from an image.

    Args:
        image_url: URL of the image
        num_colors: Number of dominant colors to extract

    Returns:
        List of hex color codes
    """
    try:
        # Download image
        response = httpx.get(image_url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()

        # Open with PIL
        img = Image.open(io.BytesIO(response.content))

        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize for faster processing
        img.thumbnail((150, 150), Image.LANCZOS)

        # Get colors using quantize
        quantized = img.quantize(colors=num_colors, method=2)
        palette = quantized.getpalette()

        # Extract RGB values for each color
        colors = []
        for i in range(num_colors):
            r = palette[i * 3]
            g = palette[i * 3 + 1]
            b = palette[i * 3 + 2]
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            colors.append(hex_color)

        return colors

    except Exception as e:
        print(f"Error extracting color palette: {e}")
        return []


def calculate_image_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """Calculate cosine similarity between two image embeddings.

    Args:
        embedding1: First image embedding
        embedding2: Second image embedding

    Returns:
        Similarity score between 0 and 1
    """
    if not embedding1 or not embedding2:
        return 0.0

    try:
        import numpy as np

        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)

        # Normalize to 0-1 range
        return float((similarity + 1) / 2)

    except Exception as e:
        print(f"Error calculating similarity: {e}")
        return 0.0


def detect_duplicate_images(
    image_url: str,
    existing_embeddings: List[Tuple[str, List[float]]],
    threshold: float = 0.95
) -> List[str]:
    """Detect if an image is a duplicate of existing items.

    Args:
        image_url: URL of the new image
        existing_embeddings: List of (item_id, embedding) tuples
        threshold: Similarity threshold for duplicate detection

    Returns:
        List of item IDs that are likely duplicates
    """
    # This would require generating an embedding for the new image
    # and comparing with existing ones
    # For now, return empty list (can be implemented when CLIP is added)
    return []


__all__ = [
    "extract_color_palette",
    "calculate_image_similarity",
    "detect_duplicate_images",
]
