from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class BillingEntitlementPlan(BaseModel):
    sku: str
    period_days: int
    daily_limit: Optional[int] = None
    total_allowance: Optional[int] = None
    unlimited: bool
