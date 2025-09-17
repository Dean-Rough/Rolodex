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
    capture_base_url: str = Field(
        default="https://app.rolodex.app",
        description="Base URL for the capture workspace in production.",
    )
    capture_staging_base_url: str | None = Field(
        default="https://staging.rolodex.app",
        description="Base URL for the capture workspace in staging environments.",
    )
    capture_development_base_url: str = Field(
        default="http://localhost:3000",
        description="Base URL for the capture workspace when running locally.",
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

    def resolve_capture_base(self, environment: str | None = None) -> str:
        """Resolve the base URL used for capture deep links for the given environment."""

        env = (environment or "production").lower()
        if env == "development":
            return self.capture_development_base_url.rstrip("/")
        if env == "staging":
            base = self.capture_staging_base_url or self.capture_base_url
            return base.rstrip("/")
        return self.capture_base_url.rstrip("/")


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
        capture_base_url=os.getenv("ROLODEX_CAPTURE_BASE_URL", Settings().capture_base_url),
        capture_staging_base_url=os.getenv("ROLODEX_CAPTURE_STAGING_BASE_URL")
        or Settings().capture_staging_base_url,
        capture_development_base_url=os.getenv(
            "ROLODEX_CAPTURE_DEVELOPMENT_BASE_URL",
            Settings().capture_development_base_url,
        ),
    )
