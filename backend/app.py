from backend.api_football import get_fixtures_today, get_standings  # re-export for tests
from backend.main import app  # noqa: F401
from backend.match_full import build_match_summary  # re-export for tests

__all__ = [
    "app",
    "build_match_summary",
    "get_fixtures_today",
    "get_standings",
]
