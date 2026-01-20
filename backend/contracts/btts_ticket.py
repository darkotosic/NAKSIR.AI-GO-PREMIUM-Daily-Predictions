from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class MiniEntity(BaseModel):
    id: Optional[int] = None
    name: str
    logo: Optional[str] = None


class BttsMatchPick(BaseModel):
    fixture_id: int
    kickoff_utc: datetime

    league: MiniEntity
    home: MiniEntity
    away: MiniEntity

    market: Literal["BTTS_YES", "BTTS_NO"]
    odds: float = Field(..., ge=1.0)
    probability: float = Field(..., ge=0.0, le=1.0)
    score: int = Field(..., ge=0, le=100)


class BttsTicket(BaseModel):
    ticket_id: str
    type: Literal["BTTS_YES", "BTTS_NO"]
    date: date

    total_odds: float = Field(..., ge=1.0)
    confidence: int = Field(..., ge=0, le=100)

    matches: List[BttsMatchPick]


class DailyBttsTicketsResponse(BaseModel):
    date: date
    yes_ticket: BttsTicket
    no_ticket: BttsTicket
