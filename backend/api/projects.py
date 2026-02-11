"""Project management routes."""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, func, insert, select, update as sql_update
from sqlalchemy.exc import IntegrityError

from backend.api.dependencies import AuthContext, get_auth, rate_limit
from backend.core.db import get_engine
from backend.models import items_table, project_items_table, projects_table


router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    budget: Optional[float] = None
    description: Optional[str] = None


class ProjectItemLink(BaseModel):
    item_id: str


def _to_iso(value: Any) -> Optional[str]:
    """Convert a datetime (or other value) to an ISO-8601 string."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.isoformat()
    return str(value)


@router.get("")
def list_projects(auth: AuthContext = Depends(get_auth)):
    """Return all projects for the authenticated user, ordered by created_at desc."""
    engine = get_engine()
    with engine.connect() as connection:
        stmt = (
            select(
                projects_table.c.id,
                projects_table.c.name,
                projects_table.c.created_at,
                func.count(project_items_table.c.item_id).label("item_count"),
            )
            .outerjoin(
                project_items_table,
                projects_table.c.id == project_items_table.c.project_id,
            )
            .where(projects_table.c.owner_id == auth.user_id)
            .group_by(
                projects_table.c.id,
                projects_table.c.name,
                projects_table.c.created_at,
            )
            .order_by(projects_table.c.created_at.desc())
        )
        rows = connection.execute(stmt).mappings().all()

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "created_at": _to_iso(row["created_at"]),
            "item_count": row["item_count"],
        }
        for row in rows
    ]


@router.post("", status_code=201)
def create_project(
    body: ProjectCreate,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
):
    project_id = str(uuid.uuid4())
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            insert(projects_table).values(
                id=project_id,
                owner_id=auth.user_id,
                name=body.name,
                created_at=dt.datetime.now(dt.timezone.utc),
            )
        )

    return {"id": project_id, "name": body.name}


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    body: ProjectUpdate,
    auth: AuthContext = Depends(get_auth),
):
    """Update project name, budget, or description."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = dt.datetime.now(dt.timezone.utc)
    engine = get_engine()
    with engine.begin() as connection:
        result = connection.execute(
            sql_update(projects_table)
            .where(
                and_(
                    projects_table.c.id == project_id,
                    projects_table.c.owner_id == auth.user_id,
                )
            )
            .values(**updates)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Project not found")

        row = connection.execute(
            select(
                projects_table.c.id,
                projects_table.c.name,
                projects_table.c.budget,
                projects_table.c.description,
                projects_table.c.created_at,
            ).where(projects_table.c.id == project_id)
        ).mappings().first()

    return {
        "id": row["id"],
        "name": row["name"],
        "budget": row.get("budget"),
        "description": row.get("description"),
        "created_at": _to_iso(row["created_at"]),
    }


@router.get("/{project_id}")
def get_project(project_id: str, auth: AuthContext = Depends(get_auth)):
    engine = get_engine()
    with engine.connect() as connection:
        project_row = (
            connection.execute(
                select(
                    projects_table.c.id,
                    projects_table.c.name,
                    projects_table.c.created_at,
                    projects_table.c.budget,
                    projects_table.c.description,
                ).where(
                    and_(
                        projects_table.c.id == project_id,
                        projects_table.c.owner_id == auth.user_id,
                    )
                )
            ).mappings().first()
        )

        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        item_rows = connection.execute(
            select(items_table)
            .join(
                project_items_table,
                items_table.c.id == project_items_table.c.item_id,
            )
            .where(project_items_table.c.project_id == project_id)
            .order_by(items_table.c.created_at.desc())
        ).mappings().all()

    items = [
        {
            "id": item["id"],
            "img_url": item["img_url"],
            "title": item.get("title"),
            "vendor": item.get("vendor"),
            "price": item.get("price"),
            "currency": item.get("currency"),
            "description": item.get("description"),
            "colour_hex": item.get("colour_hex"),
            "color_palette": item.get("color_palette"),
            "category": item.get("category"),
            "material": item.get("material"),
            "tags": item.get("tags") or [],
            "style_tags": item.get("style_tags") or [],
            "notes": item.get("notes"),
            "created_at": _to_iso(item.get("created_at")),
        }
        for item in item_rows
    ]

    result = {
        "id": project_row["id"],
        "name": project_row["name"],
        "created_at": _to_iso(project_row["created_at"]),
        "items": items,
    }

    if project_row.get("budget") is not None:
        result["budget"] = project_row["budget"]
    if project_row.get("description") is not None:
        result["description"] = project_row["description"]

    return result


@router.post("/{project_id}/add_item", status_code=204, response_model=None)
def add_item_to_project(
    project_id: str,
    body: ProjectItemLink,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
):
    engine = get_engine()
    with engine.begin() as connection:
        project = connection.execute(
            select(projects_table.c.id).where(
                and_(
                    projects_table.c.id == project_id,
                    projects_table.c.owner_id == auth.user_id,
                )
            )
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        try:
            connection.execute(
                insert(project_items_table).values(
                    project_id=project_id,
                    item_id=body.item_id,
                    created_at=dt.datetime.now(dt.timezone.utc),
                )
            )
        except IntegrityError:
            pass

    return {}


@router.delete("/{project_id}", status_code=204, response_model=None)
def delete_project(
    project_id: str,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
):
    engine = get_engine()
    with engine.begin() as connection:
        # First, delete all project_items associated with this project
        connection.execute(
            delete(project_items_table).where(
                project_items_table.c.project_id == project_id
            )
        )
        # Then, delete the project itself
        result = connection.execute(
            delete(projects_table).where(
                and_(
                    projects_table.c.id == project_id,
                    projects_table.c.owner_id == auth.user_id,
                )
            )
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Project not found")

    return {}


@router.post("/{project_id}/remove_item", status_code=204, response_model=None)
def remove_item_from_project(
    project_id: str,
    body: ProjectItemLink,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
):
    engine = get_engine()
    with engine.begin() as connection:
        project = connection.execute(
            select(projects_table.c.id).where(
                and_(
                    projects_table.c.id == project_id,
                    projects_table.c.owner_id == auth.user_id,
                )
            )
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        connection.execute(
            delete(project_items_table).where(
                and_(
                    project_items_table.c.project_id == project_id,
                    project_items_table.c.item_id == body.item_id,
                )
            )
        )

    return {}
