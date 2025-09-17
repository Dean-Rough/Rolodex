"""Project management routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from backend.api.dependencies import AuthContext, get_auth, rate_limit
from backend.core.db import get_engine


router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectItemLink(BaseModel):
    item_id: str


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
            text(
                """
                INSERT INTO projects (id, owner_id, name, created_at)
                VALUES (:id, :owner_id, :name, now())
                """
            ),
            {"id": project_id, "owner_id": auth.user_id, "name": body.name},
        )

    return {"id": project_id, "name": body.name}


@router.get("/{project_id}")
def get_project(project_id: str, auth: AuthContext = Depends(get_auth)):
    engine = get_engine()
    with engine.connect() as connection:
        row = (
            connection.execute(
                text(
                    """
                    SELECT id, name, created_at
                    FROM projects
                    WHERE id = :id AND owner_id = :owner_id
                    """
                ),
                {"id": project_id, "owner_id": auth.user_id},
            )
            .mappings()
            .first()
        )

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


@router.post("/{project_id}/add_item", status_code=204)
def add_item_to_project(
    project_id: str,
    body: ProjectItemLink,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
):
    engine = get_engine()
    with engine.begin() as connection:
        project = connection.execute(
            text("SELECT 1 FROM projects WHERE id=:id AND owner_id=:owner_id"),
            {"id": project_id, "owner_id": auth.user_id},
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        connection.execute(
            text(
                """
                INSERT INTO project_items (project_id, item_id)
                VALUES (:project_id, :item_id)
                ON CONFLICT DO NOTHING
                """
            ),
            {"project_id": project_id, "item_id": body.item_id},
        )

    return {}


@router.delete("/{project_id}/remove_item", status_code=204)
def remove_item_from_project(
    project_id: str,
    body: ProjectItemLink,
    auth: AuthContext = Depends(get_auth),
    _: None = Depends(rate_limit),
):
    engine = get_engine()
    with engine.begin() as connection:
        project = connection.execute(
            text("SELECT 1 FROM projects WHERE id=:id AND owner_id=:owner_id"),
            {"id": project_id, "owner_id": auth.user_id},
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        connection.execute(
            text("DELETE FROM project_items WHERE project_id=:project_id AND item_id=:item_id"),
            {"project_id": project_id, "item_id": body.item_id},
        )

    return {}
