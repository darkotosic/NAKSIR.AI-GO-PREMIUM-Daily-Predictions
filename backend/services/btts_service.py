from __future__ import annotations

import logging
from typing import Any, Dict, List

from backend import api_football
from backend.cache import cache_get, make_cache_key
from backend.odds_summary import build_odds_summary

logger = logging.getLogger("naksir.go_premium.btts_service")


def _extract_btts_odds(odds_payload: Dict[str, Any] | None) -> Dict[str, float] | None:
    if not odds_payload:
        return None
    odds_response = odds_payload.get("response") if isinstance(odds_payload, dict) else None
    if not isinstance(odds_response, list) or not odds_response:
        return None
    try:
        flat = build_odds_summary(odds_response)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to build odds summary: %s", exc)
        return None
    btts = flat.get("btts") if isinstance(flat, dict) else None
    if not isinstance(btts, dict):
        return None
    yes = btts.get("yes")
    no = btts.get("no")
    if yes is None and no is None:
        return None
    out: Dict[str, float] = {}
    if yes is not None:
        out["btts_yes"] = float(yes)
    if no is not None:
        out["btts_no"] = float(no)
    return out


def get_btts_today_fixtures() -> List[Dict[str, Any]]:
    fixtures = api_football.get_fixtures_today()

    for fixture in fixtures:
        fixture_id = (fixture.get("fixture") or {}).get("id")
        if not isinstance(fixture_id, int):
            continue
        odds_key = make_cache_key("odds", {"fixture": fixture_id, "page": 1})
        odds_payload = cache_get(odds_key)
        odds = _extract_btts_odds(odds_payload)
        if not odds:
            continue
        existing = fixture.get("odds") or {}
        if not isinstance(existing, dict):
            existing = {}
        merged = {**existing, **odds}
        fixture["odds"] = merged

    return fixtures
