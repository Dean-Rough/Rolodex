"""Authentication routes for Rolodex backend."""

from __future__ import annotations

import datetime as dt
import hashlib
import secrets
import uuid
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import insert, select

from backend.api.dependencies import AuthContext, get_auth
from backend.core.config import get_settings
from backend.core.db import get_engine
from backend.models import users_table


router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    """User registration payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    """User login payload."""

    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Authentication response with JWT token."""

    access_token: str
    token_type: str = "bearer"
    user: UserProfile


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


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a salt."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a stored hash."""
    try:
        salt, expected_hash = password_hash.split("$", 1)
        pwd_hash = hashlib.sha256((salt + password).encode()).hexdigest()
        return pwd_hash == expected_hash
    except (ValueError, AttributeError):
        return False


def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT access token for a user."""
    settings = get_settings()
    secret = settings.supabase_jwt_secret or settings.jwt_secret or "dev-secret-change-me"

    payload = {
        "sub": user_id,
        "email": email,
        "iat": dt.datetime.now(dt.timezone.utc),
        "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
    }

    return jwt.encode(payload, secret, algorithm="HS256")


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest) -> AuthResponse:
    """Register a new user account."""
    engine = get_engine()

    with engine.begin() as conn:
        # Check if user already exists
        existing = conn.execute(
            select(users_table.c.id).where(users_table.c.email == payload.email.lower())
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create new user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(payload.password)

        conn.execute(
            insert(users_table),
            [
                {
                    "id": user_id,
                    "email": payload.email.lower(),
                    "password_hash": password_hash,
                    "full_name": payload.full_name,
                    "created_at": dt.datetime.now(dt.timezone.utc),
                }
            ],
        )

        # Generate access token
        access_token = create_access_token(user_id, payload.email.lower())

        return AuthResponse(
            access_token=access_token,
            user=UserProfile(
                id=user_id,
                email=payload.email.lower(),
                full_name=payload.full_name,
                created_at=dt.datetime.now(dt.timezone.utc).isoformat(),
            ),
        )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    """Authenticate a user and return an access token."""
    engine = get_engine()

    with engine.begin() as conn:
        user = conn.execute(
            select(
                users_table.c.id,
                users_table.c.email,
                users_table.c.password_hash,
                users_table.c.full_name,
                users_table.c.created_at,
            ).where(users_table.c.email == payload.email.lower())
        ).first()

        if not user or not verify_password(payload.password, user.password_hash or ""):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Generate access token
        access_token = create_access_token(user.id, user.email)

        return AuthResponse(
            access_token=access_token,
            user=UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                created_at=user.created_at.isoformat() if user.created_at else "",
            ),
        )


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
            # For demo tokens, return a synthetic user
            return UserProfile(
                id=auth.user_id,
                email="demo@rolodex.app",
                full_name="Demo User",
                created_at=dt.datetime.now(dt.timezone.utc).isoformat(),
            )

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

            if user:
                return ExtensionStatusResponse(
                    authenticated=True,
                    user=UserProfile(
                        id=user.id,
                        email=user.email,
                        full_name=user.full_name,
                        created_at=user.created_at.isoformat() if user.created_at else "",
                    ),
                )
            else:
                # Demo user fallback
                return ExtensionStatusResponse(
                    authenticated=True,
                    user=UserProfile(
                        id=auth.user_id,
                        email="demo@rolodex.app",
                        full_name="Demo User",
                        created_at=dt.datetime.now(dt.timezone.utc).isoformat(),
                    ),
                )
    except Exception:  # noqa: BLE001
        return ExtensionStatusResponse(authenticated=False, user=None)


__all__ = ["router"]
