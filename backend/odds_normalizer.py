from __future__ import annotations

from typing import Any, Dict, List, Optional


def _parse_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_odds(odds_raw: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract the key markets we care about from the raw odds payload.

    The API‑FOOTBALL structure is:
    [
      {
        "league": {...},
        "fixture": {...},
        "update": "...",
        "bookmakers": [
          {
            "id": ...,
            "name": "...",
            "bets": [
              {
                "id": ...,
                "name": "Match Winner",
                "values": [
                  {"value": "Home", "odd": "1.80"},
                  ...
                ]
              },
              ...
            ]
          },
          ...
        ]
      }
    ]

    We loop all bookmakers and keep the *best* (highest) odds per market.
    """
    result = {
        "match_winner": {"home": None, "draw": None, "away": None},
        "double_chance": {"1X": None, "X2": None, "12": None},
        "totals": {
            "over_0_5_ht": None,
            "over_1_5": None,
            "over_2_5": None,
            "over_3_5": None,
            "under_3_5": None,
            "under_4_5": None,
        },
        "team_goals": {
            "home_over_0_5": None,
            "away_over_0_5": None,
        },
        "btts": {"yes": None, "no": None},
    }

    for row in odds_raw:
        for bm in row.get("bookmakers", []):
            for bet in bm.get("bets", []):
                name = (bet.get("name") or "").lower()

                # 1X2 / Match winner
                if "match winner" in name or name in {"1x2", "winner"}:
                    _apply_match_winner(result, bet)

                # Double Chance
                elif "double chance" in name:
                    _apply_double_chance(result, bet)

                # BTTS
                elif "both teams to score" in name:
                    _apply_btts(result, bet)

                # Full‑time goals (Over/Under)
                elif "goals over/under" in name or "total goals" in name:
                    _apply_totals(result, bet, half_time=False)

                # 1st half goals
                elif "1st half" in name or "first half" in name:
                    _apply_totals(result, bet, half_time=True)

                # Team total goals
                elif "home team total goals" in name or "team total goals - home" in name:
                    _apply_team_totals(result, bet, side="home")
                elif "away team total goals" in name or "team total goals - away" in name:
                    _apply_team_totals(result, bet, side="away")

    return result


def _apply_match_winner(result: Dict[str, Any], bet: Dict[str, Any]) -> None:
    for v in bet.get("values", []):
        label = (v.get("value") or "").strip().lower()
        odd = _parse_float(v.get("odd"))
        if odd is None:
            continue
        if label in {"1", "home"}:
            _max_assign(result["match_winner"], "home", odd)
        elif label in {"x", "draw"}:
            _max_assign(result["match_winner"], "draw", odd)
        elif label in {"2", "away"}:
            _max_assign(result["match_winner"], "away", odd)


def _apply_double_chance(result: Dict[str, Any], bet: Dict[str, Any]) -> None:
    for v in bet.get("values", []):
        label = (v.get("value") or "").replace(" ", "").upper()
        odd = _parse_float(v.get("odd"))
        if odd is None:
            continue
        if label == "1X":
            _max_assign(result["double_chance"], "1X", odd)
        elif label == "X2":
            _max_assign(result["double_chance"], "X2", odd)
        elif label in {"12", "1-2"}:
            _max_assign(result["double_chance"], "12", odd)


def _apply_btts(result: Dict[str, Any], bet: Dict[str, Any]) -> None:
    for v in bet.get("values", []):
        label = (v.get("value") or "").strip().lower()
        odd = _parse_float(v.get("odd"))
        if odd is None:
            continue
        if label in {"yes", "y"}:
            _max_assign(result["btts"], "yes", odd)
        elif label in {"no", "n"}:
            _max_assign(result["btts"], "no", odd)


def _apply_totals(result: Dict[str, Any], bet: Dict[str, Any], *, half_time: bool) -> None:
    for v in bet.get("values", []):
        label = (v.get("value") or "").lower().replace(" ", "")
        odd = _parse_float(v.get("odd"))
        if odd is None:
            continue

        # Expect labels like "Over 2.5", "Under 3.5"
        if "over" in label:
            line = label.replace("over", "")
            if half_time and line == "0.5":
                _max_assign(result["totals"], "over_0_5_ht", odd)
            elif not half_time and line == "1.5":
                _max_assign(result["totals"], "over_1_5", odd)
            elif not half_time and line == "2.5":
                _max_assign(result["totals"], "over_2_5", odd)
            elif not half_time and line == "3.5":
                _max_assign(result["totals"], "over_3_5", odd)
        elif "under" in label and not half_time:
            line = label.replace("under", "")
            if line == "3.5":
                _max_assign(result["totals"], "under_3_5", odd)
            elif line == "4.5":
                _max_assign(result["totals"], "under_4_5", odd)


def _apply_team_totals(result: Dict[str, Any], bet: Dict[str, Any], *, side: str) -> None:
    for v in bet.get("values", []):
        label = (v.get("value") or "").lower().replace(" ", "")
        odd = _parse_float(v.get("odd"))
        if odd is None:
            continue
        if "over0.5" in label:
            key = "home_over_0_5" if side == "home" else "away_over_0_5"
            _max_assign(result["team_goals"], key, odd)


def _max_assign(target: Dict[str, Any], key: str, value: float) -> None:
    current = target.get(key)
    if current is None or value > current:
        target[key] = value
