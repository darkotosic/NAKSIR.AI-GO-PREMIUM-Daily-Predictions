from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterable, List

ROOT = Path(__file__).resolve().parents[1]

CONTRACT_FILES: List[Path] = [
    Path("backend/contracts/api_football.py"),
    Path("backend/contracts/match.py"),
    Path("backend/contracts/odds.py"),
    Path("backend/contracts/ai_analysis.py"),
    Path("backend/contracts/api.py"),
    Path("backend/contracts/data.py"),
    Path("frontend/src/contracts/api.ts"),
    Path("frontend/src/contracts/index.ts"),
    Path("shared/contracts/index.ts"),
]

CONTRACT_DOC = Path("docs/microchip/CONTRACTS.md")
ROUTERS_DIR = Path("backend/routers")

ROUTE_PATTERN = re.compile(r"@router\.(?:get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]")


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _extract_routes(router_dir: Path) -> List[str]:
    routes: list[str] = []
    for file_path in sorted(router_dir.glob("*.py")):
        content = _read_text(ROOT / file_path)
        for match in ROUTE_PATTERN.finditer(content):
            routes.append(match.group(1))
    return sorted(set(routes))


def _missing_contract_files() -> List[str]:
    missing: list[str] = []
    for rel_path in CONTRACT_FILES:
        if not (ROOT / rel_path).exists():
            missing.append(str(rel_path))
    return missing


def _missing_contract_registry_entries(contract_text: str) -> List[str]:
    missing: list[str] = []
    for rel_path in CONTRACT_FILES:
        if str(rel_path) not in contract_text:
            missing.append(str(rel_path))
    return missing


def _missing_route_docs(contract_text: str, routes: Iterable[str]) -> List[str]:
    missing: list[str] = []
    for route in routes:
        if route not in contract_text:
            missing.append(route)
    return missing


def run_contract_checks() -> int:
    if not (ROOT / CONTRACT_DOC).exists():
        print(f"Missing contract registry: {CONTRACT_DOC}")
        return 1

    errors: list[str] = []
    errors.extend([f"Missing contract file: {path}" for path in _missing_contract_files()])

    contract_text = _read_text(ROOT / CONTRACT_DOC)
    errors.extend(
        [
            f"Contract registry missing entry: {path}"
            for path in _missing_contract_registry_entries(contract_text)
        ]
    )

    routes = _extract_routes(ROUTERS_DIR)
    errors.extend([f"Undocumented endpoint: {route}" for route in _missing_route_docs(contract_text, routes)])

    if errors:
        print("Contract check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Contract check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(run_contract_checks())
