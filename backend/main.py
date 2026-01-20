from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import TIMEZONE, settings
from backend.monitoring import install_monitoring_hooks
from backend.observability import ObservabilityMiddleware
from backend.routers import ai, billing, btts_tickets, debug_ops, matches, meta, players, teams
from backend.routers.btts import router as btts_router

logger = logging.getLogger("naksir.go_premium.api")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Naksir Go Premium – Football API",
        description=(
            "Backend servis za Naksir Go Premium / Daily Predictions.\n\n"
            "Glavni fokus: lagani JSON feedovi za mobilni front (Expo / React Native)."
        ),
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(ObservabilityMiddleware)

    install_monitoring_hooks(app)

    @app.head("/")
    async def root_head():
        return {}

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Contact support if this persists."},
        )

    @app.on_event("startup")
    def log_available_routes() -> None:
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
            visible_methods = sorted(m for m in methods if m not in {"HEAD", "OPTIONS"})
            if not visible_methods:
                continue
            logger.info("%-6s %s", ",".join(visible_methods), route.path)
        logger.info("======================")

    app.include_router(meta.router)
    app.include_router(matches.router)
    app.include_router(ai.router)
    app.include_router(teams.router)
    app.include_router(players.router)
    app.include_router(billing.router)
    app.include_router(debug_ops.router)
    app.include_router(btts_router)
    app.include_router(btts_tickets.router)

    return app


app = create_app()
