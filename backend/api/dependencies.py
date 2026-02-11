"""Shared dependencies for API routes."""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict

import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Request
from pydantic import BaseModel

from backend.storage import StorageService, get_storage_service


class AuthContext(BaseModel):
    """Minimal authentication context extracted from a bearer token."""

    user_id: str


# ---------------------------------------------------------------------------
# Clerk JWKS verification
# ---------------------------------------------------------------------------
# Clerk issues RS256 tokens. We verify them using the public JWKS endpoint
# derived from CLERK_SECRET_KEY's issuer domain, or configured explicitly.
# The PyJWKClient caches keys automatically.

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Lazily create and cache a PyJWKClient pointing at the Clerk JWKS endpoint."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client

    # Clerk JWKS URL follows the pattern:
    # https://<clerk-frontend-api>/.well-known/jwks.json
    # You can set CLERK_JWKS_URL explicitly, or we derive it from the
    # publishable key (pk_test_<base64-encoded-domain>).
    jwks_url = os.getenv("CLERK_JWKS_URL")

    if not jwks_url:
        # Derive from CLERK_PUBLISHABLE_KEY
        pk = os.getenv("CLERK_PUBLISHABLE_KEY") or os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
        if pk:
            import base64
            # pk_test_<base64-encoded-domain-with-$-suffix> or pk_live_<...>
            encoded_part = pk.split("_", 2)[-1] if "_" in pk else ""
            # Add padding
            padded = encoded_part + "=" * (4 - len(encoded_part) % 4)
            try:
                domain = base64.b64decode(padded).decode().rstrip("$")
                jwks_url = f"https://{domain}/.well-known/jwks.json"
            except Exception:
                pass

    if not jwks_url:
        raise RuntimeError(
            "Cannot determine Clerk JWKS URL. "
            "Set CLERK_JWKS_URL or CLERK_PUBLISHABLE_KEY environment variable."
        )

    _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def _extract_token(request: Request) -> str:
    """Extract JWT from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            return token

    raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")


def get_auth(request: Request) -> AuthContext:
    """Validate the Clerk-issued JWT and return the user context.

    Clerk tokens are RS256-signed. We verify against Clerk's JWKS endpoint.
    The 'sub' claim contains the Clerk user ID (e.g. 'user_abc123').
    """

    token = _extract_token(request)

    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        uid = payload.get("sub", "")
        if not uid:
            raise ValueError("missing subject claim")
        return AuthContext(user_id=uid)
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
