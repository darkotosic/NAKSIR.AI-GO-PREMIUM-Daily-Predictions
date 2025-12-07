from __future__ import annotations

from typing import Any, Dict, List, Optional

from .api_football import (
    get_all_odds_for_fixture,
    get_fixture_stats,
    get_h2h,
    get_injuries,
    get_predictions,
    get_standings,
    get_team_stats,
)
from .odds_normalizer import normalize_odds


def build_match_summary(fixture_raw: Dict[str, Any]) -> Dict[str, Any]:
    """Layer 1 — lightweight card for the main list screen."""
    fixture = fixture_raw.get("fixture", {}) or {}
    league = fixture_raw.get("league", {}) or {}
    teams = fixture_raw.get("teams", {}) or {}
    venue = fixture.get("venue", {}) or {}

    home = teams.get("home", {}) or {}
    away = teams.get("away", {}) or {}

    country = {
        "name": league.get("country"),
        "code": league.get("country"),
        "flag": league.get("flag"),
        "emoji": flag_emoji_from_code(league.get("country")),
    }

    return {
        "fixture_id": fixture.get("id"),
        "kickoff": fixture.get("date"),
        "status": (fixture.get("status") or {}).get("short"),
        "country": country,
        "league": {
            "id": league.get("id"),
            "name": league.get("name"),
            "round": league.get("round"),
            "season": league.get("season"),
        },
        "venue": {
            "id": venue.get("id"),
            "name": venue.get("name"),
            "city": venue.get("city"),
        },
        "referee": fixture.get("referee"),
        "teams": {
            "home": {
                "id": home.get("id"),
                "name": home.get("name"),
                "logo": home.get("logo"),
            },
            "away": {
                "id": away.get("id"),
                "name": away.get("name"),
                "logo": away.get("logo"),
            },
        },
    }


def build_full_match(fixture_raw: Dict[str, Any]) -> Dict[str, Any]:
    """Layer 2 — enriched match object for the detailed screen."""
    summary = build_match_summary(fixture_raw)

    league_id = summary["league"]["id"]
    home_id = summary["teams"]["home"]["id"]
    away_id = summary["teams"]["away"]["id"]
    fixture_id = summary["fixture_id"]

    # Standings
    standings_raw = get_standings(league_id)
    standings = _extract_team_standings(standings_raw, home_id, away_id)

    # Team stats (season level)
    stats_home = get_team_stats(league_id, home_id)
    stats_away = get_team_stats(league_id, away_id)

    # H2H
    h2h_raw = get_h2h(home_id, away_id, last=5)

    # Injuries
    injuries_home = get_injuries(league_id, home_id)
    injuries_away = get_injuries(league_id, away_id)

    # Live / fixture stats
    live_stats = get_fixture_stats(fixture_id)

    # Predictions (API‑Football model)
    predictions_raw = get_predictions(fixture_id)

    # Odds
    odds_raw = get_all_odds_for_fixture(fixture_id)
    odds = normalize_odds(odds_raw)

    return {
        "summary": summary,
        "standings": standings,
        "h2h_last5": _normalize_h2h(h2h_raw),
        "injuries": {
            "home": _normalize_injuries(injuries_home),
            "away": _normalize_injuries(injuries_away),
        },
        "team_stats": {
            "home": stats_home,
            "away": stats_away,
        },
        "live_stats": live_stats,
        "odds": odds,
        "api_predictions": predictions_raw,
    }


# ---------- helpers ----------


def flag_emoji_from_code(code: Optional[str]) -> Optional[str]:
    if not code or len(code) != 2:
        return None
    code = code.upper()
    try:
        return chr(0x1F1E6 + ord(code[0]) - ord("A")) + chr(
            0x1F1E6 + ord(code[1]) - ord("A")
        )
    except Exception:
        return None


def _extract_team_standings(raw: List[Dict[str, Any]], home_id: int, away_id: int) -> Dict[str, Any]:
    """Flatten the standings payload into two rows (home/away)."""
    home_row: Optional[Dict[str, Any]] = None
    away_row: Optional[Dict[str, Any]] = None

    for league_block in raw:
        for table in league_block.get("league", {}).get("standings", []):
            for row in table:
                team = row.get("team", {}) or {}
                tid = team.get("id")
                if tid == home_id:
                    home_row = row
                elif tid == away_id:
                    away_row = row
    return {"home": home_row, "away": away_row}


def _normalize_h2h(raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for fx in raw:
        fx_fixture = fx.get("fixture", {}) or {}
        fx_league = fx.get("league", {}) or {}
        teams = fx.get("teams", {}) or {}
        goals = fx.get("goals", {}) or {}
        score = fx.get("score", {}) or {}

        normalized.append(
            {
                "date": fx_fixture.get("date"),
                "league": {
                    "id": fx_league.get("id"),
                    "name": fx_league.get("name"),
                },
                "teams": {
                    "home": teams.get("home", {}).get("name"),
                    "away": teams.get("away", {}).get("name"),
                },
                "goals": goals,
                "score": score,
                "status": (fx_fixture.get("status") or {}).get("short"),
            }
        )
    return normalized


def _normalize_injuries(raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for item in raw:
        player = item.get("player", {}) or {}
        team = item.get("team", {}) or {}
        out.append(
            {
                "player": player.get("name"),
                "type": item.get("type"),
                "reason": item.get("reason"),
                "team_id": team.get("id"),
                "team_name": team.get("name"),
            }
        )
    return out
