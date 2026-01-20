# Backend Agent Notes

## AGENT_BACKEND_AI_CACHE_KEY
- **Scope:** `backend/services/ai_analysis_cache_service.py`
- **Responsibility:** Preserve DB cache-key semantics for AI analysis.
- **Guardrails:**
  - `make_cache_key` in `ai_analysis_cache_service.py` is a logical/DB cache key, not a Redis key.
  - Do **not** add `app_id` to the returned string; app isolation is enforced via the `app_id` column.
  - Do **not** import or reuse Redis/in-memory cache key helpers for this DB cache key.
  - Keep retry/fallback and locking semantics intact by leaving the DB key format stable.
- **Required checks:** contract check, AI cache unit tests.
- Any change to ai_analysis_cache_service.make_cache_key requires explicit approval in PR description.

