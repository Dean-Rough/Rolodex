"""Authentication routes for Rolodex backend.

User registration, login, and session management are handled by Clerk.
This module provides endpoints that read the Clerk-issued JWT (already
validated by get_auth in dependencies.py) and return profile data.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from backend.api.dependencies import AuthContext, get_auth
from backend.core.db import get_engine
from backend.models import users_table


router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserProfile(BaseModel):
    """User profile information."""

    id: str
    email: str
    full_name: str | None = None
    created_at: str


class ExtensionStatusResponse(BaseModel):
    """Extension authentication status."""

    authenticated: bool
    user: UserProfile | None = None


@router.get("/me", response_model=UserProfile)
async def get_current_user(auth: Annotated[AuthContext, Depends(get_auth)]) -> UserProfile:
    """Get the current authenticated user's profile."""
    engine = get_engine()

    with engine.connect() as conn:
        user = conn.execute(
            select(
                users_table.c.id,
                users_table.c.email,
                users_table.c.full_name,
                users_table.c.created_at,
            ).where(users_table.c.id == auth.user_id)
        ).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserProfile(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            created_at=user.created_at.isoformat() if user.created_at else "",
        )


@router.get("/extension/status", response_model=ExtensionStatusResponse)
async def extension_status(auth: Annotated[AuthContext, Depends(get_auth)] | None = None) -> ExtensionStatusResponse:
    """Check authentication status for the browser extension."""
    if not auth:
        return ExtensionStatusResponse(authenticated=False, user=None)

    try:
        engine = get_engine()

        with engine.connect() as conn:
            user = conn.execute(
                select(
                    users_table.c.id,
                    users_table.c.email,
                    users_table.c.full_name,
                    users_table.c.created_at,
                ).where(users_table.c.id == auth.user_id)
            ).first()

            if not user:
                return ExtensionStatusResponse(authenticated=False, user=None)

            return ExtensionStatusResponse(
                authenticated=True,
                user=UserProfile(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    created_at=user.created_at.isoformat() if user.created_at else "",
                ),
            )
    except Exception:  # noqa: BLE001
        return ExtensionStatusResponse(authenticated=False, user=None)


__all__ = ["router"]
