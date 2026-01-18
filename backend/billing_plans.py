"""Shared billing SKU definitions for backend logic.

This mirrors the frontend SKU whitelist so SKU→plan metadata stays consistent.
Only 3 Premium subscriptions are supported:
- naksir_premium_7d
- naksir_premium_1m
- naksir_premium_1y
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Optional

Sku = Literal[
    "naksir_premium_7d",
    "naksir_premium_1m",
    "naksir_premium_1y",
]

SUBS_SKUS: tuple[Sku, ...] = (
    "naksir_premium_7d",
    "naksir_premium_1m",
    "naksir_premium_1y",
)


@dataclass(frozen=True)
class EntitlementPlan:
    sku: Sku
    period_days: Literal[7, 30, 365]
    daily_limit: Optional[int]
    total_allowance: Optional[int]
    unlimited: bool


SKU_TO_PLAN: Dict[Sku, EntitlementPlan] = {
    "naksir_premium_7d": EntitlementPlan(
        sku="naksir_premium_7d",
        period_days=7,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    ),
    "naksir_premium_1m": EntitlementPlan(
        sku="naksir_premium_1m",
        period_days=30,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    ),
    "naksir_premium_1y": EntitlementPlan(
        sku="naksir_premium_1y",
        period_days=365,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    ),
}
