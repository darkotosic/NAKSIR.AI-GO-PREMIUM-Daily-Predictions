from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend import api_football
from backend.ai_analysis import build_fallback_analysis, run_ai_analysis
from backend.cache import cache_get, cache_set
from backend.config import TIMEZONE
from backend.db import get_db
from backend.dependencies import require_api_key
from backend.match_full import build_full_match
from backend.services.ai_analysis_cache_service import (
    get_cached_ok,
    get_cached_row,
    make_cache_key,
    save_failed,
    save_ok,
    try_mark_generating,
    wait_for_ready,
)
from backend.services.entitlements_service import check_and_consume_ai, get_active_entitlement
from backend.services.users_service import get_or_create_user

router = APIRouter(tags=["ai"])
logger = logging.getLogger("naksir.go_premium.api")

UNLOCK_REQUIRED_PAYLOAD = {
    "detail": "Unlock required",
    "code": "UNLOCK_REQUIRED",
    "actions": ["WATCH_AD", "BUY_SUBSCRIPTION"],
}
REWARDED_DAILY_LIMIT = 200
REWARDED_LIMIT_TTL_SECONDS = int(timedelta(days=1).total_seconds())


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


def _reward_limit_key(install_id: str) -> str:
    today = datetime.now(timezone.utc).date().isoformat()
    return f"ai:rewarded:{install_id}:{today}"


def _increment_reward_limit(install_id: str) -> bool:
    key = _reward_limit_key(install_id)
    data = cache_get(key) or {"count": 0}
    count = int(data.get("count", 0))
    if count >= REWARDED_DAILY_LIMIT:
        return False
    data["count"] = count + 1
    cache_set(key, data, ttl_seconds=REWARDED_LIMIT_TTL_SECONDS)
    return True


def _unlock_required_response() -> JSONResponse:
    return JSONResponse(status_code=402, content=UNLOCK_REQUIRED_PAYLOAD)


@router.get(
    "/matches/{fixture_id}/ai-analysis",
    summary="Cached AI analiza meča (read-only)",
    dependencies=[Depends(require_api_key)],
)
def get_match_ai_analysis(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    install_id: Optional[str] = Header(None, alias="X-Install-Id"),
    session: Session = Depends(get_db),
) -> Dict[str, Any] | JSONResponse:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    user, _wallet = get_or_create_user(session, install_id)
    now = datetime.now(timezone.utc)
    entitlement = get_active_entitlement(session, user.id, now=now)
    if entitlement is None:
        return _unlock_required_response()

    cache_key = make_cache_key(fixture_id=fixture_id, version="v1", lang="en", model="default")
    row = get_cached_row(session, cache_key)
    if not row:
        raise HTTPException(status_code=404, detail="No cached analysis yet")

    if row.status == "ok" and row.analysis_json:
        return {
            "cached": True,
            "cache_key": cache_key,
            "analysis": row.analysis_json,
        }

    if row.status == "generating":
        raise HTTPException(
            status_code=202,
            detail="Analysis is generating. Try again shortly.",
        )

    raise HTTPException(
        status_code=503,
        detail="AI analysis temporarily unavailable (cached generation failed).",
    )


@router.post(
    "/matches/{fixture_id}/ai-analysis",
    summary="AI analiza meča (GPT layer preko full konteksta)",
    dependencies=[Depends(require_api_key)],
)
def post_match_ai_analysis(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    payload: AIAnalysisRequest = Body(
        default_factory=AIAnalysisRequest,
        description="Opcioni user prompt kojim se usmerava AI analiza.",
    ),
    install_id: Optional[str] = Header(None, alias="X-Install-Id"),
    session: Session = Depends(get_db),
) -> Dict[str, Any] | JSONResponse:
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

    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    user, _wallet = get_or_create_user(session, install_id)
    now = datetime.now(timezone.utc)
    entitlement = get_active_entitlement(session, user.id, now=now)
    is_subscribed = entitlement is not None
    is_rewarded = bool(payload.trial_by_reward)
    if not (is_subscribed or is_rewarded):
        return _unlock_required_response()

    if is_subscribed:
        ok, reason = check_and_consume_ai(session, user.id, entitlement, now=now)
        if not ok:
            session.rollback()
            raise HTTPException(status_code=429, detail=reason or "Limit reached")
        session.commit()

    cache_key = make_cache_key(fixture_id=fixture_id, version="v1", lang="en", model="default")
    cached = get_cached_ok(session, cache_key)
    if cached:
        cached_payload = cached.analysis_json or {}
        return {
            "fixture_id": fixture_id,
            "generated_at": datetime.now().isoformat(),
            "timezone": TIMEZONE,
            "question": user_question,
            "analysis": cached_payload.get("analysis", cached_payload),
            "odds_probabilities": cached_payload.get("odds_probabilities"),
            "cached": True,
            "cache_key": cache_key,
        }

    if not is_subscribed:
        if not _increment_reward_limit(install_id):
            raise HTTPException(
                status_code=429,
                detail="Daily rewarded unlock limit reached",
            )

    acquired = try_mark_generating(
        session,
        fixture_id=fixture_id,
        cache_key=cache_key,
        version="v1",
        lang="en",
        model="default",
    )
    if not acquired:
        ready = wait_for_ready(cache_key)
        if ready and ready.status == "ok" and ready.analysis_json:
            cached_payload = ready.analysis_json or {}
            return {
                "fixture_id": fixture_id,
                "generated_at": datetime.now().isoformat(),
                "timezone": TIMEZONE,
                "question": user_question,
                "analysis": cached_payload.get("analysis", cached_payload),
                "odds_probabilities": cached_payload.get("odds_probabilities"),
                "cached": True,
                "cache_key": cache_key,
            }
        if ready and ready.status == "failed":
            raise HTTPException(
                status_code=503,
                detail="AI analysis temporarily unavailable (generation failed). Try again.",
            )
        raise HTTPException(
            status_code=504,
            detail="AI analysis is generating. Try again in a moment.",
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
        return {
            "fixture_id": fixture_id,
            "generated_at": datetime.now().isoformat(),
            "timezone": TIMEZONE,
            "question": user_question,
            "analysis": analysis,
            "odds_probabilities": odds_probabilities,
            "cached": False,
            "cache_key": cache_key,
        }
    except Exception as exc:  # noqa: BLE001
        save_failed(session, cache_key=cache_key, fixture_id=fixture_id, error=str(exc))
        raise HTTPException(status_code=500, detail="AI analysis failed") from exc
