from __future__ import annotations

from pathlib import Path


def test_frontend_contracts_exist() -> None:
    api_contract = Path("frontend/src/contracts/api.ts")
    index_contract = Path("frontend/src/contracts/index.ts")
    assert api_contract.exists()
    assert index_contract.exists()

    content = api_contract.read_text(encoding="utf-8")
    assert "export type MatchSummary" in content
    assert "export type MatchFullResponse" in content


def test_shared_contracts_exist() -> None:
    shared_contract = Path("shared/contracts/index.ts")
    assert shared_contract.exists()
    content = shared_contract.read_text(encoding="utf-8")
    assert "EntitlementPlan" in content
