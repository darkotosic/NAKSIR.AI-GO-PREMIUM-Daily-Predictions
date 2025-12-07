from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .api_football import ApiFootballError, _get, get_all_odds_for_fixture
from .config import SEASON, TIMEZONE

logger = logging.getLogger("naksir.go_premium.match_full")


def _get_fixture_or_error(fixture_id: int) -> Dict[str, Any]:
    """
    Učita jedan fixture iz /fixtures. Ako ga nema → ApiFootballError.
    """
    raw = _get("/fixtures", {"id": fixture_id, "timezone": TIMEZONE})
    resp = raw.get("response", [])
    if not resp:
        raise ApiFootballError(f"Fixture {fixture_id} not found")
    return resp[0]


def _safe_call(label: str, fn, *args, default=None, **kwargs):
    """
    Helper da ne rušimo ceo endpoint ako neki dodatni API call padne.
    Samo zaloguje i vrati default.
    """
    try:
        return fn(*args, **kwargs)
    except ApiFootballError as exc:
        logger.warning(
            "FULL_VIEW: %s failed for args=%s kwargs=%s → %s",
            label,
            args,
            kwargs,
            exc,
        )
        return default
    except Exception as exc:  # bilo šta neočekivano
        logger.exception("FULL_VIEW: unexpected error in %s: %s", label, exc)
        return default


def _extract_ids(fixture: Dict[str, Any]):
    league = fixture.get("league") or {}
    teams = fixture.get("teams") or {}
    home = (teams.get("home") or {})
    away = (teams.get("away") or {})

    league_id = league.get("id")
    season = league.get("season") or SEASON
    home_id = home.get("id")
    away_id = away.get("id")

    return league_id, season, home_id, away_id


def build_full_match_view(fixture_id: int) -> Dict[str, Any]:
    """
    Glavna funkcija koju zove ruta /matches/{fixture_id}/full.

    Vraća jedan veliki dict sa:
      - fixture osnovnim podacima
      - odds (svi dostupni)
      - h2h (poslednjih 10 mečeva)
      - home_stats, away_stats
      - standings
    Sve sporedne stvari su "best effort" – ako nešto pukne, samo je None/prazno.
    """
    # 1) Osnovni fixture mora da postoji → inače 404 / 502 iz rute.
    fixture = _get_fixture_or_error(fixture_id)
    league_id, season, home_id, away_id = _extract_ids(fixture)

    # 2) Odds (možemo mirno da ih preskočimo ako nema)
    odds_rows: List[Dict[str, Any]] = _safe_call(
        "odds",
        get_all_odds_for_fixture,
        fixture_id,
        default=[],
    )

    # 3) H2H – poslednjih 10 mečeva home vs away
    h2h_raw = None
    if home_id and away_id:
        h2h_raw = _safe_call(
            "h2h",
            _get,
            "/fixtures/headtohead",
            {"h2h": f"{home_id}-{away_id}", "last": 10, "timezone": TIMEZONE},
            default=None,
        )
    h2h_list = []
    if isinstance(h2h_raw, dict):
        h2h_list = h2h_raw.get("response") or []

    # 4) Team statistics – home i away (ovo znaju da blokiraju planovi)
    home_stats_raw = None
    if home_id and league_id:
        home_stats_raw = _safe_call(
            "home_stats",
            _get,
            "/teams/statistics",
            {"team": home_id, "league": league_id, "season": season},
            default=None,
        )

    away_stats_raw = None
    if away_id and league_id:
        away_stats_raw = _safe_call(
            "away_stats",
            _get,
            "/teams/statistics",
            {"team": away_id, "league": league_id, "season": season},
            default=None,
        )

    # 5) Standings – takođe mogu da budu zaključane na jeftinijim planovima
    standings_raw = None
    if league_id:
        standings_raw = _safe_call(
            "standings",
            _get,
            "/standings",
            {"league": league_id, "season": season},
            default=None,
        )

    # Lepo očistimo response da front dobije čiste listove/dict-ove
    def _unwrap_response(x: Any) -> Any:
        if isinstance(x, dict) and "response" in x:
            return x.get("response")
        return x

    return {
        "fixture_id": fixture_id,
        "fixture": fixture,
        "odds": odds_rows,
        "h2h": h2h_list,
        "home_stats": _unwrap_response(home_stats_raw),
        "away_stats": _unwrap_response(away_stats_raw),
        "standings": _unwrap_response(standings_raw),
    }
