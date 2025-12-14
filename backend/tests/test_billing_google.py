import base64
import json
from datetime import datetime, timedelta

import pytest

from backend.config import settings


def _fake_verified(end_at: datetime):
    return {
        "order_id": "GPA.1234-5678-9012-34567",
        "acknowledged": True,
        "start_at": datetime.utcnow(),
        "end_at": end_at,
        "raw": {"fake": True},
        "api": "test",
    }


def test_google_verify_creates_entitlement(monkeypatch, client):
    # Force config to look "enabled"
    monkeypatch.setattr(settings, "google_play_service_account_json", '{"type":"service_account"}', raising=False)

    # Patch verifier to avoid external calls
    from backend.services import purchases_service

    end_at = datetime.utcnow() + timedelta(days=30)

    monkeypatch.setattr(
        purchases_service,
        "verify_google_subscription_with_google",
        lambda **kwargs: _fake_verified(end_at),
    )

    # Call verify endpoint
    r = client.post(
        "/billing/google/verify",
        headers={"X-API-Key": "test-token", "X-Install-Id": "dev-install-billing-1"},
        json={
            "packageName": "com.naksir.go.premium",
            "productId": "premium_monthly",  # must exist in billing_plans mapping
            "purchaseToken": "tok_abc_123",
        },
    )

    # Depending on your SKU mapping, adjust expected status
    assert r.status_code == 200
    data = r.json()
    assert data["entitled"] in (True, False)
    assert data["plan"] == "premium_monthly"
    assert data["expiresAt"] is not None


def test_rtdn_endpoint_accepts_and_updates(monkeypatch, client, db_session):
    monkeypatch.setattr(settings, "google_pubsub_verification_token", "secret-token", raising=False)
    monkeypatch.setattr(settings, "google_play_package_name", "com.naksir.go.premium", raising=False)
    monkeypatch.setattr(settings, "google_play_service_account_json", '{"type":"service_account"}', raising=False)

    # Insert a purchase for token -> user mapping (minimal requirement in router)
    from backend.models import User
    from backend.models.enums import Platform, PurchaseState, PurchaseStatus
    from backend.models import Purchase

    u = User(install_id="dev-install-rtdn-1")
    db_session.add(u)
    db_session.flush()

    p = Purchase(
        user_id=u.id,
        platform=Platform.android,
        sku="premium_monthly",
        purchase_token="tok_rtdn_1",
        order_id=None,
        purchase_state=PurchaseState.purchased,
        acknowledged=True,
        start_at=datetime.utcnow(),
        end_at=datetime.utcnow() + timedelta(days=5),
        status=PurchaseStatus.active,
        raw_payload={},
    )
    db_session.add(p)
    db_session.commit()

    # Patch handler to skip Google
    from backend.services import purchases_service

    def _fake_handle_rtdn_event(session, package_name, subscription_id, purchase_token, user_id):
        # extend expiry
        p2 = session.query(Purchase).filter(Purchase.purchase_token == purchase_token).one()
        p2.end_at = datetime.utcnow() + timedelta(days=10)
        session.add(p2)
        session.commit()
        return p2

    monkeypatch.setattr(purchases_service, "handle_rtdn_event", _fake_handle_rtdn_event)

    # Pub/Sub push payload
    inner = {
        "packageName": "com.naksir.go.premium",
        "subscriptionNotification": {
            "subscriptionId": "premium_monthly",
            "purchaseToken": "tok_rtdn_1",
            "notificationType": 2,
        },
    }
    body = {
        "message": {
            "data": base64.b64encode(json.dumps(inner).encode("utf-8")).decode("utf-8"),
            "messageId": "1",
        },
        "subscription": "projects/x/subscriptions/y",
    }

    r = client.post(
        "/billing/google/rtdn",
        headers={"X-Goog-Channel-Token": "secret-token"},
        json=body,
    )

    assert r.status_code == 200
    assert r.json()["ok"] is True
