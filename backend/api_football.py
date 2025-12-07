import requests
from datetime import date
from typing import Any, Dict, List

from .config import BASE_URL, HEADERS, ALLOW_LIST, SKIP_STATUS


def _get(path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{BASE_URL}{path}"
    resp = requests.get(url, headers=HEADERS, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return data


def get_fixtures_today() -> List[Dict[str, Any]]:
    """Vraca listu fixture objekata za danas (samo allow list lige, bez skip statusa)."""
    today = date.today().isoformat()
    data = _get("/fixtures", {"date": today})
    fixtures = data.get("response", [])

    filtered = []
    for fx in fixtures:
        league_id = fx.get("league", {}).get("id")
        status = fx.get("fixture", {}).get("status", {}).get("short")
        if league_id not in ALLOW_LIST:
            continue
        if status in SKIP_STATUS:
            continue
        filtered.append(fx)
    return filtered


def get_odds_for_fixture(fixture_id: int) -> Dict[str, Any]:
    data = _get("/odds", {"fixture": fixture_id})
    return data.get("response", [])


def get_team_stats(league_id: int, season: int, team_id: int) -> Dict[str, Any]:
    data = _get("/teams/statistics", {
        "league": league_id,
        "season": season,
        "team": team_id,
    })
    return data.get("response", {})


def get_standings(league_id: int, season: int) -> Dict[str, Any]:
    data = _get("/standings", {"league": league_id, "season": season})
    return data.get("response", [])


def get_h2h(home_id: int, away_id: int, last: int = 5) -> Dict[str, Any]:
    data = _get("/fixtures/headtohead", {"h2h": f"{home_id}-{away_id}", "last": last})
    return data.get("response", [])


def get_injuries(league_id: int, season: int, team_id: int) -> Dict[str, Any]:
    data = _get("/injuries", {"league": league_id, "season": season, "team": team_id})
    return data.get("response", [])


def get_fixture_stats(fixture_id: int) -> Dict[str, Any]:
    data = _get("/fixtures/statistics", {"fixture": fixture_id})
    return data.get("response", [])

def get_fixture_by_id(fixture_id: int) -> List[Dict[str, Any]]:
    data = _get("/fixtures", {"id": fixture_id})
    return data.get("response", [])

