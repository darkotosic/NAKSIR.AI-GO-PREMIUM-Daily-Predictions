from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class AppConfig:
    """Per-app configuration.

    Phase 1: shared allowlist & top leagues for every app.
    Phase 2+: can diverge per app_id (features, league policy, billing, etc.).
    """

    allow_list: List[int]
    top_league_ids: List[int]


@dataclass(frozen=True)
class AppContext:
    """Request-scoped app context.

    Keep this lightweight: safe to pass through routers/services.
    """

    app_id: str
    api_key: str
    config: AppConfig
