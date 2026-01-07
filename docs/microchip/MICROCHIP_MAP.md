# Microchip Map

This map decomposes the repo into independently owned micro-cells. Each cell is the smallest unit that can be safely evolved while preserving system contracts.

## CELL_BACKEND_FETCH_CACHE
- **Purpose:** Fetch API-Football data, manage request caching, and protect rate limits.
- **Public contract:** `backend/contracts/api_football.py` (fixture identity + minimal status/teams), cache key format `cache.make_cache_key`.
- **Invariants:**
  - Cached payloads must include the last known valid response on 429/invalid JSON.
  - Allow-list league filtering must remain in place before upstream aggregation.
- **Inputs/Outputs:** Inputs are API-Football credentials + endpoint parameters; outputs are raw fixture/odds payloads and cached responses.
- **Dependencies:** `backend/config.py`, `backend/cache.py`, `requests`, `httpx`.
- **Allowed change boundaries:** HTTP and caching logic, retry/backoff strategy, request normalization.

## CELL_BACKEND_MATCH_AGG
- **Purpose:** Normalize fixtures into match cards and compose full match context.
- **Public contract:** `backend/contracts/match.py`.
- **Invariants:**
  - Summary cards must include `fixture_id`, `league`, `teams`, and `kickoff` fields.
  - Full context must preserve section keys and honor `sections` filtering.
- **Inputs/Outputs:** Inputs are raw fixtures; outputs are summary cards and full match JSON blocks.
- **Dependencies:** `backend/api_football.py`, `backend/odds_summary.py`.
- **Allowed change boundaries:** Aggregation/normalization logic, section selection rules.

## CELL_BACKEND_ODDS
- **Purpose:** Normalize raw odds into flat odds and implied probabilities.
- **Public contract:** `backend/contracts/odds.py`.
- **Invariants:**
  - Flat odds keys remain stable (`match_winner`, `double_chance`, `btts`, `goals_over_under`).
  - Probability normalization remains deterministic for a given odds input.
- **Inputs/Outputs:** Inputs are raw odds payloads; outputs are flattened odds + probabilities.
- **Dependencies:** `backend/api_football.py` (odds fetch), `backend/cache.py`.
- **Allowed change boundaries:** Odds mapping and probability computation.

## CELL_BACKEND_AI
- **Purpose:** Provide AI match analysis and caching logic.
- **Public contract:** `backend/contracts/ai_analysis.py`.
- **Invariants:**
  - Responses must include `analysis` and `fixture_id` fields.
  - Cached responses preserve `cache_key` and `cached` flags.
- **Inputs/Outputs:** Inputs are full match context + optional user question; outputs are structured AI summaries.
- **Dependencies:** `backend/match_full.py`, `backend/services/ai_analysis_cache_service.py`, GPT client.
- **Allowed change boundaries:** Prompt orchestration, fallback strategy, caching policy.

## CELL_BACKEND_API
- **Purpose:** Expose HTTP routes, guardrails, and observability.
- **Public contract:** `backend/contracts/api.py` + OpenAPI surface in `docs/microchip/CONTRACTS.md`.
- **Invariants:**
  - All documented endpoints remain available unless versioned.
  - Global exception handler continues to return JSON.
- **Inputs/Outputs:** Inputs are HTTP requests; outputs are FastAPI responses.
- **Dependencies:** `backend/routers/*`, `backend/dependencies.py`, `backend/monitoring.py`, `backend/observability.py`.
- **Allowed change boundaries:** routing, middleware, error handling, logging.

## CELL_BACKEND_DATA
- **Purpose:** Persistence, billing entitlement records, and service-layer DB orchestration.
- **Public contract:** `backend/contracts/data.py`.
- **Invariants:**
  - DB session lifecycle must remain safe (open/close per request).
  - Billing entitlements and purchase status transitions remain consistent.
- **Inputs/Outputs:** Inputs are SQLAlchemy session operations and billing payloads; outputs are persisted models.
- **Dependencies:** `backend/db.py`, `backend/models/*`, `backend/services/*`, `alembic/`.
- **Allowed change boundaries:** schema changes (with migrations), service logic, DB helpers.

## CELL_FRONTEND_APP
- **Purpose:** Expo/React Native app that consumes backend APIs and presents match + AI flows.
- **Public contract:** `frontend/src/contracts/api.ts`.
- **Invariants:**
  - Match list and match detail views consume documented API fields.
  - AI CTA continues to use `/matches/{id}/ai-analysis` contract.
- **Inputs/Outputs:** Inputs are API responses; outputs are rendered screens and user interactions.
- **Dependencies:** `frontend/src/api/*`, `frontend/src/screens/*`, `frontend/src/navigation/*`.
- **Allowed change boundaries:** UI components, navigation, client-side state management.

## CELL_SHARED_BILLING
- **Purpose:** Shared SKU + entitlement metadata between backend and frontend.
- **Public contract:** `shared/contracts/index.ts`.
- **Invariants:**
  - SKU list and entitlement fields must remain synchronized with backend definitions.
- **Inputs/Outputs:** Inputs are SKU identifiers; outputs are entitlement plan metadata.
- **Dependencies:** `shared/billing_skus.ts`.
- **Allowed change boundaries:** SKU additions (with matching backend updates).

## CELL_INFRA_GOVERNANCE
- **Purpose:** CI, scripts, documentation, and contract checks.
- **Public contract:** `scripts/contract_check.py`, `docs/microchip/*`, `OWNERSHIP.yml`.
- **Invariants:**
  - Contract check must pass before merge.
  - Smoke test must exercise core endpoints without external APIs.
- **Inputs/Outputs:** Inputs are repo files; outputs are governance artifacts and validation results.
- **Dependencies:** CI workflow, Makefile scripts.
- **Allowed change boundaries:** docs, scripts, workflows, CI configurations.
