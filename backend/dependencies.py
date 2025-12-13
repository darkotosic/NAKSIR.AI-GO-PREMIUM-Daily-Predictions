from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader

from backend.config import settings

api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(api_key: Optional[str] = Depends(api_key_scheme)) -> str:
    if not api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header is required")
    if api_key not in settings.api_auth_tokens:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key
