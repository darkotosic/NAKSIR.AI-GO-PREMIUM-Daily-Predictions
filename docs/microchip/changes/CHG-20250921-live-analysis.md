# CHG-20250921-live-analysis – Live AI analysis bypasses cache

## Why
- Ensure live matches always trigger fresh AI analysis instead of returning prematch cached data.
- Allow the frontend to explicitly request live analysis when a fixture is in-play.

## Impacted Micro-cells
- CELL_FRONTEND_APP
- CELL_BACKEND_API

## Contract Changes
- Before: AI analysis POST used cached responses by default.
- After: AI analysis POST supports optional `mode=live` to bypass cache and skip persistence.

## Migration Plan
- Deploy backend to honor `mode=live`.
- Update frontend to send `mode=live` for live fixtures and avoid cached GET.

## Rollback Plan
- Revert frontend live flag handling.
- Remove `mode=live` bypass logic from the AI analysis POST route.
