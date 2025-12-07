from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from . import api_football
from .config import TIMEZONE
from .odds_normalizer import normalize_odds

logger = logging.getLogger("naksir.go_premium.match_full")

# Zapamtimo koje helpere nemamo da ne spamujemo log svaki put
_MISSING_HELPERS: set[str] = set()


# ---------------------------------------------------------------------
# Interni helperi
# ---------------------------------------------------------------------


def _safe_call(label: str, func: Optional[callable], *args: Any, **kwargs: Any) -> Any:
    """
    Wrapper oko API-Football helpera.

    - Ako helper ne postoji u ovom buildu -> WARNING samo prvi put, vraća None.
    - Ako baci exception -> WARNING i vraća None.
    """
    if func is None:
        if label not in _MISSING_HELPERS:
            logger.warning(
                "match_full: helper '%s' not available in this build", label
            )
            _MISSING_HELPERS.add(label)
        return None

    try:
        return func(*args, **kwargs)
    except Exception as exc:  # noqa: BLE001
        logger.warning("match_full: %s failed: %s", label, exc)
        return None


def _get_fixture_core(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """Bezbedno izvuci core sekcije iz API-Football fixture objekta."""
    fx = fixture.get("fixture") or {}
    league = fixture.get("league") or {}
    teams = fixture.get("teams") or {}
    goals = fixture.get("goals") or {}
    score = fixture.get("score") or {}

    venue = fx.get("venue") or {}
    status = fx.get("status") or {}

    return {
        "fixture": fx,
        "league": league,
        "teams": teams,
        "goals": goals,
        "score": score,
        "venue": venue,
        "status": status,
    }


# ---------------------------------------------------------------------
# Public: summary za kartice
# ---------------------------------------------------------------------


def build_match_summary(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """
    Jedan "card" za front.

    Ovaj format se koristi i u:
    - GET /matches/today
    - GET /matches/{fixture_id}
    - `summary` deo u GET /matches/{fixture_id}/full
    """
    core = _get_fixture_core(fixture)

    fx = core["fixture"]
    league = core["league"]
    teams = core["teams"]
    goals = core["goals"]
    score = core["score"]
    venue = core["venue"]
    status = core["status"]

    home = teams.get("home") or {}
    away = teams.get("away") or {}

    return {
        "fixture_id": fx.get("id"),
        "kickoff": fx.get("date"),
        "timezone": fx.get("timezone") or TIMEZONE,
        "status": status.get("short"),
        "status_long": status.get("long"),
        "league": {
            "id": league.get("id"),
            "name": league.get("name"),
            "country": league.get("country"),
            "round": league.get("round"),
            "season": league.get("season"),
            "logo": league.get("logo"),
            "flag": league.get("flag"),
        },
        "venue": {
            "id": venue.get("id"),
            "name": venue.get("name"),
            "city": venue.get("city"),
        },
        "referee": fx.get("referee"),
        "teams": {
            "home": {
                "id": home.get("id"),
                "name": home.get("name"),
                "logo": home.get("logo"),
                "winner": home.get("winner"),
            },
            "away": {
                "id": away.get("id"),
                "name": away.get("name"),
                "logo": away.get("logo"),
                "winner": away.get("winner"),
            },
        },
        "goals": {
            "home": goals.get("home"),
            "away": goals.get("away"),
        },
        "score": score,  # pun raw score objekt (ht, ft, et, pen...)
    }


# ---------------------------------------------------------------------
# Public: full kontekst za jedan meč
# ---------------------------------------------------------------------


def build_full_match(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """
    OPTION A – CLEAN STRUCTURED

    Vraća jedan veliki, stabilan objekat:

    full_context = {
      "meta": {...},
      "summary": {...},
      "stats": {...},
      "team_stats": {"home": {...}, "away": {...}},
      "standings": {...},
      "h2h": {...},
      "events": [...],
      "lineups": [...],
      "players": [...],
      "predictions": {...},
      "injuries": {...},
      "odds": {...}
    }

    Sve sekcije koje ne možemo da dohvatimo ili koje failuju su jednostavno None.
    Front (i AI layer) samo preskače None.
    """

    core = _get_fixture_core(fixture)

    fx = core["fixture"]
    league = core["league"]
    teams = core["teams"]

    fixture_id = fx.get("id")
    league_id = league.get("id")
    season = league.get("season")
    home_team_id = (teams.get("home") or {}).get("id")
    away_team_id = (teams.get("away") or {}).get("id")

    logger.info(
        "Building full match context for fixture_id=%s (league=%s, season=%s)",
        fixture_id,
        league_id,
        season,
    )

    # ---- Basic stats & standings -------------------------------------------------

    stats = _safe_call(
        "fixture_stats",
        getattr(api_football, "get_fixture_stats", None),
        fixture_id,
    )

    team_stats_home = (
        _safe_call(
            "team_stats_home",
            getattr(api_football, "get_team_stats", None),
            league_id,
            season,
            home_team_id,
        )
        if home_team_id
        else None
    )

    team_stats_away = (
        _safe_call(
            "team_stats_away",
            getattr(api_football, "get_team_stats", None),
            league_id,
            season,
            away_team_id,
        )
        if away_team_id
        else None
    )

    standings = _safe_call(
        "standings",
        getattr(api_football, "get_standings", None),
        league_id,
        season,
    )

    # ---- Rich context (ako su helperi implementirani u api_football) -------------

    h2h = _safe_call(
        "h2h",
        getattr(api_football, "get_fixture_h2h", None)
        if hasattr(api_football, "get_fixture_h2h")
        else getattr(api_football, "get_h2h", None),
        fixture_id,
    )

    events = _safe_call(
        "events",
        getattr(api_football, "get_fixture_events", None),
        fixture_id,
    )

    lineups = _safe_call(
        "lineups",
        getattr(api_football, "get_fixture_lineups", None),
        fixture_id,
    )

    players = _safe_call(
        "players",
        getattr(api_football, "get_fixture_players", None),
        fixture_id,
    )

    predictions = _safe_call(
        "predictions",
        getattr(api_football, "get_fixture_predictions", None),
        fixture_id,
    )

    injuries = _safe_call(
        "injuries",
        getattr(api_football, "get_fixture_injuries", None),
        fixture_id,
    )

    # ---- Odds (raw + normalizovani marketi) --------------------------------------

    odds_helper = getattr(api_football, "get_all_odds_for_fixture", None)
    odds_raw = _safe_call("odds_all", odds_helper, fixture_id)

    odds_summary = None
    if odds_raw:
        try:
            odds_summary = normalize_odds(odds_raw)
        except Exception as exc:  # noqa: BLE001
            logger.warning("match_full: normalize_odds failed: %s", exc)

    # Ako nemamo ni home ni away team stats, sekcija je None (lakše za front)
    team_stats_block: Optional[Dict[str, Any]]
    if team_stats_home or team_stats_away:
        team_stats_block = {
            "home": team_stats_home,
            "away": team_stats_away,
        }
    else:
        team_stats_block = None

    full_context: Dict[str, Any] = {
        "meta": {
            "fixture_id": fixture_id,
            "league_id": league_id,
            "season": season,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
        "summary": build_match_summary(fixture),
        "stats": stats,
        "team_stats": team_stats_block,
        "standings": standings,
        "h2h": h2h,
        "events": events,
        "lineups": lineups,
        "players": players,
        "predictions": predictions,
        "injuries": injuries,
        "odds": {
            "summary": odds_summary,
            "raw": odds_raw,
        }
        if odds_raw is not None
        else None,
    }

    return full_context
