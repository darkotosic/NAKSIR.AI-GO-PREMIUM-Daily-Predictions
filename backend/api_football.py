from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from zoneinfo import ZoneInfo

from .config import (
    API_FOOTBALL_BASE_URL,
    HEADERS,
    TIMEZONE,
    ALLOW_LIST,
    SKIP_STATUS,
)

logger = logging.getLogger("naksir.go_premium.api_football")

DEFAULT_TIMEOUT = 15  # seconds


# ---------------------------------------------------------------------------
# Core HTTP helper
# ---------------------------------------------------------------------------


def _build_url(endpoint: str) -> str:
    endpoint = endpoint.lstrip("/")
    base = API_FOOTBALL_BASE_URL.rstrip("/")
    return f"{base}/{endpoint}"


def _call_api(
    endpoint: str,
    params: Optional[Dict[str, Any]] = None,
    *,
    safe: bool = True,
) -> Dict[str, Any]:
    """
    Low–level wrapper oko API-FOOTBALL poziva.

    Ako je `safe=True`, greške se loguju i vraća se prazan dict umesto exception-a.
    Ovo je bitno za opcione blokove u `/matches/{fixture_id}/full` – bolje da jedan
    blok izostane nego da cela ruta pukne.
    """
    params = dict(params or {})
    url = _build_url(endpoint)

    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=DEFAULT_TIMEOUT)
    except Exception as exc:  # network / timeout / SSL...
        logger.warning(
            "API-Football request failed (%s, params=%s): %s",
            endpoint,
            params,
            exc,
        )
        if safe:
            return {}
        raise

    if resp.status_code != 200:
        snippet = resp.text[:500].replace("\n", " ")
        logger.warning(
            "API-Football non-200 (%s) for %s params=%s: %s",
            resp.status_code,
            endpoint,
            params,
            snippet,
        )
        if safe:
            return {}
        resp.raise_for_status()

    try:
        data = resp.json()
    except ValueError as exc:
        logger.warning(
            "API-Football invalid JSON for %s params=%s: %s",
            endpoint,
            params,
            exc,
        )
        if safe:
            return {}
        raise

    return data or {}


def _extract_response_list(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    resp = payload.get("response")
    if isinstance(resp, list):
        return resp
    return []


def _extract_response_first(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    items = _extract_response_list(payload)
    return items[0] if items else None


# ---------------------------------------------------------------------------
# Fixtures – baza za sve ostalo
# ---------------------------------------------------------------------------


def _today_str() -> str:
    tz = ZoneInfo(TIMEZONE)
    return datetime.now(tz).strftime("%Y-%m-%d")


def get_fixtures_by_date(date_str: str) -> List[Dict[str, Any]]:
    """
    Dohvati sve fixture-e za zadati datum i filtriraj po:
    - ALLOW_LIST (dozvoljene lige)
    - SKIP_STATUS (statusi koje ignorišemo – FT, PST, CANC...)
    """
    data = _call_api(
        "fixtures",
        {"date": date_str, "timezone": TIMEZONE},
        safe=False,  # core feed – ako ovo padne, neka endpoint pukne
    )
    fixtures = _extract_response_list(data)

    filtered: List[Dict[str, Any]] = []
    for fx in fixtures:
        league = fx.get("league") or {}
        fixture_info = fx.get("fixture") or {}
        status_info = fixture_info.get("status") or {}

        league_id = league.get("id")
        status_short = (status_info.get("short") or "").upper()

        if league_id not in ALLOW_LIST:
            continue
        if status_short in SKIP_STATUS:
            continue

        filtered.append(fx)

    filtered.sort(
        key=lambda f: (f.get("fixture", {}).get("date") or ""),
    )
    return filtered


def get_fixtures_today() -> List[Dict[str, Any]]:
    """Public helper: svi *dozvoljeni* fixture-i za današnji dan."""
    return get_fixtures_by_date(_today_str())


def get_fixture_by_id(fixture_id: int) -> Optional[Dict[str, Any]]:
    """
    Dohvati jedan fixture po ID-u.

    Ako je liga van ALLOW_LIST, i dalje vraćamo – front/AI odlučuje šta radi sa tim.
    """
    data = _call_api(
        "fixtures",
        {"id": fixture_id, "timezone": TIMEZONE},
        safe=True,
    )
    return _extract_response_first(data)


# ---------------------------------------------------------------------------
# Context helpers – koriste se u match_full.build_full_match
# ---------------------------------------------------------------------------


def get_fixture_stats(fixture_id: int) -> List[Dict[str, Any]]:
    """
    /fixtures/statistics

    [
      {"team": {...}, "statistics": [...]},
      {"team": {...}, "statistics": [...]}
    ]
    """
    data = _call_api("fixtures/statistics", {"fixture": fixture_id}, safe=True)
    return _extract_response_list(data)


def get_team_stats(league_id: int, season: int, team_id: int) -> Optional[Dict[str, Any]]:
    """
    /teams/statistics – agregirane timske statistike za ligu+sezonu.
    """
    data = _call_api(
        "teams/statistics",
        {"league": league_id, "season": season, "team": team_id},
        safe=True,
    )
    return _extract_response_first(data)


def get_standings(league_id: int, season: int) -> List[Dict[str, Any]]:
    """
    /standings – tabela lige (raw JSON).
    """
    data = _call_api(
        "standings",
        {"league": league_id, "season": season},
        safe=True,
    )
    return _extract_response_list(data)


def get_h2h(
    fixture_id: int,
    team_home_id: int,
    team_away_id: int,
    last: int = 10,
) -> Dict[str, Any]:
    """
    /fixtures/headtohead – poslednji međusobni dueli.
    """
    h2h_param = f"{team_home_id}-{team_away_id}"
    data = _call_api(
        "fixtures/headtohead",
        {"h2h": h2h_param, "last": last, "timezone": TIMEZONE},
        safe=True,
    )
    return {
        "fixture_id": fixture_id,
        "h2h_param": h2h_param,
        "matches": _extract_response_list(data),
    }


def get_events_for_fixture(fixture_id: int) -> List[Dict[str, Any]]:
    """
    /fixtures/events – svi događaji (golovi, kartoni, izmene...).
    """
    data = _call_api("fixtures/events", {"fixture": fixture_id}, safe=True)
    return _extract_response_list(data)


def get_lineups_for_fixture(fixture_id: int) -> List[Dict[str, Any]]:
    """
    /fixtures/lineups – formacije, startne postave, klupe.
    """
    data = _call_api("fixtures/lineups", {"fixture": fixture_id}, safe=True)
    return _extract_response_list(data)


def _get_players_page(fixture_id: int, page: int) -> Dict[str, Any]:
    return _call_api(
        "fixtures/players",
        {"fixture": fixture_id, "page": page},
        safe=True,
    )


def get_players_for_fixture(fixture_id: int, page: int = 1) -> Dict[str, Any]:
    """
    Jedna strana `/fixtures/players` rezultata (sa `paging`).
    """
    return _get_players_page(fixture_id, page)


def get_all_players_for_fixture(fixture_id: int) -> List[Dict[str, Any]]:
    """
    Iterira kroz sve strane `/fixtures/players` i vraća jedan spojen niz.
    """
    first_page = _get_players_page(fixture_id, page=1)
    players: List[Dict[str, Any]] = _extract_response_list(first_page)

    paging = first_page.get("paging") or {}
    current = int(paging.get("current") or 1)
    total = int(paging.get("total") or 1)

    while current < total:
        current += 1
        page_payload = _get_players_page(fixture_id, page=current)
        players.extend(_extract_response_list(page_payload))

    return players


def get_predictions(fixture_id: int) -> Optional[Dict[str, Any]]:
    """
    /predictions – predikcije koje daje API-FOOTBALL.
    """
    data = _call_api("predictions", {"fixture": fixture_id}, safe=True)
    return _extract_response_first(data)


def get_injuries(fixture_id: int) -> List[Dict[str, Any]]:
    """
    /injuries – povrede vezane za dati fixture (ako ih ima).
    """
    data = _call_api("injuries", {"fixture": fixture_id}, safe=True)
    return _extract_response_list(data)


def _get_odds_page(fixture_id: int, page: int) -> Dict[str, Any]:
    return _call_api(
        "odds",
        {"fixture": fixture_id, "page": page},
        safe=True,
    )


def get_odds_for_fixture(fixture_id: int, page: int = 1) -> Dict[str, Any]:
    """
    Jedna strana `/odds` rezultata (sa `paging`).
    """
    return _get_odds_page(fixture_id, page)


def get_all_odds_for_fixture(fixture_id: int) -> List[Dict[str, Any]]:
    """
    Iterira kroz sve strane `/odds` za dati fixture.
    """
    first_page = _get_odds_page(fixture_id, page=1)
    odds: List[Dict[str, Any]] = _extract_response_list(first_page)

    paging = first_page.get("paging") or {}
    current = int(paging.get("current") or 1)
    total = int(paging.get("total") or 1)

    while current < total:
        current += 1
        page_payload = _get_odds_page(fixture_id, page=current)
        odds.extend(_extract_response_list(page_payload))

    return odds


# ---------------------------------------------------------------------------
# Backwards-compatibility aliases
# ---------------------------------------------------------------------------

# Ako je negde ostalo staro ime helpera – sve i dalje radi:
get_predictions_for_fixture = get_predictions
get_injuries_for_fixture = get_injuries
get_events = get_events_for_fixture
get_lineups = get_lineups_for_fixture
get_odds = get_odds_for_fixture

__all__ = [
    # core
    "get_fixtures_by_date",
    "get_fixtures_today",
    "get_fixture_by_id",
    # context helpers
    "get_fixture_stats",
    "get_team_stats",
    "get_standings",
    "get_h2h",
    "get_events_for_fixture",
    "get_lineups_for_fixture",
    "get_players_for_fixture",
    "get_all_players_for_fixture",
    "get_predictions",
    "get_injuries",
    "get_odds_for_fixture",
    "get_all_odds_for_fixture",
    # aliases
    "get_predictions_for_fixture",
    "get_injuries_for_fixture",
    "get_events",
    "get_lineups",
    "get_odds",
]
