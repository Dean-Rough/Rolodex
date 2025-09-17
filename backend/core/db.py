"""Database utilities for the Rolodex backend."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine

from .config import get_settings


@lru_cache()
def get_engine() -> Engine:
    """Create (or return) the shared SQLAlchemy engine."""

    settings = get_settings()
    url = settings.database_url
    if not url:
        default_path = Path(os.getenv("ROLODEX_SQLITE_PATH", "./var/rolodex.db")).resolve()
        default_path.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{default_path}"

    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
    )


def get_connection() -> Iterator[Connection]:
    """FastAPI dependency that yields a live database connection."""

    engine = get_engine()
    with engine.connect() as connection:
        yield connection
