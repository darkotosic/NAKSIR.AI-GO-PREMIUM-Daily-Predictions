from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from backend import api_football
from backend.dependencies import require_api_key

router = APIRouter(tags=["teams"])
logger = logging.getLogger("naksir.go_premium.api")


@router.get(
    "/teams",
    summary="Pretraga timova (API-Football /teams)",
    dependencies=[Depends(require_api_key)],
)
def list_teams(
    team_id: Optional[int] = Query(None, description="API-Football team ID"),
    name: Optional[str] = Query(None, description="Exact team name"),
    league_id: Optional[int] = Query(None, description="League ID"),
    season: Optional[int] = Query(None, description="Season year (e.g. 2024)"),
    country: Optional[str] = Query(None, description="Country name"),
    search: Optional[str] = Query(None, description="Search string (partial match)"),
) -> Dict[str, Any]:
    teams = api_football.get_teams(
        team_id=team_id,
        name=name,
        league_id=league_id,
        season=season,
        country=country,
        search=search,
    )
    return {"items": teams, "total": len(teams)}


@router.get(
    "/teams/{team_id}",
    summary="Jedan tim po ID-u",
    dependencies=[Depends(require_api_key)],
)
def get_team(
    team_id: int = Path(..., description="API-Football team ID"),
) -> Dict[str, Any]:
    team = api_football.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get(
    "/teams/{team_id}/statistics",
    summary="Timske statistike za ligu + sezonu",
    dependencies=[Depends(require_api_key)],
)
def get_team_statistics(
    team_id: int = Path(..., description="API-Football team ID"),
    league_id: int = Query(..., description="League ID"),
    season: int = Query(..., description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    stats = api_football.get_team_stats(league_id, season, team_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Team statistics not found")
    return stats


@router.get(
    "/teams/{team_id}/seasons",
    summary="Sezone za tim (podrazumevano current only)",
    dependencies=[Depends(require_api_key)],
)
def get_team_seasons(
    team_id: int = Path(..., description="API-Football team ID"),
    current_only: bool = Query(True, description="Only current seasons"),
) -> Dict[str, Any]:
    seasons = api_football.get_team_seasons(team_id, current_only=current_only)
    return {"team_id": team_id, "current_only": current_only, "seasons": seasons}


@router.get(
    "/teams/countries",
    summary="Lista zemalja za timove",
    dependencies=[Depends(require_api_key)],
)
def list_team_countries() -> Dict[str, Any]:
    countries = api_football.get_team_countries()
    return {"items": countries, "total": len(countries)}
