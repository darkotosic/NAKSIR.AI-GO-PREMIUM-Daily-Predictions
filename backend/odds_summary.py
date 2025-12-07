from __future__ import annotations

from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _all_done(summary: Dict[str, Any]) -> bool:
    if any(v is None for v in summary["match_winner"].values()):
        return False
    if any(v is None for v in summary["double_chance"].values()):
        return False
    if any(v is None for v in summary["btts"].values()):
        return False
    if summary["ht_over_0_5"] is None:
        return False
    if summary["home_goals_over_0_5"] is None:
        return False
    if summary["away_goals_over_0_5"] is None:
        return False
    if any(v is None for v in summary["totals"].values()):
        return False
    return True


# ---------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------


def build_odds_summary(odds_raw: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prima kompletan odds RAW sa API-Football-a i vraća SAMO kvote koje tražimo,
    uzimajući PRVU kvotu koju nađe, nebitno koja je kladionica.

    Output shape:

    {
      "match_winner": {"home": 2.40, "draw": 3.10, "away": 2.80},
      "double_chance": {"1X": 1.36, "X2": 1.62, "12": 1.36},
      "btts": {"yes": 1.83, "no": 1.83},
      "ht_over_0_5": 1.44,
      "home_goals_over_0_5": 1.30,
      "away_goals_over_0_5": 1.40,
      "totals": {
        "over_1_5": 1.36,
        "over_2_5": 2.10,
        "over_3_5": 3.75,
        "under_3_5": 1.25,
        "under_4_5": 1.08
      }
    }

    Ako neka kvota ne postoji u feed-u, ostaje None, ali struktura je uvek ista.
    """

    summary: Dict[str, Any] = {
        "match_winner": {
            "home": None,
            "draw": None,
            "away": None,
        },
        "double_chance": {
            "1X": None,
            "X2": None,
            "12": None,
        },
        "btts": {
            "yes": None,
            "no": None,
        },
        "ht_over_0_5": None,
        "home_goals_over_0_5": None,
        "away_goals_over_0_5": None,
        "totals": {
            "over_1_5": None,
            "over_2_5": None,
            "over_3_5": None,
            "under_3_5": None,
            "under_4_5": None,
        },
    }

    if not odds_raw:
        return summary

    # odds_raw je lista: svaki item = { league, fixture, update, bookmakers: [...] }
    for item in odds_raw:
        bookmakers = item.get("bookmakers") or []
        for bm in bookmakers:
            bets = bm.get("bets") or []

            # ---------------- Match Winner ----------------
            if any(v is None for v in summary["match_winner"].values()):
                mw = next((b for b in bets if b.get("name") == "Match Winner"), None)
                if mw:
                    for v in mw.get("values") or []:
                        label = v.get("value")
                        odd = _to_float(v.get("odd"))
                        if odd is None:
                            continue
                        if label == "Home" and summary["match_winner"]["home"] is None:
                            summary["match_winner"]["home"] = odd
                        elif label == "Draw" and summary["match_winner"]["draw"] is None:
                            summary["match_winner"]["draw"] = odd
                        elif label == "Away" and summary["match_winner"]["away"] is None:
                            summary["match_winner"]["away"] = odd

            # ---------------- Double Chance ----------------
            if any(v is None for v in summary["double_chance"].values()):
                dc = next((b for b in bets if b.get("name") == "Double Chance"), None)
                if dc:
                    for v in dc.get("values") or []:
                        label = v.get("value")
                        odd = _to_float(v.get("odd"))
                        if odd is None:
                            continue
                        if label == "Home/Draw" and summary["double_chance"]["1X"] is None:
                            summary["double_chance"]["1X"] = odd
                        elif (
                            label == "Draw/Away"
                            and summary["double_chance"]["X2"] is None
                        ):
                            summary["double_chance"]["X2"] = odd
                        elif (
                            label == "Home/Away"
                            and summary["double_chance"]["12"] is None
                        ):
                            summary["double_chance"]["12"] = odd

            # ---------------- BTTS ----------------
            if any(v is None for v in summary["btts"].values()):
                btts_bet = next(
                    (b for b in bets if b.get("name") == "Both Teams Score"),
                    None,
                )
                if btts_bet:
                    for v in btts_bet.get("values") or []:
                        label = v.get("value")
                        odd = _to_float(v.get("odd"))
                        if odd is None:
                            continue
                        if label == "Yes" and summary["btts"]["yes"] is None:
                            summary["btts"]["yes"] = odd
                        elif label == "No" and summary["btts"]["no"] is None:
                            summary["btts"]["no"] = odd

            # ---------------- HT Over 0.5 ----------------
            if summary["ht_over_0_5"] is None:
                ht_ou = next(
                    (
                        b
                        for b in bets
                        if b.get("name") == "Goals Over/Under First Half"
                    ),
                    None,
                )
                if ht_ou:
                    for v in ht_ou.get("values") or []:
                        if v.get("value") == "Over 0.5":
                            odd = _to_float(v.get("odd"))
                            if odd is not None:
                                summary["ht_over_0_5"] = odd
                                break

            # ---------------- Home goals Over 0.5 ----------------
            if summary["home_goals_over_0_5"] is None:
                home_total = next(
                    (b for b in bets if b.get("name") == "Total - Home"),
                    None,
                )
                if home_total:
                    for v in home_total.get("values") or []:
                        if v.get("value") == "Over 0.5":
                            odd = _to_float(v.get("odd"))
                            if odd is not None:
                                summary["home_goals_over_0_5"] = odd
                                break

            # ---------------- Away goals Over 0.5 ----------------
            if summary["away_goals_over_0_5"] is None:
                away_total = next(
                    (b for b in bets if b.get("name") == "Total - Away"),
                    None,
                )
                if away_total:
                    for v in away_total.get("values") or []:
                        if v.get("value") == "Over 0.5":
                            odd = _to_float(v.get("odd"))
                            if odd is not None:
                                summary["away_goals_over_0_5"] = odd
                                break

            # ---------------- Totals O/U ----------------
            if any(v is None for v in summary["totals"].values()):
                ou = next(
                    (b for b in bets if b.get("name") == "Goals Over/Under"),
                    None,
                )
                if ou:
                    for v in ou.get("values") or []:
                        label = v.get("value")
                        odd = _to_float(v.get("odd"))
                        if odd is None:
                            continue
                        if label == "Over 1.5" and summary["totals"]["over_1_5"] is None:
                            summary["totals"]["over_1_5"] = odd
                        elif (
                            label == "Over 2.5"
                            and summary["totals"]["over_2_5"] is None
                        ):
                            summary["totals"]["over_2_5"] = odd
                        elif (
                            label == "Over 3.5"
                            and summary["totals"]["over_3_5"] is None
                        ):
                            summary["totals"]["over_3_5"] = odd
                        elif (
                            label == "Under 3.5"
                            and summary["totals"]["under_3_5"] is None
                        ):
                            summary["totals"]["under_3_5"] = odd
                        elif (
                            label == "Under 4.5"
                            and summary["totals"]["under_4_5"] is None
                        ):
                            summary["totals"]["under_4_5"] = odd

            if _all_done(summary):
                return summary

    return summary
