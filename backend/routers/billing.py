from __future__ import annotations

import base64
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import get_db
from backend.dependencies import require_api_key
from backend.models.enums import Platform
from backend.services.entitlements_service import (
    get_entitlement_status,
    resolve_product,
    upsert_entitlement,
)
from backend.services.purchases_service import (
    upsert_product,
    apply_verified_purchase,
    verify_google_subscription_with_google,
)
from backend.services.users_service import get_or_create_user

router = APIRouter(tags=["billing"])
logger = logging.getLogger("naksir.go_premium.api")

# === OIDC (Pub/Sub "Enable authentication") settings ===
# IMPORTANT:
# - In Pub/Sub subscription, set Audience to EXACTLY the endpoint URL below.
# - Service Account must match the one selected in Pub/Sub push auth settings.
RTDN_EXPECTED_AUDIENCE = "https://naksir-go-premium-api.onrender.com/billing/google/rtdn"
RTDN_EXPECTED_SERVICE_ACCOUNT_EMAIL = (
    "naksir-play-billing@soccer-predictions-naksir-ai.iam.gserviceaccount.com"
)
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"

# Cache JWK client (created lazily to avoid startup failures if dependency missing)
_JWK_CLIENT = None


class BillingVerifyRequest(BaseModel):
    packageName: str = Field(..., description="Android package name (app id)")
    productId: str = Field(..., description="SKU sa Play Console-a")
    purchaseToken: str = Field(..., description="Token koji vraća Play Billing")


class EntitlementEnvelope(BaseModel):
    entitled: bool
    expiresAt: Optional[str] = None
    plan: Optional[str] = None
    freeRewardUsed: Optional[bool] = None


class PubSubPushEnvelope(BaseModel):
    message: dict
    subscription: Optional[str] = None


def _require_google_config_or_throw() -> None:
    if settings.app_env in {"stage", "prod"} and not settings.google_play_service_account_json:
        raise HTTPException(status_code=503, detail="Billing verification not configured")


def _verify_pubsub_oidc_or_throw(authorization: Optional[str]) -> None:
    """
    Verifies Pub/Sub OIDC JWT (when subscription has "Enable authentication" checked).
    Accepts only:
      - aud == RTDN_EXPECTED_AUDIENCE
      - email == RTDN_EXPECTED_SERVICE_ACCOUNT_EMAIL
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization scheme")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")

    # Lazy imports so you only need to add dependency if you enable OIDC in Pub/Sub.
    try:
        import jwt  # type: ignore
        from jwt import PyJWKClient  # type: ignore
    except Exception as exc:  # noqa: BLE001
        # If this triggers, install PyJWT in backend deps (poetry/pip).
        raise HTTPException(
            status_code=503,
            detail="Missing dependency for OIDC verification (PyJWT). Install 'PyJWT' and redeploy.",
        ) from exc

    global _JWK_CLIENT
    if _JWK_CLIENT is None:
        _JWK_CLIENT = PyJWKClient(GOOGLE_JWKS_URL)

    try:
        signing_key = _JWK_CLIENT.get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=RTDN_EXPECTED_AUDIENCE,
            options={"require": ["exp", "iat", "aud"]},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("RTDN OIDC token verification failed")
        raise HTTPException(status_code=401, detail="Invalid OIDC token") from exc

    email = payload.get("email")
    if email != RTDN_EXPECTED_SERVICE_ACCOUNT_EMAIL:
        logger.warning("RTDN OIDC principal mismatch")
        raise HTTPException(status_code=401, detail="Invalid OIDC principal")


@router.post(
    "/billing/google/verify",
    summary="REAL: Google Play verifikacija + entitlement",
    response_model=EntitlementEnvelope,
    dependencies=[Depends(require_api_key)],
)
def verify_google_purchase(
    payload: BillingVerifyRequest,
    install_id: str = Header(None, alias="X-Install-Id"),
    session: Session = Depends(get_db),
) -> EntitlementEnvelope:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    _require_google_config_or_throw()

    product_meta = resolve_product(payload.productId)

    user, wallet = get_or_create_user(session, install_id)
    product = upsert_product(session, product_meta)

    package_name = payload.packageName or settings.google_play_package_name
    if not package_name:
        raise HTTPException(status_code=400, detail="packageName is required")

    # REAL verify
    verified = verify_google_subscription_with_google(
        package_name=package_name,
        sku=payload.productId,
        purchase_token=payload.purchaseToken,
    )

    purchase = apply_verified_purchase(
        session,
        user_id=user.id,
        sku=product.sku,
        purchase_token=payload.purchaseToken,
        package_name=package_name,
        verified=verified,
    )

    # Use Google end_at as entitlement expiry (source of truth)
    entitlement = upsert_entitlement(
        session,
        user_id=user.id,
        plan=product_meta["sku"],
        period_days=product_meta.get("period_days"),
        daily_limit=product_meta.get("daily_limit"),
        total_allowance=product_meta.get("total_allowance"),
        unlimited=product_meta.get("unlimited", False),
        purchase=purchase,
        start_at=verified.get("start_at") or datetime.utcnow(),
        valid_until_override=verified.get("end_at"),
    )

    entitled = entitlement.valid_until is None or entitlement.valid_until > datetime.utcnow()
    return EntitlementEnvelope(
        entitled=entitled,
        expiresAt=entitlement.valid_until.isoformat() if entitlement.valid_until else None,
        plan=entitlement.tier,
        freeRewardUsed=wallet.free_reward_used,
    )


@router.post(
    "/billing/google/rtdn",
    summary="RTDN: Google Play Real-time Developer Notifications (Pub/Sub push)",
)
async def google_rtdn(
    request: Request,
    body: PubSubPushEnvelope,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_goog_channel_token: Optional[str] = Header(None, alias="X-Goog-Channel-Token"),
    session: Session = Depends(get_db),
) -> dict:
    """
    Pub/Sub push body (expected when payload unwrapping is OFF):
      { message: { data: base64(json), messageId: "...", attributes: {...} }, subscription: "..." }

    Auth:
      - Preferred: OIDC JWT via Authorization: Bearer ... (Pub/Sub subscription -> Enable authentication)
      - Fallback: X-Goog-Channel-Token header (legacy)
    """
    # === Auth gate ===
    # If Pub/Sub OIDC is enabled, Authorization header will exist; verify it.
    if authorization:
        _verify_pubsub_oidc_or_throw(authorization)
    else:
        # Legacy optional verification token (if you use custom header mode)
        expected = settings.google_pubsub_verification_token
        if expected and x_goog_channel_token != expected:
            raise HTTPException(status_code=401, detail="Invalid RTDN token")

    msg = body.message or {}
    data_b64 = msg.get("data")
    if not data_b64:
        raise HTTPException(status_code=400, detail="Missing message.data")

    try:
        decoded = base64.b64decode(data_b64).decode("utf-8")
        payload = json.loads(decoded)
    except Exception as exc:  # noqa: BLE001
        logger.exception("RTDN decode error")
        raise HTTPException(status_code=400, detail="Invalid RTDN payload") from exc

    # subscriptionNotification: { subscriptionId, purchaseToken, notificationType }
    sn = payload.get("subscriptionNotification") or {}
    subscription_id = sn.get("subscriptionId")
    purchase_token = sn.get("purchaseToken")
    package_name = payload.get("packageName") or settings.google_play_package_name

    if not package_name or not subscription_id or not purchase_token:
        raise HTTPException(status_code=400, detail="RTDN missing packageName/subscriptionId/purchaseToken")

    # We cannot map purchaseToken -> user_id without store association.
    # Minimal pragmatic approach: find Purchase by token, then user_id from that.
    from backend.models import Purchase  # local import to avoid cycles

    existing = (
        session.query(Purchase)
        .filter(Purchase.purchase_token == purchase_token, Purchase.platform == Platform.android)
        .one_or_none()
    )
    if not existing:
        # Idempotent: accept and exit (Google will retry; we just don't know user yet)
        return {"ok": True, "ignored": True}

    from backend.services.purchases_service import handle_rtdn_event

    purchase = handle_rtdn_event(
        session,
        package_name=package_name,
        subscription_id=subscription_id,
        purchase_token=purchase_token,
        user_id=existing.user_id,
    )

    # Update entitlement to match new expiry
    from backend.services.entitlements_service import resolve_product, upsert_entitlement

    meta = resolve_product(subscription_id)
    upsert_entitlement(
        session,
        user_id=existing.user_id,
        plan=meta["sku"],
        period_days=meta.get("period_days"),
        daily_limit=meta.get("daily_limit"),
        total_allowance=meta.get("total_allowance"),
        unlimited=meta.get("unlimited", False),
        purchase=purchase,
        start_at=purchase.start_at,
        valid_until_override=purchase.end_at,
    )

    return {"ok": True}


@router.get(
    "/me/entitlements",
    summary="Trenutni entitlement status za install/device",
    response_model=EntitlementEnvelope,
    dependencies=[Depends(require_api_key)],
)
def get_entitlements(
    install_id: str = Header(None, alias="X-Install-Id"),
    session: Session = Depends(get_db),
) -> EntitlementEnvelope:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    user, wallet = get_or_create_user(session, install_id)
    entitled, expires_at, plan, _ = get_entitlement_status(session, user_id=user.id, now=datetime.utcnow())

    return EntitlementEnvelope(
        entitled=entitled,
        expiresAt=expires_at.isoformat() if expires_at else None,
        plan=plan,
        freeRewardUsed=wallet.free_reward_used,
    )
