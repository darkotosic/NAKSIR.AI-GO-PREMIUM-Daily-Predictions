from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings


def _normalize_database_url(raw_url: str) -> str:
    url = raw_url.strip()
    # Render Postgres je standardno postgres:// ili postgresql://. Preferiramo moderni psycopg driver.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Ako URL nema eksplicitan driver, prebacujemo ga na psycopg (psycopg3) koji ima
    # Py3.13 kompatibilne wheel‑ove.
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    return url


DATABASE_URL = _normalize_database_url(settings.database_url)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
