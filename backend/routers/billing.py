from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from backend.db import get_db
from backend.dependencies import require_api_key
from backend.models.enums import Platform
from backend.services.entitlements_service import (
    get_entitlement_status,
    resolve_product,
    upsert_entitlement,
)
from backend.services.purchases_service import upsert_product, upsert_purchase
from backend.services.users_service import get_or_create_user
from sqlalchemy.orm import Session

router = APIRouter(tags=["billing"])
logger = logging.getLogger("naksir.go_premium.api")


class BillingVerifyRequest(BaseModel):
    """Minimalni payload koji front šalje posle uspešne Google kupovine."""

    packageName: str = Field(..., description="Android package name (app id)")
    productId: str = Field(..., description="SKU sa Play Console-a")
    purchaseToken: str = Field(..., description="Token koji vraća Play Billing")


class EntitlementEnvelope(BaseModel):
    entitled: bool
    expiresAt: Optional[str] = None
    plan: Optional[str] = None
    freeRewardUsed: Optional[bool] = None


@router.post(
    "/billing/google/verify",
    summary="Verifikacija Google Play kupovine + kreiranje entitlementa",
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

    product_meta = resolve_product(payload.productId)
    now = datetime.utcnow()
    expires_at = (
        now + timedelta(days=product_meta.get("period_days"))
        if product_meta.get("period_days")
        else None
    )

    user, wallet = get_or_create_user(session, install_id)
    product = upsert_product(session, product_meta)

    raw_payload = {
        "packageName": payload.packageName,
        "daily_limit": product_meta.get("daily_limit"),
        "total_allowance": product_meta.get("total_allowance"),
        "unlimited": product_meta.get("unlimited"),
    }

    purchase = upsert_purchase(
        session,
        user_id=user.id,
        product_sku=product.sku,
        purchase_token=payload.purchaseToken,
        platform=Platform.android,
        start_at=now,
        end_at=expires_at,
        raw_payload=raw_payload,
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
        start_at=now,
    )

    return EntitlementEnvelope(
        entitled=True,
        expiresAt=entitlement.valid_until.isoformat() if entitlement.valid_until else None,
        plan=entitlement.tier,
        freeRewardUsed=wallet.free_reward_used,
    )


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
    entitled, expires_at, plan, _ = get_entitlement_status(
        session, user_id=user.id, now=datetime.utcnow()
    )

    return EntitlementEnvelope(
        entitled=entitled,
        expiresAt=expires_at.isoformat() if expires_at else None,
        plan=plan,
        freeRewardUsed=wallet.free_reward_used,
    )
