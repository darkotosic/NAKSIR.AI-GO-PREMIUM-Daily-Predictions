from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.billing_plans import SKU_TO_PLAN, EntitlementPlan
from backend.models import AIUsageDaily, AIUsagePeriod, Entitlement, Purchase
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
    total_allowance: Optional[int] = None,
    unlimited: bool = False,
    purchase: Optional[Purchase] = None,
    start_at: Optional[datetime] = None,
    valid_until_override: Optional[datetime] = None,
) -> Entitlement:
    entitlement = session.query(Entitlement).filter(Entitlement.user_id == user_id).one_or_none()

    valid_until: datetime | None = None
    if valid_until_override is not None:
        valid_until = valid_until_override
    else:
        base_start = start_at or datetime.now(timezone.utc)
        if period_days:
            valid_until = base_start + timedelta(days=period_days)

    if entitlement is None:
        entitlement = Entitlement(
            user_id=user_id,
            tier=plan,
            daily_limit=daily_limit or 0,
            total_allowance=total_allowance,
            unlimited=unlimited,
            valid_until=valid_until,
            status=EntitlementStatus.active,
            source_purchase=purchase,
        )
        session.add(entitlement)
    else:
        entitlement.tier = plan
        entitlement.daily_limit = daily_limit if daily_limit is not None else entitlement.daily_limit
        entitlement.total_allowance = total_allowance if total_allowance is not None else entitlement.total_allowance
        entitlement.unlimited = unlimited
        entitlement.valid_until = valid_until
        entitlement.status = EntitlementStatus.active
        entitlement.source_purchase = purchase

    session.commit()
    return entitlement


def get_entitlement_status(
    session: Session, *, user_id, now: Optional[datetime] = None
) -> tuple[bool, Optional[datetime], Optional[str], Optional[Entitlement]]:
    entitlement = session.query(Entitlement).filter(Entitlement.user_id == user_id).one_or_none()
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    entitled = False
    expires_at: Optional[datetime] = None
    plan: Optional[str] = None

    if entitlement and entitlement.status == EntitlementStatus.active:
        expires_at = entitlement.valid_until
        plan = entitlement.tier
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at is None or expires_at > current_time:
            entitled = True
        else:
            entitlement.status = EntitlementStatus.expired
            session.add(entitlement)
            session.commit()

    return entitled, expires_at, plan, entitlement


def get_active_entitlement(
    db: Session, user_id, now: Optional[datetime] = None
) -> Optional[Entitlement]:
    current_time = now or datetime.utcnow()
    if current_time.tzinfo:
        current_time = current_time.replace(tzinfo=None)

    stmt = (
        select(Entitlement)
        .where(Entitlement.user_id == user_id)
        .where(Entitlement.status == EntitlementStatus.active)
        .where(or_(Entitlement.valid_until == None, Entitlement.valid_until > current_time))
        .order_by(Entitlement.valid_until.desc().nulls_last())
        .limit(1)
    )

    return db.execute(stmt).scalars().first()


def check_and_consume_ai(
    db: Session, user_id, entitlement: Entitlement, now: Optional[datetime] = None
) -> Tuple[bool, Optional[str]]:
    """
    Enforce AI quota server-side.
    - unlimited -> allow
    - daily_limit -> atomic per-day increment
    - total_allowance -> atomic per-entitlement increment
    """

    current_time = now or datetime.now(timezone.utc)

    unlimited = bool(getattr(entitlement, "unlimited", False))
    daily_limit = getattr(entitlement, "daily_limit", None)
    total_allowance = getattr(entitlement, "total_allowance", None)

    if unlimited:
        return True, None

    if daily_limit is not None:
        today: date_type = current_time.date()

        row = db.execute(
            select(AIUsageDaily)
            .where(AIUsageDaily.user_id == user_id)
            .where(AIUsageDaily.date == today)
            .with_for_update()
        ).scalars().first()

        if row is None:
            row = AIUsageDaily(user_id=user_id, date=today, count=0)
            db.add(row)
            db.flush()

        if (row.count + 1) > int(daily_limit):
            return False, "Daily AI limit reached"

        row.count += 1
        db.add(row)
        return True, None

    if total_allowance is not None:
        ent_id = getattr(entitlement, "id")
        row = db.execute(
            select(AIUsagePeriod)
            .where(AIUsagePeriod.user_id == user_id)
            .where(AIUsagePeriod.entitlement_id == ent_id)
            .with_for_update()
        ).scalars().first()

        if row is None:
            row = AIUsagePeriod(user_id=user_id, entitlement_id=ent_id, count=0)
            db.add(row)
            db.flush()

        if (row.count + 1) > int(total_allowance):
            return False, "AI allowance reached"

        row.count += 1
        db.add(row)
        return True, None

    return True, None
