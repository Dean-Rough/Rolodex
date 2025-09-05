"""
storage.py - Supabase Storage and vector embedding service

Provides functionality for:
- Downloading images from external URLs
- Uploading images to Supabase Storage
- Generating vector embeddings using OpenAI
- Semantic search using pgvector
"""

import os
import hashlib
import httpx
import uuid
from io import BytesIO
from typing import Optional, List, Dict, Any, Tuple
from PIL import Image
from supabase import create_client, Client
import openai
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

class StorageService:
    """Service for handling image storage and vector embeddings"""
    
    def __init__(self):
        # Supabase client setup
        self.supabase_url = os.getenv("SUPABASE_PROJECT_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise RuntimeError("SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # OpenAI client setup
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for embeddings")
        
        openai.api_key = self.openai_api_key
        self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
        
        # Storage bucket name
        self.bucket_name = "product-images"
        
        # Database connection for vector operations
        self.database_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required")
        
        self.engine = create_engine(
            self.database_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,
        )
    
    def _generate_file_path(self, url: str, user_id: str) -> str:
        """Generate a unique file path for the image based on URL hash and user ID"""
        url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
        unique_id = str(uuid.uuid4())[:8]
        return f"{user_id}/{url_hash}_{unique_id}.jpg"
    
    async def download_image(self, url: str, max_size_mb: int = 10) -> Tuple[bytes, str]:
        """Download image from URL and return bytes with content type"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                # Check content type
                content_type = response.headers.get("content-type", "")
                if not content_type.startswith("image/"):
                    raise ValueError(f"URL does not point to an image: {content_type}")
                
                # Check file size
                content_length = len(response.content)
                if content_length > max_size_mb * 1024 * 1024:
                    raise ValueError(f"Image too large: {content_length} bytes")
                
                return response.content, content_type
                
            except httpx.HTTPError as e:
                raise ValueError(f"Failed to download image: {str(e)}")
    
    def _process_image(self, image_data: bytes, max_width: int = 1200, max_height: int = 1200) -> bytes:
        """Process and optimize image for storage"""
        try:
            with Image.open(BytesIO(image_data)) as img:
                # Convert to RGB if needed
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                
                # Resize if too large
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.LANCZOS)
                
                # Save as JPEG with optimization
                output_buffer = BytesIO()
                img.save(output_buffer, format="JPEG", quality=85, optimize=True)
                return output_buffer.getvalue()
                
        except Exception as e:
            logger.error(f"Failed to process image: {str(e)}")
            # Return original if processing fails
            return image_data
    
    async def upload_to_storage(self, image_data: bytes, file_path: str) -> str:
        """Upload image to Supabase Storage and return public URL"""
        try:
            # Process image before upload
            processed_data = self._process_image(image_data)
            
            # Upload to Supabase Storage
            result = self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=processed_data,
                file_options={
                    "content-type": "image/jpeg",
                    "cache-control": "3600"
                }
            )
            
            if result.error:
                raise RuntimeError(f"Upload failed: {result.error}")
            
            # Get public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_path)
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload to storage: {str(e)}")
            raise RuntimeError(f"Storage upload failed: {str(e)}")
    
    async def store_image(self, url: str, user_id: str) -> str:
        """Download image from URL and store in Supabase Storage, return public URL"""
        try:
            # Download image
            image_data, content_type = await self.download_image(url)
            
            # Generate file path
            file_path = self._generate_file_path(url, user_id)
            
            # Upload to storage
            public_url = await self.upload_to_storage(image_data, file_path)
            
            logger.info(f"Successfully stored image: {url} -> {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to store image {url}: {str(e)}")
            # Return original URL as fallback
            return url
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for text using OpenAI"""
        try:
            # Prepare text for embedding
            clean_text = text.strip()
            if not clean_text:
                return []
            
            # Generate embedding using OpenAI (1536 dimensions)
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=clean_text,
                encoding_format="float"
            )
            
            embedding = response.data[0].embedding
            logger.info(f"Generated embedding of dimension {len(embedding)} for text: {clean_text[:100]}...")
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return []
    
    def create_description_for_embedding(self, item_data: Dict[str, Any]) -> str:
        """Create a comprehensive description for embedding generation"""
        parts = []
        
        # Add title and vendor
        if item_data.get("title"):
            parts.append(f"Product: {item_data['title']}")
        if item_data.get("vendor"):
            parts.append(f"Brand: {item_data['vendor']}")
        
        # Add category and material
        if item_data.get("category"):
            parts.append(f"Category: {item_data['category']}")
        if item_data.get("material"):
            parts.append(f"Material: {item_data['material']}")
        
        # Add description
        if item_data.get("description"):
            parts.append(f"Description: {item_data['description']}")
        
        # Add color information
        if item_data.get("colour_hex"):
            parts.append(f"Color: {item_data['colour_hex']}")
        
        # Add price information
        if item_data.get("price") and item_data.get("currency"):
            parts.append(f"Price: {item_data['price']} {item_data['currency']}")
        
        return " | ".join(parts)
    
    def search_by_embedding(self, query_embedding: List[float], user_id: str, 
                          limit: int = 20, similarity_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search items using vector similarity"""
        try:
            if not query_embedding:
                return []
            
            # Convert embedding to string format for PostgreSQL
            embedding_str = f"[{','.join(map(str, query_embedding))}]"
            
            sql = """
                SELECT 
                    id, img_url, title, vendor, price, currency, description,
                    colour_hex, category, material, created_at,
                    1 - (embedding <=> :query_embedding::vector) as similarity
                FROM items 
                WHERE owner_id = :owner_id 
                AND embedding IS NOT NULL
                AND 1 - (embedding <=> :query_embedding::vector) > :threshold
                ORDER BY embedding <=> :query_embedding::vector
                LIMIT :limit
            """
            
            params = {
                "query_embedding": embedding_str,
                "owner_id": user_id,
                "threshold": similarity_threshold,
                "limit": limit
            }
            
            with self.engine.connect() as conn:
                result = conn.execute(text(sql), params)
                rows = result.mappings().all()
            
            # Format results
            results = []
            for row in rows:
                item = dict(row)
                item["created_at"] = item["created_at"].isoformat() if item["created_at"] else None
                results.append(item)
            
            logger.info(f"Vector search returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Vector search failed: {str(e)}")
            return []
    
    async def semantic_search(self, query: str, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Perform semantic search using query embedding"""
        try:
            # Generate embedding for search query
            query_embedding = self.generate_embedding(query)
            if not query_embedding:
                logger.warning("Failed to generate query embedding, falling back to text search")
                return []
            
            # Search using vector similarity
            results = self.search_by_embedding(query_embedding, user_id, limit)
            return results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {str(e)}")
            return []
    
    def store_item_embedding(self, item_id: str, embedding: List[float]) -> bool:
        """Store embedding vector for an item"""
        try:
            if not embedding:
                return False
            
            # Convert embedding to string format for PostgreSQL
            embedding_str = f"[{','.join(map(str, embedding))}]"
            
            sql = """
                UPDATE items 
                SET embedding = :embedding::vector 
                WHERE id = :item_id
            """
            
            with self.engine.begin() as conn:
                conn.execute(text(sql), {
                    "embedding": embedding_str,
                    "item_id": item_id
                })
            
            logger.info(f"Stored embedding for item {item_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store embedding for item {item_id}: {str(e)}")
            return False


# Global instance
storage_service = StorageService()