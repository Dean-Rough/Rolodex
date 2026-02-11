"""Project management routes."""

from __future__ import annotations

import uuid

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, insert, select
from sqlalchemy.exc import IntegrityError

from backend.api.dependencies import AuthContext, get_auth, rate_limit
from backend.core.db import get_engine
from backend.models import project_items_table, projects_table


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
            insert(projects_table).values(
                id=project_id,
                owner_id=auth.user_id,
                name=body.name,
                created_at=dt.datetime.now(dt.timezone.utc),
            )
        )

    return {"id": project_id, "name": body.name}


@router.get("/{project_id}")
def get_project(project_id: str, auth: AuthContext = Depends(get_auth)):
    engine = get_engine()
    with engine.connect() as connection:
        row = (
            connection.execute(
                select(
                    projects_table.c.id,
                    projects_table.c.name,
                    projects_table.c.created_at,
                ).where(
                    and_(
                        projects_table.c.id == project_id,
                        projects_table.c.owner_id == auth.user_id,
                    )
                )
            ).mappings().first()
        )

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    created_at = row.get("created_at")
    if isinstance(created_at, dt.datetime) and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=dt.timezone.utc)

    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": created_at.isoformat() if isinstance(created_at, dt.datetime) else created_at,
    }


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


@router.delete("/{project_id}/remove_item", status_code=204, response_model=None)
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
