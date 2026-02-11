import asyncio
import os
import pathlib
import sys
from typing import Any, Dict, List

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

    def create_description_for_embedding(self, payload: Dict[str, Any]) -> str:
        return payload.get("title", "") or ""

    def generate_embedding(self, text: str) -> List[float]:
        return []

    def store_item_embedding(self, item_id: str, embedding: List[float]) -> bool:
        return False

    async def semantic_search(self, query: str, user_id: str, limit: int = 20):
        return []


@pytest.fixture()
async def app(tmp_path):
    db_path = tmp_path / "rolodex-test.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    os.environ["ROLODEX_SEED_DEMO"] = "0"
    os.environ["JWT_SECRET"] = "test-secret"
    get_settings.cache_clear()
    get_engine.cache_clear()

    # Reset storage proxy so it picks up new settings
    from backend import storage as storage_module  # noqa: E402

    if isinstance(storage_module._storage_proxy, _StorageProxy):  # type: ignore[attr-defined]
        storage_module._storage_proxy._instance = None  # type: ignore[attr-defined]

    app = create_app()
    dummy_storage = DummyStorage()
    app.dependency_overrides[get_storage_dependency] = lambda: dummy_storage
    app.dependency_overrides[get_auth] = lambda: AuthContext(user_id="00000000-0000-0000-0000-test-token00")
    await app.router.startup()
    yield app
    await app.router.shutdown()


@pytest.fixture()
async def client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


def _make_token(sub: str = "00000000-0000-0000-0000-test-token00") -> str:
    secret = os.environ["JWT_SECRET"]
    return jwt.encode({"sub": sub}, secret, algorithm="HS256")


def _auth_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {_make_token()}"}


@pytest.mark.anyio
async def test_create_and_list_items(client):
    payload = {
        "img_url": "https://example.com/image.jpg",
        "title": "Arched Floor Lamp",
        "vendor": "Design House",
        "price": 1200,
        "currency": "USD",
        "description": "Sculptural lamp with dimmable LED.",
        "colour_hex": "#C0A480",
        "category": "Lighting",
        "material": "Brass",
    }

    response = await client.post("/api/items", json=payload, headers=_auth_headers())
    assert response.status_code == 201
    created = response.json()
    assert created["title"] == payload["title"]

    await asyncio.sleep(0)

    list_response = await client.get("/api/items", headers=_auth_headers())
    assert list_response.status_code == 200
    listing = list_response.json()
    assert any(item["id"] == created["id"] for item in listing["items"])

    filter_response = await client.get(
        "/api/items",
        params={"query": "lamp"},
        headers=_auth_headers(),
    )
    assert filter_response.status_code == 200
    assert filter_response.json()["items"]


@pytest.mark.anyio
async def test_project_lifecycle(client):
    item_payload = {
        "img_url": "https://example.com/sofa.jpg",
        "title": "Modular Sofa",
    }
    item_res = await client.post("/api/items", json=item_payload, headers=_auth_headers())
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    project_res = await client.post(
        "/api/projects",
        json={"name": "Living Room"},
        headers=_auth_headers(),
    )
    assert project_res.status_code == 201
    project_id = project_res.json()["id"]

    add_res = await client.post(
        f"/api/projects/{project_id}/add_item",
        json={"item_id": item_id},
        headers=_auth_headers(),
    )
    assert add_res.status_code == 204

    add_again = await client.post(
        f"/api/projects/{project_id}/add_item",
        json={"item_id": item_id},
        headers=_auth_headers(),
    )
    assert add_again.status_code == 204

    project_detail = await client.get(
        f"/api/projects/{project_id}",
        headers=_auth_headers(),
    )
    assert project_detail.status_code == 200
    assert project_detail.json()["id"] == project_id

    remove_res = await client.request(
        "DELETE",
        f"/api/projects/{project_id}/remove_item",
        json={"item_id": item_id},
        headers=_auth_headers(),
    )
    assert remove_res.status_code == 204
@pytest.fixture()
def anyio_backend():
    return "asyncio"
