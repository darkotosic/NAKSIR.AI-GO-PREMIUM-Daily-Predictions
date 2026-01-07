# AGENTS.md — NAKSIR.AI GO PREMIUM

This file defines the Agent Mesh and Microchip Map summary for the repo.

## Microchip Map Summary
| Cell ID | Scope | Purpose |
| --- | --- | --- |
| CELL_BACKEND_FETCH_CACHE | `backend/api_football.py`, `backend/cache.py`, `backend/config.py` | API-Football fetch + caching boundaries. |
| CELL_BACKEND_MATCH_AGG | `backend/match_full.py` | Match summary + full context aggregation. |
| CELL_BACKEND_ODDS | `backend/odds_normalizer.py`, `backend/odds_summary.py` | Odds normalization + probabilities. |
| CELL_BACKEND_AI | `backend/ai_analysis.py`, `backend/services/ai_analysis_cache_service.py` | AI analysis orchestration + caching. |
| CELL_BACKEND_API | `backend/main.py`, `backend/app.py`, `backend/routers/*`, `backend/monitoring.py`, `backend/observability.py`, `backend/dependencies.py` | HTTP routing + guardrails. |
| CELL_BACKEND_DATA | `backend/db.py`, `backend/models/*`, `backend/services/*`, `alembic/*` | Persistence + billing data. |
| CELL_FRONTEND_APP | `frontend/*` | Expo/React Native app + API consumption. |
| CELL_SHARED_BILLING | `shared/billing_skus.ts` | Shared SKU + entitlement metadata. |
| CELL_INFRA_GOVERNANCE | `docs/microchip/*`, `scripts/*`, `OWNERSHIP.yml`, `.github/workflows/*`, `Makefile` | Governance, CI, and contract checks. |

## Agent Mesh

### AGENT_BACKEND_FETCH_CACHE
- **Ownership:** `backend/api_football.py`, `backend/cache.py`, `backend/config.py`
- **Responsibilities:** API-Football calls, caching, rate-limit handling.
- **Guardrails:** Must preserve allow-list filtering and cache fallback behavior.
- **Required checks:** contract check, unit tests touching fetch/cache.

### AGENT_BACKEND_MATCH_AGG
- **Ownership:** `backend/match_full.py`
- **Responsibilities:** summary card + full context aggregation.
- **Guardrails:** Summary and full-context output keys must remain stable.
- **Required checks:** contract check, unit tests for match contracts.

### AGENT_BACKEND_ODDS
- **Ownership:** `backend/odds_normalizer.py`, `backend/odds_summary.py`
- **Responsibilities:** odds flattening + probabilities.
- **Guardrails:** Maintain flat odds schema and probability invariants.
- **Required checks:** contract check, odds-related unit tests.

### AGENT_BACKEND_AI
- **Ownership:** `backend/ai_analysis.py`, `backend/services/ai_analysis_cache_service.py`
- **Responsibilities:** AI analysis orchestration and caching policy.
- **Guardrails:** Preserve AI response structure and caching flags.
- **Required checks:** contract check, AI unit tests.

### AGENT_BACKEND_API
- **Ownership:** `backend/main.py`, `backend/app.py`, `backend/routers/*`, `backend/monitoring.py`, `backend/observability.py`, `backend/dependencies.py`
- **Responsibilities:** routing, middleware, guardrails, observability.
- **Guardrails:** Documented endpoints must remain available unless versioned.
- **Required checks:** contract check, smoke tests.

### AGENT_BACKEND_DATA
- **Ownership:** `backend/db.py`, `backend/models/*`, `backend/services/*`, `alembic/*`
- **Responsibilities:** persistence, billing entitlements, service layer.
- **Guardrails:** Schema migrations required for breaking DB changes.
- **Required checks:** contract check, unit tests for services.

### AGENT_FRONTEND_APP
- **Ownership:** `frontend/*`
- **Responsibilities:** UI flows, API consumption, navigation.
- **Guardrails:** Must respect backend contracts defined in `frontend/src/contracts`.
- **Required checks:** contract check, frontend type-check (when available).

### AGENT_SHARED_BILLING
- **Ownership:** `shared/billing_skus.ts`, `shared/contracts/index.ts`
- **Responsibilities:** Shared SKU list + entitlement metadata.
- **Guardrails:** Keep shared SKUs in sync with backend billing plans.
- **Required checks:** contract check.

### AGENT_INFRA_GOVERNANCE
- **Ownership:** `docs/microchip/*`, `scripts/*`, `OWNERSHIP.yml`, `.github/workflows/*`, `Makefile`
- **Responsibilities:** governance docs, CI gates, contract checks.
- **Guardrails:** Contract check must always be runnable.
- **Required checks:** contract check, smoke test.

### AGENT_SYSTEM
- **Ownership:** Global constraints, cross-cell policies.
- **Responsibilities:** Approve cross-cell changes, enforce contract policies.
- **Guardrails:** Protect system integrity and backward compatibility.

### AGENT_RELEASE
- **Ownership:** Release validation and integration.
- **Responsibilities:** End-to-end validation, versioning, migration checks.
- **Guardrails:** Ensure integration tests and smoke tests pass before release.

## Cross-cell Change Protocol
- Any change touching more than one micro-cell must follow `docs/microchip/CHANGE_PROTOCOL.md`.
- Submit `docs/microchip/changes/CHG-<id>.md` for review.

## Breaking Change Rules
- Removing/renaming endpoints, changing required fields, or altering SKU semantics is breaking.
- Breaking changes must be versioned and require AGENT_SYSTEM approval.

## Required CI Gates
- Contract check: `python scripts/contract_check.py` (always).
- Lint: `ruff check backend tests backend/tests scripts`.
- Type-check (contracts + scripts): `mypy --config-file mypy.ini`.
- Unit tests: `pytest`.
- Smoke test: `python scripts/smoke_test.py`.
