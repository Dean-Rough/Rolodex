"""Supabase storage and embedding helpers."""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image
from sqlalchemy import text, update
from sqlalchemy.engine import Engine

try:  # pragma: no cover - optional dependency
    from supabase import Client, create_client
except ImportError:  # pragma: no cover - optional dependency
    Client = Any  # type: ignore[misc, assignment]
    create_client = None  # type: ignore[assignment]

try:  # pragma: no cover - optional dependency
    import openai
except ImportError as exc:  # pragma: no cover - optional dependency
    openai = None

from backend.core.config import get_settings
from backend.core.db import get_engine
from backend.models import items_table


logger = logging.getLogger(__name__)

class StorageService:
    """Service for handling image storage and vector embeddings"""
    
    def __init__(
        self,
        *,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        bucket_name: str = "product-images",
        engine: Optional[Engine] = None,
    ) -> None:
        settings = get_settings()

        self.supabase_url = supabase_url or settings.supabase_project_url
        self.supabase_key = supabase_key or settings.supabase_service_role_key
        self.openai_api_key = openai_api_key or settings.openai_api_key

        self.supabase: Optional[Client] = None
        if self.supabase_url and self.supabase_key and create_client is not None:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except Exception as exc:  # pragma: no cover - network initialisation
                logger.warning("Failed to initialise Supabase client: %s", exc)
                self.supabase = None
        elif self.supabase_url or self.supabase_key:
            logger.warning("Supabase credentials provided but client library missing. Storage disabled.")

        if self.openai_api_key and openai is not None:
            try:  # pragma: no cover - optional dependency
                openai.api_key = self.openai_api_key
                self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
            except Exception as exc:
                logger.warning("Failed to initialise OpenAI client: %s", exc)
                self.openai_client = None
        else:
            if self.openai_api_key and openai is None:
                logger.warning("OpenAI key supplied but `openai` package missing. Embeddings disabled.")
            self.openai_client = None

        self.bucket_name = bucket_name
        self._engine = engine

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            self._engine = get_engine()
        return self._engine
    
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
        if self.supabase is None:
            logger.debug("Supabase storage disabled; returning source URL for %s", url)
            return url

        try:
            image_data, _content_type = await self.download_image(url)
            file_path = self._generate_file_path(url, user_id)
            public_url = await self.upload_to_storage(image_data, file_path)
            logger.info("Stored image %s for user %s", file_path, user_id)
            return public_url
        except Exception as exc:
            logger.warning("Failed to store image %s: %s", url, exc)
            return url
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for text using OpenAI"""
        if self.openai_client is None:
            logger.debug("OpenAI client unavailable; skipping embedding generation")
            return []

        try:
            clean_text = text.strip()
            if not clean_text:
                return []

            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=clean_text,
                encoding_format="float",
            )
            embedding = response.data[0].embedding
            logger.info("Generated embedding of dimension %s", len(embedding))
            return embedding
        except Exception as exc:  # pragma: no cover - network errors
            logger.warning("Failed to generate embedding: %s", exc)
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
    
    def search_by_embedding(
        self,
        query_embedding: List[float],
        user_id: str,
        limit: int = 20,
        similarity_threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """Search items using vector similarity when pgvector is available."""

        if not query_embedding:
            return []

        engine = self.engine
        if engine.dialect.name != "postgresql":
            logger.debug("Vector search skipped for dialect %s", engine.dialect.name)
            return []

        try:
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
                "limit": limit,
            }

            with engine.connect() as connection:
                rows = connection.execute(text(sql), params).mappings().all()

            return [
                {**row, "created_at": row["created_at"].isoformat() if row.get("created_at") else None}
                for row in rows
            ]
        except Exception as exc:  # pragma: no cover - requires pgvector
            logger.warning("Vector search failed: %s", exc)
            return []
    
    async def semantic_search(self, query: str, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Perform semantic search using query embedding"""
        query_embedding = self.generate_embedding(query)
        if not query_embedding:
            return []

        return self.search_by_embedding(query_embedding, user_id, limit)
    
    def store_item_embedding(self, item_id: str, embedding: List[float]) -> bool:
        """Store embedding vector for an item"""
        if not embedding:
            return False

        try:
            with self.engine.begin() as connection:
                connection.execute(
                    update(items_table)
                    .where(items_table.c.id == item_id)
                    .values(embedding=embedding)
                )
            logger.info("Stored embedding for item %s", item_id)
            return True
        except Exception as exc:  # pragma: no cover - db errors
            logger.warning("Failed to store embedding for item %s: %s", item_id, exc)
            return False


class _StorageProxy:
    """Attribute proxy that lazily instantiates the storage service."""

    _instance: Optional[StorageService] = None

    def _get_instance(self) -> StorageService:
        if self._instance is None:
            self._instance = StorageService()
        return self._instance

    def __getattr__(self, item: str):  # noqa: D401
        return getattr(self._get_instance(), item)


def get_storage_service() -> StorageService:
    """Return a shared StorageService instance, initialising on demand."""

    return _storage_proxy._get_instance()


_storage_proxy = _StorageProxy()
storage_service = _storage_proxy

__all__ = ["StorageService", "get_storage_service", "storage_service"]
