from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.models import Product, Purchase
from backend.models.enums import Platform, ProductType, PurchaseState, PurchaseStatus


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


def upsert_purchase(
    session: Session,
    *,
    user_id,
    product_sku: str,
    purchase_token: str,
    platform: Platform,
    start_at: datetime,
    end_at: Optional[datetime],
    raw_payload: dict[str, Any],
) -> Purchase:
    purchase = (
        session.query(Purchase)
        .filter(Purchase.purchase_token == purchase_token, Purchase.platform == platform)
        .one_or_none()
    )

    if purchase is None:
        purchase = Purchase(
            user_id=user_id,
            platform=platform,
            sku=product_sku,
            purchase_token=purchase_token,
            order_id=None,
            purchase_state=PurchaseState.purchased,
            acknowledged=True,
            start_at=start_at,
            end_at=end_at,
            status=PurchaseStatus.active,
            raw_payload=raw_payload,
        )
        session.add(purchase)
    else:
        purchase.sku = product_sku
        purchase.purchase_state = PurchaseState.purchased
        purchase.acknowledged = True
        purchase.status = PurchaseStatus.active
        purchase.start_at = purchase.start_at or start_at
        purchase.end_at = end_at
        purchase.raw_payload = raw_payload

    return purchase
