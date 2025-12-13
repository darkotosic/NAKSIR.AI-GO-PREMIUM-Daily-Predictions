from __future__ import annotations

import logging
import time
from typing import Callable

import requests
from fastapi import FastAPI, Request

from .config import settings

logger = logging.getLogger("naksir.go_premium.monitoring")


def install_monitoring_hooks(app: FastAPI) -> None:
    """Attach lightweight monitoring/alerting hooks to the FastAPI app."""

    @app.middleware("http")
    async def log_latency(request: Request, call_next: Callable):  # type: ignore[override]
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "HTTP %s %s -> %s in %.2fms",
            request.method,
            request.url.path,
            getattr(response, "status_code", "?"),
            duration_ms,
        )
        return response

    if settings.alert_webhook:
        try:
            requests.post(
                settings.alert_webhook,
                json={
                    "text": (
                        "Naksir Go Premium backend is up "
                        f"(env={settings.app_env}, timezone={settings.timezone})."
                    )
                },
                timeout=5,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to send startup alert: %s", exc)
