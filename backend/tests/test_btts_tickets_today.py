from __future__ import annotations

from datetime import datetime, timezone

import pytest

from backend.services import btts_service


@pytest.fixture
def sample_btts_fixtures() -> list[dict[str, object]]:
    kickoff = datetime(2024, 10, 19, 12, 30, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    yes_stats = {
        "home_scored_avg_5": 1.3,
        "away_scored_avg_5": 1.3,
        "home_conceded_avg_5": 1.1,
        "away_conceded_avg_5": 1.1,
        "both_btts_rate_10": 0.6,
        "under_tendency": 0.3,
    }
    no_stats = {
        "home_scored_avg_5": 0.9,
        "away_scored_avg_5": 0.9,
        "home_conceded_avg_5": 0.8,
        "away_conceded_avg_5": 0.8,
        "both_btts_rate_10": 0.4,
        "under_tendency": 0.7,
    }
    return [
        {
            "fixture": {"id": 101, "date": kickoff, "status": {"short": "NS"}},
            "league": {"id": 39, "name": "Premier League", "logo": "league.png"},
            "teams": {
                "home": {"id": 10, "name": "Home A", "logo": "home.png"},
                "away": {"id": 20, "name": "Away A", "logo": "away.png"},
            },
            "odds": {"btts_yes": 1.42},
            "stats": yes_stats,
        },
        {
            "fixture": {"id": 102, "date": kickoff, "status": {"short": "NS"}},
            "league": {"id": 78, "name": "Bundesliga", "logo": "league.png"},
            "teams": {
                "home": {"id": 11, "name": "Home B", "logo": "home.png"},
                "away": {"id": 21, "name": "Away B", "logo": "away.png"},
            },
            "odds": {"btts_yes": 1.5},
            "stats": yes_stats,
        },
        {
            "fixture": {"id": 201, "date": kickoff, "status": {"short": "NS"}},
            "league": {"id": 140, "name": "La Liga", "logo": "league.png"},
            "teams": {
                "home": {"id": 12, "name": "Home C", "logo": "home.png"},
                "away": {"id": 22, "name": "Away C", "logo": "away.png"},
            },
            "odds": {"btts_no": 1.35},
            "stats": no_stats,
        },
        {
            "fixture": {"id": 202, "date": kickoff, "status": {"short": "NS"}},
            "league": {"id": 135, "name": "Serie A", "logo": "league.png"},
            "teams": {
                "home": {"id": 13, "name": "Home D", "logo": "home.png"},
                "away": {"id": 23, "name": "Away D", "logo": "away.png"},
            },
            "odds": {"btts_no": 1.5},
            "stats": no_stats,
        },
    ]


def test_btts_tickets_today(monkeypatch: pytest.MonkeyPatch, client, sample_btts_fixtures) -> None:
    monkeypatch.setattr(btts_service, "get_btts_today_fixtures", lambda: sample_btts_fixtures)

    response = client.get(
        "/btts/tickets/today",
        headers={"X-API-Key": "test-token", "X-App-Id": "btts.predictor"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "yes_ticket" in data
    assert "no_ticket" in data
    assert data["yes_ticket"]["type"] == "BTTS_YES"
    assert data["no_ticket"]["type"] == "BTTS_NO"
