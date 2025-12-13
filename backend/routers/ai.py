from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend import api_football
from backend.ai_analysis import build_fallback_analysis, run_ai_analysis
from backend.config import TIMEZONE
from backend.db import get_db
from backend.dependencies import require_api_key
from backend.match_full import build_full_match
from backend.services.entitlements_service import check_and_consume_ai, get_active_entitlement
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
        description="Besplatna nagrada uz rewarded ad; server enforce-uje da se iskoristi najviše jednom",
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
) -> Dict[str, Any]:
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

    user, wallet = get_or_create_user(session, install_id)

    now = datetime.now(timezone.utc)
    entitlement = get_active_entitlement(session, user.id, now=now)

    if entitlement is not None:
        ok, reason = check_and_consume_ai(session, user.id, entitlement, now=now)
        if not ok:
            session.rollback()
            raise HTTPException(status_code=429, detail=reason or "Limit reached")
        session.commit()
    else:
        if not payload.trial_by_reward:
            raise HTTPException(status_code=402, detail="Subscription required")

        if wallet.free_reward_used:
            raise HTTPException(status_code=402, detail="Subscription required")

        wallet.free_reward_used = True
        session.add(wallet)
        session.commit()

    fixture = None
    fixture_error_reason: str | None = None
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

    return {
        "fixture_id": fixture_id,
        "generated_at": datetime.now().isoformat(),
        "timezone": TIMEZONE,
        "question": user_question,
        "analysis": analysis,
        "odds_probabilities": odds_probabilities,
    }
