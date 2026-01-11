from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader

from backend.apps.models import AppContext
from backend.apps.registry import get_app_config, resolve_app_id
from backend.config import get_settings

api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
logger = logging.getLogger("naksir.go_premium.api")


def _mask(token: str | None) -> str:
    if not token:
        return "<missing>"
    token = token.strip()
    if len(token) <= 8:
        return "***"
    return f"{token[:4]}...{token[-4:]}"


def require_api_key(
    request: Request, api_key: Optional[str] = Depends(api_key_scheme)
) -> str:
    settings = get_settings()
    logger.info("Auth header X-API-Key=%s", _mask(request.headers.get("X-API-Key")))
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key")

    allowed_tokens = {token.strip() for token in settings.api_auth_tokens if token.strip()}
    if not allowed_tokens and settings.app_env.value == "dev" and settings.allow_dev_fallback:
        allowed_tokens = {"dev-token"}

    if api_key not in allowed_tokens:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


def require_app_context(
    request: Request,
    api_key: str = Depends(require_api_key),
) -> AppContext:
    """Request-scoped AppContext.

    Phase 1:
    - app_id is optional via X-App-Id
    - config is shared across apps (ALLOW_LIST/TOP_LEAGUE_IDS)
    - existing clients can ignore X-App-Id entirely
    """

    app_id = resolve_app_id(request)
    config = get_app_config(app_id)
    return AppContext(app_id=app_id, api_key=api_key, config=config)
