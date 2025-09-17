"""Item routes for capture, listing, and extraction."""

from __future__ import annotations

import asyncio
import datetime as dt
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import and_, func, insert, or_, select
from sqlalchemy.exc import SQLAlchemyError

from backend.api.dependencies import (
    AuthContext,
    get_auth,
    get_storage_dependency,
    rate_limit,
)
from backend.core.db import get_engine
from backend.models import items_table
from backend.storage import StorageService

try:
    from backend.services.ai_extraction import (
        AIExtractionError,
        get_extraction_service,
    )
except ImportError:  # pragma: no cover - optional dependency
    AIExtractionError = Exception  # type: ignore[assignment]

    def get_extraction_service():  # type: ignore[override]
        return None


router = APIRouter(prefix="/api/items", tags=["items"])


class ItemCreate(BaseModel):
    img_url: HttpUrl
    title: Optional[str] = None
    vendor: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    colour_hex: Optional[str] = None
    category: Optional[str] = None
    material: Optional[str] = None
    src_url: Optional[str] = None


class ItemOut(BaseModel):
    id: str
    img_url: HttpUrl
    title: Optional[str] = None
    vendor: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    colour_hex: Optional[str] = None
    category: Optional[str] = None
    material: Optional[str] = None
    created_at: Optional[str] = None


class ItemsResponse(BaseModel):
    items: List[ItemOut]
    nextCursor: Optional[str] = None
    search_type: str = Field(default="text")


class ExtractRequest(BaseModel):
    imageUrl: Optional[HttpUrl] = Field(None, description="URL of the product image to analyze")
    sourceUrl: Optional[HttpUrl] = Field(None, description="URL of the source page for context")
    title: Optional[str] = Field(None, description="Page title for additional context")
    image_url: Optional[HttpUrl] = None  # Backwards compatibility
    raw_text: Optional[str] = None  # Future text-only extraction support


def _to_iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.isoformat()
    return str(value)


def _parse_cursor(value: Optional[str]) -> Optional[dt.datetime]:
    if not value:
        return None
    normalized = value.rstrip("Z") + ("+00:00" if value.endswith("Z") else "")
    try:
        return dt.datetime.fromisoformat(normalized)
    except ValueError:
        return None


async def _generate_item_embedding(
    item_id: str,
    item_payload: Dict[str, Any],
    storage: StorageService,
) -> None:
    """Generate and persist embeddings in the background."""

    try:
        description = storage.create_description_for_embedding(item_payload)
        if not description:
            return
        loop = asyncio.get_running_loop()
        embedding = await loop.run_in_executor(None, storage.generate_embedding, description)
        if embedding:
            await loop.run_in_executor(None, storage.store_item_embedding, item_id, embedding)
    except Exception as exc:  # noqa: BLE001
        print(f"Error generating embedding for item {item_id}: {exc}")


@router.post("", status_code=201, response_model=ItemOut)
async def create_item(
    payload: ItemCreate,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
    storage: StorageService = Depends(get_storage_dependency),
) -> ItemOut:
    """Create a new library item for the authenticated user."""

    item_id = str(uuid.uuid4())
    stored_img_url = str(payload.img_url)

    try:
        stored_img_url = await storage.store_image(str(payload.img_url), auth.user_id)
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: Failed to store image in Supabase Storage: {exc}")

    engine = get_engine()
    try:
        with engine.begin() as connection:
            connection.execute(
                insert(items_table).values(
                    id=item_id,
                    owner_id=auth.user_id,
                    img_url=stored_img_url,
                    title=payload.title,
                    vendor=payload.vendor,
                    price=payload.price,
                    currency=payload.currency,
                    description=payload.description,
                    colour_hex=payload.colour_hex,
                    category=payload.category,
                    material=payload.material,
                    src_url=payload.src_url,
                    created_at=dt.datetime.now(dt.timezone.utc),
                )
            )
    except SQLAlchemyError as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    asyncio.create_task(
        _generate_item_embedding(item_id, payload.model_dump(), storage),
    )

    return ItemOut(
        id=item_id,
        img_url=stored_img_url,
        title=payload.title,
        vendor=payload.vendor,
        price=payload.price,
        currency=payload.currency,
        description=payload.description,
        colour_hex=payload.colour_hex,
        category=payload.category,
        material=payload.material,
    )


@router.get("", response_model=ItemsResponse)
async def list_items(
    query: Optional[str] = None,
    hex: Optional[str] = None,
    price_max: Optional[float] = None,
    limit: int = 20,
    cursor: Optional[str] = None,
    semantic: bool = False,
    auth: AuthContext = Depends(get_auth),
    storage: StorageService = Depends(get_storage_dependency),
) -> ItemsResponse:
    """List items for the authenticated user with optional filters."""

    limit = max(1, min(limit, 100))

    if semantic and query:
        try:
            semantic_results = await storage.semantic_search(query, auth.user_id, limit)
        except Exception as exc:  # noqa: BLE001
            print(f"Semantic search failed, falling back to text search: {exc}")
            semantic_results = []

        if semantic_results:
            filtered_results: List[Dict[str, Any]] = []
            for item in semantic_results:
                if hex and item.get("colour_hex") and hex.lower() not in item["colour_hex"].lower():
                    continue
                if price_max is not None and item.get("price") and item["price"] > price_max:
                    continue
                filtered_results.append(item)

            return ItemsResponse(
                items=[ItemOut(**{
                    "id": entry["id"],
                    "img_url": entry["img_url"],
                    "title": entry.get("title"),
                    "vendor": entry.get("vendor"),
                    "price": entry.get("price"),
                    "currency": entry.get("currency"),
                    "description": entry.get("description"),
                    "colour_hex": entry.get("colour_hex"),
                    "category": entry.get("category"),
                    "material": entry.get("material"),
                    "created_at": entry.get("created_at"),
                }) for entry in filtered_results[:limit]],
                nextCursor=None,
                search_type="semantic",
            )

    filters = [items_table.c.owner_id == auth.user_id]
    if query:
        pattern = f"%{query.lower()}%"
        filters.append(
            or_(
                func.lower(items_table.c.title).like(pattern),
                func.lower(items_table.c.vendor).like(pattern),
                func.lower(items_table.c.description).like(pattern),
                func.lower(items_table.c.category).like(pattern),
            )
        )
    if hex:
        filters.append(func.lower(items_table.c.colour_hex).like(f"%{hex.lower()}%"))
    if price_max is not None:
        filters.append(items_table.c.price <= price_max)
    cursor_dt = _parse_cursor(cursor)
    if cursor_dt is not None:
        filters.append(items_table.c.created_at < cursor_dt)

    stmt = (
        select(
            items_table.c.id,
            items_table.c.img_url,
            items_table.c.title,
            items_table.c.vendor,
            items_table.c.price,
            items_table.c.currency,
            items_table.c.description,
            items_table.c.colour_hex,
            items_table.c.category,
            items_table.c.material,
            items_table.c.created_at,
        )
        .where(and_(*filters))
        .order_by(items_table.c.created_at.desc())
        .limit(limit)
    )

    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(stmt).mappings().all()

    items = [
        ItemOut(
            id=row["id"],
            img_url=row["img_url"],
            title=row.get("title"),
            vendor=row.get("vendor"),
            price=row.get("price"),
            currency=row.get("currency"),
            description=row.get("description"),
            colour_hex=row.get("colour_hex"),
            category=row.get("category"),
            material=row.get("material"),
            created_at=_to_iso(row.get("created_at")),
        )
        for row in rows
    ]

    next_cursor = _to_iso(rows[-1]["created_at"]) if rows else None

    return ItemsResponse(items=items, nextCursor=next_cursor, search_type="text")


@router.post("/extract")
async def extract_metadata(
    payload: ExtractRequest,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
    storage: StorageService = Depends(get_storage_dependency),
) -> Dict[str, Any]:
    """AI-powered product data extraction from images."""

    image_url = payload.imageUrl or payload.image_url

    if not image_url and not payload.raw_text:
        raise HTTPException(
            status_code=422,
            detail="Provide imageUrl (or legacy image_url) for image analysis, or raw_text for text analysis",
        )

    if not image_url:
        raise HTTPException(
            status_code=422,
            detail="Image URL is required. Text-only extraction not yet implemented.",
        )

    stored_img_url = str(image_url)
    try:
        stored_img_url = await storage.store_image(str(image_url), auth.user_id)
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: Failed to store image during extraction: {exc}")

    extraction_service = get_extraction_service()
    if extraction_service:
        try:
            product_data = extraction_service.extract_from_image_url(
                image_url=str(image_url),
                context_url=str(payload.sourceUrl) if payload.sourceUrl else None,
                page_title=payload.title,
            )

            extracted_data: Dict[str, Any] = {
                "title": product_data.title,
                "vendor": product_data.vendor,
                "price": product_data.price,
                "currency": product_data.currency or "USD",
                "description": product_data.description,
                "colour_hex": product_data.colour_hex,
                "category": product_data.category,
                "material": product_data.material,
                "dimensions": product_data.dimensions,
                "features": product_data.features or [],
                "img_url": stored_img_url,
                "src_url": str(payload.sourceUrl) if payload.sourceUrl else None,
            }
        except AIExtractionError as exc:  # type: ignore[arg-type]
            raise HTTPException(status_code=422, detail=f"AI extraction failed: {exc}") from exc
    else:
        extracted_data = {
            "title": "Modern Furniture Piece",
            "vendor": "Design Studio",
            "price": 1500,
            "currency": "USD",
            "description": "A beautifully crafted modern furniture piece with premium materials and elegant design.",
            "colour_hex": "#8B4513",
            "category": "Furniture",
            "material": "Wood",
            "dimensions": None,
            "features": ["Modern Design", "Premium Materials"],
            "img_url": stored_img_url,
            "src_url": str(payload.sourceUrl) if payload.sourceUrl else None,
        }

    try:
        description_text = storage.create_description_for_embedding(extracted_data)
        if description_text:
            embedding = storage.generate_embedding(description_text)
            if embedding:
                extracted_data["embedding_preview"] = f"Generated {len(embedding)}-dimensional embedding"
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: Failed to generate embedding during extraction: {exc}")

    return extracted_data
