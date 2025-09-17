"""Health and readiness endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from backend.core.db import get_engine


router = APIRouter(tags=["health"])


def _probe_database() -> dict[str, str]:
    try:
        engine = get_engine()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return {"status": "error", "db": "unavailable"}
    except RuntimeError:
        return {"status": "error", "db": "missing_configuration"}
    return {"status": "ok", "db": "connected"}


@router.get("/")
def root() -> dict[str, str]:
    """Primary health check endpoint."""

    return _probe_database()


@router.get("/health")
def health() -> dict[str, str]:
    """Secondary health endpoint used by clients."""

    return _probe_database()
