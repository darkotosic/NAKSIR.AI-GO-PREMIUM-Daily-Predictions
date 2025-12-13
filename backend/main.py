from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import TIMEZONE, settings
from backend.monitoring import install_monitoring_hooks
from backend.routers import ai, billing, matches, meta

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

    install_monitoring_hooks(app)

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

    app.include_router(meta.router)
    app.include_router(matches.router)
    app.include_router(ai.router)
    app.include_router(billing.router)

    return app


app = create_app()
