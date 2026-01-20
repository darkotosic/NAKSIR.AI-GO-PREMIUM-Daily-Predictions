from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend import api_football
from backend.apps.models import AppContext
from backend.config import TIMEZONE
from backend.dependencies import require_app_context
from backend.db import get_db
from backend.services.ai_analysis_cache_service import (
    get_cached_ok,
    list_cached_ready_for_fixture_ids,
    make_cache_key as make_ai_db_cache_key,
)

logger = logging.getLogger("naksir.go_premium.api")

router = APIRouter(prefix="/btts", tags=["BTTS"])


# ---------- helpers ----------
FilterState = Literal["prematch", "live", "finished", "all"]
Market = Literal["yes", "no"]


def _require_btts_app(app_ctx: AppContext) -> None:
    # Hard guardrail: ovaj router je samo za BTTS app
    if app_ctx.app_id != "btts.predictor":
        raise HTTPException(status_code=403, detail="BTTS endpoints require X-App-Id=btts.predictor")


def _state_from_fixture(fx: dict[str, Any]) -> str:
    st = ((fx.get("fixture") or {}).get("status") or {})
    short = (st.get("short") or "").upper()
    # API-Football status mapping (pragmatično)
    if short in {"FT", "AET", "PEN"}:
        return "finished"
    if short in {"1H", "2H", "HT", "ET", "BT", "P"}:
        return "live"
    return "prematch"


def _build_flashscore_item(fx: dict[str, Any], *, btts_badge: dict[str, Any] | None) -> dict[str, Any]:
    fixture = fx.get("fixture") or {}
    league = fx.get("league") or {}
    teams = fx.get("teams") or {}
    goals = fx.get("goals") or {}
    status = fixture.get("status") or {}

    home = (teams.get("home") or {})
    away = (teams.get("away") or {})

    state = _state_from_fixture(fx)
    minute = None
    if state == "live":
        minute = (fixture.get("periods") or {}).get("first")  # fallback; API-Football minute varira
        # ako ima elapsed:
        elapsed = status.get("elapsed")
        if isinstance(elapsed, int):
            minute = elapsed

    item = {
        "fixture_id": fixture.get("id"),
        "league": {
            "id": league.get("id"),
            "name": league.get("name"),
            "country": league.get("country"),
            "logo": league.get("logo"),
        },
        "status": {
            "short": status.get("short"),
            "state": state,
        },
        "kickoff": fixture.get("date"),
        "timestamp": fixture.get("timestamp"),
        "home": {"id": home.get("id"), "name": home.get("name"), "logo": home.get("logo")},
        "away": {"id": away.get("id"), "name": away.get("name"), "logo": away.get("logo")},
        "score": {
            "home": goals.get("home"),
            "away": goals.get("away"),
        },
        "minute": minute,
        "btts_badge": btts_badge,
    }
    return item


def _badge_from_cached_ai(cached_json: dict[str, Any] | None) -> dict[str, Any] | None:
    if not cached_json:
        return None
    # očekujemo da analysis_json ima "analysis" ili direktan objekat; i eventualno odds_probabilities
    analysis = cached_json.get("analysis", cached_json)
    btts = None
    reason_short = None
    if isinstance(analysis, dict):
        reason_short = analysis.get("reasoning_short") or analysis.get("summary")
        btts = analysis.get("btts") or analysis.get("BTTS")
    if not isinstance(btts, dict):
        return None

    yes_pct = btts.get("yes_pct")
    no_pct = btts.get("no_pct")
    rec = btts.get("recommended_btts_market") or btts.get("recommended")  # tolerantno
    conf = btts.get("confidence_pct") or btts.get("confidence")
    if not reason_short:
        reason_short = btts.get("reasoning_short")

    return {
        "yes_pct": yes_pct,
        "no_pct": no_pct,
        "recommended": rec,
        "confidence": conf,
        "reason_short": reason_short,
    }


def _fetch_fixtures_for_day(offset_days: int) -> list[dict[str, Any]]:
    # Reuse API layer; idealno: postoji cached endpoint u api_football
    # Ako nema, koristi get_fixtures_today + get_fixtures_by_date; zavisi od tvoje implementacije.
    if offset_days == 0:
        return api_football.get_fixtures_today()  # mora postojati u projektu
    if offset_days == 1:
        tz = ZoneInfo(TIMEZONE)
        tomorrow = datetime.now(tz).date() + timedelta(days=1)
        return api_football.get_fixtures_by_date(tomorrow.isoformat())
    raise ValueError("offset_days must be 0 (today) or 1 (tomorrow)")


def _filter_items(items: list[dict[str, Any]], state: FilterState) -> list[dict[str, Any]]:
    if state == "all":
        return items
    return [it for it in items if (it.get("status") or {}).get("state") == state]


def _build_btts_badge_map(
    session: Session,
    fixture_ids: list[int],
    *,
    app_id: str,
    prompt_version: str = "btts-v1",
    locale: str = "en",
) -> dict[int, dict[str, Any]]:
    """
    1 DB query: uzmi sve READY cached rows za fixture_ids.
    Zatim pretvori analysis_json u btts_badge mapu.
    """
    cached_rows = list_cached_ready_for_fixture_ids(session, fixture_ids, app_id=app_id)

    out: dict[int, dict[str, Any]] = {}
    for fid, row in cached_rows.items():
        if not row or not row.analysis_json:
            continue

        badge = _badge_from_cached_ai(row.analysis_json)
        if badge:
            out[int(fid)] = badge
    return out


# ---------- routes ----------
@router.get("/matches/today")
def btts_matches_today(
    filter: FilterState = Query("all"),
    limit: int = Query(200, ge=1, le=500),
    include_badge: bool = Query(True, description="Attach BTTS badge if cached AI exists"),
    app_ctx: AppContext = Depends(require_app_context),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    _require_btts_app(app_ctx)
    fixtures = _fetch_fixtures_for_day(0)

    app_id = app_ctx.app_id

    fixture_ids: list[int] = []
    for fx in fixtures:
        fid = ((fx.get("fixture") or {}).get("id"))
        if isinstance(fid, int):
            fixture_ids.append(fid)

    badge_map: dict[int, dict[str, Any]] = {}
    if include_badge and fixture_ids:
        badge_map = _build_btts_badge_map(
            session,
            fixture_ids,
            app_id=app_id,
            prompt_version="btts-v1",
            locale="en",
        )

    items: list[dict[str, Any]] = []
    for fx in fixtures:
        fid = ((fx.get("fixture") or {}).get("id"))
        btts_badge = badge_map.get(fid) if isinstance(fid, int) else None
        items.append(_build_flashscore_item(fx, btts_badge=btts_badge))

    items = _filter_items(items, filter)
    items = items[:limit]
    return {"items": items, "total": len(items), "day": "today"}


@router.get("/matches/tomorrow")
def btts_matches_tomorrow(
    filter: FilterState = Query("all"),
    limit: int = Query(200, ge=1, le=500),
    include_badge: bool = Query(True),
    app_ctx: AppContext = Depends(require_app_context),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    _require_btts_app(app_ctx)
    fixtures = _fetch_fixtures_for_day(1)

    app_id = app_ctx.app_id

    fixture_ids: list[int] = []
    for fx in fixtures:
        fid = ((fx.get("fixture") or {}).get("id"))
        if isinstance(fid, int):
            fixture_ids.append(fid)

    badge_map: dict[int, dict[str, Any]] = {}
    if include_badge and fixture_ids:
        badge_map = _build_btts_badge_map(
            session,
            fixture_ids,
            app_id=app_id,
            prompt_version="btts-v1",
            locale="en",
        )

    items: list[dict[str, Any]] = []
    for fx in fixtures:
        fid = ((fx.get("fixture") or {}).get("id"))
        btts_badge = badge_map.get(fid) if isinstance(fid, int) else None
        items.append(_build_flashscore_item(fx, btts_badge=btts_badge))

    items = _filter_items(items, filter)
    items = items[:limit]
    return {"items": items, "total": len(items), "day": "tomorrow"}


@router.get("/matches/top3-today")
def btts_top3_today(
    market: Market = Query("yes"),
    app_ctx: AppContext = Depends(require_app_context),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    _require_btts_app(app_ctx)
    fixtures = _fetch_fixtures_for_day(0)
    app_id = app_ctx.app_id

    scored: list[tuple[float, dict[str, Any]]] = []
    for fx in fixtures:
        fid = ((fx.get("fixture") or {}).get("id"))
        if not isinstance(fid, int):
            continue
        ck = make_ai_db_cache_key(fixture_id=fid, prompt_version="btts-v1", locale="en")
        cached = get_cached_ok(session, ck, app_id=app_id)
        if not cached or not cached.analysis_json:
            continue
        badge = _badge_from_cached_ai(cached.analysis_json)
        if not badge:
            continue

        score = badge.get("yes_pct") if market == "yes" else badge.get("no_pct")
        try:
            score_f = float(score)
        except Exception:
            continue
        item = _build_flashscore_item(fx, btts_badge=badge)
        item["featured"] = {
            "headline": f"BTTS {market.upper()} {int(score_f)}%",
            "reason_short": (badge.get("reason_short") if isinstance(badge, dict) else None),
            "market": market,
        }
        scored.append((score_f, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_items = [it for _, it in scored[:3]]
    return {"items": top_items, "total": len(top_items), "day": "today", "market": market}
