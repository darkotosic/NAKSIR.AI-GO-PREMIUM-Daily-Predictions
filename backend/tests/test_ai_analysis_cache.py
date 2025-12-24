from __future__ import annotations

from typing import Any
import pathlib
import sys

from fastapi.testclient import TestClient

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import tests.conftest  # noqa: F401
import pytest

pytest_plugins = ["tests.conftest"]

from backend.models.ai_analysis_cache import AiAnalysisCache
from backend.services import ai_analysis_cache_service


def test_ai_analysis_get_cached_hit(
    client: TestClient, db_session, entitlement_factory
) -> None:
    entitlement_factory(install_id="dev-install-cache", daily_limit=10, expires_in_days=1)

    cache_key = ai_analysis_cache_service.make_cache_key(
        fixture_id=123, prompt_version="v1", locale="en"
    )
    row = AiAnalysisCache(
        fixture_id=123,
        cache_key=cache_key,
        status="ready",
        analysis_json={"analysis": {"preview": "cached preview"}},
    )
    db_session.add(row)
    db_session.commit()

    response = client.get(
        "/matches/123/ai-analysis",
        headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-cache"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis"]["preview"] == "cached preview"


def test_ai_analysis_single_flight_waits_for_cached(
    client: TestClient, db_session, entitlement_factory, monkeypatch
) -> None:
    entitlement_factory(install_id="dev-install-single", daily_limit=10, expires_in_days=1)

    cache_key = ai_analysis_cache_service.make_cache_key(
        fixture_id=321, prompt_version="v1", locale="en"
    )
    row = AiAnalysisCache(
        fixture_id=321,
        cache_key=cache_key,
        status="generating",
        analysis_version="v1",
        lang="en",
        model="default",
    )
    db_session.add(row)
    db_session.commit()

    ready_row = AiAnalysisCache(
        fixture_id=321,
        cache_key=cache_key,
        status="ready",
        analysis_json={"analysis": {"preview": "cached from wait"}},
    )

    from backend.routers import ai as ai_router

    monkeypatch.setattr(ai_router, "wait_for_ready", lambda _cache_key: ready_row)

    response = client.post(
        "/matches/321/ai-analysis",
        headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-single"},
        json={"trial_by_reward": False},
    )

    assert response.status_code == 200
    payload: dict[str, Any] = response.json()
    assert payload["analysis"]["preview"] == "cached from wait"
