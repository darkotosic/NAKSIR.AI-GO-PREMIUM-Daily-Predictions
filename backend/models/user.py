import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AuthProvider


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    app_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="naksir.go_premium",
        server_default="naksir.go_premium",
        index=True,
    )
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True, index=True)

    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider, name="auth_provider_enum"),
        nullable=False,
        default=AuthProvider.device,
    )

    is_banned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")
    entitlement = relationship("Entitlement", back_populates="user", uselist=False, cascade="all, delete-orphan")
    wallet = relationship("CoinsWallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    consent = relationship("AdsConsent", back_populates="user", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("app_id", "device_id", name="uq_users_app_id_device_id"),
        UniqueConstraint("app_id", "email", name="uq_users_app_id_email"),
    )


Index("ix_users_auth_provider", User.auth_provider)
