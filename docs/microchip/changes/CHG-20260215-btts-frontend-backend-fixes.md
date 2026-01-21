# CHG-20260215 – BTTS frontend env + list normalization, backend cache JSON default

## Why
- Ensure Expo static env access to avoid missing EXPO_PUBLIC_* in APK builds.
- Normalize list payloads to avoid `.map` crashes when API returns wrapped objects.
- Prevent cache serialization errors for date/datetime values to stop 500s on tickets.

## Impacted Micro-cells
- CELL_BACKEND_FETCH_CACHE
- (Frontend app scope outside microchip map: `btts.predictor`)

## Contract Changes
- Before: API list endpoints sometimes returned wrapped payloads and frontend assumed arrays.
- After: Frontend normalizes arrays from `data`/`matches`/`items` without changing API contracts.

## Migration Plan
- Deploy backend cache serialization change.
- Release frontend app update with env/static access + list normalization.

## Rollback Plan
- Revert to previous cache serialization behavior and frontend API helpers.
