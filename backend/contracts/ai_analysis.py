from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel


class AIAnalysisRequestContract(BaseModel):
    question: Optional[str] = None
    trial_by_reward: bool = False


class AIAnalysisResponseContract(BaseModel):
    fixture_id: int
    generated_at: Optional[str] = None
    timezone: Optional[str] = None
    question: Optional[str] = None
    analysis: Dict[str, Any]
    odds_probabilities: Optional[Dict[str, Any]] = None
    cached: bool
    cache_key: Optional[str] = None
