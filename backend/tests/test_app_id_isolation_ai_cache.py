from __future__ import annotations

import pathlib
import sys

from fastapi.testclient import TestClient
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import tests.conftest  # noqa: F401

pytest_plugins = ["tests.conftest"]

from backend import api_football
from backend.models.ai_analysis_cache import AiAnalysisCache
from backend.routers import ai as ai_router
from backend.services import ai_analysis_cache_service


def _install_fake_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        api_football,
        "get_fixture_by_id",
        lambda _fixture_id: {"league": {"id": 39}},
    )
    monkeypatch.setattr(
        ai_router,
        "build_full_match",
        lambda _fixture: {"odds": {"flat_probabilities": {"home": 0.5}}},
    )
    monkeypatch.setattr(
        ai_router,
        "run_ai_analysis",
        lambda *args, **kwargs: {"preview": "ok"},
    )
    monkeypatch.setattr(
        ai_router,
        "run_live_ai_analysis",
        lambda *args, **kwargs: {"preview": "ok"},
    )


def _get_cache_row(
    db_session, *, cache_key: str, app_id: str
) -> AiAnalysisCache | None:
    return (
        db_session.query(AiAnalysisCache)
        .filter_by(cache_key=cache_key, app_id=app_id)
        .first()
    )


def test_ai_cache_uses_header_app_id(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, db_session
) -> None:
    _install_fake_ai(monkeypatch)
    fixture_id = 456

    response = client.post(
        f"/matches/{fixture_id}/ai-analysis",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": "install-header",
            "X-App-Id": "btts.predictor",
        },
        json={"trial_by_reward": False},
    )

    assert response.status_code == 200

    cache_key = ai_analysis_cache_service.make_cache_key(
        fixture_id=fixture_id,
        prompt_version="v1",
        locale="en",
    )
    row = _get_cache_row(db_session, cache_key=cache_key, app_id="btts.predictor")

    assert row is not None
    assert row.app_id == "btts.predictor"


def test_ai_cache_defaults_to_go_premium_app_id(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, db_session
) -> None:
    _install_fake_ai(monkeypatch)
    fixture_id = 789

    response = client.post(
        f"/matches/{fixture_id}/ai-analysis",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": "install-default",
        },
        json={"trial_by_reward": False},
    )

    assert response.status_code == 200

    cache_key = ai_analysis_cache_service.make_cache_key(
        fixture_id=fixture_id,
        prompt_version="v1",
        locale="en",
    )
    row = _get_cache_row(db_session, cache_key=cache_key, app_id="naksir.go_premium")

    assert row is not None
    assert row.app_id == "naksir.go_premium"
