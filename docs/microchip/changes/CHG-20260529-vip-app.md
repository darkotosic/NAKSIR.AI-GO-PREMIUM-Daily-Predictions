# CHG-20260529-vip-app – No-ads VIP app and app-aware billing/AI gates

## Why
- Add a clean VIP Expo application without AdMob binaries or ad unlock flows.
- Ensure VIP AI access is enforced server-side by subscription entitlement.
- Keep the existing Go Premium app backward-compatible.

## Impacted Micro-cells
- CELL_BACKEND_AI
- CELL_BACKEND_API
- CELL_BACKEND_DATA
- CELL_FRONTEND_APP
- CELL_INFRA_GOVERNANCE

## Contract Changes
- Before: Contract registry omitted existing `/ping`, `/matches/tomorrow`, and `/matches/top3-today` routes.
- After: Existing routes are documented; no endpoints are removed or renamed.
- Before: AI and billing user lookup could default to the Go Premium app when `X-App-Id` was present.
- After: AI and billing lookups are scoped to request app context; VIP AI returns HTTP 402 without entitlement.

## Migration Plan
- Configure `GOOGLE_PLAY_PACKAGE_NAME_VIP=com.naksir.soccerpredictions.vip` on backend environments.
- Build VIP app with `EXPO_PUBLIC_APP_ID=naksir.vip` and `EXPO_PUBLIC_ANDROID_PACKAGE=com.naksir.soccerpredictions.vip`.
- Release VIP through a separate Play package/internal testing track.

## Rollback Plan
- Revert this change to remove the VIP folder and restore prior app feature flag behavior.
- Existing Go Premium app remains compatible because default `X-App-Id` behavior is unchanged.
