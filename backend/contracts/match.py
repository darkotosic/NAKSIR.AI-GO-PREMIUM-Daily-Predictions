from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class MatchSummaryCard(BaseModel):
    fixture_id: int
    league: Dict[str, Any]
    teams: Dict[str, Any]
    kickoff: Optional[str] = None
    status: Optional[str] = None
    score: Optional[Dict[str, Any]] = None
    venue: Optional[Dict[str, Any]] = None
    referee: Optional[str] = None


class MatchFullContext(BaseModel):
    meta: Dict[str, Any]
    summary: Dict[str, Any]
    stats: Dict[str, Any]
    team_stats: Dict[str, Any]
    standings: Optional[Dict[str, Any]] = None
    h2h: Optional[Dict[str, Any]] = None
    events: Optional[Dict[str, Any]] = None
    lineups: Optional[Dict[str, Any]] = None
    players: Optional[Dict[str, Any]] = None
    predictions: Optional[Dict[str, Any]] = None
    injuries: Optional[Dict[str, Any]] = None
    odds: Optional[Dict[str, Any]] = None
