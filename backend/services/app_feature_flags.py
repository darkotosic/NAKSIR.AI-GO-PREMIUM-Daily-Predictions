from __future__ import annotations

APP_IDS_WITH_LIVE_AI = {"naksir.go_premium"}


def is_live_ai_enabled(app_id: str) -> bool:
    return app_id in APP_IDS_WITH_LIVE_AI
