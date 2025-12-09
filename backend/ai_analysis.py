import json
from typing import Any, Dict, List, Optional

from openai import OpenAI

from .config import OPENAI_API_KEY


# Inicijalizacija OpenAI klijenta (ili None ako nema ključa)
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

SYSTEM_PROMPT = """You are a football betting analyst.

Strictly follow these rules:
- Use only the data provided in MATCH_JSON (stats, form, standings, h2h, odds, injuries).
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


def run_ai_analysis(
    full_match: Dict[str, Any],
    user_question: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate structured AI analysis for a single match.

    Args:
        full_match: JSON kontekst iz ``match_full.build_full_match``.
        user_question: Opcioni dodatni fokus (npr. "naglasite defanzivu").
    """
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
