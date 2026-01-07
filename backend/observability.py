from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("naksir.go_premium.observability")


@dataclass
class RequestMetrics:
    cache_hits: int = 0
    cache_misses: int = 0
    upstream_calls: int = 0
    db_ms: float = 0.0
    api_ms: float = 0.0


_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)
_metrics: ContextVar[RequestMetrics | None] = ContextVar("request_metrics", default=None)


def get_request_id() -> str | None:
    return _request_id.get()


def get_request_metrics() -> RequestMetrics | None:
    return _metrics.get()


def add_cache_hit() -> None:
    metrics = _metrics.get()
    if metrics:
        metrics.cache_hits += 1


def add_cache_miss() -> None:
    metrics = _metrics.get()
    if metrics:
        metrics.cache_misses += 1


def add_upstream_call() -> None:
    metrics = _metrics.get()
    if metrics:
        metrics.upstream_calls += 1


def add_db_ms(duration_ms: float) -> None:
    metrics = _metrics.get()
    if metrics:
        metrics.db_ms += duration_ms


def add_api_ms(duration_ms: float) -> None:
    metrics = _metrics.get()
    if metrics:
        metrics.api_ms += duration_ms


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        request_id_token = _request_id.set(rid)
        metrics_token = _metrics.set(RequestMetrics())
        start = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            metrics = _metrics.get() or RequestMetrics()
            if response is not None:
                response.headers["X-Request-Id"] = rid
                response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
                response.headers["X-Cache-Hits"] = str(metrics.cache_hits)
                response.headers["X-Cache-Misses"] = str(metrics.cache_misses)
                response.headers["X-Upstream-Calls"] = str(metrics.upstream_calls)
                response.headers["X-DB-Time-Ms"] = f"{metrics.db_ms:.2f}"
                response.headers["X-API-Time-Ms"] = f"{metrics.api_ms:.2f}"
            logger.info(
                "RID=%s %s %s -> %s in %.2fms cache=HIT:%s MISS:%s upstream_calls=%s db_ms=%.2f api_ms=%.2f",
                rid,
                request.method,
                request.url.path,
                getattr(response, "status_code", "ERR"),
                duration_ms,
                metrics.cache_hits,
                metrics.cache_misses,
                metrics.upstream_calls,
                metrics.db_ms,
                metrics.api_ms,
            )
            _request_id.reset(request_id_token)
            _metrics.reset(metrics_token)
