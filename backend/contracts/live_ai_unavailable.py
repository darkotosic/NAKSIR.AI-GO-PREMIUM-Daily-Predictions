from __future__ import annotations

from pydantic import BaseModel


class LiveAiUnavailable(BaseModel):
    status: str = "unavailable"
    message: str = "Live AI analysis not available for this match."
    code: str = "LIVE_AI_NOT_AVAILABLE"
