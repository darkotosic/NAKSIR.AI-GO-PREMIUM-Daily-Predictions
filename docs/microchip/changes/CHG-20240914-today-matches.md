# CHG-20240914 – Include finished matches + live filter UI

## Why
- Allow the Today Matches feed to show completed games alongside upcoming fixtures.
- Add a live-only view and richer status badges in the frontend.

## Impacted Micro-cells
- CELL_BACKEND_FETCH_CACHE
- CELL_BACKEND_API
- CELL_FRONTEND_APP

## Contract Changes
- Before: `/matches/today` excluded finished fixtures due to SKIP_STATUS filtering.
- After: `/matches/today` includes finished fixtures while still skipping canceled/abandoned matches.

## Migration Plan
- Deploy backend change to include finished fixtures for `/matches/today`.
- Deploy frontend update to handle status/goals fields and live filtering.

## Rollback Plan
- Revert the include-finished flag for `/matches/today` and redeploy.
- Revert frontend filter/status badge updates.
