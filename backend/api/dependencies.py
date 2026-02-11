"""Shared dependencies for API routes."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

import jwt
from fastapi import HTTPException, Request
from pydantic import BaseModel

from backend.core.config import get_settings
from backend.storage import StorageService, get_storage_service


class AuthContext(BaseModel):
    """Minimal authentication context extracted from a bearer token."""

    user_id: str


def get_auth(request: Request) -> AuthContext:
    """Validate the Authorization header and return the user context.

    Raises 401 if the token is missing, invalid, or unsigned.
    Raises 500 if no JWT secret is configured — the app cannot operate
    without one, and this is a deployment error, not a user error.
    """

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    settings = get_settings()
    secret = settings.supabase_jwt_secret or settings.jwt_secret

    if not secret:
        raise HTTPException(
            status_code=500,
            detail="JWT signing secret not configured",
        )

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256", "HS512"],
            options={"verify_aud": False},
        )
        uid = str(
            payload.get("sub")
            or payload.get("user_id")
            or payload.get("id")
            or payload.get("user")
            or ""
        )
        if not uid:
            raise ValueError("missing subject")
        if len(uid) == 36 and uid.count("-") == 4:
            return AuthContext(user_id=uid)
        tail = (uid[:12] or "anonymous000000").ljust(12, "0")
        return AuthContext(user_id=f"00000000-0000-0000-0000-{tail}")
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid token") from exc


_RATE_BUCKETS: Dict[str, Deque[float]] = defaultdict(deque)
_RATE_LIMIT = 60
_RATE_WINDOW = 60


def rate_limit(request: Request) -> None:
    """Apply a lightweight, in-memory rate limit per client and route."""

    client = request.client.host if request.client else "unknown"
    key = f"{client}:{request.url.path}"
    now = time.time()
    bucket = _RATE_BUCKETS[key]

    while bucket and now - bucket[0] > _RATE_WINDOW:
        bucket.popleft()

    if len(bucket) >= _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")

    bucket.append(now)


def get_storage_dependency() -> StorageService:
    """Return the shared storage service, raising a service error when unavailable."""

    try:
        return get_storage_service()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
