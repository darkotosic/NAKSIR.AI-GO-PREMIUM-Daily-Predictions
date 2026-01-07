from __future__ import annotations

from typing import Dict, Optional

from pydantic import BaseModel


class OddsSummary(BaseModel):
    fixture_id: int
    raw_count: int
    flat_available: bool


class OddsFlat(BaseModel):
    match_winner: Optional[Dict[str, float]] = None
    double_chance: Optional[Dict[str, float]] = None
    btts: Optional[Dict[str, float]] = None
    goals_over_under: Optional[Dict[str, float]] = None
