from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from math import prod
from typing import Any, Dict, List, Literal, Optional, Tuple

from backend.contracts.btts_ticket import (
    BttsMatchPick,
    BttsTicket,
    DailyBttsTicketsResponse,
    MiniEntity,
)

TicketType = Literal["BTTS_YES", "BTTS_NO"]


@dataclass(frozen=True)
class Candidate:
    fixture_id: int
    kickoff_utc: datetime
    league_id: Optional[int]
    league_name: str
    league_logo: Optional[str]
    home_id: Optional[int]
    home_name: str
    home_logo: Optional[str]
    away_id: Optional[int]
    away_name: str
    away_logo: Optional[str]
    odds: float

    # stats for heuristics (optional; if missing -> scoring is conservative)
    home_scored_avg_5: Optional[float] = None
    away_scored_avg_5: Optional[float] = None
    home_conceded_avg_5: Optional[float] = None
    away_conceded_avg_5: Optional[float] = None
    both_btts_rate_10: Optional[float] = None  # 0..1
    under_tendency: Optional[float] = None  # 0..1

    is_top_league: bool = False
    is_live: bool = False


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def score_to_probability(score: int) -> float:
    return clamp(0.45 + (score / 200.0), 0.50, 0.90)


def _round2(x: float) -> float:
    return float(f"{x:.2f}")


# ---------- Scoring (MVP heuristics) ----------

def score_yes(c: Candidate) -> int:
    s = 0

    # goals scored last5
    if c.home_scored_avg_5 is not None and c.home_scored_avg_5 >= 1.2:
        s += 15
    if c.away_scored_avg_5 is not None and c.away_scored_avg_5 >= 1.2:
        s += 15

    # goals conceded last5
    if c.home_conceded_avg_5 is not None and c.home_conceded_avg_5 >= 1.0:
        s += 10
    if c.away_conceded_avg_5 is not None and c.away_conceded_avg_5 >= 1.0:
        s += 10

    # btts rate last10 (optional)
    if c.both_btts_rate_10 is not None and c.both_btts_rate_10 >= 0.55:
        s += 15

    if c.is_top_league:
        s += 10

    # mild penalty if clearly under-ish profile
    if c.under_tendency is not None and c.under_tendency >= 0.65:
        s -= 10

    # keep within 0..100
    return max(0, min(100, s))


def score_no(c: Candidate) -> int:
    s = 0

    # low scored last5
    if c.home_scored_avg_5 is not None and c.home_scored_avg_5 < 1.0:
        s += 15
    if c.away_scored_avg_5 is not None and c.away_scored_avg_5 < 1.0:
        s += 15

    # low conceded last5 (tight defense)
    if c.home_conceded_avg_5 is not None and c.home_conceded_avg_5 < 1.0:
        s += 10
    if c.away_conceded_avg_5 is not None and c.away_conceded_avg_5 < 1.0:
        s += 10

    # under tendency
    if c.under_tendency is not None and c.under_tendency >= 0.60:
        s += 15

    if c.is_top_league:
        s += 10

    # penalty if BTTS rate is high
    if c.both_btts_rate_10 is not None and c.both_btts_rate_10 >= 0.60:
        s -= 20

    return max(0, min(100, s))


# ---------- Selection (2 or 3, aggressive with guardrails) ----------

def select_2_or_3(
    candidates: List[Tuple[Candidate, int]],
    *,
    min_score_2: int = 70,
    min_score_3: int = 75,
    odds_range_for_3: Tuple[float, float] = (2.20, 3.70),
) -> List[Tuple[Candidate, int]]:
    """
    candidates: list of (Candidate, score) sorted desc
    Constraints:
      - max 1 match per league in the final ticket
      - try 3 only if top3 >= min_score_3 and total_odds in range
      - else fallback to 2 with >= min_score_2
    """
    # Helper: pick with league diversification
    def pick_n(n: int, threshold: int) -> List[Tuple[Candidate, int]]:
        picked: List[Tuple[Candidate, int]] = []
        used_leagues: set = set()
        for c, sc in candidates:
            if sc < threshold:
                continue
            lid = c.league_id or f"no_league:{c.league_name}"
            if lid in used_leagues:
                continue
            used_leagues.add(lid)
            picked.append((c, sc))
            if len(picked) == n:
                break
        return picked

    # Try 3
    top3 = pick_n(3, min_score_3)
    if len(top3) == 3:
        total = prod([x[0].odds for x in top3])
        if odds_range_for_3[0] <= total <= odds_range_for_3[1]:
            return top3

    # Fallback to 2
    top2 = pick_n(2, min_score_2)
    return top2


# ---------- Candidate extraction (plug into your existing data) ----------

def build_daily_btts_tickets(
    *,
    today: date,
    fixtures: List[Dict[str, Any]],
    top_league_ids: Optional[set] = None,
) -> DailyBttsTicketsResponse:
    """
    fixtures: should already be TODAY-only fixtures, ideally enriched with odds + logos.
    You will adapt `extract_candidates_from_fixtures()` to match your actual fixture schema.
    """
    top_league_ids = top_league_ids or set()

    yes_candidates = extract_candidates_from_fixtures(fixtures, "BTTS_YES", top_league_ids)
    no_candidates = extract_candidates_from_fixtures(fixtures, "BTTS_NO", top_league_ids)

    yes_scored = sorted([(c, score_yes(c)) for c in yes_candidates], key=lambda x: x[1], reverse=True)
    no_scored = sorted([(c, score_no(c)) for c in no_candidates], key=lambda x: x[1], reverse=True)

    yes_selected = select_2_or_3(yes_scored)
    no_selected = select_2_or_3(no_scored)

    yes_ticket = build_ticket(today, "BTTS_YES", yes_selected)
    no_ticket = build_ticket(today, "BTTS_NO", no_selected)

    return DailyBttsTicketsResponse(date=today, yes_ticket=yes_ticket, no_ticket=no_ticket)


def build_ticket(today: date, ttype: TicketType, selected: List[Tuple[Candidate, int]]) -> BttsTicket:
    ticket_id = f"{ttype.replace('_', '')}-{today.strftime('%Y%m%d')}-01"

    picks: List[BttsMatchPick] = []
    for c, sc in selected:
        prob = score_to_probability(sc)
        picks.append(
            BttsMatchPick(
                fixture_id=c.fixture_id,
                kickoff_utc=c.kickoff_utc,
                league=MiniEntity(id=c.league_id, name=c.league_name, logo=c.league_logo),
                home=MiniEntity(id=c.home_id, name=c.home_name, logo=c.home_logo),
                away=MiniEntity(id=c.away_id, name=c.away_name, logo=c.away_logo),
                market=ttype,
                odds=_round2(c.odds),
                probability=_round2(prob),
                score=sc,
            )
        )

    total_odds = _round2(prod([p.odds for p in picks])) if picks else 1.0
    confidence = int(round(sum([p.score for p in picks]) / len(picks))) if picks else 0

    return BttsTicket(
        ticket_id=ticket_id,
        type=ttype,
        date=today,
        total_odds=total_odds,
        confidence=confidence,
        matches=picks,
    )


def extract_candidates_from_fixtures(
    fixtures: List[Dict[str, Any]],
    ttype: TicketType,
    top_league_ids: set,
) -> List[Candidate]:
    """
    IMPORTANT: Adapt this function to your real fixture schema.

    Expected minimal keys (typical API-Football-like):
      fixture['fixture']['id']
      fixture['fixture']['date'] (ISO)
      fixture['fixture']['status']['short']
      fixture['league']['id'], ['name'], ['logo']
      fixture['teams']['home']['id','name','logo']
      fixture['teams']['away']['id','name','logo']
      fixture['odds']['btts_yes'] or fixture['odds']['btts_no'] (float)
    """
    out: List[Candidate] = []
    for f in fixtures:
        try:
            fid = int(f["fixture"]["id"])
            kickoff_iso = f["fixture"]["date"]
            kickoff = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00")).astimezone(timezone.utc)

            status_short = (f.get("fixture", {}).get("status", {}) or {}).get("short", "")
            is_live = status_short in {"1H", "2H", "HT", "ET", "P", "PEN", "LIVE"}

            # Skip live – pre-match only
            if is_live:
                continue

            league = f.get("league", {}) or {}
            teams = f.get("teams", {}) or {}
            home = teams.get("home", {}) or {}
            away = teams.get("away", {}) or {}

            league_id = league.get("id")
            is_top = bool(league_id in top_league_ids)

            odds_obj = f.get("odds", {}) or {}
            odds = odds_obj.get("btts_yes") if ttype == "BTTS_YES" else odds_obj.get("btts_no")
            if odds is None:
                continue

            odds = float(odds)
            # hard odds range
            if not (1.30 <= odds <= 1.55):
                continue

            # optional stats (if present)
            stats = f.get("stats", {}) or {}

            out.append(
                Candidate(
                    fixture_id=fid,
                    kickoff_utc=kickoff,
                    league_id=league_id,
                    league_name=str(league.get("name") or "League"),
                    league_logo=league.get("logo"),
                    home_id=home.get("id"),
                    home_name=str(home.get("name") or "Home"),
                    home_logo=home.get("logo"),
                    away_id=away.get("id"),
                    away_name=str(away.get("name") or "Away"),
                    away_logo=away.get("logo"),
                    odds=odds,
                    home_scored_avg_5=stats.get("home_scored_avg_5"),
                    away_scored_avg_5=stats.get("away_scored_avg_5"),
                    home_conceded_avg_5=stats.get("home_conceded_avg_5"),
                    away_conceded_avg_5=stats.get("away_conceded_avg_5"),
                    both_btts_rate_10=stats.get("both_btts_rate_10"),
                    under_tendency=stats.get("under_tendency"),
                    is_top_league=is_top,
                    is_live=False,
                )
            )
        except Exception:
            # skip malformed fixture
            continue

    return out
