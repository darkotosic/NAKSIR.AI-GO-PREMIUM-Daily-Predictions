from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends

from backend import api_football
from backend.cache import cache_get, make_cache_key
from backend.config import TIMEZONE, settings
from backend.dependencies import require_api_key
from backend import cache as cache_module

router = APIRouter(tags=["debug"], dependencies=[Depends(require_api_key)])


def _redis_status() -> tuple[bool, bool]:
    redis_configured = bool(settings.redis_url)
    redis_ok = False
    backend = cache_module._BACKEND
    if isinstance(backend, cache_module.RedisCacheBackend):
        try:
            redis_ok = bool(backend.client.ping())
        except Exception:
            redis_ok = False
    return redis_ok, redis_configured


def _fixtures_cache_status(days: int = 2) -> dict[str, Any]:
    tz = ZoneInfo(TIMEZONE)
    today = datetime.now(tz).date()
    cached_dates: list[str] = []
    for offset in range(max(1, days)):
        day = today + timedelta(days=offset)
        cache_key = make_cache_key("fixtures", {"date": day.isoformat(), "timezone": TIMEZONE})
        if cache_get(cache_key):
            cached_dates.append(day.isoformat())
    last_fetch = None
    if api_football.LAST_FIXTURES_NEXT_FETCH:
        last_fetch = datetime.fromtimestamp(api_football.LAST_FIXTURES_NEXT_FETCH, tz=tz).isoformat()
    return {
        "cache_entries": len(cached_dates),
        "cached_dates": cached_dates,
        "last_fetch_at": last_fetch,
        "last_error": api_football.LAST_FIXTURES_NEXT_ERROR,
    }


@router.get("/_debug/ops")
def ops() -> dict[str, Any]:
    redis_ok, redis_configured = _redis_status()
    fixtures_cache = _fixtures_cache_status(2)
    return {
        "redis_ok": redis_ok,
        "redis_configured": redis_configured,
        "fixtures_next_2_days": fixtures_cache,
    }
