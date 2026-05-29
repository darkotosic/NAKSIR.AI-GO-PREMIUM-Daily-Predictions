from __future__ import annotations

from backend.apps.registry import get_app_config


def is_live_ai_enabled(app_id: str) -> bool:
    return bool(get_app_config(app_id).live_ai_enabled)
