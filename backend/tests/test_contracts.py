from __future__ import annotations

from backend.contracts import (
    AIAnalysisRequestContract,
    AIAnalysisResponseContract,
    APIFootballFixture,
    BillingEntitlementPlan,
    FixtureStatus,
    FixtureTeam,
    HealthResponse,
    MatchFullContext,
    MatchSummaryCard,
    OddsFlat,
    OddsSummary,
    RootResponse,
)


def test_api_football_contract_models() -> None:
    fixture = APIFootballFixture(
        fixture_id=1,
        kickoff="2024-01-01T12:00:00Z",
        status=FixtureStatus(short="NS", long="Not Started"),
        home=FixtureTeam(id=10, name="Home"),
        away=FixtureTeam(id=20, name="Away"),
        league_id=39,
        season=2024,
    )
    assert fixture.fixture_id == 1


def test_match_contract_models() -> None:
    summary = MatchSummaryCard(
        fixture_id=1,
        league={"id": 39},
        teams={"home": {"id": 10}, "away": {"id": 20}},
    )
    full = MatchFullContext(
        meta={"fixture_id": 1},
        summary=summary.model_dump(),
        stats={},
        team_stats={},
    )
    assert full.meta["fixture_id"] == 1


def test_odds_contract_models() -> None:
    flat = OddsFlat(match_winner={"home": 2.1, "draw": 3.2, "away": 3.6})
    summary = OddsSummary(fixture_id=1, raw_count=1, flat_available=True)
    assert flat.match_winner
    assert summary.flat_available is True


def test_ai_contract_models() -> None:
    request = AIAnalysisRequestContract(question="Explain", trial_by_reward=True)
    response = AIAnalysisResponseContract(
        fixture_id=1,
        analysis={"summary": "ok"},
        cached=False,
    )
    assert request.trial_by_reward is True
    assert response.analysis["summary"] == "ok"


def test_app_contract_models() -> None:
    root = RootResponse(
        service="Naksir Go Premium API",
        status="online",
        docs="/docs",
        redoc="/redoc",
        timezone="UTC",
    )
    health = HealthResponse(status="ok", db="ok")
    assert root.status == "online"
    assert health.db == "ok"


def test_data_contract_models() -> None:
    plan = BillingEntitlementPlan(
        sku="naksir_premium_7d",
        period_days=7,
        daily_limit=None,
        total_allowance=None,
        unlimited=True,
    )
    assert plan.sku == "naksir_premium_7d"
