# Contract Registry

This registry lists public contracts for each micro-cell. Every endpoint and exported contract must be documented here.

## Contract Files

| Micro-cell | Contract file | Description |
| --- | --- | --- |
| CELL_BACKEND_FETCH_CACHE | `backend/contracts/api_football.py` | Minimal fixture identity + status/teams contract. |
| CELL_BACKEND_MATCH_AGG | `backend/contracts/match.py` | Match summary card + full match context contract. |
| CELL_BACKEND_ODDS | `backend/contracts/odds.py` | Flat odds + odds summary contract. |
| CELL_BACKEND_AI | `backend/contracts/ai_analysis.py` | AI request/response contract. |
| CELL_BACKEND_API | `backend/contracts/api.py` | Root/health/route metadata contracts. |
| CELL_BACKEND_DATA | `backend/contracts/data.py` | Billing entitlement plan contract. |
| CELL_FRONTEND_APP | `frontend/src/contracts/api.ts` | Frontend API response contracts. |
| CELL_FRONTEND_APP | `frontend/src/contracts/index.ts` | Barrel exports for frontend contracts. |
| CELL_SHARED_BILLING | `shared/contracts/index.ts` | Shared SKU + entitlement plan exports. |

## HTTP Endpoints (CELL_BACKEND_API)

### Meta + debug
- `GET /`
- `GET /health`
- `GET /_debug/routes`
- `GET /_debug/ops`

### Matches
- `GET /matches/today`
- `GET /matches/top`
- `GET /matches/{fixture_id}`
- `GET /matches/{fixture_id}/full`
- `GET /h2h`

### AI Analysis
- `GET /matches/{fixture_id}/ai-analysis`
- `POST /matches/{fixture_id}/ai-analysis`
- `GET /ai/cached-matches`

### Teams
- `GET /teams`
- `GET /teams/{team_id}`
- `GET /teams/{team_id}/statistics`
- `GET /teams/{team_id}/seasons`
- `GET /teams/countries`

### Players
- `GET /players/seasons`
- `GET /players/profiles`
- `GET /players`
- `GET /players/squads`
- `GET /players/teams`
- `GET /players/topscorers`
- `GET /players/topassists`
- `GET /players/topyellowcards`
- `GET /players/topredcards`

### Billing
- `POST /billing/google/verify`
- `POST /billing/google/rtdn`
- `GET /me/entitlements`
