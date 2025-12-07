from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

from .api_football import get_fixture_by_id
from .match_full import build_full_match
from .ai_analysis import run_ai_analysis

app = FastAPI(title="NAKSIR GO PREMIUM API")


class AiRequest(BaseModel):
    user_question: str | None = None


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/matches/{fixture_id}/full")
def get_match_full(fixture_id: int) -> Dict[str, Any]:
    fixtures: List[Dict[str, Any]] = get_fixture_by_id(fixture_id)
    if not fixtures:
        raise HTTPException(status_code=404, detail="Fixture not found")
    full = build_full_match(fixtures[0])
    return full


@app.post("/matches/{fixture_id}/ai-analysis")
def post_ai_analysis(
    fixture_id: int,
    body: AiRequest,
) -> Dict[str, Any]:
    fixtures: List[Dict[str, Any]] = get_fixture_by_id(fixture_id)
    if not fixtures:
        raise HTTPException(status_code=404, detail="Fixture not found")

    full = build_full_match(fixtures[0])
    analysis = run_ai_analysis(full, user_question=body.user_question)
    return analysis
