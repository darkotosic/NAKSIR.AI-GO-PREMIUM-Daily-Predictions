"""Shared billing SKU definitions for backend logic.

This mirrors the shared/billing_skus.ts file used by the frontend so that
SKU→plan metadata stays consistent across the stack.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Optional

Sku = Literal[
    "naksir_day_1_10",
    "naksir_day_1_5",
    "naksir_day_1_unlock",
    "naksir_day_7_10",
    "naksir_day_7_5",
    "naksir_day_7_unlimited",
    "naksir_day_30_10",
    "naksir_day_30_5",
    "naksir_day_30_unlimited",
]

SUBS_SKUS: tuple[Sku, ...] = (
    "naksir_day_1_10",
    "naksir_day_1_5",
    "naksir_day_1_unlock",
    "naksir_day_7_10",
    "naksir_day_7_5",
    "naksir_day_7_unlimited",
    "naksir_day_30_10",
    "naksir_day_30_5",
    "naksir_day_30_unlimited",
)


@dataclass(frozen=True)
class EntitlementPlan:
    sku: Sku
    period_days: Literal[1, 7, 30]
    daily_limit: Optional[int]
    total_allowance: Optional[int]
    unlimited: bool


SKU_TO_PLAN: Dict[Sku, EntitlementPlan] = {
    "naksir_day_1_10": EntitlementPlan(
        sku="naksir_day_1_10",
        period_days=1,
        daily_limit=None,
        total_allowance=10,
        unlimited=False,
    ),
    "naksir_day_1_5": EntitlementPlan(
        sku="naksir_day_1_5",
        period_days=1,
        daily_limit=None,
        total_allowance=5,
        unlimited=False,
    ),
    "naksir_day_1_unlock": EntitlementPlan(
        sku="naksir_day_1_unlock",
        period_days=1,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    ),
    "naksir_day_7_10": EntitlementPlan(
        sku="naksir_day_7_10",
        period_days=7,
        daily_limit=10,
        total_allowance=None,
        unlimited=False,
    ),
    "naksir_day_7_5": EntitlementPlan(
        sku="naksir_day_7_5",
        period_days=7,
        daily_limit=5,
        total_allowance=None,
        unlimited=False,
    ),
    "naksir_day_7_unlimited": EntitlementPlan(
        sku="naksir_day_7_unlimited",
        period_days=7,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    ),
    "naksir_day_30_10": EntitlementPlan(
        sku="naksir_day_30_10",
        period_days=30,
        daily_limit=10,
        total_allowance=None,
        unlimited=False,
    ),
    "naksir_day_30_5": EntitlementPlan(
        sku="naksir_day_30_5",
        period_days=30,
        daily_limit=5,
        total_allowance=None,
        unlimited=False,
    ),
    "naksir_day_30_unlimited": EntitlementPlan(
        sku="naksir_day_30_unlimited",
        period_days=30,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    ),
}
