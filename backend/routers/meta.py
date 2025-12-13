from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from backend.config import TIMEZONE
from backend.db import SessionLocal
from backend.dependencies import require_api_key

router = APIRouter(tags=["meta"])
logger = logging.getLogger("naksir.go_premium.api")


@router.get("/")
def root() -> Dict[str, Any]:
    """Kratak opis servisa + linkovi ka dokumentaciji."""
    return {
        "service": "Naksir Go Premium API",
        "status": "online",
        "docs": "/docs",
        "redoc": "/redoc",
        "timezone": TIMEZONE,
    }


@router.get("/health")
def health() -> Dict[str, str]:
    """Health-check endpoint za Render / uptime monitor."""
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.exception("DB health check failed")
        raise HTTPException(status_code=503, detail="database_unavailable") from exc

    return {"status": "ok", "db": "ok"}


@router.get("/_debug/routes", dependencies=[Depends(require_api_key)])
def list_routes(request: Request) -> List[Dict[str, Any]]:
    """Povratak svih ruta i metoda – korisno za debag i QA."""
    routes: List[Dict[str, Any]] = []
    for route in request.app.routes:
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
