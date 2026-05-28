"""Smoke test del endpoint /api/v1/health."""


def test_health_endpoint_devuelve_ok(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "oncascan-api"


def test_root_devuelve_mensaje(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "OncaScan" in response.json().get("message", "")
