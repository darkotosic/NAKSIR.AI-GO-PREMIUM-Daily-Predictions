import json
from typing import Any, Dict, List, Literal, Optional, Tuple, TypedDict

from openai import OpenAI

from .config import settings


# Inicijalizacija OpenAI klijenta (ili None ako nema ključa)
client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

SYSTEM_PROMPT = """You are a football betting analyst.

Strictly follow these rules:
- Use only the data provided in MATCH_JSON (stats, team profiles, team seasons, team countries, players stats, players squads, top scorers, top assists, top yellow cards, top red cards, standings, h2h, odds, injuries).
- If data is missing or weak, explicitly mention limitations and reduce confidence.
- Provide balanced, realistic probabilities. Avoid 0% or 100%.
- Always keep responses grounded and concise.
- When proposing value bets, prefer Double Chance + Over/Under goals (avoid BTTS combos).

Output: Return ONE JSON object with EXACTLY these keys:
- preview: 5–7 sentence in-depth preview.
- key_factors: array of strings (why the outlook is what it is).
- winner_probabilities: { "home_win_pct": float|null, "draw_pct": float|null, "away_win_pct": float|null }
- goals_probabilities: {
    "over_0_5_ht_pct": float|null,
    "over_1_5_pct": float|null,
    "over_2_5_pct": float|null,
    "over_3_5_pct": float|null,
    "under_3_5_pct": float|null,
    "under_4_5_pct": float|null
  }
- team_goals: { "home_over_0_5_pct": float|null, "away_over_0_5_pct": float|null }
- btts: { "yes_pct": float|null, "no_pct": float|null }
- value_bet: {  # prioritize Double Chance + Over/Under goals combos
    "market": string,
    "selection": string,
  "bookmaker_odd": float|null,
  "model_probability_pct": float|null,
  "edge_pct": float|null,
  "comment": string
  }
- correct_scores_top2: array of the two most probable scorelines { "score": string, "probability_pct": float|null }
- corners_probabilities: {
    "over_8_5_pct": float|null,
    "over_9_5_pct": float|null,
    "over_10_5_pct": float|null
  }
- cards_probabilities: {
    "over_3_5_pct": float|null,
    "over_4_5_pct": float|null,
    "over_5_5_pct": float|null
  }
- risk_flags: array of strings (data quality, volatility, injuries, etc.).
- disclaimer: string that clearly states this is NOT financial advice.

Percentages are 0–100 floats (e.g. 68 = 68%). Do not return any other keys.
"""

LIVE_SYSTEM_PROMPT = """You are a live football match analyst.

Strictly follow these rules:
- Use only the data provided in MATCH_JSON (events, live stats, team profiles, standings, h2h, team form, players stats, team stats, injuries).
- If data is missing or weak, explicitly mention limitations and reduce confidence.
- Provide balanced, realistic probabilities. Avoid 0% or 100%.
- Keep output short, live-focused, and actionable.

Output: Return ONE JSON object with EXACTLY these keys:
- summary: short live summary (2–4 sentences).
- goals_remaining: { "at_least_1_more_pct": float|null, "at_least_2_more_pct": float|null }
- match_winner: { "home_pct": float|null, "draw_pct": float|null, "away_pct": float|null }
- yellow_cards_summary: short summary based on history + live match data.
- corners_summary: short summary based on history + live match data.
- disclaimer: string that clearly states this is NOT financial advice.

Percentages are 0–100 floats (e.g. 68 = 68%). Do not return any other keys.
"""

# ---------------------------
# BTTS v1 (deterministic + strict JSON)
# ---------------------------

BTTSMarket = Literal["YES", "NO"]


class BTTSBlock(TypedDict, total=False):
    yes_pct: int
    no_pct: int
    recommended_btts_market: BTTSMarket
    confidence_pct: int
    key_factors: List[str]
    avoid_flags: List[str]
    reasoning_short: str


def _clamp_int(x: float, lo: int, hi: int) -> int:
    try:
        xi = int(round(float(x)))
    except Exception:
        return lo
    return max(lo, min(hi, xi))


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        return float(x)
    except Exception:
        return None


def _safe_int(x: Any) -> Optional[int]:
    try:
        if x is None:
            return None
        return int(x)
    except Exception:
        return None


def compute_btts_yes_probability_v1(
    full_match: dict[str, Any],
) -> Tuple[int, list[str], list[str]]:
    """
    Deterministic scoring, returns:
    (yes_pct, key_factors, avoid_flags)
    """
    score = 50.0
    factors: list[str] = []
    avoid_flags: list[str] = []

    # ---- Extract common sections defensively ----
    stats = full_match.get("statistics") or {}
    # Expecting either {"home": {...}, "away": {...}} or flat.
    st_home = stats.get("home") if isinstance(stats, dict) else None
    st_away = stats.get("away") if isinstance(stats, dict) else None

    form = full_match.get("form") or {}
    f_home = form.get("home") if isinstance(form, dict) else None
    f_away = form.get("away") if isinstance(form, dict) else None

    h2h = full_match.get("h2h") or {}
    # might be list or dict; handle both
    h2h_list = (
        h2h.get("matches") if isinstance(h2h, dict) else (h2h if isinstance(h2h, list) else [])
    )

    league = full_match.get("league") or {}
    league_name = (league.get("name") or "").lower()

    odds = full_match.get("odds") or {}
    flat_probs = odds.get("flat_probabilities") if isinstance(odds, dict) else None

    # ---- Feature helpers ----
    def _get_rate(obj: Any, key: str) -> Optional[float]:
        if not isinstance(obj, dict):
            return None
        v = obj.get(key)
        return _safe_float(v)

    def _push_factor(text: str) -> None:
        if text and text not in factors:
            factors.append(text)

    def _push_avoid(flag: str) -> None:
        if flag and flag not in avoid_flags:
            avoid_flags.append(flag)

    # ---- A) Recent BTTS rate (last 5-6) ----
    # Expected keys (you can align with your real structure):
    # f_home: {"btts_rate": 0-100, "scored_pg": x, "conceded_pg": x, "clean_sheet_rate": 0-100}
    home_btts = _get_rate(f_home, "btts_rate")
    away_btts = _get_rate(f_away, "btts_rate")
    if home_btts is not None and away_btts is not None:
        score += 0.25 * (home_btts + away_btts)
        _push_factor("Recent form: oba tima često i daju i primaju gol (BTTS trend).")

    # ---- B) Strong attacks / leaky defenses ----
    home_scored = _get_rate(f_home, "scored_pg") or _get_rate(st_home, "scored_pg")
    away_scored = _get_rate(f_away, "scored_pg") or _get_rate(st_away, "scored_pg")
    home_conc = _get_rate(f_home, "conceded_pg") or _get_rate(st_home, "conceded_pg")
    away_conc = _get_rate(f_away, "conceded_pg") or _get_rate(st_away, "conceded_pg")

    if home_scored is not None and home_scored >= 1.1:
        score += 6
    if away_scored is not None and away_scored >= 1.1:
        score += 6
    if home_conc is not None and home_conc >= 1.1:
        score += 6
    if away_conc is not None and away_conc >= 1.1:
        score += 6

    if (home_scored or 0) >= 1.1 and (away_conc or 0) >= 1.1:
        score += 8
        _push_factor("Matchup: jak napad domaćih protiv propusne odbrane gostiju.")
    if (away_scored or 0) >= 1.1 and (home_conc or 0) >= 1.1:
        score += 8
        _push_factor("Matchup: jak napad gostiju protiv propusne odbrane domaćih.")

    # ---- C) H2H (prefer recency) ----
    # Minimal heuristic: count BTTS in last up to 3 meetings if data present.
    h2h_btts_hits = 0
    h2h_seen = 0
    if isinstance(h2h_list, list):
        for m in h2h_list[:3]:
            # expect "goals": {"home":x,"away":y} OR nested fixture data
            goals = (m.get("goals") or {}) if isinstance(m, dict) else {}
            gh = _safe_int(goals.get("home"))
            ga = _safe_int(goals.get("away"))
            if gh is None or ga is None:
                continue
            h2h_seen += 1
            if gh > 0 and ga > 0:
                h2h_btts_hits += 1
    if h2h_seen >= 2:
        if h2h_btts_hits >= 2:
            score += 6
            _push_factor("H2H: u poslednjim duelima često oba tima postižu gol.")
        elif h2h_btts_hits == 0:
            score -= 6
            _push_factor("H2H: poslednji dueli naginju ka tome da jedan tim ostane bez gola.")

    # ---- D) Lineups absences (GK/CB) ----
    # If you already have injuries/lineups in full_match, map these keys accordingly.
    absences = full_match.get("absences") or {}
    # expected: {"home_key_def_absent": bool, "away_key_def_absent": bool}
    hk = absences.get("home_key_def_absent")
    ak = absences.get("away_key_def_absent")
    if hk is True or ak is True:
        score += 7
        _push_factor("Izostanci: ključni defanzivci/golman mogu povećati šansu za gol protivnika.")

    # ---- E) Strong away strategy ----
    away_scored_away = _get_rate(f_away, "scored_away_pg") or _get_rate(st_away, "scored_away_pg")
    home_scored_home = _get_rate(f_home, "scored_home_pg") or _get_rate(st_home, "scored_home_pg")
    if away_scored_away is not None and away_scored_away >= 1.0:
        score += 4
        _push_factor("Gosti imaju solidan učinak u postizanju gola na strani.")
    if home_scored_home is not None and home_scored_home >= 1.0:
        score += 4
        _push_factor("Domaći imaju solidan učinak u postizanju gola kod kuće.")

    # ---- F) Stakes / importance ----
    # optional: full_match.get("importance") or fixture round info; if absent, do nothing.
    importance = full_match.get("importance")
    if isinstance(importance, str) and importance.lower() in {"final", "relegation", "must_win"}:
        score -= 8
        _push_factor("Ulog meča je visok, što često spušta otvorenost i BTTS tempo.")

    # ---- G) League factor ----
    if "bundesliga" in league_name:
        score += 4
        _push_factor("Liga profil: često otvoren ritam i BTTS trend (Bundesliga-like).")
    if league_name in {"serie a", "ligue 1"}:
        # neutral; adjust only if you want
        pass

    # ---- H) Odds sanity (if flat_probs exists) ----
    # If you have implied prob for btts_yes, use it.
    if isinstance(flat_probs, dict):
        btts_yes_imp = _safe_float(flat_probs.get("btts_yes"))
        if btts_yes_imp is not None:
            # expecting 0-1
            imp_pct = btts_yes_imp * 100 if btts_yes_imp <= 1.0 else btts_yes_imp
            if imp_pct < 50:
                score -= 5
                _push_factor("Odds signal: tržište ne favorizuje BTTS YES.")
            elif imp_pct >= 55:
                score += 5
                _push_factor("Odds signal: tržište naginje BTTS YES.")

    # ---- What to avoid: elite defense / low scoring ----
    home_cs = _get_rate(f_home, "clean_sheet_rate") or _get_rate(st_home, "clean_sheet_rate")
    away_cs = _get_rate(f_away, "clean_sheet_rate") or _get_rate(st_away, "clean_sheet_rate")
    if (home_cs is not None and home_cs >= 55) or (away_cs is not None and away_cs >= 55):
        score -= 10
        _push_avoid("ELITE_DEFENSE")
        _push_factor("Avoid: bar jedan tim drži visok clean-sheet rate (elite defense profil).")

    if (home_scored is not None and home_scored < 0.9) or (away_scored is not None and away_scored < 0.9):
        score -= 10
        _push_avoid("LOW_SCORING_TEAM")
        _push_factor("Avoid: bar jedan tim ima nizak scoring output (low-scoring profil).")

    yes_pct = _clamp_int(score, 5, 95)
    return yes_pct, factors, avoid_flags


def build_btts_v1_analysis(full_match: dict[str, Any]) -> dict[str, Any]:
    """
    Returns strict JSON block:
    {"btts": {yes_pct,no_pct,recommended_btts_market,confidence_pct,key_factors,avoid_flags,reasoning_short}}
    """
    yes_pct, factors, avoid_flags = compute_btts_yes_probability_v1(full_match)

    no_pct = 100 - yes_pct
    recommended: BTTSMarket = "YES" if yes_pct >= 55 else "NO"
    confidence = yes_pct if recommended == "YES" else no_pct

    # reasoning_short: 1-2 rečenice
    if recommended == "YES":
        reasoning_short = (
            "Profil je otvoren: oba tima imaju realnu šansu da postignu gol, uz vidljive defanzivne rupe."
        )
    else:
        reasoning_short = (
            "BTTS YES je slab kandidat: bar jedna strana ima nizak scoring potencijal ili protivnik drži visoku clean-sheet stabilnost."
        )

    # keep it tight: max 5 faktora
    factors = factors[:5]
    avoid_flags = avoid_flags[:5]

    btts: BTTSBlock = {
        "yes_pct": int(yes_pct),
        "no_pct": int(no_pct),
        "recommended_btts_market": recommended,
        "confidence_pct": int(confidence),
        "key_factors": factors,
        "avoid_flags": avoid_flags,
        "reasoning_short": reasoning_short,
    }
    return {"btts": btts}

def _fallback_response(reason: str) -> Dict[str, Any]:
    """Minimal valid schema kada je AI isključen ili odgovori loše."""
    return {
        "preview": f"AI analysis unavailable: {reason}",
        "key_factors": [],
        "winner_probabilities": {
            "home_win_pct": None,
            "draw_pct": None,
            "away_win_pct": None,
        },
        "goals_probabilities": {
            "over_0_5_ht_pct": None,
            "over_1_5_pct": None,
            "over_2_5_pct": None,
            "over_3_5_pct": None,
            "under_3_5_pct": None,
            "under_4_5_pct": None,
        },
        "team_goals": {
            "home_over_0_5_pct": None,
            "away_over_0_5_pct": None,
        },
        "btts": {"yes_pct": None, "no_pct": None},
        "value_bet": {
            "market": "",
            "selection": "",
            "bookmaker_odd": None,
            "model_probability_pct": None,
            "edge_pct": None,
            "comment": "",
        },
        "correct_scores_top2": [],
        "corners_probabilities": {
            "over_8_5_pct": None,
            "over_9_5_pct": None,
            "over_10_5_pct": None,
        },
        "cards_probabilities": {
            "over_3_5_pct": None,
            "over_4_5_pct": None,
            "over_5_5_pct": None,
        },
        "risk_flags": [reason],
        "disclaimer": "Ovo nije finansijski savet, već AI analiza zasnovana na dostupnoj statistici.",
    }


def _fallback_live_response(reason: str) -> Dict[str, Any]:
    return {
        "summary": f"AI live analysis unavailable: {reason}",
        "goals_remaining": {
            "at_least_1_more_pct": None,
            "at_least_2_more_pct": None,
        },
        "match_winner": {
            "home_pct": None,
            "draw_pct": None,
            "away_pct": None,
        },
        "yellow_cards_summary": reason,
        "corners_summary": reason,
        "disclaimer": "Ovo nije finansijski savet, već AI analiza zasnovana na dostupnoj statistici.",
    }


def build_fallback_analysis(reason: str) -> Dict[str, Any]:
    """Public wrapper for returning a safe, validated fallback block."""

    return _fallback_response(reason)


def run_ai_analysis(
    full_match: dict[str, Any],
    user_question: str | None = None,
    *,
    prompt_version: str = "v1",
) -> Any:
    """Generate structured AI analysis for a single match.

    Args:
        full_match: JSON kontekst iz ``match_full.build_full_match``.
        user_question: Opcioni dodatni fokus (npr. "naglasite defanzivu").
    """
    # BTTS deterministic path (no LLM)
    if (prompt_version or "").lower().startswith("btts"):
        return build_btts_v1_analysis(full_match)

    if client is None:
        return _fallback_response("no OPENAI_API_KEY configured")

    # Ovo je payload koji šaljemo modelu – čitav meč kao JSON string
    match_json_str = json.dumps(full_match, ensure_ascii=False)

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Analyze this football match using the MATCH_JSON below. "
                "Return ONLY a JSON object that follows the specified schema and percentages.\n\n"
                f"MATCH_JSON:\n{match_json_str}"
            ),
        },
    ]

    if user_question:
        messages.append(
            {
                "role": "user",
                "content": (
                    "Additional user focus for this analysis: "
                    f"{user_question.strip()}"
                ),
            }
        )

    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        # Ako bilo šta pukne na API strani, vrati fallback da ne sruši backend
        return _fallback_response(f"OpenAI error: {e}")

    # U novom OpenAI SDK-u, uz response_format=json_object,
    # message.content je JSON string.
    try:
        raw_content = completion.choices[0].message.content
        if isinstance(raw_content, list):
            # Za svaki slučaj – ako se vrati kao list of parts
            text = "".join(part.get("text", "") for part in raw_content if isinstance(part, dict))
        else:
            text = str(raw_content)
    except Exception:
        return _fallback_response("cannot read AI message content")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return _fallback_response("AI output is not valid JSON")

    # Minimalna validacija ključnih polja; ako nešto fali, dopuni default vrednostima
    return {
        "preview": parsed.get("preview", ""),
        "key_factors": parsed.get("key_factors", []) or [],
        "winner_probabilities": parsed.get("winner_probabilities", {})
        or {
            "home_win_pct": None,
            "draw_pct": None,
            "away_win_pct": None,
        },
        "goals_probabilities": parsed.get("goals_probabilities", {})
        or {
            "over_0_5_ht_pct": None,
            "over_1_5_pct": None,
            "over_2_5_pct": None,
            "over_3_5_pct": None,
            "under_3_5_pct": None,
            "under_4_5_pct": None,
        },
        "team_goals": parsed.get("team_goals", {})
        or {"home_over_0_5_pct": None, "away_over_0_5_pct": None},
        "btts": parsed.get("btts", {}) or {"yes_pct": None, "no_pct": None},
        "value_bet": parsed.get("value_bet", {})
        or {
            "market": "",
            "selection": "",
            "bookmaker_odd": None,
            "model_probability_pct": None,
            "edge_pct": None,
            "comment": "",
        },
        "correct_scores_top2": parsed.get("correct_scores_top2", []) or [],
        "corners_probabilities": parsed.get("corners_probabilities", {})
        or {
            "over_8_5_pct": None,
            "over_9_5_pct": None,
            "over_10_5_pct": None,
        },
        "cards_probabilities": parsed.get("cards_probabilities", {})
        or {
            "over_3_5_pct": None,
            "over_4_5_pct": None,
            "over_5_5_pct": None,
        },
        "risk_flags": parsed.get("risk_flags", []) or [],
        "disclaimer": parsed.get(
            "disclaimer",
            "Ovo nije finansijski savet, već AI analiza zasnovana na dostupnoj statistici.",
        ),
    }


def run_live_ai_analysis(
    full_match: Dict[str, Any],
    user_question: Optional[str] = None,
) -> Dict[str, Any]:
    if client is None:
        return _fallback_live_response("no OPENAI_API_KEY configured")

    match_json_str = json.dumps(full_match, ensure_ascii=False)

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": LIVE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Analyze this live football match using the MATCH_JSON below. "
                "Return ONLY a JSON object that follows the specified schema and percentages.\n\n"
                f"MATCH_JSON:\n{match_json_str}"
            ),
        },
    ]

    if user_question:
        messages.append(
            {
                "role": "user",
                "content": (
                    "Additional user focus for this live analysis: "
                    f"{user_question.strip()}"
                ),
            }
        )

    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        return _fallback_live_response(f"OpenAI error: {e}")

    try:
        raw_content = completion.choices[0].message.content
        if isinstance(raw_content, list):
            text = "".join(part.get("text", "") for part in raw_content if isinstance(part, dict))
        else:
            text = str(raw_content)
    except Exception:
        return _fallback_live_response("cannot read AI message content")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return _fallback_live_response("AI output is not valid JSON")

    return {
        "summary": parsed.get("summary", ""),
        "goals_remaining": parsed.get("goals_remaining", {})
        or {
            "at_least_1_more_pct": None,
            "at_least_2_more_pct": None,
        },
        "match_winner": parsed.get("match_winner", {})
        or {"home_pct": None, "draw_pct": None, "away_pct": None},
        "yellow_cards_summary": parsed.get("yellow_cards_summary", ""),
        "corners_summary": parsed.get("corners_summary", ""),
        "disclaimer": parsed.get(
            "disclaimer",
            "Ovo nije finansijski savet, već AI analiza zasnovana na dostupnoj statistici.",
        ),
    }
