"""Configuration helpers for the Rolodex backend."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Tuple

from dotenv import load_dotenv
from pydantic import BaseModel, Field


load_dotenv()


class Settings(BaseModel):
    """Application settings loaded from environment variables."""

    database_url: str | None = Field(
        default=None,
        description="SQLAlchemy database URL used for primary persistence.",
    )
    supabase_project_url: str | None = Field(
        default=None,
        description="Supabase project URL for storage operations.",
    )
    supabase_service_role_key: str | None = Field(
        default=None,
        description="Supabase service role key used for storage uploads.",
    )
    openai_api_key: str | None = Field(
        default=None,
        description="OpenAI API key for embedding generation.",
    )
    supabase_jwt_secret: str | None = Field(
        default=None,
        description="Supabase JWT secret for validating access tokens.",
    )
    jwt_secret: str | None = Field(
        default=None,
        description="Fallback JWT secret for local development.",
    )
    cors_allow_origins: Tuple[str, ...] = Field(
        default=(
            "http://localhost:3000",
            "https://app.rolodex.app",
            "https://staging.rolodex.app",
        ),
        description="Origins allowed by CORS middleware.",
    )

    class Config:
        frozen = True

    def allow_origins(self) -> List[str]:
        """Return a mutable list of allowed origins for middleware configuration."""

        return list(self.cors_allow_origins)


@lru_cache()
def get_settings() -> Settings:
    """Load and cache application settings."""

    cors_overrides = os.getenv("ROLODEX_CORS_ORIGINS")
    if cors_overrides:
        origins: Tuple[str, ...] = tuple(
            origin.strip() for origin in cors_overrides.split(",") if origin.strip()
        )
    else:
        origins = Settings().cors_allow_origins

    return Settings(
        database_url=os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL"),
        supabase_project_url=os.getenv("SUPABASE_PROJECT_URL"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET"),
        jwt_secret=os.getenv("JWT_SECRET"),
        cors_allow_origins=origins,
    )
