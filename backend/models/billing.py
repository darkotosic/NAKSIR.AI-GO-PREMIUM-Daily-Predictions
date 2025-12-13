import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import Platform, ProductType, PurchaseState, PurchaseStatus, EntitlementStatus


class Product(Base):
    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(128), primary_key=True)  # sku kao PK je praktično
    type: Mapped[ProductType] = mapped_column(Enum(ProductType, name="product_type_enum"), nullable=False)

    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None može da znači unlimited
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    platform: Mapped[Platform] = mapped_column(Enum(Platform, name="platform_enum"), nullable=False, default=Platform.android)
    sku: Mapped[str] = mapped_column(String(128), nullable=False)

    purchase_token: Mapped[str] = mapped_column(Text, nullable=False)
    order_id: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)

    purchase_state: Mapped[PurchaseState] = mapped_column(Enum(PurchaseState, name="purchase_state_enum"), nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[PurchaseStatus] = mapped_column(Enum(PurchaseStatus, name="purchase_status_enum"), nullable=False)

    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="purchases")
    entitlement = relationship("Entitlement", back_populates="source_purchase", uselist=False)


Index("ix_purchases_user_created", Purchase.user_id, Purchase.created_at)
Index("uq_purchases_platform_token", Purchase.platform, Purchase.purchase_token, unique=True)


class Entitlement(Base):
    __tablename__ = "entitlements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    tier: Mapped[str] = mapped_column(String(64), nullable=False, default="free")
    daily_limit: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)  # 0=free; unlimited se rešava posebnim flagom u logici
    total_allowance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unlimited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[EntitlementStatus] = mapped_column(Enum(EntitlementStatus, name="entitlement_status_enum"), nullable=False, default=EntitlementStatus.active)

    source_purchase_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("purchases.id", ondelete="SET NULL"), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="entitlement")
    source_purchase = relationship("Purchase", back_populates="entitlement")
