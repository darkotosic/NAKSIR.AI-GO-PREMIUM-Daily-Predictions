# CHG-20251001-btts-live-ai-gate – Gate live AI by app

## Why
- BTTS app must not generate live AI output, but should allow pre-match reads if already cached.
- Keep Soccer Predictions live behavior unchanged.

## Impacted Micro-cells
- CELL_BACKEND_API
- CELL_BACKEND_DATA

## Contract Changes
- Before: any app could request live AI snapshots and run live analysis.
- After: live AI is disabled for `btts.predictor`; live mode becomes pre-match read-only with unavailable fallback.

## Migration Plan
- Deploy backend changes.
- Ensure BTTS client sends `X-App-Id: btts.predictor` on requests.

## Rollback Plan
- Revert change proposal commit and restore prior live AI routing logic.
