"""Multi-app context (Phase 1).

Phase 1 goal: introduce an AppContext that can be threaded through routers/services
without changing any existing API behavior.

Business decision for now:
- ALLOW_LIST and TOP_LEAGUE_IDS are shared across all apps.
"""

from backend.apps.models import AppConfig, AppContext
from backend.apps.registry import get_app_config, resolve_app_id

__all__ = ["AppConfig", "AppContext", "get_app_config", "resolve_app_id"]
