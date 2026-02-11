"""Saved searches API endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import and_, delete, insert, select

from backend.api.dependencies import AuthContext, get_auth
from backend.core.db import get_engine
from backend.models import saved_searches_table


router = APIRouter(prefix="/api/searches", tags=["searches"])


class SearchFilters(BaseModel):
    """Search filter configuration."""

    query: Optional[str] = None
    category: Optional[str] = None
    vendor: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    colour_hex: Optional[str] = None
    material: Optional[str] = None
    tags: Optional[List[str]] = None


class SavedSearchCreate(BaseModel):
    """Create saved search payload."""

    name: str
    filters: SearchFilters


class SavedSearchOut(BaseModel):
    """Saved search response."""

    id: str
    name: str
    filters: SearchFilters
    created_at: str


@router.post("", response_model=SavedSearchOut, status_code=201)
async def create_saved_search(
    payload: SavedSearchCreate,
    auth: Annotated[AuthContext, Depends(get_auth)],
) -> SavedSearchOut:
    """Save a search filter configuration."""
    engine = get_engine()

    search_id = str(uuid.uuid4())

    with engine.begin() as conn:
        conn.execute(
            insert(saved_searches_table).values(
                id=search_id,
                owner_id=auth.user_id,
                name=payload.name,
                filters=payload.filters.model_dump(),
            )
        )

        # Fetch to return
        row = conn.execute(
            select(saved_searches_table).where(
                saved_searches_table.c.id == search_id
            )
        ).mappings().first()

    return SavedSearchOut(
        id=row["id"],
        name=row["name"],
        filters=SearchFilters(**row["filters"]),
        created_at=row["created_at"].isoformat() if row.get("created_at") else "",
    )


@router.get("", response_model=List[SavedSearchOut])
async def list_saved_searches(
    auth: Annotated[AuthContext, Depends(get_auth)],
) -> List[SavedSearchOut]:
    """List all saved searches for the user."""
    engine = get_engine()

    with engine.connect() as conn:
        rows = conn.execute(
            select(saved_searches_table)
            .where(saved_searches_table.c.owner_id == auth.user_id)
            .order_by(saved_searches_table.c.created_at.desc())
        ).mappings().all()

    return [
        SavedSearchOut(
            id=row["id"],
            name=row["name"],
            filters=SearchFilters(**row["filters"]),
            created_at=row["created_at"].isoformat() if row.get("created_at") else "",
        )
        for row in rows
    ]


@router.get("/{search_id}", response_model=SavedSearchOut)
async def get_saved_search(
    search_id: str,
    auth: Annotated[AuthContext, Depends(get_auth)],
) -> SavedSearchOut:
    """Get a specific saved search."""
    engine = get_engine()

    with engine.connect() as conn:
        row = conn.execute(
            select(saved_searches_table).where(
                and_(
                    saved_searches_table.c.id == search_id,
                    saved_searches_table.c.owner_id == auth.user_id,
                )
            )
        ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Saved search not found")

    return SavedSearchOut(
        id=row["id"],
        name=row["name"],
        filters=SearchFilters(**row["filters"]),
        created_at=row["created_at"].isoformat() if row.get("created_at") else "",
    )


@router.delete("/{search_id}", status_code=204, response_model=None)
async def delete_saved_search(
    search_id: str,
    auth: Annotated[AuthContext, Depends(get_auth)],
) -> None:
    """Delete a saved search."""
    engine = get_engine()

    with engine.begin() as conn:
        result = conn.execute(
            delete(saved_searches_table).where(
                and_(
                    saved_searches_table.c.id == search_id,
                    saved_searches_table.c.owner_id == auth.user_id,
                )
            )
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Saved search not found")


__all__ = ["router"]
