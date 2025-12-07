import json
from typing import Any, Dict, List

from openai import OpenAI

from .config import OPENAI_API_KEY


# Inicijalizacija OpenAI klijenta (ili None ako nema ključa)
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

SYSTEM_PROMPT = """You are a football betting analyst. Focus on:
- Double Chance + Goals combos (1X & O1.5, X2 & O1.5, 1X & U3.5, etc.)
- Correct Score Top 2 scenarios
- BTTS YES probability

Rules:
- Use only the data provided in MATCH_JSON (stats, form, standings, h2h, odds, injuries).
- If data is missing for some metric, mention that as a limitation.
- Be conservative with probabilities; avoid 100% or 0%.

Output:
Return a single JSON object with EXACTLY these keys:
- summary: short string
- key_factors: array of strings
- probabilities: object with:
    - dc: { "1X": float|null, "X2": float|null, "12": float|null }
    - goals: { "over_1_5": float|null, "over_2_5": float|null, "under_3_5": float|null }
    - btts_yes: float|null
    - btts_no: float|null
    - cs_top2: array of { "score": string, "probability": float }
- value_bets: array of {
    "market": string,
    "selection": string,
    "bookmaker_odd": float|null,
    "model_probability": float|null,
    "edge": float|null,
    "comment": string
  }
- risk_flags: array of strings
- disclaimer: string (must clearly say this is NOT financial advice)

All probabilities are 0–1 floats (e.g. 0.68 = 68%).
"""


def _fallback_response(reason: str) -> Dict[str, Any]:
    """Minimal valid schema kada je AI isključen ili odgovori loše."""
    return {
        "summary": f"AI analysis unavailable: {reason}",
        "key_factors": [],
        "probabilities": {
            "dc": {"1X": None, "X2": None, "12": None},
            "goals": {"over_1_5": None, "over_2_5": None, "under_3_5": None},
            "btts_yes": None,
            "btts_no": None,
            "cs_top2": [],
        },
        "value_bets": [],
        "risk_flags": [reason],
        "disclaimer": "Ovo nije finansijski savet, već AI analiza zasnovana na dostupnoj statistici.",
    }


def run_ai_analysis(full_match: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prima full_match JSON (iz match_full.build_full_match)
    i vraća strukturisanu AI analizu sa value bet predlozima.
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
                "Return ONLY a JSON object that follows the specified schema.\n\n"
                f"MATCH_JSON:\n{match_json_str}"
            ),
        },
    ]

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
        "summary": parsed.get("summary", ""),
        "key_factors": parsed.get("key_factors", []) or [],
        "probabilities": parsed.get("probabilities", {}) or {
            "dc": {"1X": None, "X2": None, "12": None},
            "goals": {"over_1_5": None, "over_2_5": None, "under_3_5": None},
            "btts_yes": None,
            "btts_no": None,
            "cs_top2": [],
        },
        "value_bets": parsed.get("value_bets", []) or [],
        "risk_flags": parsed.get("risk_flags", []) or [],
        "disclaimer": parsed.get(
            "disclaimer",
            "Ovo nije finansijski savet, već AI analiza zasnovana na dostupnoj statistici.",
        ),
    }
