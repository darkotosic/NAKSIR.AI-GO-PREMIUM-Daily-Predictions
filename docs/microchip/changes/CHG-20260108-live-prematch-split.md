# CHG-20260108 – Split live vs prematch AI analysis flows

## Why
- Live match analysis needs a dedicated prompt/output and UI tailored to real-time data.
- Prematch analysis should still generate on demand even when no cached report exists.

## Impacted Micro-cells
- CELL_BACKEND_AI
- CELL_BACKEND_API
- CELL_FRONTEND_APP

## Contract Changes
- Before:
  - Live and prematch analysis used the same output schema and screen.
- After:
  - Live analysis uses a dedicated output schema and screen while prematch analysis keeps the existing schema.

## Migration Plan
- Deploy backend prompt changes and frontend navigation updates together.
- Monitor live analysis response parsing in the new screen.

## Rollback Plan
- Revert to the previous AI analysis prompt and screen, and route live matches back to the prematch analysis screen.
