from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from backend import api_football
from backend.cache import cache_get, make_cache_key
from backend.config import TOP_LEAGUE_IDS
from backend.dependencies import require_api_key
from backend.match_full import build_full_match, build_match_summary
from backend.odds_summary import build_odds_summary

router = APIRouter(tags=["matches"])
logger = logging.getLogger("naksir.go_premium.api")


@router.get(
    "/matches/today",
    summary="Svi današnji mečevi (card format)",
    dependencies=[Depends(require_api_key)],
)
def get_today_matches(
    cursor: int = Query(0, ge=0, description="Pagination cursor"),
    limit: int = Query(10, ge=1, le=100, description="Page size"),
) -> Dict[str, Any]:
    """
    Vrati listu svih *dozvoljenih* mečeva za današnji dan u paginiranom wrapper-u.

    Interno:
    - `get_fixtures_next_days()` radi poziv ka API-Football i filtriranje
      (allowlist liga + izbacivanje završenih / otkazanih statusa).
    - `build_match_summary()` pretvara raw fixture u lagani JSON
      spreman za karticu na frontu (liga, timovi, kickoff, status, skor, flagovi...).
    - Lagani odds snapshot se doda samo ako već postoji u cache-u (bez novih API poziva).
    """

    fixtures = api_football.get_fixtures_next_days(2)
    cards: List[Dict[str, Any]] = []
    standings_cache: Dict[tuple[int, int], List[Dict[str, Any]]] = {}

    for fx in fixtures:
        fixture_id = (fx.get("fixture") or {}).get("id")
        summary = build_match_summary(fx)
        league_id = summary.get("league", {}).get("id")
        season = summary.get("league", {}).get("season")
        home_team_id = (summary.get("teams", {}).get("home") or {}).get("id")
        away_team_id = (summary.get("teams", {}).get("away") or {}).get("id")

        odds_flat = None
        if fixture_id:
            odds_key = make_cache_key("odds", {"fixture": fixture_id, "page": 1})
            odds_payload = cache_get(odds_key)
            odds_response = odds_payload.get("response") if isinstance(odds_payload, dict) else None
            if isinstance(odds_response, list) and odds_response:
                try:
                    odds_flat = build_odds_summary(odds_response)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Failed to build odds snapshot for fixture_id=%s: %s", fixture_id, exc
                    )

        card: Dict[str, Any] = {
            "fixture_id": fixture_id,
            "summary": summary,
        }

        if league_id and season and (home_team_id or away_team_id):
            cache_key = (league_id, season)
            standings_payload = standings_cache.get(cache_key)
            if standings_payload is None:
                standings_payload = api_football.get_standings(league_id, season)
                standings_cache[cache_key] = standings_payload

            league_block = (standings_payload[0].get("league") or {}) if standings_payload else {}
            standings_groups = league_block.get("standings") or []
            table_rows = [row for group in standings_groups for row in (group or [])]

            def _find_row(team_id: Optional[int]) -> Optional[Dict[str, Any]]:
                if not team_id:
                    return None
                row = next(
                    (item for item in table_rows if (item.get("team") or {}).get("id") == team_id),
                    None,
                )
                if not row:
                    return None
                return {
                    "rank": row.get("rank"),
                    "points": row.get("points"),
                    "form": row.get("form"),
                    "team": row.get("team"),
                }

            home_standing = _find_row(home_team_id)
            away_standing = _find_row(away_team_id)
            if home_standing or away_standing:
                card["standings_snapshot"] = {
                    "home": home_standing,
                    "away": away_standing,
                }

        if odds_flat:
            card["odds"] = {"flat": odds_flat}
        cards.append(card)

    cards.sort(key=lambda c: (c.get("summary", {}).get("kickoff") or ""))
    total = len(cards)
    start = min(cursor, total)
    end = min(start + limit, total)
    items = cards[start:end]
    next_cursor = end if end < total else None

    logger.info("Today matches requested -> %s cards (cursor=%s, limit=%s)", total, cursor, limit)

    return {"items": items, "next_cursor": next_cursor, "total": total}


@router.get(
    "/matches/top",
    summary="Top mečevi (Top 5 EU lige + UEFA) u card formatu",
    dependencies=[Depends(require_api_key)],
)
def get_top_matches(
    cursor: int = Query(0, ge=0, description="Pagination cursor"),
    limit: int = Query(10, ge=1, le=100, description="Page size"),
) -> Dict[str, Any]:
    """
    Vraća fixtures za naredna 2 dana ali filtrirano samo na TOP_LEAGUE_IDS.
    Output je 1:1 kao /matches/today da frontend može reuse MatchCard.
    """
    fixtures = api_football.get_fixtures_next_days(2)
    cards: List[Dict[str, Any]] = []
    standings_cache: Dict[tuple[int, int], List[Dict[str, Any]]] = {}

    for fx in fixtures:
        fixture_id = (fx.get("fixture") or {}).get("id")
        summary = build_match_summary(fx)

        league_id = (summary.get("league") or {}).get("id")
        if league_id not in set(TOP_LEAGUE_IDS):
            continue

        season = (summary.get("league") or {}).get("season")
        home_team_id = ((summary.get("teams") or {}).get("home") or {}).get("id")
        away_team_id = ((summary.get("teams") or {}).get("away") or {}).get("id")

        odds_flat = None
        if fixture_id:
            odds_key = make_cache_key("odds", {"fixture": fixture_id, "page": 1})
            odds_payload = cache_get(odds_key)
            odds_response = odds_payload.get("response") if isinstance(odds_payload, dict) else None
            if isinstance(odds_response, list) and odds_response:
                try:
                    odds_flat = build_odds_summary(odds_response)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Failed to build odds snapshot for fixture_id=%s: %s", fixture_id, exc)

        card: Dict[str, Any] = {"fixture_id": fixture_id, "summary": summary}

        # standings snapshot (same behavior kao /matches/today)
        if league_id and season and (home_team_id or away_team_id):
            cache_key = (league_id, season)
            standings_payload = standings_cache.get(cache_key)
            if standings_payload is None:
                standings_payload = api_football.get_standings(league_id, season)
                standings_cache[cache_key] = standings_payload

            league_block = (standings_payload[0].get("league") or {}) if standings_payload else {}
            standings_groups = league_block.get("standings") or []
            table_rows = [row for group in standings_groups for row in (group or [])]

            def _find_row(team_id: Optional[int]) -> Optional[Dict[str, Any]]:
                if not team_id:
                    return None
                row = next(
                    (item for item in table_rows if (item.get("team") or {}).get("id") == team_id),
                    None,
                )
                if not row:
                    return None
                return {"rank": row.get("rank"), "points": row.get("points"), "form": row.get("form"), "team": row.get("team")}

            home_standing = _find_row(home_team_id)
            away_standing = _find_row(away_team_id)
            if home_standing or away_standing:
                card["standings_snapshot"] = {"home": home_standing, "away": away_standing}

        if odds_flat:
            card["odds"] = {"flat": odds_flat}

        cards.append(card)

    cards.sort(key=lambda c: (c.get("summary", {}).get("kickoff") or ""))
    total = len(cards)
    start = min(cursor, total)
    end = min(start + limit, total)
    items = cards[start:end]
    next_cursor = end if end < total else None

    logger.info("Top matches requested -> %s cards (cursor=%s, limit=%s)", total, cursor, limit)
    return {"items": items, "next_cursor": next_cursor, "total": total}


@router.get(
    "/matches/{fixture_id}",
    summary="Sažetak jednog meča (card)",
    dependencies=[Depends(require_api_key)],
)
def get_match_summary(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
) -> Dict[str, Any]:
    """
    Vrati sažetak (istu strukturu kao iz `/matches/today`, ali za jedan fixture).

    Ako fixture ne postoji (nije u allowlistu ili je pogrešan ID) -> 404.
    """
    fixture = api_football.get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    return build_match_summary(fixture)


@router.get(
    "/matches/{fixture_id}/full",
    summary="Full kontekst jednog meča (stats, h2h, standings, itd.)",
    dependencies=[Depends(require_api_key)],
)
def get_match_full(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    sections: Optional[str] = Query(
        default=None,
        description="Comma-separated list of sections to include (summary,odds,standings,stats,team_stats,h2h,events,lineups,players,predictions,injuries)",
    ),
) -> Dict[str, Any]:
    """
    Dubinski kontekst jednog meča.

    `build_full_match` na osnovu raw fixture-a gradi bogat JSON:
    - osnovni podaci o meču
    - forma timova
    - H2H
    - standings / pozicije
    - timske statistike
    - predictions, injuries (gde god API-Football ima podatke)
    """
    fixture = api_football.get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    section_set = (
        {part.strip() for part in sections.split(",") if part.strip()}
        if sections
        else None
    )

    full_context = build_full_match(fixture, sections=section_set)

    return full_context


@router.get(
    "/h2h",
    summary="Head-to-head lista za dati fixture (core sekcija)",
    dependencies=[Depends(require_api_key)],
)
def get_h2h_for_fixture(
    fixture_id: int = Query(..., description="API-Football fixture ID"),
) -> Dict[str, Any]:
    """Vraća samo H2H blok za fixture – lagani helper za dedicated ekran."""

    fixture = api_football.get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    teams = fixture.get("teams") or {}
    home_team = teams.get("home") or {}
    away_team = teams.get("away") or {}
    home_team_id = home_team.get("id")
    away_team_id = away_team.get("id")

    if not home_team_id or not away_team_id:
        raise HTTPException(
            status_code=400,
            detail="Missing team IDs for fixture; cannot fetch head-to-head data.",
        )

    h2h_helper = getattr(api_football, "get_fixture_h2h", None) or getattr(
        api_football, "get_h2h", None
    )
    if h2h_helper is None:
        raise HTTPException(status_code=503, detail="H2H helper not available")

    try:
        h2h_block = h2h_helper(fixture_id, home_team_id, away_team_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to fetch h2h for fixture_id=%s: %s", fixture_id, exc)
        raise HTTPException(status_code=502, detail="Failed to fetch h2h data")

    return {
        "fixture_id": fixture_id,
        "home_team_id": home_team_id,
        "away_team_id": away_team_id,
        **(h2h_block or {}),
    }
