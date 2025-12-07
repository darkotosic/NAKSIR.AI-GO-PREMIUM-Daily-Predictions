import json
from typing import Any, Dict

from openai import OpenAI

from .config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

SYSTEM_PROMPT = """You are a football betting analyst. Focus on:
- Double Chance + Goals combos (1X & O1.5, X2 & O1.5, 1X & U3.5, etc.)
- Correct Score Top 2 scenarios
- BTTS YES probability
Always respond in JSON with keys:
summary, key_factors, probabilities, value_bets, risk_flags, disclaimer.
"""


def run_ai_analysis(full_match: Dict[str, Any]) -> Dict[str, Any]:
    if client is None:
        # fallback kad nema API kljuca
        return {
            "summary": "AI analysis disabled (no OPENAI_API_KEY).",
            "key_factors": [],
            "probabilities": {
                "dc": {},
                "goals": {},
                "btts_yes": None,
                "btts_no": None,
                "cs_top2": [],
            },
            "value_bets": [],
            "risk_flags": [],
            "disclaimer": "Ovo nije finansijski savet.",
        }

    user_content = {"match": full_match}

    completion = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Analyze this match and output pure JSON only. {user_content}",
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        message_text = completion.output[0].content[0].text
    except Exception:
        message_text = "{}"

    try:
        return json.loads(message_text)
    except json.JSONDecodeError:
        return {
            "summary": "AI response malformed; returning empty analysis.",
            "key_factors": [],
            "probabilities": {
                "dc": {},
                "goals": {},
                "btts_yes": None,
                "btts_no": None,
                "cs_top2": [],
            },
            "value_bets": [],
            "risk_flags": ["AI output malformed"],
            "disclaimer": "Ovo nije finansijski savet.",
        }
