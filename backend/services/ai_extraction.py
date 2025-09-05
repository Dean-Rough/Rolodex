"""
AI Extraction Service for Rolodex

This module provides AI-powered product data extraction using OpenAI's GPT-4V model.
It analyzes product images and web page content to extract structured product information.
"""

import os
import re
import json
import logging
from typing import Dict, Any, Optional, Tuple
from io import BytesIO
from urllib.parse import urlparse, urljoin

import requests
from PIL import Image
from openai import OpenAI
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProductData(BaseModel):
    """Structured product data model for extraction results."""
    title: str = Field(description="Product name or title")
    vendor: Optional[str] = Field(default=None, description="Brand or vendor name")
    price: Optional[float] = Field(default=None, description="Product price as number")
    currency: Optional[str] = Field(default="USD", description="Price currency code")
    description: Optional[str] = Field(default=None, description="Product description")
    colour_hex: Optional[str] = Field(default=None, description="Dominant color as hex code")
    category: Optional[str] = Field(default=None, description="Product category")
    material: Optional[str] = Field(default=None, description="Primary material")
    dimensions: Optional[str] = Field(default=None, description="Product dimensions")
    features: Optional[list] = Field(default_factory=list, description="Key product features")


class AIExtractionError(Exception):
    """Custom exception for AI extraction errors."""
    pass


class AIExtractionService:
    """Service for extracting product data using OpenAI GPT-4V."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the AI extraction service.
        
        Args:
            api_key: OpenAI API key. If None, will use OPENAI_API_KEY environment variable.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise AIExtractionError("OpenAI API key is required. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.max_image_size = (1024, 1024)  # Max dimensions for image analysis
        self.supported_formats = {"jpg", "jpeg", "png", "webp", "gif"}
        
    def extract_from_image_url(
        self, 
        image_url: str, 
        context_url: Optional[str] = None,
        page_title: Optional[str] = None
    ) -> ProductData:
        """Extract product data from an image URL.
        
        Args:
            image_url: URL of the product image
            context_url: Optional URL of the source page for additional context
            page_title: Optional page title for additional context
            
        Returns:
            ProductData object with extracted information
            
        Raises:
            AIExtractionError: If extraction fails
        """
        try:
            # Validate and fetch image
            image_data = self._fetch_and_validate_image(image_url)
            
            # Build context information
            context_info = self._build_context_info(context_url, page_title)
            
            # Create the vision prompt
            prompt = self._create_extraction_prompt(context_info)
            
            # Call OpenAI GPT-4V
            response = self._call_vision_api(prompt, image_data)
            
            # Parse and validate response
            product_data = self._parse_ai_response(response)
            
            # Post-process the data
            product_data = self._post_process_data(product_data, image_url, context_url)
            
            logger.info(f"Successfully extracted product data from {image_url}")
            return product_data
            
        except Exception as e:
            logger.error(f"Failed to extract product data from {image_url}: {str(e)}")
            raise AIExtractionError(f"AI extraction failed: {str(e)}")
    
    def _fetch_and_validate_image(self, image_url: str) -> bytes:
        """Fetch and validate image from URL.
        
        Args:
            image_url: URL of the image to fetch
            
        Returns:
            Image data as bytes
            
        Raises:
            AIExtractionError: If image fetch or validation fails
        """
        try:
            # Validate URL format
            parsed = urlparse(image_url)
            if not parsed.scheme or not parsed.netloc:
                raise AIExtractionError(f"Invalid image URL format: {image_url}")
            
            # Fetch image with timeout and size limits
            headers = {
                'User-Agent': 'Rolodex-AI-Extractor/1.0 (Furniture Product Analysis)'
            }
            
            response = requests.get(
                image_url, 
                headers=headers, 
                timeout=30,
                stream=True
            )
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            if not any(fmt in content_type for fmt in ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']):
                raise AIExtractionError(f"Unsupported image format: {content_type}")
            
            # Read image data with size limit (10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            image_data = b''
            downloaded = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                downloaded += len(chunk)
                if downloaded > max_size:
                    raise AIExtractionError("Image too large (>10MB)")
                image_data += chunk
            
            # Validate image can be opened
            try:
                with Image.open(BytesIO(image_data)) as img:
                    # Resize if too large
                    if img.size[0] > self.max_image_size[0] or img.size[1] > self.max_image_size[1]:
                        img.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)
                        output = BytesIO()
                        img.save(output, format='JPEG', quality=85)
                        image_data = output.getvalue()
            except Exception as e:
                raise AIExtractionError(f"Invalid image data: {str(e)}")
            
            return image_data
            
        except requests.RequestException as e:
            raise AIExtractionError(f"Failed to fetch image: {str(e)}")
    
    def _build_context_info(self, context_url: Optional[str] = None, page_title: Optional[str] = None) -> str:
        """Build context information for the AI prompt.
        
        Args:
            context_url: Source page URL
            page_title: Page title
            
        Returns:
            Context information string
        """
        context_parts = []
        
        if context_url:
            parsed = urlparse(context_url)
            domain = parsed.netloc.lower()
            
            # Identify known retailers
            retailer_hints = {
                'wayfair': 'furniture and home decor retailer',
                'ikea': 'Swedish furniture retailer',
                'westelm': 'modern furniture retailer',
                'cb2': 'contemporary furniture retailer',
                'crateandbarrel': 'furniture and housewares retailer',
                'potterybarn': 'home furnishings retailer',
                'article': 'modern furniture retailer',
                'overstock': 'discount home goods retailer',
                'homedepot': 'home improvement retailer',
                'lowes': 'home improvement retailer',
                'target': 'general merchandise retailer',
                'walmart': 'general merchandise retailer',
                'amazon': 'e-commerce marketplace'
            }
            
            for hint_domain, hint_desc in retailer_hints.items():
                if hint_domain in domain:
                    context_parts.append(f"Source: {hint_desc} ({domain})")
                    break
            else:
                context_parts.append(f"Source website: {domain}")
        
        if page_title:
            context_parts.append(f"Page title: {page_title}")
        
        return " | ".join(context_parts) if context_parts else ""
    
    def _create_extraction_prompt(self, context_info: str) -> str:
        """Create the AI prompt for product extraction.
        
        Args:
            context_info: Context information about the source
            
        Returns:
            Formatted prompt string
        """
        context_section = f"\n\nContext: {context_info}" if context_info else ""
        
        return f"""Analyze this product image and extract structured information. Focus on furniture, fixtures, and equipment (FF&E) products.

Extract the following information and return ONLY valid JSON:

{{
  "title": "Product name or title",
  "vendor": "Brand or manufacturer name",
  "price": numeric_price_value_or_null,
  "currency": "USD" or other currency code,
  "description": "Brief product description",
  "colour_hex": "#RRGGBB" color code of dominant color,
  "category": "Primary category (e.g., 'Sofa', 'Chair', 'Table', 'Lighting', 'Decor')",
  "material": "Primary material (e.g., 'Wood', 'Metal', 'Fabric', 'Leather')",
  "dimensions": "Product dimensions if visible",
  "features": ["key", "product", "features"]
}}

Guidelines:
- If information is not visible/available, use null
- For price, extract only numeric value (no currency symbols)
- Color should be the dominant/primary color as hex
- Category should be specific (Chair, not Furniture)
- Description should be concise (1-2 sentences max)
- Features should be factual attributes visible in image{context_section}

Return only the JSON object, no additional text or formatting."""
    
    def _call_vision_api(self, prompt: str, image_data: bytes) -> str:
        """Call OpenAI Vision API with the image and prompt.
        
        Args:
            prompt: Extraction prompt
            image_data: Image data as bytes
            
        Returns:
            AI response text
            
        Raises:
            AIExtractionError: If API call fails
        """
        try:
            import base64
            
            # Encode image to base64
            image_b64 = base64.b64encode(image_data).decode('utf-8')
            
            # Make API call
            response = self.client.chat.completions.create(
                model="gpt-4o",  # Using GPT-4 Omni which has vision capabilities
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_b64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1,  # Low temperature for consistent extraction
                timeout=60
            )
            
            if not response.choices or not response.choices[0].message.content:
                raise AIExtractionError("Empty response from OpenAI API")
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            if "insufficient_quota" in str(e).lower():
                raise AIExtractionError("OpenAI API quota exceeded")
            elif "invalid_api_key" in str(e).lower():
                raise AIExtractionError("Invalid OpenAI API key")
            else:
                raise AIExtractionError(f"OpenAI API error: {str(e)}")
    
    def _parse_ai_response(self, response: str) -> ProductData:
        """Parse AI response into ProductData object.
        
        Args:
            response: Raw AI response string
            
        Returns:
            ProductData object
            
        Raises:
            AIExtractionError: If parsing fails
        """
        try:
            # Clean response - remove any markdown formatting
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Parse JSON
            try:
                data = json.loads(cleaned)
            except json.JSONDecodeError:
                # Try to extract JSON from text if it's embedded
                json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                else:
                    raise AIExtractionError("No valid JSON found in AI response")
            
            # Validate and create ProductData
            return ProductData(**data)
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {response}")
            raise AIExtractionError(f"Failed to parse AI response: {str(e)}")
    
    def _post_process_data(self, data: ProductData, image_url: str, context_url: Optional[str]) -> ProductData:
        """Post-process extracted data for validation and enhancement.
        
        Args:
            data: Extracted ProductData
            image_url: Source image URL
            context_url: Source page URL
            
        Returns:
            Enhanced ProductData
        """
        # Validate and clean color hex
        if data.colour_hex:
            color = data.colour_hex.strip()
            if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
                # Try to fix common issues
                if color.startswith('#') and len(color) == 4:  # #RGB -> #RRGGBB
                    color = f"#{color[1]}{color[1]}{color[2]}{color[2]}{color[3]}{color[3]}"
                elif not color.startswith('#') and len(color) == 6:  # RRGGBB -> #RRGGBB
                    color = f"#{color}"
                else:
                    color = None  # Invalid color
            data.colour_hex = color
        
        # Clean and validate price
        if data.price is not None:
            try:
                data.price = float(data.price)
                if data.price < 0:
                    data.price = None
            except (ValueError, TypeError):
                data.price = None
        
        # Standardize currency
        if data.currency:
            data.currency = data.currency.upper()
        
        # Clean text fields
        if data.title:
            data.title = data.title.strip()[:200]  # Limit length
        
        if data.vendor:
            data.vendor = data.vendor.strip()[:100]
            
        if data.description:
            data.description = data.description.strip()[:500]
            
        if data.category:
            data.category = data.category.strip().title()[:50]
            
        if data.material:
            data.material = data.material.strip().title()[:50]
        
        # Ensure we have at least a title
        if not data.title:
            data.title = "Product"  # Fallback title
        
        return data
    
    def extract_color_from_image(self, image_data: bytes) -> Optional[str]:
        """Extract dominant color from image as fallback method.
        
        Args:
            image_data: Image data as bytes
            
        Returns:
            Hex color code or None
        """
        try:
            from PIL import Image
            import colorsys
            
            with Image.open(BytesIO(image_data)) as img:
                # Convert to RGB and resize for speed
                img = img.convert('RGB')
                img.thumbnail((150, 150), Image.Resampling.LANCZOS)
                
                # Get dominant color using histogram
                colors = img.getcolors(maxcolors=256*256*256)
                if not colors:
                    return None
                
                # Sort by frequency and get dominant color
                dominant_color = max(colors, key=lambda x: x[0])[1]
                
                # Convert to hex
                return f"#{dominant_color[0]:02x}{dominant_color[1]:02x}{dominant_color[2]:02x}"
                
        except Exception:
            return None


# Singleton instance
_extraction_service = None


def get_extraction_service() -> AIExtractionService:
    """Get singleton extraction service instance."""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = AIExtractionService()
    return _extraction_service