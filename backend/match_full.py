from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from . import api_football
from .config import TIMEZONE
from .odds_normalizer import normalize_odds
from .odds_summary import build_odds_probabilities, build_odds_summary


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


def _should_include(section: str, sections: Optional[set[str]]) -> bool:
    if sections is None:
        return True
    if "all" in sections:
        return True
    return section in sections


def build_full_match(fixture: Dict[str, Any], sections: Optional[set[str]] = None) -> Dict[str, Any]:
    """
    OPTION A – CLEAN STRUCTURED

    Vraća jedan veliki, stabilan objekat:

full_context = {
    "meta": meta,
    "summary": summary,
    "stats": stats,
    "team_stats": team_stats,
    "standings": standings,
    "h2h": h2h,
    "events": events,
    "lineups": lineups,
    "players": players,
    "predictions": predictions,
    "injuries": injuries,
    "odds": odds_block,  # summary + raw + "flat" snapshot
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

    stats = (
        _safe_call(
            "fixture_stats",
            getattr(api_football, "get_fixture_stats", None),
            fixture_id,
        )
        if _should_include("stats", sections)
        else None
    )

    team_stats_home = None
    team_stats_away = None
    if _should_include("team_stats", sections):
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

    standings = (
        _safe_call(
            "standings",
            getattr(api_football, "get_standings", None),
            league_id,
            season,
        )
        if _should_include("standings", sections)
        else None
    )

    # ---- Rich context (ako su helperi implementirani u api_football) -------------

    h2h_helper = getattr(api_football, "get_fixture_h2h", None)
    if h2h_helper is None:
        h2h_helper = getattr(api_football, "get_h2h", None)

    if h2h_helper and home_team_id and away_team_id and _should_include("h2h", sections):
        h2h = _safe_call(
            "h2h",
            h2h_helper,
            fixture_id,
            home_team_id,
            away_team_id,
        )
    else:
        h2h = None

    events = None
    if _should_include("events", sections):
        events_helper = getattr(api_football, "get_fixture_events", None) or getattr(
            api_football, "get_events_for_fixture", None
        )
        events = _safe_call("events", events_helper, fixture_id)

    lineups = None
    if _should_include("lineups", sections):
        lineups_helper = getattr(api_football, "get_fixture_lineups", None) or getattr(
            api_football, "get_lineups_for_fixture", None
        )
        lineups = _safe_call("lineups", lineups_helper, fixture_id)

    players = None
    if _should_include("players", sections):
        players_helper = getattr(api_football, "get_fixture_players", None) or getattr(
            api_football, "get_players_for_fixture", None
        )
        players = _safe_call("players", players_helper, fixture_id)

    predictions = None
    if _should_include("predictions", sections):
        predictions_helper = getattr(api_football, "get_fixture_predictions", None) or getattr(
            api_football, "get_predictions", None
        )
        predictions = _safe_call("predictions", predictions_helper, fixture_id)

    injuries = None
    if _should_include("injuries", sections):
        injuries_helper = getattr(api_football, "get_fixture_injuries", None) or getattr(
            api_football, "get_injuries_for_fixture", None
        )
        injuries = _safe_call("injuries", injuries_helper, fixture_id)

    # ---- Odds (raw + normalizovani marketi) --------------------------------------

    odds_raw = None
    odds_flat = None
    odds_summary = None
    odds_flat_probabilities = None
    if _should_include("odds", sections):
        odds_helper = getattr(api_football, "get_all_odds_for_fixture", None)
        odds_raw = _safe_call("odds_all", odds_helper, fixture_id)

    if odds_raw:
        try:
            odds_summary = normalize_odds(odds_raw)
        except Exception as exc:  # noqa: BLE001
            logger.warning("match_full: normalize_odds failed: %s", exc)
        try:
            odds_flat = build_odds_summary(odds_raw)
        except Exception as exc:  # noqa: BLE001
            logger.warning("match_full: build_odds_summary failed: %s", exc)
        try:
            if odds_flat:
                odds_flat_probabilities = build_odds_probabilities(odds_flat)
        except Exception as exc:  # noqa: BLE001
            logger.warning("match_full: build_odds_probabilities failed: %s", exc)

    odds_block = None
    if odds_raw is not None:
        odds_block = {
            "summary": odds_summary,
            "raw": odds_raw,
            "flat": odds_flat,
            "flat_probabilities": odds_flat_probabilities,
        }

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
        "odds": odds_block,
    }

    return full_context
