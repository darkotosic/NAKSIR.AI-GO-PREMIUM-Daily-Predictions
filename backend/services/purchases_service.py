from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.models import Product, Purchase
from backend.models.enums import Platform, ProductType, PurchaseState, PurchaseStatus
from backend.services.google_play_service import fetch_subscription_state


def upsert_product(session: Session, meta: dict[str, Any]) -> Product:
    product = session.query(Product).filter(Product.sku == meta["sku"]).one_or_none()
    if product is None:
        product = Product(
            sku=meta["sku"],
            type=ProductType.subscription,
            duration_days=meta.get("period_days"),
            daily_limit=meta.get("daily_limit"),
            is_active=True,
        )
        session.add(product)
    else:
        product.duration_days = meta.get("period_days")
        product.daily_limit = meta.get("daily_limit")
        product.is_active = True
    return product


def get_purchase_by_token(
    session: Session, purchase_token: str, platform: Platform
) -> Optional[Purchase]:
    return (
        session.query(Purchase)
        .filter(Purchase.purchase_token == purchase_token, Purchase.platform == platform)
        .one_or_none()
    )


def _derive_status_from_end_at(end_at: Optional[datetime]) -> PurchaseStatus:
    if end_at is None:
        return PurchaseStatus.active
    now = datetime.utcnow()
    return PurchaseStatus.active if end_at > now else PurchaseStatus.expired


def upsert_purchase(
    session: Session,
    *,
    user_id,
    product_sku: str,
    purchase_token: str,
    platform: Platform,
    start_at: Optional[datetime],
    end_at: Optional[datetime],
    raw_payload: dict[str, Any],
    order_id: Optional[str] = None,
    acknowledged: Optional[bool] = None,
) -> Purchase:
    purchase = (
        session.query(Purchase)
        .filter(Purchase.purchase_token == purchase_token, Purchase.platform == platform)
        .one_or_none()
    )

    status = _derive_status_from_end_at(end_at)

    if purchase is None:
        purchase = Purchase(
            user_id=user_id,
            platform=platform,
            sku=product_sku,
            purchase_token=purchase_token,
            order_id=order_id,
            purchase_state=PurchaseState.purchased,
            acknowledged=bool(acknowledged) if acknowledged is not None else False,
            start_at=start_at,
            end_at=end_at,
            status=status,
            raw_payload=raw_payload,
        )
        session.add(purchase)
    else:
        purchase.sku = product_sku
        purchase.purchase_state = PurchaseState.purchased
        if order_id:
            purchase.order_id = order_id
        if acknowledged is not None:
            purchase.acknowledged = bool(acknowledged)
        purchase.status = status
        purchase.start_at = purchase.start_at or start_at
        purchase.end_at = end_at
        purchase.raw_payload = raw_payload

    return purchase


def verify_google_subscription_with_google(
    *, package_name: str, sku: str, purchase_token: str
) -> dict[str, Any]:
    """
    Calls Google Play Developer API to verify subscription.
    Returns normalized dict with end_at/order_id/ack + raw.
    """
    verified = fetch_subscription_state(
        package_name=package_name,
        subscription_id=sku,
        purchase_token=purchase_token,
    )
    return verified


def apply_verified_purchase(
    session: Session,
    *,
    user_id,
    sku: str,
    purchase_token: str,
    package_name: str,
    verified: dict[str, Any],
) -> Purchase:
    return upsert_purchase(
        session,
        user_id=user_id,
        product_sku=sku,
        purchase_token=purchase_token,
        platform=Platform.android,
        start_at=verified.get("start_at"),
        end_at=verified.get("end_at"),
        raw_payload={
            "packageName": package_name,
            "api": verified.get("api"),
            "raw": verified.get("raw"),
        },
        order_id=verified.get("order_id"),
        acknowledged=verified.get("acknowledged"),
    )


def handle_rtdn_event(
    session: Session,
    *,
    package_name: str,
    subscription_id: str,
    purchase_token: str,
    user_id,
) -> Purchase:
    """
    RTDN event arrives with (subscriptionId, purchaseToken).
    We re-verify against Google, then upsert purchase.
    """
    verified = verify_google_subscription_with_google(
        package_name=package_name,
        sku=subscription_id,
        purchase_token=purchase_token,
    )
    purchase = apply_verified_purchase(
        session,
        user_id=user_id,
        sku=subscription_id,
        purchase_token=purchase_token,
        package_name=package_name,
        verified=verified,
    )
    return purchase
