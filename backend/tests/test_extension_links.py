import os
import pathlib
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict

import httpx
import jwt
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.api.dependencies import AuthContext, get_auth, get_storage_dependency  # noqa: E402
from backend.core.config import get_settings  # noqa: E402
from backend.core.db import get_engine  # noqa: E402
from backend.main import create_app  # noqa: E402
from backend.storage import _StorageProxy  # type: ignore[attr-defined]  # noqa: E402


class DummyStorage:
    async def store_image(self, url: str, user_id: str) -> str:
        return url

    def create_description_for_embedding(self, payload: Dict[str, str]) -> str:
        return payload.get("title", "")

    def generate_embedding(self, text: str):
        return []

    def store_item_embedding(self, item_id: str, embedding):
        return False

    async def semantic_search(self, query: str, user_id: str, limit: int = 20):
        return []


def _mock_auth() -> AuthContext:
    """Return a fake auth context for testing."""
    return AuthContext(user_id="user-123")


@pytest.fixture()
async def app(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path / 'rolodex-extension.db'}"
    os.environ["ROLODEX_SEED_DEMO"] = "0"
    os.environ["JWT_SECRET"] = "super-secret"
    os.environ["ROLODEX_CAPTURE_BASE_URL"] = "https://app.example.com"
    os.environ["ROLODEX_CAPTURE_STAGING_BASE_URL"] = "https://staging.example.com"
    os.environ["ROLODEX_CAPTURE_DEVELOPMENT_BASE_URL"] = "http://localhost:3000"

    get_settings.cache_clear()
    get_engine.cache_clear()

    from backend import storage as storage_module  # noqa: E402

    if isinstance(storage_module._storage_proxy, _StorageProxy):  # type: ignore[attr-defined]
        storage_module._storage_proxy._instance = None  # type: ignore[attr-defined]

    application = create_app()
    application.dependency_overrides[get_storage_dependency] = lambda: DummyStorage()
    application.dependency_overrides[get_auth] = _mock_auth

    await application.router.startup()
    yield application
    await application.router.shutdown()


@pytest.fixture()
async def client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest.fixture()
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_create_deeplink(client):
    payload = {
        "image": "https://cdn.example.com/image.jpg",
        "source": "https://retailer.example.com/products/1",
        "title": "Acrylic Bar Stool",
        "environment": "staging",
    }

    response = await client.post(
        "/api/extension/deeplink",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["capture_url"].startswith("https://staging.example.com/capture?")

    token_param = httpx.URL(data["capture_url"]).params.get("token")
    assert token_param
    parsed_token = jwt.decode(
        token_param,
        os.environ["JWT_SECRET"],
        algorithms=["HS256"],
        options={"verify_aud": False},
    )

    assert "user-123" in parsed_token["sub"]
    assert parsed_token["image"] == payload["image"]
    assert parsed_token["source"] == payload["source"]
    assert parsed_token["title"] == payload["title"]

    expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
    assert expires_at - datetime.now(timezone.utc) <= timedelta(minutes=5, seconds=5)


@pytest.mark.anyio
async def test_deeplink_requires_image(client):
    """Deeplink endpoint should reject payloads without an image."""
    response = await client.post(
        "/api/extension/deeplink",
        json={"source": "https://example.com"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 422
