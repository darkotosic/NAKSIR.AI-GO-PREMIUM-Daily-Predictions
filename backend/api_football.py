from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional

import requests

from .config import BASE_URL, HEADERS, ALLOW_LIST, SKIP_STATUS, SEASON, TIMEZONE


class ApiFootballError(RuntimeError):
    pass


def _get(path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{BASE_URL}{path}"
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=25)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ApiFootballError(f"API request failed: {exc}") from exc

    data = resp.json()
    if data.get("errors"):
        raise ApiFootballError(str(data["errors"]))
    return data


# ---------- Core fetchers ----------


def get_fixtures_today() -> List[Dict[str, Any]]:
    """Return today's fixtures for the allow‑listed leagues.

    This is the backbone for Layer 1. It calls `/fixtures` once with
    date + timezone and then filters in Python, to keep API usage efficient.
    """
    today = dt.date.today().isoformat()
    raw = _get(
        "/fixtures",
        {
            "date": today,
            "timezone": TIMEZONE,
        },
    )
    fixtures: List[Dict[str, Any]] = raw.get("response", [])

    result: List[Dict[str, Any]] = []
    for item in fixtures:
        league = item.get("league", {}) or {}
        fixture = item.get("fixture", {}) or {}
        league_id = league.get("id")
        status_short = (fixture.get("status") or {}).get("short")

        if league_id not in ALLOW_LIST:
            continue
        if status_short in SKIP_STATUS:
            continue
        result.append(item)
    return result


def get_fixture_by_id(fixture_id: int) -> Optional[Dict[str, Any]]:
    raw = _get("/fixtures", {"id": fixture_id, "timezone": TIMEZONE})
    items = raw.get("response", [])
    return items[0] if items else None


def get_team_stats(league_id: int, team_id: int) -> Dict[str, Any]:
    raw = _get(
        "/teams/statistics",
        {"league": league_id, "season": SEASON, "team": team_id},
    )
    return raw.get("response", {})


def get_standings(league_id: int) -> List[Dict[str, Any]]:
    raw = _get("/standings", {"league": league_id, "season": SEASON})
    return raw.get("response", [])


def get_h2h(home_id: int, away_id: int, last: int = 5) -> List[Dict[str, Any]]:
    raw = _get(
        "/fixtures/headtohead",
        {"h2h": f"{home_id}-{away_id}", "last": last, "timezone": TIMEZONE},
    )
    return raw.get("response", [])


def get_injuries(league_id: int, team_id: int) -> List[Dict[str, Any]]:
    raw = _get(
        "/injuries",
        {"league": league_id, "season": SEASON, "team": team_id},
    )
    return raw.get("response", [])


def get_fixture_stats(fixture_id: int) -> List[Dict[str, Any]]:
    raw = _get("/fixtures/statistics", {"fixture": fixture_id})
    return raw.get("response", [])


def get_predictions(fixture_id: int) -> List[Dict[str, Any]]:
    raw = _get("/predictions", {"fixture": fixture_id})
    return raw.get("response", [])


def get_odds_for_fixture(fixture_id: int, page: int = 1) -> List[Dict[str, Any]]:
    raw = _get("/odds", {"fixture": fixture_id, "page": page})
    return raw.get("response", [])


# Optional: helper to try a second odds page if the first one is empty.
def get_all_odds_for_fixture(fixture_id: int, max_pages: int = 3) -> List[Dict[str, Any]]:
    all_rows: List[Dict[str, Any]] = []
    for page in range(1, max_pages + 1):
        data = get_odds_for_fixture(fixture_id, page=page)
        if not data:
            break
        all_rows.extend(data)
    return all_rows
