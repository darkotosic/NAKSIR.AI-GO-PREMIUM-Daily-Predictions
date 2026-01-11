from __future__ import annotations

from functools import lru_cache

from fastapi import Request

from backend.apps.models import AppConfig
from backend.config import ALLOW_LIST, TOP_LEAGUE_IDS


DEFAULT_APP_ID = "naksir.go_premium"
APP_ID_HEADER = "X-App-Id"


def resolve_app_id(request: Request) -> str:
    """Resolve the app_id for the current request.

    Phase 1: optional header. If missing, return DEFAULT_APP_ID.
    """
    raw = (request.headers.get(APP_ID_HEADER) or "").strip()
    return raw or DEFAULT_APP_ID


@lru_cache
def _shared_config() -> AppConfig:
    # Phase 1: identical policy across all apps.
    return AppConfig(allow_list=list(ALLOW_LIST), top_league_ids=list(TOP_LEAGUE_IDS))


def get_app_config(app_id: str) -> AppConfig:
    """Get AppConfig for the given app_id.

    Phase 1: shared config.
    """
    _ = app_id  # reserved for Phase 2 per-app configs
    return _shared_config()
