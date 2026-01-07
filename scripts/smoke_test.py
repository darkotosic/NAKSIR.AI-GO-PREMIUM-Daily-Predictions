from __future__ import annotations

import os
from typing import Any, Dict, List

from fastapi.testclient import TestClient

from backend import ai_analysis
from backend import api_football
from backend.main import create_app


def _sample_fixture() -> Dict[str, Any]:
    return {
        "fixture": {
            "id": 123,
            "date": "2024-10-19T12:30:00Z",
            "timezone": "UTC",
            "referee": "Smoke Ref",
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


def _sample_odds_raw() -> List[Dict[str, Any]]:
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
                        }
                    ]
                }
            ],
        }
    ]


def _install_fake_api(fixture: Dict[str, Any], odds_raw: List[Dict[str, Any]]) -> None:
    setattr(api_football, "get_fixtures_next_days", lambda *_args, **_kwargs: [fixture])
    setattr(api_football, "get_fixtures_today", lambda: [fixture])
    setattr(api_football, "get_fixture_by_id", lambda _fx_id: fixture)
    setattr(api_football, "get_standings", lambda *_args, **_kwargs: [])
    setattr(api_football, "get_fixture_stats", lambda _fx_id: {"shots": []})
    setattr(
        api_football,
        "get_team_stats",
        lambda _league_id, _season, team_id: {
        "team_id": team_id,
        "form": "W",
        },
    )
    setattr(api_football, "get_fixture_h2h", lambda *_args, **_kwargs: {"h2h": []})
    setattr(api_football, "get_fixture_events", lambda *_args, **_kwargs: [])
    setattr(api_football, "get_fixture_lineups", lambda *_args, **_kwargs: [])
    setattr(api_football, "get_fixture_players", lambda *_args, **_kwargs: [])
    setattr(api_football, "get_fixture_predictions", lambda *_args, **_kwargs: {})
    setattr(api_football, "get_fixture_injuries", lambda *_args, **_kwargs: [])
    setattr(api_football, "get_all_odds_for_fixture", lambda _fixture_id: odds_raw)
    setattr(ai_analysis, "run_ai_analysis", lambda *_, **__: {
        "preview": "ok",
        "key_factors": [],
        "winner_probabilities": {},
    })


def main() -> int:
    os.environ.setdefault("APP_ENV", "dev")
    os.environ.setdefault("API_AUTH_TOKENS", "test-token")
    os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost")
    os.environ.setdefault("USE_FAKE_REDIS", "true")

    fixture = _sample_fixture()
    odds_raw = _sample_odds_raw()
    _install_fake_api(fixture, odds_raw)

    app = create_app()
    client = TestClient(app)

    health = client.get("/health")
    if health.status_code != 200:
        print("/health failed", health.status_code, health.text)
        return 1

    today = client.get("/matches/today", headers={"X-API-Key": "test-token"})
    if today.status_code != 200:
        print("/matches/today failed", today.status_code, today.text)
        return 1

    full = client.get("/matches/123/full", headers={"X-API-Key": "test-token"})
    if full.status_code != 200:
        print("/matches/123/full failed", full.status_code, full.text)
        return 1

    print("Smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
