from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

logger = logging.getLogger("naksir.go_premium.cache")


@dataclass
class CacheEntry:
    value: Dict[str, Any]
    expires_at: float


class InflightResult:
    def __init__(self) -> None:
        self.event = threading.Event()
        self.value: Optional[Dict[str, Any]] = None
        self.error: Optional[BaseException] = None

    def set_result(self, value: Dict[str, Any]) -> None:
        self.value = value
        self.event.set()

    def set_exception(self, error: BaseException) -> None:
        self.error = error
        self.event.set()

    def wait(self) -> Dict[str, Any]:
        self.event.wait()
        if self.error:
            raise self.error
        return self.value or {}


_LOCK = threading.Lock()
_CACHE: Dict[str, CacheEntry] = {}
_INFLIGHT: Dict[str, InflightResult] = {}


def make_cache_key(endpoint: str, params: Optional[Dict[str, Any]] = None) -> str:
    endpoint_clean = endpoint.strip("/")
    params = params or {}
    if not params:
        return endpoint_clean
    sorted_items = sorted(params.items())
    params_str = "|".join(f"{k}={v}" for k, v in sorted_items)
    return f"{endpoint_clean}|{params_str}"


def cache_get(key: str) -> Optional[Dict[str, Any]]:
    now = time.time()
    with _LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        if entry.expires_at < now:
            _CACHE.pop(key, None)
            return None
        return entry.value


def cache_set(key: str, value: Dict[str, Any], ttl_seconds: float) -> None:
    if ttl_seconds <= 0:
        return
    expires_at = time.time() + ttl_seconds
    with _LOCK:
        _CACHE[key] = CacheEntry(value=value, expires_at=expires_at)


def begin_inflight(key: str) -> tuple[InflightResult, bool]:
    """Return inflight holder and flag whether caller owns execution."""

    with _LOCK:
        existing = _INFLIGHT.get(key)
        if existing:
            return existing, False

        holder = InflightResult()
        _INFLIGHT[key] = holder
        return holder, True


def resolve_inflight(
    key: str, *, value: Optional[Dict[str, Any]] = None, error: Optional[BaseException] = None
) -> None:
    with _LOCK:
        holder = _INFLIGHT.pop(key, None)

    if not holder:
        return

    if error is not None:
        holder.set_exception(error)
    else:
        holder.set_result(value or {})


def wait_for_inflight(holder: InflightResult) -> Dict[str, Any]:
    return holder.wait()
