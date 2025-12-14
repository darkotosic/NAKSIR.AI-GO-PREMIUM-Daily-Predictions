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

# === RTDN Pub/Sub Push Authentication (OIDC) ===
RTDN_EXPECTED_AUDIENCE = "https://naksir-go-premium-api.onrender.com/billing/google/rtdn"
RTDN_EXPECTED_SERVICE_ACCOUNT_EMAIL = (
    "naksir-play-billing@soccer-predictions-naksir-ai.iam.gserviceaccount.com"
)

# Pub/Sub OIDC tokens are verified using Google's public signing certs.
# Docs: validate token integrity + ensure email + audience match subscription config.
GOOGLE_OIDC_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"

_JWK_CLIENT = None


def _verify_pubsub_oidc_or_throw(authorization: Optional[str]) -> None:
    """Verify Pub/Sub push OIDC JWT (Enable authentication ON)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization scheme")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")

    try:
        import jwt  # type: ignore
        from jwt import PyJWKClient  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail="Missing dependency for OIDC verification (PyJWT).",
        ) from exc

    global _JWK_CLIENT
    if _JWK_CLIENT is None:
        _JWK_CLIENT = PyJWKClient(GOOGLE_OIDC_JWKS_URL)

    # Audience can appear with/without trailing slash depending on config.
    auds = [RTDN_EXPECTED_AUDIENCE, RTDN_EXPECTED_AUDIENCE.rstrip("/") + "/"]

    try:
        # Helpful debug (no signature verification here) -> only for logs on failure
        unverified_header = jwt.get_unverified_header(token)
        unverified_claims = jwt.decode(token, options={"verify_signature": False})
        kid = unverified_header.get("kid")
        iss = unverified_claims.get("iss")
        aud = unverified_claims.get("aud")
        email = unverified_claims.get("email")
        sub = unverified_claims.get("sub")

        signing_key = _JWK_CLIENT.get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=auds,
            options={"require": ["exp", "iat", "aud"]},
        )
    except Exception as exc:  # noqa: BLE001
        # Log high-signal info so we can immediately see what's wrong.
        try:
            logger.warning(
                "RTDN OIDC token verification failed | kid=%s iss=%s aud=%s email=%s sub=%s err=%s",
                kid if "kid" in locals() else None,
                iss if "iss" in locals() else None,
                aud if "aud" in locals() else None,
                email if "email" in locals() else None,
                sub if "sub" in locals() else None,
                str(exc),
            )
        except Exception:
            logger.warning("RTDN OIDC token verification failed (logging error)")
        raise HTTPException(status_code=401, detail="Invalid OIDC token") from exc

    # Principal check per docs: email should match the service account configured on the subscription.
    email_claim = payload.get("email")
    if email_claim != RTDN_EXPECTED_SERVICE_ACCOUNT_EMAIL:
        # If Google ever sends tokens without email (rare), this log shows `sub` so we can adapt safely.
        logger.warning(
            "RTDN OIDC principal mismatch | email=%s sub=%s iss=%s aud=%s",
            payload.get("email"),
            payload.get("sub"),
            payload.get("iss"),
            payload.get("aud"),
        )
        raise HTTPException(status_code=401, detail="Invalid OIDC principal")


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
    Pub/Sub push body:
      { message: { data: base64(json), messageId: "...", attributes: {...} }, subscription: "..." }
    """
    # Prefer OIDC push-auth (Enable authentication).
    if authorization:
        _verify_pubsub_oidc_or_throw(authorization)
    else:
        # Fallback shared secret (only if you configured it)
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

    sn = payload.get("subscriptionNotification") or {}
    subscription_id = sn.get("subscriptionId")
    purchase_token = sn.get("purchaseToken")
    package_name = payload.get("packageName") or settings.google_play_package_name

    if not package_name or not subscription_id or not purchase_token:
        raise HTTPException(
            status_code=400,
            detail="RTDN missing packageName/subscriptionId/purchaseToken",
        )

    from backend.models import Purchase  # local import to avoid cycles
    from backend.services.purchases_service import handle_rtdn_event

    existing = (
        session.query(Purchase)
        .filter(Purchase.purchase_token == purchase_token, Purchase.platform == Platform.android)
        .one_or_none()
    )
    if not existing:
        # Idempotent: accept and exit; user may verify later and link purchase.
        return {"ok": True, "ignored": True}

    purchase = handle_rtdn_event(
        session,
        package_name=package_name,
        subscription_id=subscription_id,
        purchase_token=purchase_token,
        user_id=existing.user_id,
    )

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
