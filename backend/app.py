from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import SEASON, TIMEZONE, ALLOW_LIST
from .api_football import get_fixture_by_id, get_fixtures_today
from .match_full import build_full_match, build_match_summary
from .ai_analysis import run_ai_analysis

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logger = logging.getLogger("naksir.go_premium.api")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Naksir GO Premium Backend",
    description=(
        "Three-layer match analysis API powered by API-FOOTBALL (season 2025) "
        "and OpenAI. Layer 1 = daily match list, Layer 2 = full enriched match, "
        "Layer 3 = Naksir in-depth AI analysis."
    ),
    version="1.0.0",
)

# CORS – front će najčešće biti mobilna app + web, zato otvaramo sve
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic modeli
# ---------------------------------------------------------------------------


class AiRequest(BaseModel):
    """
    Body za /matches/{fixture_id}/ai-analysis.
    """

    user_question: Optional[str] = Field(
        default=None,
        description=(
            "Opcioni custom prompt korisnika. Ako je None, koristi se "
            "default Naksir in-depth analiza."
        ),
    )


# ---------------------------------------------------------------------------
# Helper – logovanje ruta na startup
# ---------------------------------------------------------------------------


@app.on_event("startup")
async def log_routes() -> None:
    lines: List[str] = []
    for route in app.routes:
        methods = getattr(route, "methods", None)
        if not methods:
            continue
        visible_methods = sorted(m for m in methods if m not in {"HEAD", "OPTIONS"})
        for m in visible_methods:
            lines.append(f"{m:6} {route.path}")
    if lines:
        logger.info("========== API ROUTES ==========")
        for line in lines:
            logger.info(line)
        logger.info("================================")


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------


@app.get("/")
def root() -> Dict[str, Any]:
    """
    Root endpoint – brzi health + meta informacije o servisu.
    """
    return {
        "name": "Naksir GO Premium Backend",
        "status": "ok",
        "season": SEASON,
        "timezone": TIMEZONE,
        "allow_leagues_count": len(ALLOW_LIST),
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
def health() -> Dict[str, str]:
    """
    Jednostavan health-check – koristi ga Render i monitoring.
    """
    return {"status": "ok"}


@app.get("/matches/today")
def get_today_matches() -> List[Dict[str, Any]]:
    """
    Layer 1 — lista svih današnjih mečeva iz allow liste.

    Idealno za home screen:
    • scroll lista kartica
    • osnovni podaci: država + emoji, liga, runda, timovi, logo, vreme (Europe/Belgrade),
      stadion, sudija…

    Response: list[MatchSummaryDict]
    (tačan shape određuje build_match_summary u match_full.py)
    """
    fixtures = get_fixtures_today()
    summaries = [build_match_summary(fx) for fx in fixtures]
    logger.info("Returned %s matches for /matches/today", len(summaries))
    return summaries


@app.get("/matches/{fixture_id}")
@app.get("/matches/{fixture_id}/full")
def get_match_full(fixture_id: int) -> Dict[str, Any]:
    """
    Layer 2 — full enriched match object za jedan meč.

    Ovaj endpoint je core za drugi sloj:
    • forma oba tima (last 5)
    • H2H (last 5)
    • standings
    • injuries
    • team statistics
    • venue / stadium
    • kompletan odds paket (1X2, DC, BTTS, totals, team goals…)

    Response: dict (shape određuje build_full_match u match_full.py)
    """
    fixture = get_fixture_by_id(fixture_id)
    if not fixture:
        logger.warning("Fixture %s not found for /matches/.../full", fixture_id)
        raise HTTPException(status_code=404, detail="Fixture not found")

    full = build_full_match(fixture)
    logger.info("Built full match payload for fixture_id=%s", fixture_id)
    return full


@app.post("/matches/{fixture_id}/ai-analysis")
def post_ai_analysis(fixture_id: int, body: AiRequest) -> Dict[str, Any]:
    """
    Layer 3 — Naksir AI in-depth analiza za jedan meč.

    Radi end-to-end:
    • dohvatimo fixture
    • složimo full objekt (Layer 2)
    • pošaljemo u OpenAI meta-model
    • vraćamo:
        - in-depth text analizу (5–7 rečenica)
        - value bet kombinacije
        - winner prediction
        - goals / BTTS probability
        - correct score (2 najverovatnija rezultata)
    """
    fixture = get_fixture_by_id(fixture_id)
    if not fixture:
        logger.warning("Fixture %s not found for /matches/.../ai-analysis", fixture_id)
        raise HTTPException(status_code=404, detail="Fixture not found")

    full = build_full_match(fixture)
    analysis = run_ai_analysis(full, user_question=body.user_question)
    logger.info("AI analysis generated for fixture_id=%s", fixture_id)
    return analysis


# ---------------------------------------------------------------------------
# Lokalno pokretanje (nije potrebno na Render-u, ali zgodno za dev)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
