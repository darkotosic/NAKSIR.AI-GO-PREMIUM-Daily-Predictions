from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader

from backend.apps.models import AppContext
from backend.apps.registry import get_app_config, resolve_app_id
from backend.config import get_settings

api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
API_KEY_HEADER_PRIMARY = "X-API-Key"
API_KEY_HEADER_ALIAS = "X-Client-Key"
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

    # Primary: X-API-Key (existing contract)
    # Alias:   X-Client-Key (BTTS app contract)
    header_primary = (request.headers.get(API_KEY_HEADER_PRIMARY) or "").strip()
    header_alias = (request.headers.get(API_KEY_HEADER_ALIAS) or "").strip()

    effective_key = header_primary or header_alias or (api_key or "").strip()

    logger.info(
        "Auth headers %s=%s %s=%s",
        API_KEY_HEADER_PRIMARY,
        _mask(header_primary),
        API_KEY_HEADER_ALIAS,
        _mask(header_alias),
    )

    if not effective_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    allowed_tokens = {token.strip() for token in settings.api_auth_tokens if token.strip()}
    if not allowed_tokens and settings.app_env.value == "dev" and settings.allow_dev_fallback:
        allowed_tokens = {"dev-token"}

    if effective_key not in allowed_tokens:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return effective_key


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
