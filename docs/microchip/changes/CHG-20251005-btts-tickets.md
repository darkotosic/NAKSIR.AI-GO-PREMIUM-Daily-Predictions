# CHG-20251005 – Daily BTTS Tickets endpoint

## Why
- Add a cached daily BTTS tickets endpoint that returns YES/NO tickets built from today's pre-match fixtures.

## Impacted Micro-cells
- CELL_BACKEND_API
- CELL_BACKEND_DATA
- CELL_BACKEND_FETCH_CACHE

## Contract Changes
- Before:
  - No `/btts/tickets/today` endpoint.
- After:
  - New `GET /btts/tickets/today` returning the `DailyBttsTicketsResponse` contract.

## Migration Plan
- Deploy new router and service behind existing API key/app-id enforcement.
- Cache results for 30 minutes to keep tickets stable across clients.

## Rollback Plan
- Remove the router registration for the new endpoint and delete the added service/contract files.
