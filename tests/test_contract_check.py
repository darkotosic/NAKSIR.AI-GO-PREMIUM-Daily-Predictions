from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.contract_check import run_contract_checks


def test_contract_check_passes() -> None:
    assert run_contract_checks() == 0
