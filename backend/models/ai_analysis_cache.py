from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AiAnalysisCache(Base):
    __tablename__ = "ai_analysis_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fixture_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    cache_key: Mapped[str] = mapped_column(String(200), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ok")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    analysis_version: Mapped[str] = mapped_column(String(20), nullable=False, default="v1")
    lang: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    model: Mapped[str] = mapped_column(String(80), nullable=False, default="default")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    __table_args__ = (UniqueConstraint("cache_key", name="uq_ai_analysis_cache_cache_key"),)
