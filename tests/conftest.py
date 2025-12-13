import os
import pathlib
import sys

from datetime import datetime, timedelta
import pytest

from fastapi.testclient import TestClient
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import Session

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
from backend.db import SessionLocal, engine  # noqa: E402
from backend.models import Base, Entitlement  # noqa: E402
from backend.models.enums import EntitlementStatus  # noqa: E402
from backend.services.users_service import get_or_create_user  # noqa: E402


# Allow PostgreSQL JSONB type to compile on SQLite during tests
SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture(scope="function")
def db_session() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def entitlement_factory(db_session: Session):
    def _factory(
        *,
        install_id: str,
        daily_limit: int | None = None,
        total_allowance: int | None = None,
        unlimited: bool = False,
        expires_in_days: int = 1,
    ) -> Entitlement:
        user, _wallet = get_or_create_user(db_session, install_id)
        entitlement = Entitlement(
            user_id=user.id,
            tier="test",
            daily_limit=daily_limit,
            total_allowance=total_allowance,
            unlimited=unlimited,
            valid_until=datetime.utcnow() + timedelta(days=expires_in_days),
            status=EntitlementStatus.active,
        )
        db_session.add(entitlement)
        db_session.commit()
        db_session.refresh(entitlement)
        return entitlement

    return _factory


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)
