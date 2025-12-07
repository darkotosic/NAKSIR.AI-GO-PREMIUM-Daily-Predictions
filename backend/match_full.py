from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

# Ovi importi su u skladu sa tvojim backend dizajnom.
# Ako neki helper ne postoji u konkretnom repo-u, fallback
# funkcije ispod će sprečiti pad servisa.
try:
    from .api_football import (
        get_team_stats,
        get_standings,
        get_h2h,
        get_injuries,
        get_predictions_for_fixture,
        get_all_odds_for_fixture,
    )
except Exception:  # pragma: no cover - fallback za dev situacije

    def _missing_api_helper(*_: Any, **__: Any) -> Any:
        raise RuntimeError("API-Football helper not available in this build")

    get_team_stats = _missing_api_helper
    get_standings = _missing_api_helper
    get_h2h = _missing_api_helper
    get_injuries = _missing_api_helper
    get_predictions_for_fixture = _missing_api_helper
    get_all_odds_for_fixture = _missing_api_helper

# Odds normalizacija – nije obavezna, ali ako postoji koristimo je.
try:
    from .odds_normalizer import normalize_fixture_odds
except Exception:  # pragma: no cover
    normalize_fixture_odds = None  # type: ignore[assignment]


logger = logging.getLogger("naksir.go_premium.match_full")


# ---------------------------------------------------------------------
# Helperi za bezbedno čitanje i čišćenje podataka
# ---------------------------------------------------------------------


def _safe_get(obj: Any, *keys: Any, default: Any = None) -> Any:
    """
    Bezbedno čitanje ugnježdenih ključeva iz dict-a.

    _safe_get(fx, "league", "id") -> fx["league"]["id"] ili default.
    """
    cur = obj
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


def _prune_empty(value: Any) -> Any:
    """
    Rekurzivno uklanja:
      - None
      - prazne stringove
      - prazne liste/diktove/tupse
    Ne dira 0, False, i ostale validne vrednosti.
    """
    if isinstance(value, dict):
        cleaned: Dict[str, Any] = {}
        for k, v in value.items():
            v_clean = _prune_empty(v)
            if v_clean is None:
                continue
            if isinstance(v_clean, str) and not v_clean.strip():
                continue
            if isinstance(v_clean, (list, dict, tuple, set)) and not v_clean:
                continue
            cleaned[k] = v_clean
        return cleaned

    if isinstance(value, list):
        items: List[Any] = []
        for v in value:
            v_clean = _prune_empty(v)
            if v_clean is None:
                continue
            if isinstance(v_clean, str) and not v_clean.strip():
                continue
            if isinstance(v_clean, (list, dict, tuple, set)) and not v_clean:
                continue
            items.append(v_clean)
        return items

    return value


def _safe_call(label: str, fn, *args, **kwargs) -> Any:
    """
    Wrapper za sve API-Football pozive – hvata SVAKU grešku i loguje je,
    ali ne dozvoljava da se endpoint sruši.
    """
    try:
        return fn(*args, **kwargs)
    except Exception as exc:  # pragma: no cover - runtime zaštita
        logger.warning("Failed to fetch %s: %s", label, exc)
        return None


# ---------------------------------------------------------------------
# Sažetak meča – card format za /matches/today i /matches/{fixture_id}
# ---------------------------------------------------------------------


def _build_basic_match_info(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """
    Minimalni set podataka koji treba svakoj kartici:
      - fixture_id, kickoff, status
      - osnovni info o ligi i zemlji
      - osnovni info o timovima
      - venue, referee (ako postoji)
    Pretpostavka: fixture je već Naksir-normalizovan (kao iz /matches/today).
    """
    fixture_id = fixture.get("fixture_id") or _safe_get(fixture, "fixture", "id")

    league_block = fixture.get("league", {}) or {}
    country_block = fixture.get("country", {}) or {}

    home_team = _safe_get(fixture, "teams", "home", default={}) or {}
    away_team = _safe_get(fixture, "teams", "away", default={}) or {}

    return {
        "fixture_id": fixture_id,
        "kickoff": fixture.get("kickoff")
        or _safe_get(fixture, "fixture", "date"),
        "status": fixture.get("status")
        or _safe_get(fixture, "fixture", "status", "short"),
        "league": {
            "id": league_block.get("id"),
            "name": league_block.get("name"),
            "season": league_block.get("season"),
            "round": league_block.get("round"),
            "logo": league_block.get("logo"),
        },
        "country": {
            "name": country_block.get("name"),
            "code": country_block.get("code"),
            "flag": country_block.get("flag"),
        },
        "venue": {
            "id": _safe_get(fixture, "venue", "id"),
            "name": _safe_get(fixture, "venue", "name"),
            "city": _safe_get(fixture, "venue", "city"),
        },
        "referee": fixture.get("referee")
        or _safe_get(fixture, "fixture", "referee"),
        "teams": {
            "home": {
                "id": home_team.get("id"),
                "name": home_team.get("name"),
                "logo": home_team.get("logo"),
            },
            "away": {
                "id": away_team.get("id"),
                "name": away_team.get("name"),
                "logo": away_team.get("logo"),
            },
        },
    }


def _build_scoreboard(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """
    Izvlači skor: golove i poluvremena, ako postoje.
    Ako nema skorova (pred meč), ostavlja score blok prazan.
    """
    goals = fixture.get("goals") or {}
    score = fixture.get("score") or {}

    home_ft = _safe_get(score, "fulltime", "home", default=goals.get("home"))
    away_ft = _safe_get(score, "fulltime", "away", default=goals.get("away"))

    if home_ft is None and away_ft is None:
        # pre meča – nema smislenog score-a
        return {"score": None}

    return {
        "score": {
            "home": home_ft,
            "away": away_ft,
            "ht_home": _safe_get(score, "halftime", "home"),
            "ht_away": _safe_get(score, "halftime", "away"),
            "ft_home": home_ft,
            "ft_away": away_ft,
        }
    }


def build_match_summary(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """
    Finalni payload za karticu (lista na /matches/today i single na /matches/{id}).

    Sve je organizovano tako da se može direktno renderovati na frontu
    bez dodatne obrade. Front može da ignoriše polja koja mu ne trebaju.
    """
    base = _build_basic_match_info(fixture)
    score = _build_scoreboard(fixture)
    # Spoj i očisti prazna polja
    payload = {**base, **score}
    return _prune_empty(payload)


# ---------------------------------------------------------------------
# Full kontekst meča – za /matches/{fixture_id}/full
# ---------------------------------------------------------------------


def _build_stats_block(
    league_id: Optional[int],
    season: Optional[int],
    home_team_id: Optional[int],
    away_team_id: Optional[int],
) -> Dict[str, Any]:
    """
    Wrapper za team statistics – pojedinačni pozivi za home/away tim.
    Ako bilo šta fali (id, season…), vraća prazan blok.
    """
    if not league_id or not season or not home_team_id or not away_team_id:
        return {}

    home_raw = _safe_call(
        "team_stats_home",
        get_team_stats,
        league_id=league_id,
        season=season,
        team_id=home_team_id,
    )
    away_raw = _safe_call(
        "team_stats_away",
        get_team_stats,
        league_id=league_id,
        season=season,
        team_id=away_team_id,
    )

    if not home_raw and not away_raw:
        return {}

    return {"home": home_raw or {}, "away": away_raw or {}}


def _build_standings_block(
    league_id: Optional[int], season: Optional[int]
) -> Dict[str, Any]:
    if not league_id or not season:
        return {}

    standings_raw = _safe_call(
        "standings",
        get_standings,
        league_id=league_id,
        season=season,
    )
    return standings_raw or {}


def _build_h2h_block(
    home_team_id: Optional[int],
    away_team_id: Optional[int],
    limit: int = 10,
) -> List[Dict[str, Any]]:
    if not home_team_id or not away_team_id:
        return []

    h2h_raw = _safe_call(
        "h2h",
        get_h2h,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        limit=limit,
    )
    if not h2h_raw:
        return []
    return h2h_raw


def _build_injuries_block(fixture_id: Optional[int]) -> List[Dict[str, Any]]:
    if not fixture_id:
        return []
    injuries_raw = _safe_call("injuries", get_injuries, fixture_id=fixture_id)
    return injuries_raw or []


def _build_predictions_block(fixture_id: Optional[int]) -> Dict[str, Any]:
    if not fixture_id:
        return {}
    predictions_raw = _safe_call(
        "predictions", get_predictions_for_fixture, fixture_id=fixture_id
    )
    return predictions_raw or {}


def _build_odds_block(fixture_id: Optional[int]) -> Dict[str, Any]:
    if not fixture_id:
        return {}

    raw_odds = _safe_call("odds", get_all_odds_for_fixture, fixture_id=fixture_id)
    if not raw_odds:
        return {}

    # Ako postoji normalizator – prosledi kroz njega, inače vrati raw
    if callable(normalize_fixture_odds):  # type: ignore[arg-type]
        try:
            normalized = normalize_fixture_odds(raw_odds)  # type: ignore[call-arg]
            return normalized or {}
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to normalize odds for fixture_id=%s: %s", fixture_id, exc)
            return raw_odds or {}

    return raw_odds or {}


def build_full_match(fixture: Dict[str, Any]) -> Dict[str, Any]:
    """
    Glavna funkcija koju koristi /matches/{fixture_id}/full.

    Princip:
    - fixture (sažetak) uvek postoji – to je core bloka `summary`
    - svi ostali slojevi (stats, standings, h2h, injuries, predictions, odds)
      su *best-effort* – ako bilo koji API call padne, samo se taj deo izostavi
      ali endpoint uvek vraća validan JSON.
    """
    summary = build_match_summary(fixture)

    fixture_id: Optional[int] = summary.get("fixture_id")  # već očišćen
    league_id: Optional[int] = _safe_get(fixture, "league", "id")
    season: Optional[int] = _safe_get(fixture, "league", "season")
    home_team_id: Optional[int] = _safe_get(fixture, "teams", "home", "id")
    away_team_id: Optional[int] = _safe_get(fixture, "teams", "away", "id")

    logger.info(
        "Building full match context for fixture_id=%s (league=%s, season=%s)",
        fixture_id,
        league_id,
        season,
    )

    stats_block = _build_stats_block(league_id, season, home_team_id, away_team_id)
    standings_block = _build_standings_block(league_id, season)
    h2h_block = _build_h2h_block(home_team_id, away_team_id, limit=10)
    injuries_block = _build_injuries_block(fixture_id)
    predictions_block = _build_predictions_block(fixture_id)
    odds_block = _build_odds_block(fixture_id)

    payload: Dict[str, Any] = {
        "meta": {
            "fixture_id": fixture_id,
            "league_id": league_id,
            "season": season,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
        "summary": summary,
        "context": {
            "stats": stats_block,
            "standings": standings_block,
            "h2h": h2h_block,
            "injuries": injuries_block,
            "predictions": predictions_block,
            "odds": odds_block,
        },
    }

    # Završno čišćenje da izbaciš sve prazne blokove i None.
    return _prune_empty(payload)
