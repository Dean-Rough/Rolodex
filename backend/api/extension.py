"""Routes that support the Chrome extension handshake."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import urlencode

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from backend.api.dependencies import AuthContext, get_auth
from backend.core.config import get_settings

router = APIRouter(prefix="/api/extension", tags=["extension"])


class DeepLinkRequest(BaseModel):
    """Payload for creating a deep link into the capture workspace."""

    image: HttpUrl = Field(..., description="Image URL selected from the page.")
    source: HttpUrl | None = Field(
        default=None, description="Source URL of the product or page."
    )
    title: str | None = Field(default=None, description="Optional tab title context.")
    environment: Literal["production", "staging", "development"] | None = Field(
        default=None,
        description="Environment hint used to resolve the capture base URL.",
    )


class DeepLinkResponse(BaseModel):
    """Deep link details for the extension."""

    capture_url: HttpUrl
    expires_at: datetime


TOKEN_TTL_MINUTES = 5


@router.post("/deeplink", response_model=DeepLinkResponse)
def create_deeplink(
    payload: DeepLinkRequest, auth: AuthContext = Depends(get_auth)
) -> DeepLinkResponse:
    """Generate a signed capture deep link for the Chrome extension."""

    settings = get_settings()
    secret = settings.supabase_jwt_secret or settings.jwt_secret
    if not secret:
        raise HTTPException(
            status_code=500, detail="JWT signing secret not configured"
        )

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)
    token_payload = {
        "sub": auth.user_id,
        "image": str(payload.image),
        "source": str(payload.source) if payload.source else None,
        "title": payload.title,
        "exp": int(expires_at.timestamp()),
        "iss": "rolodex-extension",
    }
    token_payload = {k: v for k, v in token_payload.items() if v is not None}
    token = jwt.encode(token_payload, secret, algorithm="HS256")

    base_url = settings.resolve_capture_base(payload.environment)
    capture_path = f"{base_url}/capture"
    query = urlencode(
        {
            "image": str(payload.image),
            "source": str(payload.source) if payload.source else None,
            "title": payload.title,
            "token": token,
        },
        doseq=False,
    )

    capture_url = f"{capture_path}?{query}" if query else capture_path

    return DeepLinkResponse(capture_url=capture_url, expires_at=expires_at)


__all__ = ["router"]
