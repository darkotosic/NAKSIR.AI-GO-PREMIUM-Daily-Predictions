import os

import pathlib
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure critical env vars are present before app/config imports
os.environ.setdefault("APP_ENV", "dev")
os.environ.setdefault("API_FOOTBALL_KEY", "test-api-football")
os.environ.setdefault("OPENAI_API_KEY", "test-openai")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("API_AUTH_TOKENS", "test-token")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost")
os.environ.setdefault("USE_FAKE_REDIS", "true")

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)
