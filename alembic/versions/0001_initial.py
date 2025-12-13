"""Initial schema"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


auth_provider_enum = postgresql.ENUM(
    "device",
    "email_otp",
    "google",
    name="auth_provider_enum",
)
platform_enum = postgresql.ENUM("android", name="platform_enum")
purchase_state_enum = postgresql.ENUM("purchased", "pending", name="purchase_state_enum")
purchase_status_enum = postgresql.ENUM(
    "active",
    "expired",
    "canceled",
    "refunded",
    name="purchase_status_enum",
)
entitlement_status_enum = postgresql.ENUM("active", "expired", name="entitlement_status_enum")
product_type_enum = postgresql.ENUM("subscription", "consumable", name="product_type_enum")
coin_ledger_type_enum = postgresql.ENUM(
    "earn",
    "spend",
    "purchase",
    "adjust",
    name="coin_ledger_type_enum",
)
coin_ledger_source_enum = postgresql.ENUM(
    "rewarded_ad",
    "iap",
    "ai_analysis",
    "predictions",
    "admin",
    name="coin_ledger_source_enum",
)
ads_consent_status_enum = postgresql.ENUM(
    "unknown",
    "consented",
    "declined",
    name="ads_consent_status_enum",
)


def upgrade() -> None:
    bind = op.get_bind()
    auth_provider_enum.create(bind)
    platform_enum.create(bind)
    purchase_state_enum.create(bind)
    purchase_status_enum.create(bind)
    entitlement_status_enum.create(bind)
    product_type_enum.create(bind)
    coin_ledger_type_enum.create(bind)
    coin_ledger_source_enum.create(bind)
    ads_consent_status_enum.create(bind)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column(
            "auth_provider",
            sa.Enum("device", "email_otp", "google", name="auth_provider_enum"),
            nullable=False,
            server_default=sa.text("'device'::auth_provider_enum"),
        ),
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_device_id"), "users", ["device_id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)
    op.create_index("ix_users_auth_provider", "users", ["auth_provider"], unique=False)

    op.create_table(
        "products",
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("type", sa.Enum("subscription", "consumable", name="product_type_enum"), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=True),
        sa.Column("daily_limit", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.PrimaryKeyConstraint("sku"),
    )

    op.create_table(
        "ai_usage_daily",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_ai_usage_user_date"),
    )
    op.create_index("ix_ai_usage_user_date", "ai_usage_daily", ["user_id", "date"], unique=False)

    op.create_table(
        "coins_wallet",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("balance", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("refresh_token_hash", sa.String(length=256), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_sessions_user_expires", "user_sessions", ["user_id", "expires_at"], unique=False)

    op.create_table(
        "purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "platform",
            sa.Enum("android", name="platform_enum"),
            nullable=False,
            server_default=sa.text("'android'::platform_enum"),
        ),
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("purchase_token", sa.Text(), nullable=False),
        sa.Column("order_id", sa.String(length=128), nullable=True),
        sa.Column(
            "purchase_state",
            sa.Enum("purchased", "pending", name="purchase_state_enum"),
            nullable=False,
        ),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Enum("active", "expired", "canceled", "refunded", name="purchase_status_enum"), nullable=False),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id"),
        sa.UniqueConstraint("platform", "purchase_token", name="uq_purchases_platform_token"),
    )
    op.create_index("ix_purchases_user_created", "purchases", ["user_id", "created_at"], unique=False)

    op.create_table(
        "entitlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tier", sa.String(length=64), nullable=False, server_default=sa.text("'free'")),
        sa.Column("daily_limit", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "expired", name="entitlement_status_enum"),
            nullable=False,
            server_default=sa.text("'active'::entitlement_status_enum"),
        ),
        sa.Column("source_purchase_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.ForeignKeyConstraint(["source_purchase_id"], ["purchases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "coins_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.Enum("earn", "spend", "purchase", "adjust", name="coin_ledger_type_enum"), nullable=False),
        sa.Column(
            "source",
            sa.Enum("rewarded_ad", "iap", "ai_analysis", "predictions", "admin", name="coin_ledger_source_enum"),
            nullable=False,
        ),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("ref_id", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_coins_ledger_user_created", "coins_ledger", ["user_id", "created_at"], unique=False)

    op.create_table(
        "ads_consent",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("unknown", "consented", "declined", name="ads_consent_status_enum"),
            nullable=False,
            server_default=sa.text("'unknown'::ads_consent_status_enum"),
        ),
        sa.Column("region", sa.String(length=32), nullable=True),
        sa.Column("consent_provider", sa.String(length=32), nullable=False, server_default=sa.text("'ump'")),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("ads_consent")
    op.drop_index("ix_coins_ledger_user_created", table_name="coins_ledger")
    op.drop_table("coins_ledger")
    op.drop_table("entitlements")
    op.drop_index("ix_purchases_user_created", table_name="purchases")
    op.drop_table("purchases")
    op.drop_index("ix_user_sessions_user_expires", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("coins_wallet")
    op.drop_index("ix_ai_usage_user_date", table_name="ai_usage_daily")
    op.drop_table("ai_usage_daily")
    op.drop_table("products")
    op.drop_index("ix_users_auth_provider", table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_device_id"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    ads_consent_status_enum.drop(bind)
    coin_ledger_source_enum.drop(bind)
    coin_ledger_type_enum.drop(bind)
    product_type_enum.drop(bind)
    entitlement_status_enum.drop(bind)
    purchase_status_enum.drop(bind)
    purchase_state_enum.drop(bind)
    platform_enum.drop(bind)
    auth_provider_enum.drop(bind)
