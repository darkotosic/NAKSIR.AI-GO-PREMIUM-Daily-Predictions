from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from backend import api_football
from backend.dependencies import require_api_key

router = APIRouter(tags=["players"])


@router.get(
    "/players/seasons",
    summary="Sezone za igrača (API-Football /players/seasons)",
    dependencies=[Depends(require_api_key)],
)
def get_player_seasons(
    player_id: int = Query(..., description="API-Football player ID"),
) -> Dict[str, Any]:
    seasons = api_football.get_player_seasons(player_id)
    return {"player_id": player_id, "seasons": seasons}


@router.get(
    "/players/profiles",
    summary="Profil igrača (API-Football /players/profiles)",
    dependencies=[Depends(require_api_key)],
)
def get_player_profiles(
    player_id: int = Query(..., description="API-Football player ID"),
    season: Optional[int] = Query(None, description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    profiles = api_football.get_player_profiles(player_id, season=season)
    return {"player_id": player_id, "season": season, "items": profiles, "total": len(profiles)}


@router.get(
    "/players",
    summary="Statistike igrača (API-Football /players)",
    dependencies=[Depends(require_api_key)],
)
def get_players(
    player_id: Optional[int] = Query(None, description="API-Football player ID"),
    team_id: Optional[int] = Query(None, description="API-Football team ID"),
    league_id: Optional[int] = Query(None, description="League ID"),
    season: Optional[int] = Query(None, description="Season year (e.g. 2024)"),
    search: Optional[str] = Query(None, description="Search string (partial match)"),
    page: Optional[int] = Query(None, ge=1, description="Pagination page"),
) -> Dict[str, Any]:
    payload = api_football.get_players(
        player_id=player_id,
        team_id=team_id,
        league_id=league_id,
        season=season,
        search=search,
        page=page,
    )
    response = payload.get("response")
    items: List[Dict[str, Any]] = response if isinstance(response, list) else []
    return {"items": items, "paging": payload.get("paging"), "results": payload.get("results")}


@router.get(
    "/players/squads",
    summary="Squad lista za tim (API-Football /players/squads)",
    dependencies=[Depends(require_api_key)],
)
def get_players_squads(
    team_id: int = Query(..., description="API-Football team ID"),
    season: Optional[int] = Query(None, description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    squads = api_football.get_players_squads(team_id, season=season)
    return {"team_id": team_id, "season": season, "items": squads, "total": len(squads)}


@router.get(
    "/players/teams",
    summary="Klubovi kroz koje je igrač prošao (API-Football /players/teams)",
    dependencies=[Depends(require_api_key)],
)
def get_player_teams(
    player_id: int = Query(..., description="API-Football player ID"),
) -> Dict[str, Any]:
    teams = api_football.get_player_teams(player_id)
    return {"player_id": player_id, "items": teams, "total": len(teams)}


@router.get(
    "/players/topscorers",
    summary="Top strelci za ligu + sezonu",
    dependencies=[Depends(require_api_key)],
)
def get_top_scorers(
    league_id: int = Query(..., description="League ID"),
    season: int = Query(..., description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    scorers = api_football.get_players_top_scorers(league_id, season)
    return {"league_id": league_id, "season": season, "items": scorers, "total": len(scorers)}


@router.get(
    "/players/topassists",
    summary="Top asistenti za ligu + sezonu",
    dependencies=[Depends(require_api_key)],
)
def get_top_assists(
    league_id: int = Query(..., description="League ID"),
    season: int = Query(..., description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    assists = api_football.get_players_top_assists(league_id, season)
    return {"league_id": league_id, "season": season, "items": assists, "total": len(assists)}


@router.get(
    "/players/topyellowcards",
    summary="Top žuti kartoni za ligu + sezonu",
    dependencies=[Depends(require_api_key)],
)
def get_top_yellow_cards(
    league_id: int = Query(..., description="League ID"),
    season: int = Query(..., description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    players = api_football.get_players_top_yellow_cards(league_id, season)
    return {"league_id": league_id, "season": season, "items": players, "total": len(players)}


@router.get(
    "/players/topredcards",
    summary="Top crveni kartoni za ligu + sezonu",
    dependencies=[Depends(require_api_key)],
)
def get_top_red_cards(
    league_id: int = Query(..., description="League ID"),
    season: int = Query(..., description="Season year (e.g. 2024)"),
) -> Dict[str, Any]:
    players = api_football.get_players_top_red_cards(league_id, season)
    return {"league_id": league_id, "season": season, "items": players, "total": len(players)}
