from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, HTTPException, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .api_football import get_fixtures_today, get_fixture_by_id
from .match_full import build_full_match, build_match_summary
from .ai_analysis import run_ai_analysis
from .config import TIMEZONE

# ---------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------

logger = logging.getLogger("naksir.go_premium.api")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ---------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------

app = FastAPI(
    title="Naksir Go Premium – Football API",
    description=(
        "Backend servis za Naksir Go Premium / Daily Predictions.\n\n"
        "Glavni fokus: lagani JSON feedovi za mobilni front (Expo / React Native)."
    ),
    version="1.0.0",
)

# CORS – dozvoli mobilnim aplikacijama i web frontovima da zovu API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # po potrebi kasnije zatvoriti
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Pydantic modeli
# ---------------------------------------------------------------------


class AIAnalysisRequest(BaseModel):
    """Optionalni prompt korisnika za AI analizu meča."""

    question: Optional[str] = Field(
        default=None,
        description="Dodatno objašnjenje šta tačno AI treba da naglasi (npr. 'objasni value bet', 'short TikTok opis', itd.)",
    )


# ---------------------------------------------------------------------
# Globalni handler-i
# ---------------------------------------------------------------------


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler da uvek vratimo čist JSON a ne HTML traceback."""
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Contact support if this persists."},
    )


@app.on_event("startup")
def log_available_routes() -> None:
    """Na startup izloguj sve rute da odmah u Render logu vidiš šta je aktivno."""
    logger.info("===== API ROUTES =====")
    for route in app.routes:
        methods = getattr(route, "methods", None)
        if not methods:
            continue
        visible_methods = sorted(
            m for m in methods if m not in {"HEAD", "OPTIONS"}
        )
        if not visible_methods:
            continue
        logger.info(
            "%-6s %s",
            ",".join(visible_methods),
            route.path,
        )
    logger.info("======================")


# ---------------------------------------------------------------------
# Meta / health
# ---------------------------------------------------------------------


@app.get("/", tags=["meta"])
def root() -> Dict[str, Any]:
    """Kratak opis servisa + linkovi ka dokumentaciji."""
    return {
        "service": "Naksir Go Premium API",
        "status": "online",
        "docs": "/docs",
        "redoc": "/redoc",
        "timezone": TIMEZONE,
    }


@app.get("/health", tags=["meta"])
def health() -> Dict[str, str]:
    """Health-check endpoint za Render / uptime monitor."""
    return {"status": "ok"}


@app.get("/_debug/routes", tags=["meta"])
def list_routes() -> List[Dict[str, Any]]:
    """Povratak svih ruta i metoda – korisno za debag i QA."""
    routes: List[Dict[str, Any]] = []
    for route in app.routes:
        methods = getattr(route, "methods", None)
        if not methods:
            continue
        visible_methods = sorted(
            m for m in methods if m not in {"HEAD", "OPTIONS"}
        )
        if not visible_methods:
            continue
        routes.append(
            {
                "path": route.path,
                "methods": visible_methods,
                "name": route.name,
            }
        )
    routes.sort(key=lambda r: r["path"])
    return routes


# ---------------------------------------------------------------------
# Matches – glavne rute za front
# ---------------------------------------------------------------------


@app.get(
    "/matches/today",
    tags=["matches"],
    summary="Svi današnji mečevi (card format)",
)
def get_today_matches() -> List[Dict[str, Any]]:
    """
    Vrati listu svih *dozvoljenih* mečeva za današnji dan.

    Interno:
    - `get_fixtures_today()` radi poziv ka API-Football i filtriranje
      (allowlist liga + izbacivanje završenih / otkazanih statusa).
    - `build_match_summary()` pretvara raw fixture u lagani JSON
      spreman za karticu na frontu (liga, timovi, kickoff, status, skor, flagovi...).

    Response je čist `List[card]` bez dodatnog wrapper-a,
    da Expo/React Native može direktno da map-uje niz.
    """
    fixtures = get_fixtures_today()
    cards: List[Dict[str, Any]] = []

    for fx in fixtures:
        fixture_id = (fx.get("fixture") or {}).get("id")

        try:
            full_context = build_full_match(fx)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to build full context for fixture_id=%s: %s", fixture_id, exc
            )
            full_context = None

        if not full_context:
            cards.append(build_match_summary(fx))
            continue

        odds_block = full_context.get("odds") or {}

        cards.append(
            {
                "fixture_id": fixture_id,
                "summary": full_context.get("summary"),
                "standings": full_context.get("standings"),
                # Lagani snapshot za kartice – frontu je dovoljan "flat" deo
                "odds": {
                    "flat": odds_block.get("flat"),
                    "flat_probabilities": odds_block.get("flat_probabilities"),
                },
            }
        )

    logger.info("Today matches requested -> %s cards", len(cards))

    return cards


@app.get(
    "/matches/{fixture_id}",
    tags=["matches"],
    summary="Sažetak jednog meča (card)",
)
def get_match_summary(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
) -> Dict[str, Any]:
    """
    Vrati sažetak (istu strukturu kao iz `/matches/today`, ali za jedan fixture).

    Ako fixture ne postoji (nije u allowlistu ili je pogrešan ID) -> 404.
    """
    fixture = get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    return build_match_summary(fixture)


@app.get(
    "/matches/{fixture_id}/full",
    tags=["matches"],
    summary="Full kontekst jednog meča (stats, h2h, standings, itd.)",
)
def get_match_full(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
) -> Dict[str, Any]:
    """
    Dubinski kontekst jednog meča.

    `build_full_match` na osnovu raw fixture-a gradi bogat JSON:
    - osnovni podaci o meču
    - forma timova
    - H2H
    - standings / pozicije
    - timske statistike
    - predictions, injuries (gde god API-Football ima podatke)
    """
    fixture = get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    full_context = build_full_match(fixture)

    return full_context


@app.post(
    "/matches/{fixture_id}/ai-analysis",
    tags=["ai"],
    summary="AI analiza meča (GPT layer preko full konteksta)",
)
def post_match_ai_analysis(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    payload: AIAnalysisRequest = Body(
        default_factory=AIAnalysisRequest,
        description="Opcioni user prompt kojim se usmerava AI analiza.",
    ),
) -> Dict[str, Any]:
    """
    GPT analiza konkretnog meča.

    Flow:
    1) Dohvati se fixture (`get_fixture_by_id`).
    2) Od njega se napravi full kontekst (`build_full_match`).
    3) Taj kontekst + opcioni `question` se šalju u `run_ai_analysis`.
    """
    fixture = get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    full_context = build_full_match(fixture)

    odds_probabilities = None
    odds_section = full_context.get("odds") or {}
    if isinstance(odds_section, dict):
        odds_probabilities = odds_section.get("flat_probabilities")

    user_question = payload.question.strip() if payload.question else None
    logger.info(
        "AI analysis requested for fixture_id=%s (custom_question=%s)",
        fixture_id,
        bool(user_question),
    )

    analysis = run_ai_analysis(
        full_match=full_context,
        user_question=user_question,
    )

    return {
        "fixture_id": fixture_id,
        "generated_at": datetime.now().isoformat(),
        "timezone": TIMEZONE,
        "question": user_question,
        "analysis": analysis,
        "odds_probabilities": odds_probabilities,
    }
