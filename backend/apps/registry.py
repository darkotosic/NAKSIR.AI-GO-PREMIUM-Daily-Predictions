from __future__ import annotations

import os
from functools import lru_cache

from fastapi import Request

from backend.apps.models import AppConfig
from backend.config import ALLOW_LIST, TOP_LEAGUE_IDS


DEFAULT_APP_ID = "naksir.go_premium"
VIP_APP_ID = "naksir.vip"
APP_ID_HEADER = "X-App-Id"

GO_PREMIUM_PACKAGE = os.getenv("GOOGLE_PLAY_PACKAGE_NAME", "com.naksir.soccerpredictions")
VIP_PACKAGE = os.getenv("GOOGLE_PLAY_PACKAGE_NAME_VIP", "com.naksir.soccerpredictions.vip")


def resolve_app_id(request: Request) -> str:
    """Resolve the app_id for the current request.

    The header stays optional so existing clients remain backward-compatible.
    """
    raw = (request.headers.get(APP_ID_HEADER) or "").strip()
    return raw or DEFAULT_APP_ID


def _base_config(**overrides: object) -> AppConfig:
    return AppConfig(
        allow_list=list(ALLOW_LIST),
        top_league_ids=list(TOP_LEAGUE_IDS),
        **overrides,
    )


@lru_cache
def _registry() -> dict[str, AppConfig]:
    return {
        DEFAULT_APP_ID: _base_config(
            android_package_name=GO_PREMIUM_PACKAGE,
            live_ai_enabled=True,
            requires_entitlement_for_ai=False,
        ),
        VIP_APP_ID: _base_config(
            android_package_name=VIP_PACKAGE,
            live_ai_enabled=True,
            requires_entitlement_for_ai=True,
        ),
    }


def get_app_config(app_id: str) -> AppConfig:
    """Get AppConfig for the given app_id.

    Unknown app IDs keep the shared league policy and conservative feature flags,
    preserving existing behavior for non-VIP app-specific cache isolation.
    """
    return _registry().get(app_id) or _base_config()
