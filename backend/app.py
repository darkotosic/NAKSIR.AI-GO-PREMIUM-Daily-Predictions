from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import Body, Depends, FastAPI, Header, HTTPException, Path, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from . import api_football
from .api_football import get_fixtures_today, get_fixture_by_id, get_standings
from .cache import cache_get, make_cache_key
from .db import SessionLocal
from .match_full import build_full_match, build_match_summary
from .ai_analysis import build_fallback_analysis, run_ai_analysis
from .config import TIMEZONE, settings
from .odds_summary import build_odds_summary
from .models import CoinsWallet, Entitlement, Product, Purchase, User
from .models.enums import (
    AuthProvider,
    EntitlementStatus,
    Platform,
    ProductType,
    PurchaseState,
    PurchaseStatus,
)
from .monitoring import install_monitoring_hooks

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
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(api_key: Optional[str] = Depends(api_key_scheme)) -> str:
    if not api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header is required")
    if api_key not in settings.api_auth_tokens:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


install_monitoring_hooks(app)

# ---------------------------------------------------------------------
# Pydantic modeli
# ---------------------------------------------------------------------


class AIAnalysisRequest(BaseModel):
    """Optionalni prompt korisnika za AI analizu meča."""

    question: Optional[str] = Field(
        default=None,
        description="Dodatno objašnjenje šta tačno AI treba da naglasi (npr. 'objasni value bet', 'short TikTok opis', itd.)",
    )


class BillingVerifyRequest(BaseModel):
    """Minimalni payload koji front šalje posle uspešne Google kupovine."""

    packageName: str = Field(..., description="Android package name (app id)")
    productId: str = Field(..., description="SKU sa Play Console-a")
    purchaseToken: str = Field(..., description="Token koji vraća Play Billing")


class EntitlementEnvelope(BaseModel):
    entitled: bool
    expiresAt: Optional[str] = None
    plan: Optional[str] = None
    freeRewardUsed: Optional[bool] = None


# ---------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------


def _get_or_create_user(session: SessionLocal, install_id: str) -> tuple[User, CoinsWallet]:
    user = session.query(User).filter(User.device_id == install_id).one_or_none()
    if user is None:
        user = User(device_id=install_id, auth_provider=AuthProvider.device)
        session.add(user)
        session.flush()

    wallet = (
        session.query(CoinsWallet).filter(CoinsWallet.user_id == user.id).one_or_none()
    )
    if wallet is None:
        wallet = CoinsWallet(user_id=user.id, balance=0, free_reward_used=False)
        session.add(wallet)

    return user, wallet


def _resolve_product(product_id: str) -> dict[str, Any]:
    sku_map: dict[str, dict[str, Any]] = {
        # 1 DAY
        "naksir_day_1_5_analysis": {"duration_days": 1, "daily_limit": 5},
        "naksir_day_1_10_analysis": {"duration_days": 1, "daily_limit": 10},
        "naksir_day_1_unlimited": {"duration_days": 1, "daily_limit": None},
        # 7 DAYS
        "naksir_7_days_5_per_day": {"duration_days": 7, "daily_limit": 5},
        "naksir_7_days_10_per_day": {"duration_days": 7, "daily_limit": 10},
        "naksir_7_days_unlimited": {"duration_days": 7, "daily_limit": None},
        # 30 DAYS
        "naksir_30_days_5_per_day": {"duration_days": 30, "daily_limit": 5},
        "naksir_30_days_10_per_day": {"duration_days": 30, "daily_limit": 10},
        "naksir_30_days_unlimited": {"duration_days": 30, "daily_limit": None},
    }

    resolved = sku_map.get(product_id, {"duration_days": 1, "daily_limit": None})
    return {"sku": product_id, "plan": product_id, **resolved}


def _upsert_product(session: SessionLocal, meta: dict[str, Any]) -> Product:
    product = session.query(Product).filter(Product.sku == meta["sku"]).one_or_none()
    if product is None:
        product = Product(
            sku=meta["sku"],
            type=ProductType.subscription,
            duration_days=meta.get("duration_days"),
            daily_limit=meta.get("daily_limit"),
            is_active=True,
        )
        session.add(product)
    else:
        product.duration_days = meta.get("duration_days")
        product.daily_limit = meta.get("daily_limit")
        product.is_active = True
    return product


def _upsert_entitlement(
    session: SessionLocal,
    user: User,
    plan: str,
    duration_days: Optional[int],
    daily_limit: Optional[int],
    purchase: Optional[Purchase] = None,
) -> Entitlement:
    entitlement = (
        session.query(Entitlement).filter(Entitlement.user_id == user.id).one_or_none()
    )
    valid_until: datetime | None = None
    if duration_days:
        valid_until = datetime.utcnow() + timedelta(days=duration_days)

    if entitlement is None:
        entitlement = Entitlement(
            user_id=user.id,
            tier=plan,
            daily_limit=daily_limit or 0,
            valid_until=valid_until,
            status=EntitlementStatus.active,
            source_purchase=purchase,
        )
        session.add(entitlement)
    else:
        entitlement.tier = plan
        entitlement.daily_limit = daily_limit or entitlement.daily_limit
        entitlement.valid_until = valid_until
        entitlement.status = EntitlementStatus.active
        entitlement.source_purchase = purchase

    return entitlement


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
    logger.info(
        "Env=%s, timezone=%s, redis_configured=%s",
        settings.app_env,
        TIMEZONE,
        bool(settings.redis_url),
    )
    logger.info("Allowed CORS origins: %s", ", ".join(settings.allowed_origins))
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
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.exception("DB health check failed")
        raise HTTPException(status_code=503, detail="database_unavailable") from exc

    return {"status": "ok", "db": "ok"}


@app.get("/_debug/routes", tags=["meta"], dependencies=[Depends(require_api_key)])
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
# Billing / entitlements
# ---------------------------------------------------------------------


@app.post(
    "/billing/google/verify",
    tags=["billing"],
    summary="Verifikacija Google Play kupovine + kreiranje entitlementa",
    response_model=EntitlementEnvelope,
    dependencies=[Depends(require_api_key)],
)
def verify_google_purchase(
    payload: BillingVerifyRequest,
    install_id: str = Header(None, alias="X-Install-Id"),
) -> EntitlementEnvelope:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    product_meta = _resolve_product(payload.productId)
    now = datetime.utcnow()
    expires_at = (
        now + timedelta(days=product_meta.get("duration_days"))
        if product_meta.get("duration_days")
        else None
    )

    with SessionLocal() as session:
        user, wallet = _get_or_create_user(session, install_id)
        product = _upsert_product(session, product_meta)

        purchase = (
            session.query(Purchase)
            .filter(
                Purchase.purchase_token == payload.purchaseToken,
                Purchase.platform == Platform.android,
            )
            .one_or_none()
        )

        raw_payload = {
            "packageName": payload.packageName,
            "daily_limit": product_meta.get("daily_limit"),
        }

        if purchase is None:
            purchase = Purchase(
                user_id=user.id,
                platform=Platform.android,
                sku=product.sku,
                purchase_token=payload.purchaseToken,
                order_id=None,
                purchase_state=PurchaseState.purchased,
                acknowledged=True,
                start_at=now,
                end_at=expires_at,
                status=PurchaseStatus.active,
                raw_payload=raw_payload,
            )
            session.add(purchase)
        else:
            purchase.sku = product.sku
            purchase.purchase_state = PurchaseState.purchased
            purchase.acknowledged = True
            purchase.status = PurchaseStatus.active
            purchase.start_at = purchase.start_at or now
            purchase.end_at = expires_at
            purchase.raw_payload = raw_payload

        entitlement = _upsert_entitlement(
            session,
            user=user,
            plan=product_meta["plan"],
            duration_days=product_meta.get("duration_days"),
            daily_limit=product_meta.get("daily_limit"),
            purchase=purchase,
        )

        session.commit()

        return EntitlementEnvelope(
            entitled=True,
            expiresAt=entitlement.valid_until.isoformat() if entitlement.valid_until else None,
            plan=entitlement.tier,
            freeRewardUsed=wallet.free_reward_used,
        )


@app.get(
    "/me/entitlements",
    tags=["billing"],
    summary="Trenutni entitlement status za install/device",
    response_model=EntitlementEnvelope,
    dependencies=[Depends(require_api_key)],
)
def get_entitlements(install_id: str = Header(None, alias="X-Install-Id")) -> EntitlementEnvelope:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    with SessionLocal() as session:
        user, wallet = _get_or_create_user(session, install_id)
        entitlement = (
            session.query(Entitlement).filter(Entitlement.user_id == user.id).one_or_none()
        )

        now = datetime.utcnow()
        entitled = False
        expires_at: Optional[datetime] = None
        plan: Optional[str] = None

        if entitlement and entitlement.status == EntitlementStatus.active:
            expires_at = entitlement.valid_until
            plan = entitlement.tier
            if entitlement.valid_until is None or entitlement.valid_until > now:
                entitled = True
            else:
                entitlement.status = EntitlementStatus.expired
                session.add(entitlement)
                session.commit()

        return EntitlementEnvelope(
            entitled=entitled,
            expiresAt=expires_at.isoformat() if expires_at else None,
            plan=plan,
            freeRewardUsed=wallet.free_reward_used,
        )


# ---------------------------------------------------------------------
# Matches – glavne rute za front
# ---------------------------------------------------------------------


@app.get(
    "/matches/today",
    tags=["matches"],
    summary="Svi današnji mečevi (card format)",
    dependencies=[Depends(require_api_key)],
)
def get_today_matches(
    cursor: int = Query(0, ge=0, description="Pagination cursor"),
    limit: int = Query(10, ge=1, le=100, description="Page size"),
) -> Dict[str, Any]:
    """
    Vrati listu svih *dozvoljenih* mečeva za današnji dan u paginiranom wrapper-u.

    Interno:
    - `get_fixtures_today()` radi poziv ka API-Football i filtriranje
      (allowlist liga + izbacivanje završenih / otkazanih statusa).
    - `build_match_summary()` pretvara raw fixture u lagani JSON
      spreman za karticu na frontu (liga, timovi, kickoff, status, skor, flagovi...).
    - Lagani odds snapshot se doda samo ako već postoji u cache-u (bez novih API poziva).
    """

    fixtures = get_fixtures_today()
    cards: List[Dict[str, Any]] = []
    standings_cache: Dict[tuple[int, int], List[Dict[str, Any]]] = {}

    for fx in fixtures:
        fixture_id = (fx.get("fixture") or {}).get("id")
        summary = build_match_summary(fx)
        league_id = summary.get("league", {}).get("id")
        season = summary.get("league", {}).get("season")
        home_team_id = (summary.get("teams", {}).get("home") or {}).get("id")
        away_team_id = (summary.get("teams", {}).get("away") or {}).get("id")

        odds_flat = None
        if fixture_id:
            odds_key = make_cache_key("odds", {"fixture": fixture_id, "page": 1})
            odds_payload = cache_get(odds_key)
            odds_response = odds_payload.get("response") if isinstance(odds_payload, dict) else None
            if isinstance(odds_response, list) and odds_response:
                try:
                    odds_flat = build_odds_summary(odds_response)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Failed to build odds snapshot for fixture_id=%s: %s", fixture_id, exc
                    )

        card: Dict[str, Any] = {
            "fixture_id": fixture_id,
            "summary": summary,
        }

        if league_id and season and (home_team_id or away_team_id):
            cache_key = (league_id, season)
            standings_payload = standings_cache.get(cache_key)
            if standings_payload is None:
                standings_payload = get_standings(league_id, season)
                standings_cache[cache_key] = standings_payload

            league_block = (standings_payload[0].get("league") or {}) if standings_payload else {}
            standings_groups = league_block.get("standings") or []
            table_rows = [row for group in standings_groups for row in (group or [])]

            def _find_row(team_id: Optional[int]) -> Optional[Dict[str, Any]]:
                if not team_id:
                    return None
                row = next(
                    (item for item in table_rows if (item.get("team") or {}).get("id") == team_id),
                    None,
                )
                if not row:
                    return None
                return {
                    "rank": row.get("rank"),
                    "points": row.get("points"),
                    "form": row.get("form"),
                    "team": row.get("team"),
                }

            home_standing = _find_row(home_team_id)
            away_standing = _find_row(away_team_id)
            if home_standing or away_standing:
                card["standings_snapshot"] = {
                    "home": home_standing,
                    "away": away_standing,
                }

        if odds_flat:
            card["odds"] = {"flat": odds_flat}
        cards.append(card)

    total = len(cards)
    start = min(cursor, total)
    end = min(start + limit, total)
    items = cards[start:end]
    next_cursor = end if end < total else None

    logger.info("Today matches requested -> %s cards (cursor=%s, limit=%s)", total, cursor, limit)

    return {"items": items, "next_cursor": next_cursor, "total": total}


@app.get(
    "/matches/{fixture_id}",
    tags=["matches"],
    summary="Sažetak jednog meča (card)",
    dependencies=[Depends(require_api_key)],
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
    dependencies=[Depends(require_api_key)],
)
def get_match_full(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    sections: Optional[str] = Query(
        default=None,
        description="Comma-separated list of sections to include (summary,odds,standings,stats,team_stats,h2h,events,lineups,players,predictions,injuries)",
    ),
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

    section_set = (
        {part.strip() for part in sections.split(",") if part.strip()}
        if sections
        else None
    )

    full_context = build_full_match(fixture, sections=section_set)

    return full_context


@app.get(
    "/h2h",
    tags=["matches"],
    summary="Head-to-head lista za dati fixture (core sekcija)",
    dependencies=[Depends(require_api_key)],
)
def get_h2h_for_fixture(
    fixture_id: int = Query(..., description="API-Football fixture ID"),
) -> Dict[str, Any]:
    """Vraća samo H2H blok za fixture – lagani helper za dedicated ekran."""

    fixture = get_fixture_by_id(fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    teams = fixture.get("teams") or {}
    home_team = teams.get("home") or {}
    away_team = teams.get("away") or {}
    home_team_id = home_team.get("id")
    away_team_id = away_team.get("id")

    if not home_team_id or not away_team_id:
        raise HTTPException(
            status_code=400,
            detail="Missing team IDs for fixture; cannot fetch head-to-head data.",
        )

    h2h_helper = getattr(api_football, "get_fixture_h2h", None) or getattr(
        api_football, "get_h2h", None
    )
    if h2h_helper is None:
        raise HTTPException(status_code=503, detail="H2H helper not available")

    try:
        h2h_block = h2h_helper(fixture_id, home_team_id, away_team_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to fetch h2h for fixture_id=%s: %s", fixture_id, exc)
        raise HTTPException(status_code=502, detail="Failed to fetch h2h data")

    return {
        "fixture_id": fixture_id,
        "home_team_id": home_team_id,
        "away_team_id": away_team_id,
        **(h2h_block or {}),
    }


@app.post(
    "/matches/{fixture_id}/ai-analysis",
    tags=["ai"],
    summary="AI analiza meča (GPT layer preko full konteksta)",
    dependencies=[Depends(require_api_key)],
)
def post_match_ai_analysis(
    fixture_id: int = Path(..., description="API-Football fixture ID"),
    payload: AIAnalysisRequest = Body(
        default_factory=AIAnalysisRequest,
        description="Opcioni user prompt kojim se usmerava AI analiza.",
    ),
    trial: bool = Query(False, description="Da li je besplatna nagrada iskorišćena"),
    install_id: Optional[str] = Header(None, alias="X-Install-Id"),
) -> Dict[str, Any]:
    """
    GPT analiza konkretnog meča.

    Flow:
    1) Dohvati se fixture (`get_fixture_by_id`).
    2) Od njega se napravi full kontekst (`build_full_match`).
    3) Taj kontekst + opcioni `question` se šalju u `run_ai_analysis`.
    """
    user_question = payload.question.strip() if payload.question else None
    logger.info(
        "AI analysis requested for fixture_id=%s (custom_question=%s)",
        fixture_id,
        bool(user_question),
    )

    fixture = None
    fixture_error_reason: str | None = None
    try:
        fixture = get_fixture_by_id(fixture_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Failed to fetch fixture_id=%s from API-Football: %s", fixture_id, exc
        )
        fixture_error_reason = f"API-Football fetch failed: {exc}"

    if not fixture:
        analysis = build_fallback_analysis(
            fixture_error_reason or "fixture not found or API-Football unavailable"
        )
        odds_probabilities = None
    else:
        try:
            full_context = build_full_match(fixture)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to build full match context for fixture_id=%s: %s",
                fixture_id,
                exc,
            )
            full_context = None
            context_error_reason = f"context build failed: {exc}"
        else:
            context_error_reason = None

        if not full_context:
            analysis = build_fallback_analysis(
                context_error_reason or "context build failed"
            )
            odds_probabilities = None
        else:
            odds_section = full_context.get("odds") or {}
            odds_probabilities = None
            if isinstance(odds_section, dict):
                odds_probabilities = odds_section.get("flat_probabilities")

            analysis = run_ai_analysis(
                full_match=full_context,
                user_question=user_question,
            )

    if trial:
        if not install_id:
            raise HTTPException(status_code=400, detail="X-Install-Id header is required for trial flag")
        with SessionLocal() as session:
            _, wallet = _get_or_create_user(session, install_id)
            wallet.free_reward_used = True
            session.add(wallet)
            session.commit()

    return {
        "fixture_id": fixture_id,
        "generated_at": datetime.now().isoformat(),
        "timezone": TIMEZONE,
        "question": user_question,
        "analysis": analysis,
        "odds_probabilities": odds_probabilities,
    }
