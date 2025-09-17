"""Application bootstrap helpers."""

from __future__ import annotations

import os

from fastapi import FastAPI

from backend.core.config import get_settings
from backend.core.db import get_engine
from backend.models import ensure_schema, seed_demo_items, seed_demo_project


DEMO_USER_ID = os.getenv("ROLODEX_DEMO_USER_ID", "00000000-0000-0000-0000-demo00000000")


def register_startup(app: FastAPI) -> None:
    """Attach startup events for schema bootstrap and demo data seeding."""

    @app.on_event("startup")
    def _bootstrap() -> None:
        engine = get_engine()
        ensure_schema(engine)

        settings = get_settings()
        # Only seed demo data when running locally (SQLite or explicitly requested).
        database_url = settings.database_url or ""
        if database_url.startswith("sqlite") or os.getenv("ROLODEX_FORCE_DEMO"):
            seed_demo_items(engine, DEMO_USER_ID)
            seed_demo_project(engine, DEMO_USER_ID)
