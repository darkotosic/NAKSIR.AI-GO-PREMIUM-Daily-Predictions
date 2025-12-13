import datetime
import pathlib
import sys
from typing import Any, Dict, List

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import tests.conftest  # noqa: F401

from backend import ai_analysis
from backend import api_football
from backend import match_full

pytest_plugins = ["tests.conftest"]


@pytest.fixture

def sample_fixture() -> Dict[str, Any]:
    return {
        "fixture": {
            "id": 123,
            "date": "2024-10-19T12:30:00Z",
            "timezone": "UTC",
            "referee": "Test Ref",
            "venue": {"id": 50, "name": "Stadium", "city": "City"},
            "status": {"short": "NS", "long": "Not Started"},
        },
        "league": {
            "id": 39,
            "name": "Premier League",
            "country": "England",
            "season": 2024,
            "round": "Regular Season",
            "logo": "league.png",
            "flag": "gb.png",
        },
        "teams": {
            "home": {"id": 10, "name": "Home", "logo": "home.png", "winner": None},
            "away": {"id": 20, "name": "Away", "logo": "away.png", "winner": None},
        },
        "goals": {"home": 0, "away": 0},
        "score": {"halftime": {"home": 0, "away": 0}},
    }


@pytest.fixture

def sample_odds_raw() -> List[Dict[str, Any]]:
    return [
        {
            "fixture": {"id": 123},
            "bookmakers": [
                {
                    "bets": [
                        {
                            "name": "Match Winner",
                            "values": [
                                {"value": "Home", "odd": "2.10"},
                                {"value": "Draw", "odd": "3.20"},
                                {"value": "Away", "odd": "3.60"},
                            ],
                        },
                        {
                            "name": "Double Chance",
                            "values": [
                                {"value": "Home/Draw", "odd": "1.45"},
                                {"value": "Draw/Away", "odd": "1.55"},
                                {"value": "Home/Away", "odd": "1.25"},
                            ],
                        },
                        {
                            "name": "Both Teams Score",
                            "values": [
                                {"value": "Yes", "odd": "1.90"},
                                {"value": "No", "odd": "1.90"},
                            ],
                        },
                        {
                            "name": "Goals Over/Under First Half",
                            "values": [
                                {"value": "Over 0.5", "odd": "1.40"},
                                {"value": "Under 0.5", "odd": "2.80"},
                            ],
                        },
                        {
                            "name": "Total - Home",
                            "values": [
                                {"value": "Over 0.5", "odd": "1.35"},
                                {"value": "Under 0.5", "odd": "2.90"},
                            ],
                        },
                        {
                            "name": "Total - Away",
                            "values": [
                                {"value": "Over 0.5", "odd": "1.60"},
                                {"value": "Under 0.5", "odd": "2.30"},
                            ],
                        },
                        {
                            "name": "Goals Over/Under",
                            "values": [
                                {"value": "Over 1.5", "odd": "1.50"},
                                {"value": "Over 2.5", "odd": "2.40"},
                                {"value": "Over 3.5", "odd": "3.80"},
                                {"value": "Under 3.5", "odd": "1.25"},
                                {"value": "Under 4.5", "odd": "1.10"},
                            ],
                        },
                    ]
                }
            ],
        }
    ]


@pytest.fixture(autouse=True)

def freeze_generated_at(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(datetime, "datetime", datetime.datetime)


def _install_fake_api(monkeypatch: pytest.MonkeyPatch, fixture: Dict[str, Any], odds_raw: List[Dict[str, Any]] | None = None) -> None:
    monkeypatch.setattr(api_football, "get_fixtures_today", lambda: [fixture])
    monkeypatch.setattr(api_football, "get_fixture_by_id", lambda _fx_id: fixture)
    monkeypatch.setattr(api_football, "get_standings", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(api_football, "get_fixture_stats", lambda _fx_id: {"shots": []})
    monkeypatch.setattr(
        api_football,
        "get_team_stats",
        lambda _league_id, _season, team_id: {"team_id": team_id, "form": "W"},
    )
    monkeypatch.setattr(
        api_football,
        "get_fixture_h2h",
        lambda *_args, **_kwargs: {"h2h": []},
        raising=False,
    )
    monkeypatch.setattr(api_football, "get_fixture_events", lambda *_args, **_kwargs: [], raising=False)
    monkeypatch.setattr(api_football, "get_fixture_lineups", lambda *_args, **_kwargs: [], raising=False)
    monkeypatch.setattr(api_football, "get_fixture_players", lambda *_args, **_kwargs: [], raising=False)
    monkeypatch.setattr(api_football, "get_fixture_predictions", lambda *_args, **_kwargs: {}, raising=False)
    monkeypatch.setattr(api_football, "get_fixture_injuries", lambda *_args, **_kwargs: [], raising=False)
    monkeypatch.setattr(api_football, "get_all_odds_for_fixture", lambda _fixture_id: odds_raw, raising=False)
    monkeypatch.setattr(
        ai_analysis,
        "run_ai_analysis",
        lambda *_, **__: {"preview": "ok", "key_factors": [], "winner_probabilities": {}},
    )



def test_health_endpoint(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_today_matches_shape(monkeypatch: pytest.MonkeyPatch, client, sample_fixture: Dict[str, Any]) -> None:
    _install_fake_api(monkeypatch, sample_fixture)

    response = client.get("/matches/today", headers={"X-API-Key": "test-token"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["fixture_id"] == 123
    assert "summary" in payload["items"][0]
    assert payload["items"][0]["summary"]["league"]["id"] == 39


def test_match_summary_route(monkeypatch: pytest.MonkeyPatch, client, sample_fixture: Dict[str, Any]) -> None:
    _install_fake_api(monkeypatch, sample_fixture)

    response = client.get("/matches/123", headers={"X-API-Key": "test-token"})

    assert response.status_code == 200
    summary = response.json()
    assert summary["fixture_id"] == 123
    assert summary["teams"]["home"]["name"] == "Home"
    assert summary["status"] == "NS"


def test_match_full_route_contract(
    monkeypatch: pytest.MonkeyPatch, client, sample_fixture: Dict[str, Any], sample_odds_raw: List[Dict[str, Any]]
) -> None:
    _install_fake_api(monkeypatch, sample_fixture, odds_raw=sample_odds_raw)

    response = client.get("/matches/123/full", headers={"X-API-Key": "test-token"})

    assert response.status_code == 200
    full = response.json()
    assert set(full.keys()) >= {
        "meta",
        "summary",
        "stats",
        "team_stats",
        "standings",
        "h2h",
        "events",
        "lineups",
        "players",
        "predictions",
        "injuries",
        "odds",
    }

    assert full["meta"]["fixture_id"] == 123
    assert full["summary"]["teams"]["home"]["id"] == 10
    assert full["odds"]["raw"]
    assert "flat" in full["odds"]
    assert "flat_probabilities" in full["odds"]



def test_build_full_match_contract(
    monkeypatch: pytest.MonkeyPatch, sample_fixture: Dict[str, Any], sample_odds_raw: List[Dict[str, Any]]
) -> None:
    _install_fake_api(monkeypatch, sample_fixture, odds_raw=sample_odds_raw)

    full_match = match_full.build_full_match(sample_fixture)

    assert full_match["meta"]["league_id"] == 39
    assert full_match["summary"]["fixture_id"] == 123
    assert isinstance(full_match["team_stats"], dict)
    assert set(full_match["team_stats"].keys()) == {"home", "away"}
    assert full_match["odds"]["summary"] is not None
    assert full_match["odds"]["flat"]["match_winner"]["home"] == 2.10
    assert "flat_probabilities" in full_match["odds"]


def test_free_reward_only_once(monkeypatch, client, sample_fixture, sample_odds_raw):
    _install_fake_api(monkeypatch, sample_fixture, odds_raw=sample_odds_raw)

    r1 = client.post(
        "/matches/123/ai-analysis",
        headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-1"},
        json={"trial_by_reward": True},
    )
    assert r1.status_code in (200, 202)

    r2 = client.post(
        "/matches/123/ai-analysis",
        headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-1"},
        json={"trial_by_reward": True},
    )
    assert r2.status_code == 402


def test_daily_limit_blocks_after_limit(
    monkeypatch: pytest.MonkeyPatch, client, sample_fixture, sample_odds_raw, entitlement_factory
):
    _install_fake_api(monkeypatch, sample_fixture, odds_raw=sample_odds_raw)

    entitlement_factory(install_id="dev-install-2", daily_limit=5, expires_in_days=1)

    for _ in range(5):
        r = client.post(
            "/matches/123/ai-analysis",
            headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-2"},
            json={"trial_by_reward": False},
        )
        assert r.status_code in (200, 202)

    r6 = client.post(
        "/matches/123/ai-analysis",
        headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-2"},
        json={"trial_by_reward": False},
    )
    assert r6.status_code == 429
