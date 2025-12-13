from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Protocol

import fakeredis
from redis import Redis
from redis.lock import Lock

from .config import settings

logger = logging.getLogger("naksir.go_premium.cache")

CACHE_PREFIX = "naksir:cache:"
LOCK_PREFIX = "naksir:lock:"


def make_cache_key(endpoint: str, params: Optional[Dict[str, Any]] = None) -> str:
    endpoint_clean = endpoint.strip("/")
    params = params or {}
    if not params:
        return endpoint_clean
    sorted_items = sorted(params.items())
    params_str = "|".join(f"{k}={v}" for k, v in sorted_items)
    return f"{endpoint_clean}|{params_str}"


@dataclass
class InflightHandle:
    key: str
    lock: Lock | None = None
    acquired: bool = False
    event: threading.Event | None = None


class CacheBackend(Protocol):
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        ...

    def set(self, key: str, value: Dict[str, Any], ttl_seconds: float) -> None:
        ...

    def begin_inflight(self, key: str) -> tuple[InflightHandle, bool]:
        ...

    def resolve_inflight(
        self, handle: InflightHandle, *, value: Optional[Dict[str, Any]] = None, error: Optional[BaseException] = None
    ) -> None:
        ...

    def wait_for_inflight(self, handle: InflightHandle) -> Dict[str, Any]:
        ...


class RedisCacheBackend:
    def __init__(self, redis_url: str, use_fake: bool = False) -> None:
        self.client: Redis
        if use_fake:
            self.client = fakeredis.FakeRedis(decode_responses=False)
        else:
            self.client = Redis.from_url(redis_url, decode_responses=False, socket_timeout=5)

    def _namespaced(self, key: str) -> str:
        return f"{CACHE_PREFIX}{key}"

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        raw = self.client.get(self._namespaced(key))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Invalid cached JSON for key=%s, purging", key)
            self.client.delete(self._namespaced(key))
            return None

    def set(self, key: str, value: Dict[str, Any], ttl_seconds: float) -> None:
        if ttl_seconds <= 0:
            return
        payload = json.dumps(value)
        self.client.setex(self._namespaced(key), int(ttl_seconds), payload)

    def begin_inflight(self, key: str) -> tuple[InflightHandle, bool]:
        lock = self.client.lock(f"{LOCK_PREFIX}{key}", timeout=30, blocking_timeout=5)
        acquired = lock.acquire(blocking=False)
        return InflightHandle(key=key, lock=lock, acquired=acquired), acquired

    def resolve_inflight(
        self, handle: InflightHandle, *, value: Optional[Dict[str, Any]] = None, error: Optional[BaseException] = None
    ) -> None:
        if handle.lock and handle.acquired and handle.lock.locked():
            try:
                handle.lock.release()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to release redis lock for %s: %s", handle.key, exc)

    def wait_for_inflight(self, handle: InflightHandle) -> Dict[str, Any]:
        if handle.lock:
            try:
                handle.lock.acquire(blocking=True)
            finally:
                if handle.lock.locked():
                    try:
                        handle.lock.release()
                    except Exception:
                        pass
        cached = self.get(handle.key)
        return cached or {}


class LocalCacheBackend:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._expiry: Dict[str, float] = {}
        self._inflight: Dict[str, InflightHandle] = {}

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        now = time.time()
        with self._lock:
            expires_at = self._expiry.get(key)
            if expires_at and expires_at < now:
                self._cache.pop(key, None)
                self._expiry.pop(key, None)
                return None
            return self._cache.get(key)

    def set(self, key: str, value: Dict[str, Any], ttl_seconds: float) -> None:
        if ttl_seconds <= 0:
            return
        expires_at = time.time() + ttl_seconds
        with self._lock:
            self._cache[key] = value
            self._expiry[key] = expires_at

    def begin_inflight(self, key: str) -> tuple[InflightHandle, bool]:
        with self._lock:
            if key in self._inflight:
                return self._inflight[key], False
            handle = InflightHandle(key=key, event=threading.Event(), acquired=True)
            self._inflight[key] = handle
            return handle, True

    def resolve_inflight(
        self, handle: InflightHandle, *, value: Optional[Dict[str, Any]] = None, error: Optional[BaseException] = None
    ) -> None:
        with self._lock:
            self._inflight.pop(handle.key, None)

        if handle.event:
            if error:
                handle.event.set()
            else:
                handle.event.set()

    def wait_for_inflight(self, handle: InflightHandle) -> Dict[str, Any]:
        if handle.event:
            handle.event.wait()
        cached = self.get(handle.key)
        return cached or {}


def _select_backend() -> CacheBackend:
    if settings.redis_url:
        logger.info("Using Redis cache backend (%s)", "fakeredis" if settings.use_fake_redis else settings.redis_url)
        return RedisCacheBackend(settings.redis_url, use_fake=settings.use_fake_redis)
    logger.info("Using in-memory cache backend")
    return LocalCacheBackend()


_BACKEND: CacheBackend = _select_backend()


def cache_get(key: str) -> Optional[Dict[str, Any]]:
    return _BACKEND.get(key)


def cache_set(key: str, value: Dict[str, Any], ttl_seconds: float) -> None:
    _BACKEND.set(key, value, ttl_seconds)


def begin_inflight(key: str) -> tuple[InflightHandle, bool]:
    return _BACKEND.begin_inflight(key)


def resolve_inflight(
    handle: InflightHandle, *, value: Optional[Dict[str, Any]] = None, error: Optional[BaseException] = None
) -> None:
    _BACKEND.resolve_inflight(handle, value=value, error=error)


def wait_for_inflight(handle: InflightHandle) -> Dict[str, Any]:
    return _BACKEND.wait_for_inflight(handle)
