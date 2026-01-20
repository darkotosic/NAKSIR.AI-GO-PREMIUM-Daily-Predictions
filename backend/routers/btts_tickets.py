from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from backend.apps.models import AppContext
from backend.cache import cache_get_json, cache_set_json
from backend.contracts.btts_ticket import DailyBttsTicketsResponse
from backend.dependencies import require_app_context
from backend.services.btts_service import get_btts_today_fixtures
from backend.services.btts_ticket_engine import build_daily_btts_tickets

router = APIRouter(prefix="/btts/tickets", tags=["BTTS Tickets"])


def _require_btts_app(app_ctx: AppContext) -> None:
    if app_ctx.app_id != "btts.predictor":
        raise HTTPException(status_code=403, detail="BTTS endpoints require X-App-Id=btts.predictor")


@router.get("/today", response_model=DailyBttsTicketsResponse)
def get_btts_tickets_today(app_ctx: AppContext = Depends(require_app_context)) -> DailyBttsTicketsResponse:
    _require_btts_app(app_ctx)
    today = date.today()
    cache_key = f"btts:daily:tickets:{today.isoformat()}"

    cached = cache_get_json(cache_key)
    if cached:
        return DailyBttsTicketsResponse.model_validate(cached)

    fixtures = get_btts_today_fixtures()
    top_league_ids = set(app_ctx.config.top_league_ids or [])

    result = build_daily_btts_tickets(today=today, fixtures=fixtures, top_league_ids=top_league_ids)

    cache_set_json(cache_key, result.model_dump(), ttl_seconds=30 * 60)
    return result
