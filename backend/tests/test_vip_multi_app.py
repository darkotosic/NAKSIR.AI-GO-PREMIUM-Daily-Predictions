# ruff: noqa: E402
from __future__ import annotations

from datetime import datetime, timedelta
import pathlib
import sys

import pytest
from fastapi.testclient import TestClient

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import tests.conftest  # noqa: F401

pytest_plugins = ["tests.conftest"]

from backend import api_football
from backend.models import Entitlement
from backend.models.enums import EntitlementStatus
from backend.routers import ai as ai_router
from backend.routers import billing as billing_router
from backend.services.users_service import get_or_create_user


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


def _grant_entitlement(db_session, install_id: str, app_id: str) -> None:
    user, _wallet = get_or_create_user(db_session, install_id, app_id=app_id)
    db_session.add(
        Entitlement(
            user_id=user.id,
            tier="naksir_premium_1m",
            unlimited=True,
            valid_until=datetime.utcnow() + timedelta(days=30),
            status=EntitlementStatus.active,
        )
    )
    db_session.commit()


def test_vip_ai_without_entitlement_gets_402(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
) -> None:
    _install_fake_ai(monkeypatch)

    response = client.post(
        "/matches/123/ai-analysis",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": "vip-no-entitlement",
            "X-App-Id": "naksir.vip",
        },
        json={"trial_by_reward": False},
    )

    assert response.status_code == 402
    assert response.json()["detail"]["code"] == "SUBSCRIPTION_REQUIRED"


def test_vip_ai_with_entitlement_gets_200(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, db_session
) -> None:
    _install_fake_ai(monkeypatch)
    _grant_entitlement(db_session, "vip-entitled", "naksir.vip")

    response = client.post(
        "/matches/124/ai-analysis",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": "vip-entitled",
            "X-App-Id": "naksir.vip",
        },
        json={"trial_by_reward": False},
    )

    assert response.status_code == 200
    assert response.json()["analysis"]["preview"] == "ok"


def test_go_premium_ai_remains_backward_compatible(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
) -> None:
    _install_fake_ai(monkeypatch)

    response = client.post(
        "/matches/125/ai-analysis",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": "go-premium-free",
            "X-App-Id": "naksir.go_premium",
        },
        json={"trial_by_reward": False},
    )

    assert response.status_code == 200
    assert response.json()["analysis"]["preview"] == "ok"


def test_me_entitlements_isolated_by_app_id(client: TestClient, db_session) -> None:
    install_id = "same-device-isolated"
    _grant_entitlement(db_session, install_id, "naksir.go_premium")

    vip_response = client.get(
        "/me/entitlements",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": install_id,
            "X-App-Id": "naksir.vip",
        },
    )
    go_response = client.get(
        "/me/entitlements",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": install_id,
            "X-App-Id": "naksir.go_premium",
        },
    )

    assert vip_response.status_code == 200
    assert vip_response.json()["entitled"] is False
    assert go_response.status_code == 200
    assert go_response.json()["entitled"] is True


def test_google_verify_checks_package_per_app(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
) -> None:
    monkeypatch.setattr(billing_router, "APP_ENV", "prod")
    monkeypatch.setattr(billing_router, "GOOGLE_PLAY_PACKAGE_NAME", "com.naksir.soccerpredictions")
    monkeypatch.setattr(
        billing_router,
        "get_google_service_account_info",
        lambda: {"client_email": "svc@example.com", "private_key": "key"},
    )

    response = client.post(
        "/billing/google/verify",
        headers={
            "X-API-Key": "test-token",
            "X-Install-Id": "vip-package-check",
            "X-App-Id": "naksir.vip",
        },
        json={
            "packageName": "com.naksir.soccerpredictions",
            "productId": "naksir_premium_1m",
            "purchaseToken": "tok_vip_package_check",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "packageName mismatch"
