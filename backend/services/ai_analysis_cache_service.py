from __future__ import annotations

import time
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models.ai_analysis_cache import AiAnalysisCache

DEFAULT_WAIT_SECONDS = 20
POLL_INTERVAL_SECONDS = 0.5


def make_cache_key(*, fixture_id: int, version: str = "v1", lang: str = "en", model: str = "default") -> str:
    return f"{fixture_id}:{version}:{lang}:{model}"


def get_cached_ok(session: Session, cache_key: str) -> AiAnalysisCache | None:
    row = session.execute(
        select(AiAnalysisCache).where(AiAnalysisCache.cache_key == cache_key)
    ).scalars().first()
    if row and row.status == "ok" and row.analysis_json:
        return row
    return None


def try_mark_generating(
    session: Session,
    *,
    fixture_id: int,
    cache_key: str,
    version: str,
    lang: str,
    model: str,
) -> bool:
    """
    Returns True if we acquired "generation rights" (created row with status=generating).
    Returns False if someone else already has it.
    """
    row = AiAnalysisCache(
        fixture_id=fixture_id,
        cache_key=cache_key,
        status="generating",
        analysis_version=version,
        lang=lang,
        model=model,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(row)
    try:
        session.commit()
        return True
    except IntegrityError:
        session.rollback()
        return False


def wait_for_ready(cache_key: str, *, max_wait_seconds: int = DEFAULT_WAIT_SECONDS) -> AiAnalysisCache | None:
    """
    Poll DB until row becomes ok (or failed) or timeout.
    """
    deadline = time.monotonic() + max_wait_seconds
    while time.monotonic() < deadline:
        with SessionLocal() as session:
            row = session.execute(
                select(AiAnalysisCache).where(AiAnalysisCache.cache_key == cache_key)
            ).scalars().first()
            if not row:
                return None
            if row.status == "ok" and row.analysis_json:
                return row
            if row.status == "failed":
                return row
        time.sleep(POLL_INTERVAL_SECONDS)
    return None


def save_ok(
    session: Session,
    *,
    cache_key: str,
    fixture_id: int,
    analysis_json: dict[str, Any],
) -> None:
    row = session.execute(
        select(AiAnalysisCache).where(AiAnalysisCache.cache_key == cache_key)
    ).scalars().first()
    if not row:
        row = AiAnalysisCache(cache_key=cache_key, fixture_id=fixture_id)
        session.add(row)
    row.status = "ok"
    row.error = None
    row.analysis_json = analysis_json
    row.updated_at = datetime.utcnow()
    session.commit()


def save_failed(session: Session, *, cache_key: str, fixture_id: int, error: str) -> None:
    row = session.execute(
        select(AiAnalysisCache).where(AiAnalysisCache.cache_key == cache_key)
    ).scalars().first()
    if not row:
        row = AiAnalysisCache(cache_key=cache_key, fixture_id=fixture_id)
        session.add(row)
    row.status = "failed"
    row.error = error[:5000]
    row.updated_at = datetime.utcnow()
    session.commit()
