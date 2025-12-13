import uuid
from datetime import datetime, date
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import CoinLedgerType, CoinLedgerSource


class AIUsageDaily(Base):
    __tablename__ = "ai_usage_daily"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    date: Mapped[date] = mapped_column(Date, nullable=False)  # Europe/Belgrade date računaš u app logici
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


Index("uq_ai_usage_user_date", AIUsageDaily.user_id, AIUsageDaily.date, unique=True)
Index("ix_ai_usage_user_date", AIUsageDaily.user_id, AIUsageDaily.date)


class CoinsWallet(Base):
    __tablename__ = "coins_wallet"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    free_reward_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="wallet")


class CoinsLedger(Base):
    __tablename__ = "coins_ledger"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    type: Mapped[CoinLedgerType] = mapped_column(Enum(CoinLedgerType, name="coin_ledger_type_enum"), nullable=False)
    source: Mapped[CoinLedgerSource] = mapped_column(Enum(CoinLedgerSource, name="coin_ledger_source_enum"), nullable=False)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # + earn, - spend
    ref_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


Index("ix_coins_ledger_user_created", CoinsLedger.user_id, CoinsLedger.created_at)
