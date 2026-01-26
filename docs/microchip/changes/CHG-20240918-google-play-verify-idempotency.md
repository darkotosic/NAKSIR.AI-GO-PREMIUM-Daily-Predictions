# CHG-20240918 – Google Play verify hardening, expiry parsing, idempotent apply

## Why
- Prevent prod/stage Google Play verify from being blocked by silent env misconfiguration.
- Fix SubscriptionsV2 expiry parsing across RFC3339 and millis formats.
- Ensure purchase application is idempotent per purchaseToken to avoid duplicate rows or premium flip-flops.

## Impacted Micro-cells
- CELL_BACKEND_FETCH_CACHE
- CELL_BACKEND_API
- CELL_BACKEND_DATA

## Contract Changes
- Before: `/billing/google/verify` returned entitlement-only envelope.
- After: `/billing/google/verify` returns a deterministic payload including acknowledged/isActive/endAt/productId while retaining entitlement fields.

## Migration Plan
- Apply Alembic migration to add unique constraint on purchases.purchase_token.
- Deploy backend with new Google Play config validation and parsing logic.

## Rollback Plan
- Revert backend changes and drop the unique constraint.
- Restore previous billing verify response schema if needed.
