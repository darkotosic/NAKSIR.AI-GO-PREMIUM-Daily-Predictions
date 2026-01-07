from __future__ import annotations

import logging
import time
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Deque, Dict, List, Optional

import requests
from zoneinfo import ZoneInfo

from .config import (
    API_FOOTBALL_BASE_URL,
    HEADERS,
    TIMEZONE,
    ALLOW_LIST,
    SKIP_STATUS,
)

from .cache import (
    begin_inflight,
    cache_get,
    cache_set,
    make_cache_key,
    resolve_inflight,
    wait_for_inflight,
)
from .observability import add_api_ms, add_upstream_call

logger = logging.getLogger("naksir.go_premium.api_football")

DEFAULT_TIMEOUT = 15  # seconds
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_THRESHOLD = 5
MAX_BACKOFF = 10

SESSION = requests.Session()
RATE_LIMIT_EVENTS: Deque[float] = deque()
LAST_FIXTURES_NEXT_FETCH: float | None = None
LAST_FIXTURES_NEXT_ERROR: str | None = None


# ---------------------------------------------------------------------------
# Core HTTP helper
# ---------------------------------------------------------------------------


def _build_url(endpoint: str) -> str:
    endpoint = endpoint.lstrip("/")
    base = API_FOOTBALL_BASE_URL.rstrip("/")
    return f"{base}/{endpoint}"


def _prune_rate_limits(now: float) -> None:
    while RATE_LIMIT_EVENTS and RATE_LIMIT_EVENTS[0] < now - RATE_LIMIT_WINDOW:
        RATE_LIMIT_EVENTS.popleft()


def _get_ttl_for_endpoint(endpoint: str) -> int:
    endpoint = endpoint.strip("/")
    if endpoint == "fixtures":
        return 45
    if endpoint == "standings":
        return 6 * 60 * 60
    if endpoint == "teams/statistics":
        return 6 * 60 * 60
    if endpoint == "fixtures/headtohead":
        return 6 * 60 * 60
    if endpoint == "odds":
        return 120
    if endpoint in {
        "fixtures/events",
        "fixtures/lineups",
        "fixtures/players",
        "injuries",
        "predictions",
    }:
        return 10 * 60
    if endpoint == "fixtures/statistics":
        return 10 * 60
    return 0


def _circuit_open(endpoint: str) -> bool:
    now = time.time()
    _prune_rate_limits(now)
    if endpoint.strip("/") == "fixtures":
        return False
    return len(RATE_LIMIT_EVENTS) >= RATE_LIMIT_THRESHOLD


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
    cache_key = make_cache_key(endpoint, params)
    cached = cache_get(cache_key)

    if cached and _circuit_open(endpoint):
        logger.warning("API-Football circuit open for %s, serving cached payload", endpoint)
        return cached
    if _circuit_open(endpoint):
        logger.warning("API-Football circuit open for %s, no cache available", endpoint)
        return cached or {}

    if cached:
        return cached

    inflight, owns_execution = begin_inflight(cache_key)
    if not owns_execution:
        try:
            return wait_for_inflight(inflight)
        except Exception:
            if safe:
                return cached or {}
            raise

    backoff_seconds = 1
    try:
        while True:
            start_call = time.perf_counter()
            add_upstream_call()
            try:
                resp = SESSION.get(
                    url, headers=HEADERS, params=params, timeout=DEFAULT_TIMEOUT
                )
            except Exception as exc:  # network / timeout / SSL...
                add_api_ms((time.perf_counter() - start_call) * 1000)
                logger.warning(
                    "API-Football request failed (%s, params=%s): %s",
                    endpoint,
                    params,
                    exc,
                )
                if safe:
                    resolve_inflight(inflight, value=cached or {})
                    return cached or {}
                resolve_inflight(inflight, error=exc)
                raise

            add_api_ms((time.perf_counter() - start_call) * 1000)
            if resp.status_code == 429:
                RATE_LIMIT_EVENTS.append(time.time())
                if cached:
                    logger.warning(
                        "API-Football 429 for %s params=%s; serving cached payload", endpoint, params
                    )
                    resolve_inflight(inflight, value=cached)
                    return cached
                if backoff_seconds > MAX_BACKOFF:
                    message = f"API-Football rate limited {endpoint} beyond backoff"
                    logger.warning(message)
                    if safe:
                        resolve_inflight(inflight, value=cached or {})
                        return cached or {}
                    error = RuntimeError(message)
                    resolve_inflight(inflight, error=error)
                    raise error
                time.sleep(backoff_seconds)
                backoff_seconds = min(backoff_seconds * 2, MAX_BACKOFF)
                continue

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
                    resolve_inflight(inflight, value=cached or {})
                    return cached or {}
                try:
                    resp.raise_for_status()
                except Exception as exc:  # noqa: BLE001
                    resolve_inflight(inflight, error=exc)
                    raise

            try:
                data = resp.json()
            except ValueError as exc:  # noqa: BLE001
                logger.warning(
                    "API-Football invalid JSON for %s params=%s: %s",
                    endpoint,
                    params,
                    exc,
                )
                if safe:
                    resolve_inflight(inflight, value=cached or {})
                    return cached or {}
                resolve_inflight(inflight, error=exc)
                raise

            ttl = _get_ttl_for_endpoint(endpoint)
            if data:
                cache_set(cache_key, data, ttl)
            resolve_inflight(inflight, value=data or {})
            return data or {}
    finally:
        resolve_inflight(inflight, value=cached or {})


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


def get_fixtures_next_days(days: int = 2, timezone: str | None = None) -> List[Dict[str, Any]]:
    """
    Vrati fixture-e za danas + naredne (days-1) dane.

    days=2 => danas + sutra.
    """
    tz_name = timezone or TIMEZONE
    today = datetime.now(ZoneInfo(tz_name)).date()
    merged: List[Dict[str, Any]] = []
    seen: set[int] = set()

    global LAST_FIXTURES_NEXT_FETCH, LAST_FIXTURES_NEXT_ERROR
    try:
        for offset in range(max(1, days)):
            day = today + timedelta(days=offset)
            fixtures = get_fixtures_by_date(day.isoformat())
            for fx in fixtures:
                fixture_id = (fx.get("fixture") or {}).get("id")
                if fixture_id is not None:
                    try:
                        fixture_id = int(fixture_id)
                    except (TypeError, ValueError):
                        fixture_id = None
                if fixture_id is not None:
                    if fixture_id in seen:
                        continue
                    seen.add(fixture_id)
                merged.append(fx)
    except Exception as exc:  # noqa: BLE001
        LAST_FIXTURES_NEXT_ERROR = str(exc)
        raise

    merged.sort(key=lambda f: (f.get("fixture", {}).get("date") or ""))
    LAST_FIXTURES_NEXT_FETCH = time.time()
    LAST_FIXTURES_NEXT_ERROR = None
    return merged


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
    "get_fixtures_next_days",
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
