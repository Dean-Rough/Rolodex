import os
import pathlib
import sys

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import httpx
import pytest

from backend.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def _request(path: str) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.get(path)


@pytest.mark.anyio
async def test_health_endpoint_exists():
    response = await _request("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "error"}


@pytest.mark.anyio
async def test_root_health_alias():
    response = await _request("/")
    assert response.status_code == 200
    assert "status" in response.json()

