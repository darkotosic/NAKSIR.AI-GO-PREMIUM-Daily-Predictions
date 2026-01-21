# CHG-20260109 – Dev CORS defaults + API key header alias

## Why
- Allow Expo Web dev servers (8081) and common local tooling to pass CORS preflight without manual env setup.
- Accept `X-Client-Key` as an alias to `X-API-Key` for backward compatibility with existing clients.

## Impacted Micro-cells
- CELL_BACKEND_FETCH_CACHE
- CELL_BACKEND_API

## Contract Changes
- Before: CORS defaults excluded Expo Web port 8081; API auth required `X-API-Key`.
- After: CORS defaults include Expo Web and additional local dev origins; API auth accepts `X-Client-Key` as an alias in addition to `X-API-Key`.

## Migration Plan
- Deploy backend changes; clients may continue sending `X-Client-Key` or adopt `X-API-Key`.
- No data migrations required.

## Rollback Plan
- Revert to previous CORS default list and header enforcement (only `X-API-Key`).
