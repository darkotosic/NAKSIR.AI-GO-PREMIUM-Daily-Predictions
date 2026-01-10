from __future__ import annotations

import time
from dataclasses import dataclass

from backend.config import LIVE_AI_ALLOWED_LEAGUE_IDS


@dataclass(frozen=True)
class LiveAiPolicyResult:
    allowed: bool
    reason: str | None = None


def compute_15m_bucket_ts(now_ts: int | None = None) -> int:
    """
    Returns bucket timestamp (epoch seconds) rounded down to 15-minute boundary.
    """
    t = now_ts or int(time.time())
    return (t // 900) * 900  # 900s = 15 minutes


def is_live_ai_allowed_for_league(league_id: int | None) -> LiveAiPolicyResult:
    if league_id is None:
        return LiveAiPolicyResult(False, "unknown_league")

    if league_id not in set(LIVE_AI_ALLOWED_LEAGUE_IDS):
        return LiveAiPolicyResult(False, "not_top_or_uefa")

    return LiveAiPolicyResult(True, None)
