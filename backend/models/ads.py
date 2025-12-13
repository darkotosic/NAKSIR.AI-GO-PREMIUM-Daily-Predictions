from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import ConsentStatus


class AdsConsent(Base):
    __tablename__ = "ads_consent"

    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    status: Mapped[ConsentStatus] = mapped_column(
        Enum(ConsentStatus, name="ads_consent_status_enum"),
        nullable=False,
        default=ConsentStatus.unknown,
    )

    region: Mapped[str | None] = mapped_column(String(32), nullable=True)  # "EEA" / "non-EEA" / ...
    consent_provider: Mapped[str] = mapped_column(String(32), nullable=False, default="ump")
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="consent")
