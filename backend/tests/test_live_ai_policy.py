from backend.services.live_ai_policy import (
    compute_15m_bucket_ts,
    is_live_ai_allowed_for_league,
)


def test_bucket_15m_rounding() -> None:
    assert compute_15m_bucket_ts(0) == 0
    assert compute_15m_bucket_ts(1) == 0
    assert compute_15m_bucket_ts(899) == 0
    assert compute_15m_bucket_ts(900) == 900
    assert compute_15m_bucket_ts(901) == 900


def test_live_ai_allowed_for_league_unknown() -> None:
    r = is_live_ai_allowed_for_league(None)
    assert r.allowed is False


def test_live_ai_allowed_for_league_not_allowed() -> None:
    # This test assumes LIVE_AI_ALLOWED_LEAGUE_IDS is set in config.
    # Use an unlikely league id.
    r = is_live_ai_allowed_for_league(999999)
    assert r.allowed is False
