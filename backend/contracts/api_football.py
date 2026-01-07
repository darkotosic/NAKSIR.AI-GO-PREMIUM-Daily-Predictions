from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class FixtureStatus(BaseModel):
    short: str = Field(..., description="API-Football status short code")
    long: Optional[str] = Field(default=None, description="Human readable status")


class FixtureTeam(BaseModel):
    id: int
    name: Optional[str] = None
    logo: Optional[str] = None


class APIFootballFixture(BaseModel):
    fixture_id: int = Field(..., description="API-Football fixture identifier")
    kickoff: Optional[str] = Field(default=None, description="Kickoff ISO timestamp")
    status: Optional[FixtureStatus] = None
    home: FixtureTeam
    away: FixtureTeam
    league_id: Optional[int] = None
    season: Optional[int] = None
