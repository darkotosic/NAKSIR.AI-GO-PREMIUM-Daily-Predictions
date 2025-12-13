from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from backend.billing_plans import SKU_TO_PLAN, EntitlementPlan
from backend.db import SessionLocal
from backend.dependencies import require_api_key
from backend.models import CoinsWallet, Entitlement, Product, Purchase, User
from backend.models.enums import (
    AuthProvider,
    EntitlementStatus,
    Platform,
    ProductType,
    PurchaseState,
    PurchaseStatus,
)

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


def _get_or_create_user(session: SessionLocal, install_id: str) -> tuple[User, CoinsWallet]:
    user = session.query(User).filter(User.device_id == install_id).one_or_none()
    if user is None:
        user = User(device_id=install_id, auth_provider=AuthProvider.device)
        session.add(user)
        session.flush()

    wallet = (
        session.query(CoinsWallet).filter(CoinsWallet.user_id == user.id).one_or_none()
    )
    if wallet is None:
        wallet = CoinsWallet(user_id=user.id, balance=0, free_reward_used=False)
        session.add(wallet)

    return user, wallet


def _resolve_product(product_id: str) -> dict[str, Any]:
    plan: EntitlementPlan | None = SKU_TO_PLAN.get(product_id)
    if plan is None:
        raise HTTPException(status_code=400, detail="Unsupported SKU")

    daily_limit = plan.daily_limit or plan.total_allowance

    return {
        "sku": plan.sku,
        "plan": plan.sku,
        "duration_days": plan.period_days,
        "daily_limit": daily_limit,
        "total_allowance": plan.total_allowance,
        "unlimited": plan.unlimited,
    }


def _upsert_product(session: SessionLocal, meta: dict[str, Any]) -> Product:
    product = session.query(Product).filter(Product.sku == meta["sku"]).one_or_none()
    if product is None:
        product = Product(
            sku=meta["sku"],
            type=ProductType.subscription,
            duration_days=meta.get("duration_days"),
            daily_limit=meta.get("daily_limit"),
            is_active=True,
        )
        session.add(product)
    else:
        product.duration_days = meta.get("duration_days")
        product.daily_limit = meta.get("daily_limit")
        product.is_active = True
    return product


def _upsert_entitlement(
    session: SessionLocal,
    user: User,
    plan: str,
    duration_days: Optional[int],
    daily_limit: Optional[int],
    purchase: Optional[Purchase] = None,
) -> Entitlement:
    entitlement = (
        session.query(Entitlement).filter(Entitlement.user_id == user.id).one_or_none()
    )
    valid_until: datetime | None = None
    if duration_days:
        valid_until = datetime.utcnow() + timedelta(days=duration_days)

    if entitlement is None:
        entitlement = Entitlement(
            user_id=user.id,
            tier=plan,
            daily_limit=daily_limit or 0,
            valid_until=valid_until,
            status=EntitlementStatus.active,
            source_purchase=purchase,
        )
        session.add(entitlement)
    else:
        entitlement.tier = plan
        entitlement.daily_limit = daily_limit or entitlement.daily_limit
        entitlement.valid_until = valid_until
        entitlement.status = EntitlementStatus.active
        entitlement.source_purchase = purchase

    return entitlement


@router.post(
    "/billing/google/verify",
    summary="Verifikacija Google Play kupovine + kreiranje entitlementa",
    response_model=EntitlementEnvelope,
    dependencies=[Depends(require_api_key)],
)
def verify_google_purchase(
    payload: BillingVerifyRequest,
    install_id: str = Header(None, alias="X-Install-Id"),
) -> EntitlementEnvelope:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    product_meta = _resolve_product(payload.productId)
    now = datetime.utcnow()
    expires_at = (
        now + timedelta(days=product_meta.get("duration_days"))
        if product_meta.get("duration_days")
        else None
    )

    with SessionLocal() as session:
        user, wallet = _get_or_create_user(session, install_id)
        product = _upsert_product(session, product_meta)

        purchase = (
            session.query(Purchase)
            .filter(
                Purchase.purchase_token == payload.purchaseToken,
                Purchase.platform == Platform.android,
            )
            .one_or_none()
        )

        raw_payload = {
            "packageName": payload.packageName,
            "daily_limit": product_meta.get("daily_limit"),
            "total_allowance": product_meta.get("total_allowance"),
            "unlimited": product_meta.get("unlimited"),
        }

        if purchase is None:
            purchase = Purchase(
                user_id=user.id,
                platform=Platform.android,
                sku=product.sku,
                purchase_token=payload.purchaseToken,
                order_id=None,
                purchase_state=PurchaseState.purchased,
                acknowledged=True,
                start_at=now,
                end_at=expires_at,
                status=PurchaseStatus.active,
                raw_payload=raw_payload,
            )
            session.add(purchase)
        else:
            purchase.sku = product.sku
            purchase.purchase_state = PurchaseState.purchased
            purchase.acknowledged = True
            purchase.status = PurchaseStatus.active
            purchase.start_at = purchase.start_at or now
            purchase.end_at = expires_at
            purchase.raw_payload = raw_payload

        entitlement = _upsert_entitlement(
            session,
            user=user,
            plan=product_meta["plan"],
            duration_days=product_meta.get("duration_days"),
            daily_limit=product_meta.get("daily_limit"),
            purchase=purchase,
        )

        session.commit()

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
def get_entitlements(install_id: str = Header(None, alias="X-Install-Id")) -> EntitlementEnvelope:
    if not install_id:
        raise HTTPException(status_code=400, detail="X-Install-Id header is required")

    with SessionLocal() as session:
        user, wallet = _get_or_create_user(session, install_id)
        entitlement = (
            session.query(Entitlement).filter(Entitlement.user_id == user.id).one_or_none()
        )

        now = datetime.utcnow()
        entitled = False
        expires_at: Optional[datetime] = None
        plan: Optional[str] = None

        if entitlement and entitlement.status == EntitlementStatus.active:
            expires_at = entitlement.valid_until
            plan = entitlement.tier
            if entitlement.valid_until is None or entitlement.valid_until > now:
                entitled = True
            else:
                entitlement.status = EntitlementStatus.expired
                session.add(entitlement)
                session.commit()

        return EntitlementEnvelope(
            entitled=entitled,
            expiresAt=expires_at.isoformat() if expires_at else None,
            plan=plan,
            freeRewardUsed=wallet.free_reward_used,
        )
