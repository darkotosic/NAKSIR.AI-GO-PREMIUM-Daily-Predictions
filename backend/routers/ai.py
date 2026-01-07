from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Path, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend import api_football
from backend.ai_analysis import build_fallback_analysis, run_ai_analysis
from backend.config import TIMEZONE
from backend.db import get_db
from backend.dependencies import require_api_key
from backend.match_full import build_full_match, build_match_summary
from backend.services.ai_analysis_cache_service import (
    READY_STATUSES,
    get_cached_ok,
    get_cached_row,
    make_cache_key,
    save_failed,
    save_ok,
    try_mark_generating,
    wait_for_ready,
    list_cached_ready_for_fixture_ids,
)
from backend.services.users_service import get_or_create_user

router = APIRouter(tags=["ai"])
logger = logging.getLogger("naksir.go_premium.api")

class AIAnalysisRequest(BaseModel):
    """Optionalni prompt korisnika za AI analizu meča."""

    question: Optional[str] = Field(
        default=None,
        description="Dodatno objašnjenje šta tačno AI treba da naglasi (npr. 'objasni value bet', 'short TikTok opis', itd.)",
    )
    trial_by_reward: bool = Field(
        default=False,
        description="Rewarded ad unlock za AI analizu.",
    )


def _require_install_id(install_id: Optional[str]) -> None:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")


def _enforce_ai_access(
    session: Session,
    *,
    user_id: int,
    trial_by_reward: bool,
    consume: bool,
    wallet,
    mark_reward: bool = True,
) -> None:
    _ = session, user_id, trial_by_reward, consume, wallet, mark_reward
    return


def _cache_headers(cache_key: str, cache_status: str) -> dict[str, str]:
    return {"X-Cache": cache_status, "X-Cache-Key": cache_key}


@router.get(
    "/matches/{fixture_id}/ai-analysis",
    summary="Cached AI analiza meča (read-only)",
    dependencies=[Depends(require_api_key)],
    response_model=None,
)
def get_match_ai_analysis(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    install_id: Optional[str] = Header(None, alias="X-Install-Id"),
    session: Session = Depends(get_db),
) -> Any:
    _require_install_id(install_id)

    user, wallet = get_or_create_user(session, install_id)
    _enforce_ai_access(session, user_id=user.id, trial_by_reward=False, consume=False, wallet=wallet)

    cache_key = make_cache_key(
        fixture_id=fixture_id,
        prompt_version="v1",
        locale="en",
    )
    row = get_cached_row(session, cache_key)
    if not row:
        logger.info("AI cache MISS fixture_id=%s cache_key=%s", fixture_id, cache_key)
        return JSONResponse(
            status_code=404,
            content={"status": "not_found"},
            headers=_cache_headers(cache_key, "MISS"),
        )

    if row.status in READY_STATUSES and row.analysis_json:
        logger.info("AI cache HIT fixture_id=%s cache_key=%s", fixture_id, cache_key)
        payload = {
            "fixture_id": fixture_id,
            "generated_at": row.updated_at.isoformat() if row.updated_at else None,
            "timezone": TIMEZONE,
            "analysis": row.analysis_json.get("analysis", row.analysis_json),
            "odds_probabilities": row.analysis_json.get("odds_probabilities"),
            "cached": True,
            "cache_key": cache_key,
        }
        return JSONResponse(status_code=200, content=payload, headers=_cache_headers(cache_key, "HIT"))

    if row.status == "generating":
        logger.info("AI cache WAIT fixture_id=%s cache_key=%s", fixture_id, cache_key)
        return JSONResponse(
            status_code=202,
            content={"status": "generating"},
            headers=_cache_headers(cache_key, "WAIT"),
        )

    logger.info("AI cache FAILED fixture_id=%s cache_key=%s", fixture_id, cache_key)
    return JSONResponse(
        status_code=503,
        content={
            "status": "failed",
            "message": row.error or "AI analysis temporarily unavailable.",
        },
        headers=_cache_headers(cache_key, "FAIL"),
    )


@router.post(
    "/matches/{fixture_id}/ai-analysis",
    summary="AI analiza meča (GPT layer preko full konteksta)",
    dependencies=[Depends(require_api_key)],
    response_model=None,
)
def post_match_ai_analysis(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    payload: AIAnalysisRequest = Body(
        default_factory=AIAnalysisRequest,
        description="Opcioni user prompt kojim se usmerava AI analiza.",
    ),
    install_id: Optional[str] = Header(None, alias="X-Install-Id"),
    session: Session = Depends(get_db),
) -> Any:
    """
    GPT analiza konkretnog meča.

    Flow:
    1) Dohvati se fixture (`get_fixture_by_id`).
    2) Od njega se napravi full kontekst (`build_full_match`).
    3) Taj kontekst + opcioni `question` se šalju u `run_ai_analysis`.
    """
    user_question = payload.question.strip() if payload.question else None
    logger.info(
        "AI analysis requested for fixture_id=%s (custom_question=%s)",
        fixture_id,
        bool(user_question),
    )

    _require_install_id(install_id)

    user, wallet = get_or_create_user(session, install_id)
    _enforce_ai_access(
        session,
        user_id=user.id,
        trial_by_reward=payload.trial_by_reward,
        consume=False,
        wallet=wallet,
        mark_reward=False,
    )

    cache_key = make_cache_key(
        fixture_id=fixture_id,
        prompt_version="v1",
        locale="en",
    )
    cached = get_cached_ok(session, cache_key)
    if cached:
        cached_payload = cached.analysis_json or {}
        logger.info("AI cache HIT fixture_id=%s cache_key=%s", fixture_id, cache_key)
        return JSONResponse(
            status_code=200,
            content={
                "fixture_id": fixture_id,
                "generated_at": datetime.now().isoformat(),
                "timezone": TIMEZONE,
                "question": user_question,
                "analysis": cached_payload.get("analysis", cached_payload),
                "odds_probabilities": cached_payload.get("odds_probabilities"),
                "cached": True,
                "cache_key": cache_key,
            },
            headers=_cache_headers(cache_key, "HIT"),
        )

    acquired = try_mark_generating(
        session,
        fixture_id=fixture_id,
        cache_key=cache_key,
        prompt_version="v1",
        locale="en",
        model="default",
    )
    if not acquired:
        row = get_cached_row(session, cache_key)
        if row and row.status in READY_STATUSES and row.analysis_json:
            cached_payload = row.analysis_json or {}
            logger.info("AI cache HIT fixture_id=%s cache_key=%s", fixture_id, cache_key)
            return JSONResponse(
                status_code=200,
                content={
                    "fixture_id": fixture_id,
                    "generated_at": datetime.now().isoformat(),
                    "timezone": TIMEZONE,
                    "question": user_question,
                    "analysis": cached_payload.get("analysis", cached_payload),
                    "odds_probabilities": cached_payload.get("odds_probabilities"),
                    "cached": True,
                    "cache_key": cache_key,
                },
                headers=_cache_headers(cache_key, "HIT"),
            )
        if row and row.status == "failed":
            logger.info("AI cache FAILED fixture_id=%s cache_key=%s", fixture_id, cache_key)
            return JSONResponse(
                status_code=503,
                content={
                    "status": "failed",
                    "message": row.error or "AI analysis temporarily unavailable.",
                },
                headers=_cache_headers(cache_key, "FAIL"),
            )

        ready = wait_for_ready(cache_key)
        if ready and ready.status in READY_STATUSES and ready.analysis_json:
            cached_payload = ready.analysis_json or {}
            logger.info("AI cache WAIT->HIT fixture_id=%s cache_key=%s", fixture_id, cache_key)
            return JSONResponse(
                status_code=200,
                content={
                    "fixture_id": fixture_id,
                    "generated_at": datetime.now().isoformat(),
                    "timezone": TIMEZONE,
                    "question": user_question,
                    "analysis": cached_payload.get("analysis", cached_payload),
                    "odds_probabilities": cached_payload.get("odds_probabilities"),
                    "cached": True,
                    "cache_key": cache_key,
                },
                headers=_cache_headers(cache_key, "WAIT"),
            )
        if ready and ready.status == "failed":
            logger.info("AI cache WAIT->FAIL fixture_id=%s cache_key=%s", fixture_id, cache_key)
            return JSONResponse(
                status_code=503,
                content={
                    "status": "failed",
                    "message": ready.error or "AI analysis temporarily unavailable.",
                },
                headers=_cache_headers(cache_key, "FAIL"),
            )
        logger.info("AI cache WAIT fixture_id=%s cache_key=%s", fixture_id, cache_key)
        return JSONResponse(
            status_code=202,
            content={"status": "generating"},
            headers=_cache_headers(cache_key, "WAIT"),
        )

    _enforce_ai_access(
        session,
        user_id=user.id,
        trial_by_reward=payload.trial_by_reward,
        consume=True,
        wallet=wallet,
        mark_reward=True,
    )

    fixture = None
    fixture_error_reason: str | None = None
    try:
        try:
            fixture = api_football.get_fixture_by_id(fixture_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to fetch fixture_id=%s from API-Football: %s", fixture_id, exc
            )
            fixture_error_reason = f"API-Football fetch failed: {exc}"

        if not fixture:
            analysis = build_fallback_analysis(
                fixture_error_reason or "fixture not found or API-Football unavailable"
            )
            odds_probabilities = None
        else:
            try:
                full_context = build_full_match(fixture)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to build full match context for fixture_id=%s: %s",
                    fixture_id,
                    exc,
                )
                full_context = None
                context_error_reason = f"context build failed: {exc}"
            else:
                context_error_reason = None

            if not full_context:
                analysis = build_fallback_analysis(
                    context_error_reason or "context build failed"
                )
                odds_probabilities = None
            else:
                odds_section = full_context.get("odds") or {}
                odds_probabilities = None
                if isinstance(odds_section, dict):
                    odds_probabilities = odds_section.get("flat_probabilities")

                analysis = run_ai_analysis(
                    full_match=full_context,
                    user_question=user_question,
                )

        save_ok(
            session,
            cache_key=cache_key,
            fixture_id=fixture_id,
            analysis_json={
                "analysis": analysis,
                "odds_probabilities": odds_probabilities,
            },
        )
        logger.info("AI cache MISS fixture_id=%s cache_key=%s", fixture_id, cache_key)
        return JSONResponse(
            status_code=200,
            content={
                "fixture_id": fixture_id,
                "generated_at": datetime.now().isoformat(),
                "timezone": TIMEZONE,
                "question": user_question,
                "analysis": analysis,
                "odds_probabilities": odds_probabilities,
                "cached": False,
                "cache_key": cache_key,
            },
            headers=_cache_headers(cache_key, "MISS"),
        )
    except Exception as exc:  # noqa: BLE001
        save_failed(session, cache_key=cache_key, fixture_id=fixture_id, error=str(exc))
        logger.exception("AI analysis failed fixture_id=%s cache_key=%s", fixture_id, cache_key)
        return JSONResponse(
            status_code=500,
            content={"status": "failed", "message": "AI analysis failed"},
            headers=_cache_headers(cache_key, "FAIL"),
        )


@router.get(
    "/ai/cached-matches",
    summary="Lista mečeva (naredni dani) koji imaju cached AI analizu",
    dependencies=[Depends(require_api_key)],
)
def get_cached_ai_matches(
    days: int = Query(3, ge=1, le=14, description="Number of days ahead to include"),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Frontend koristi za 'Naksir AI' tab: prikaz samo mečeva koji već imaju cached AI analizu.
    Strategija:
      1) fixtures next N days (1 API call / cache)
      2) 1 DB query IN(fixture_ids) za READY cache
      3) output: items = [{fixture_id, summary, generated_at}]
    """
    fixtures = api_football.get_fixtures_next_days(days)
    fixture_ids: list[int] = []
    fixture_by_id: dict[int, Any] = {}
    for fx in fixtures:
        fid = (fx.get("fixture") or {}).get("id")
        if isinstance(fid, int):
            fixture_ids.append(fid)
            fixture_by_id[fid] = fx

    cached_map = list_cached_ready_for_fixture_ids(session, fixture_ids)

    items: list[dict[str, Any]] = []
    for fid, row in cached_map.items():
        fx = fixture_by_id.get(fid)
        if not fx:
            continue
        summary = build_match_summary(fx)
        items.append(
            {
                "fixture_id": fid,
                "summary": summary,
                "generated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        )

    items.sort(key=lambda x: (x.get("summary", {}).get("kickoff") or ""))
    return {"items": items, "total": len(items)}
