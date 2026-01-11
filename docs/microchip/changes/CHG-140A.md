# CHG-140A – Add app_id scoping for users and AI analysis cache

## Why
- Support additive multi-tenant scoping by app_id while keeping existing behavior intact.

## Impacted Micro-cells
- CELL_BACKEND_DATA
- CELL_BACKEND_AI

## Contract Changes
- Before: No app_id column on users or AI cache tables; cache reads/writes scoped only by cache_key.
- After: Add app_id columns with default/backfill; cache reads/writes filter by app_id with default app_id for existing clients.

## Migration Plan
- Apply Alembic migration `140a_add_app_id_columns` to add and backfill app_id columns.
- Deploy application changes that write/read app_id with default `naksir.go_premium`.

## Rollback Plan
- Revert application changes to remove app_id usage.
- Downgrade migration to drop app_id columns if necessary.
