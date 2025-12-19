from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader

from backend.config import get_settings

api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(api_key: Optional[str] = Depends(api_key_scheme)) -> str:
    settings = get_settings()
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key")

    allowed_tokens = {token.strip() for token in settings.api_auth_tokens if token.strip()}
    if not allowed_tokens and settings.app_env.value == "dev" and settings.allow_dev_fallback:
        allowed_tokens = {"dev-token"}

    if api_key not in allowed_tokens:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key
