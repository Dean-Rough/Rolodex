from fastapi.testclient import TestClient
from backend.main import app


client = TestClient(app)


def test_health_endpoint_exists():
    r = client.get("/health")
    assert r.status_code == 200
    assert "status" in r.json()

