from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.billing_plans import SKU_TO_PLAN, EntitlementPlan
from backend.models import Entitlement, Purchase
from backend.models.enums import EntitlementStatus


def resolve_product(sku: str) -> dict[str, Any]:
    plan: EntitlementPlan | None = SKU_TO_PLAN.get(sku)
    if plan is None:
        raise HTTPException(status_code=400, detail="Unsupported SKU")

    return {
        "sku": plan.sku,
        "period_days": plan.period_days,
        "daily_limit": plan.daily_limit,
        "total_allowance": plan.total_allowance,
        "unlimited": plan.unlimited,
    }


def upsert_entitlement(
    session: Session,
    *,
    user_id,
    plan: str,
    period_days: Optional[int],
    daily_limit: Optional[int],
    purchase: Optional[Purchase] = None,
    start_at: Optional[datetime] = None,
) -> Entitlement:
    entitlement = session.query(Entitlement).filter(Entitlement.user_id == user_id).one_or_none()

    valid_until: datetime | None = None
    base_start = start_at or datetime.utcnow()
    if period_days:
        valid_until = base_start + timedelta(days=period_days)

    if entitlement is None:
        entitlement = Entitlement(
            user_id=user_id,
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

    session.commit()
    return entitlement


def get_entitlement_status(
    session: Session, *, user_id, now: Optional[datetime] = None
) -> tuple[bool, Optional[datetime], Optional[str], Optional[Entitlement]]:
    entitlement = session.query(Entitlement).filter(Entitlement.user_id == user_id).one_or_none()
    current_time = now or datetime.utcnow()

    entitled = False
    expires_at: Optional[datetime] = None
    plan: Optional[str] = None

    if entitlement and entitlement.status == EntitlementStatus.active:
        expires_at = entitlement.valid_until
        plan = entitlement.tier
        if entitlement.valid_until is None or entitlement.valid_until > current_time:
            entitled = True
        else:
            entitlement.status = EntitlementStatus.expired
            session.add(entitlement)
            session.commit()

    return entitled, expires_at, plan, entitlement
