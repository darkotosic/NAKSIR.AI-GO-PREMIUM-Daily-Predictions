from typing import Any, Dict

from backend import api_football
from backend import app as backend_app


def test_health_open(client):
    response = client.get("/health", headers={"X-API-Key": "test-token"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_requires_api_key(client):
    response = client.get("/matches/today")
    assert response.status_code == 401
    assert response.json()["detail"]


def test_debug_routes_with_key(client):
    response = client.get("/_debug/routes", headers={"X-API-Key": "test-token"})
    assert response.status_code == 200
    payload = response.json()
    assert any(route["path"] == "/health" for route in payload)


def test_today_matches_smoke(monkeypatch, client):
    def fake_get_fixtures_next_days(*_args, **_kwargs) -> list[Dict[str, Any]]:
        return [
            {
                "fixture": {"id": 1},
                "league": {"id": 39, "season": 2024},
                "teams": {
                    "home": {"id": 10, "name": "Home"},
                    "away": {"id": 20, "name": "Away"},
                },
            }
        ]

    monkeypatch.setattr(backend_app, "get_fixtures_next_days", fake_get_fixtures_next_days)
    monkeypatch.setattr(api_football, "get_fixtures_next_days", fake_get_fixtures_next_days)
    monkeypatch.setattr(backend_app, "get_standings", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(backend_app, "build_match_summary", lambda _fixture: {"league": {"id": 39, "season": 2024}, "teams": {"home": {"id": 10}, "away": {"id": 20}}})

    response = client.get("/matches/today", headers={"X-API-Key": "test-token"})
    assert response.status_code == 200
    body = response.json()
    assert body["items"]
    assert body["items"][0]["summary"]["league"]["id"] == 39


def test_today_matches_with_key_returns_200(monkeypatch, client):
    monkeypatch.setattr(backend_app, "get_fixtures_next_days", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(api_football, "get_fixtures_next_days", lambda *_args, **_kwargs: [])

    response = client.get("/matches/today", headers={"X-API-Key": "test-token"})
    assert response.status_code == 200
