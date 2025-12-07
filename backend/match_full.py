from typing import Any, Dict, List, Optional

from .api_football import (
    get_odds_for_fixture,
    get_team_stats,
    get_standings,
    get_h2h,
    get_injuries,
    get_fixture_stats,
)


def build_full_match(fixture_raw: Dict[str, Any]) -> Dict[str, Any]:
    """Prima jedan raw fixture objekt iz get_fixtures_today() i vraca normalized full JSON."""
    fixture = fixture_raw["fixture"]
    league = fixture_raw["league"]
    teams = fixture_raw["teams"]

    fixture_id = fixture["id"]
    league_id = league["id"]
    season = league["season"]

    odds_raw = get_odds_for_fixture(fixture_id)
    odds = _normalize_odds(odds_raw)

    home_id = teams["home"]["id"]
    away_id = teams["away"]["id"]

    stats_home = get_team_stats(league_id, season, home_id)
    stats_away = get_team_stats(league_id, season, away_id)

    standings_raw = get_standings(league_id, season)
    standings = _find_standings_for_teams(standings_raw, home_id, away_id)

    h2h_raw = get_h2h(home_id, away_id, last=5)
    h2h = _normalize_h2h(h2h_raw)

    injuries_home = get_injuries(league_id, season, home_id)
    injuries_away = get_injuries(league_id, season, away_id)

    live_stats = get_fixture_stats(fixture_id)

    return {
        "fixture": {
            "id": fixture_id,
            "league": {
                "id": league_id,
                "name": league["name"],
                "round": league.get("round"),
            },
            "date": fixture["date"],
            "status": fixture["status"]["short"],
            "venue": fixture.get("venue") or {},
        },
        "teams": {
            "home": teams["home"],
            "away": teams["away"],
        },
        "odds": odds,
        "stats": {
            "home": _normalize_team_stats(stats_home),
            "away": _normalize_team_stats(stats_away),
        },
        "form": {
            "home": stats_home.get("form", ""),
            "away": stats_away.get("form", ""),
        },
        "standings": standings,
        "h2h": h2h,
        "injuries": {
            "home": _normalize_injuries(injuries_home),
            "away": _normalize_injuries(injuries_away),
        },
        "live_stats": live_stats,
    }


def _normalize_odds(odds_raw: List[Dict[str, Any]]) -> Dict[str, Any]:
    result = {
        "1x2": {"home": None, "draw": None, "away": None},
        "double_chance": {"1X": None, "X2": None, "12": None},
        "goals": {"over_1_5": None, "over_2_5": None, "under_3_5": None},
        "btts": {"yes": None, "no": None},
        "correct_score_sample": [],
    }

    if not odds_raw:
        return result

    bookmaker_section = odds_raw[0].get("bookmakers", [])

    def find_bet(name: str) -> Optional[Dict[str, Any]]:
        for bm in bookmaker_section:
            for bet in bm.get("bets", []):
                if bet.get("name") == name:
                    return bet
        return None

    def parse_value(values: List[Dict[str, Any]], target: str) -> Optional[float]:
        for val in values:
            if val.get("value") == target:
                try:
                    return float(val.get("odd"))
                except (TypeError, ValueError):
                    return None
        return None

    match_winner = find_bet("Match Winner") or find_bet("1X2")
    if match_winner:
        values = match_winner.get("values", [])
        result["1x2"] = {
            "home": parse_value(values, "Home"),
            "draw": parse_value(values, "Draw"),
            "away": parse_value(values, "Away"),
        }

    double_chance = find_bet("Double Chance")
    if double_chance:
        values = double_chance.get("values", [])
        result["double_chance"] = {
            "1X": parse_value(values, "1X"),
            "X2": parse_value(values, "X2"),
            "12": parse_value(values, "12"),
        }

    goals = find_bet("Goals Over/Under")
    if goals:
        values = goals.get("values", [])
        result["goals"] = {
            "over_1_5": parse_value(values, "Over 1.5"),
            "over_2_5": parse_value(values, "Over 2.5"),
            "under_3_5": parse_value(values, "Under 3.5"),
        }

    btts = find_bet("Both Teams To Score")
    if btts:
        values = btts.get("values", [])
        result["btts"] = {
            "yes": parse_value(values, "Yes"),
            "no": parse_value(values, "No"),
        }

    correct_score = find_bet("Correct Score")
    if correct_score:
        values = correct_score.get("values", [])
        samples = []
        for val in values[:3]:
            score_val = val.get("value", "")
            score = score_val.replace(":", "-")
            try:
                odd_float = float(val.get("odd"))
            except (TypeError, ValueError):
                odd_float = None
            samples.append({"score": score, "odd": odd_float})
        result["correct_score_sample"] = samples

    return result


def _find_standings_for_teams(
    standings_raw: List[Dict[str, Any]], home_id: int, away_id: int
) -> Dict[str, Any]:
    standings = {"home": {}, "away": {}}

    for league_block in standings_raw:
        league_data = league_block.get("league", {})
        for table in league_data.get("standings", []):
            for row in table:
                team_info = row.get("team", {})
                team_id = team_info.get("id")
                if team_id == home_id:
                    standings["home"] = {
                        "position": row.get("rank"),
                        "points": row.get("points"),
                        "goal_diff": row.get("goalsDiff"),
                    }
                if team_id == away_id:
                    standings["away"] = {
                        "position": row.get("rank"),
                        "points": row.get("points"),
                        "goal_diff": row.get("goalsDiff"),
                    }
    return standings


def _normalize_h2h(h2h_raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for fixture in h2h_raw:
        fixture_info = fixture.get("fixture", {})
        teams_info = fixture.get("teams", {})
        goals_info = fixture.get("goals", {})

        winner = None
        if teams_info.get("home", {}).get("winner"):
            winner = "home"
        elif teams_info.get("away", {}).get("winner"):
            winner = "away"

        normalized.append(
            {
                "date": fixture_info.get("date"),
                "home_team": teams_info.get("home"),
                "away_team": teams_info.get("away"),
                "score": {
                    "home": goals_info.get("home"),
                    "away": goals_info.get("away"),
                },
                "winner": winner,
            }
        )
    return normalized


def _normalize_team_stats(stats: Dict[str, Any]) -> Dict[str, Any]:
    fixtures = stats.get("fixtures", {})
    goals = stats.get("goals", {})
    avg_goals_for = goals.get("for", {}).get("average", {}).get("total")
    avg_goals_against = goals.get("against", {}).get("average", {}).get("total")

    return {
        "played": fixtures.get("played", {}).get("total"),
        "wins": fixtures.get("wins", {}).get("total"),
        "draws": fixtures.get("draws", {}).get("total"),
        "losses": fixtures.get("loses", {}).get("total"),
        "goals_for": goals.get("for", {}).get("total", {}).get("total"),
        "goals_against": goals.get("against", {}).get("total", {}).get("total"),
        "avg_goals_for": avg_goals_for,
        "avg_goals_against": avg_goals_against,
    }


def _normalize_injuries(injuries_raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    injuries: List[Dict[str, Any]] = []
    for item in injuries_raw:
        player = item.get("player", {})
        team = item.get("team", {})
        injuries.append(
            {
                "player": player.get("name"),
                "type": item.get("type"),
                "reason": item.get("reason"),
                "team_id": team.get("id"),
                "team_name": team.get("name"),
            }
        )
    return injuries
