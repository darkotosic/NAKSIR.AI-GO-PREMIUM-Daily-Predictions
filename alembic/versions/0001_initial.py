"""Initial schema"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


# Define PG ENUM types once (we create them explicitly with checkfirst=True)
auth_provider_enum = postgresql.ENUM(
    "device",
    "email_otp",
    "google",
    name="auth_provider_enum",
)

platform_enum = postgresql.ENUM("android", name="platform_enum")

purchase_state_enum = postgresql.ENUM(
    "purchased",
    "pending",
    name="purchase_state_enum",
)

purchase_status_enum = postgresql.ENUM(
    "active",
    "expired",
    "canceled",
    "refunded",
    name="purchase_status_enum",
)

entitlement_status_enum = postgresql.ENUM(
    "active",
    "expired",
    name="entitlement_status_enum",
)

product_type_enum = postgresql.ENUM(
    "subscription",
    "consumable",
    name="product_type_enum",
)

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

    # Idempotent: will not fail if types already exist (e.g. partial migration run)
    auth_provider_enum.create(bind, checkfirst=True)
    platform_enum.create(bind, checkfirst=True)
    purchase_state_enum.create(bind, checkfirst=True)
    purchase_status_enum.create(bind, checkfirst=True)
    entitlement_status_enum.create(bind, checkfirst=True)
    product_type_enum.create(bind, checkfirst=True)
    coin_ledger_type_enum.create(bind, checkfirst=True)
    coin_ledger_source_enum.create(bind, checkfirst=True)
    ads_consent_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column(
            "auth_provider",
            postgresql.ENUM(
                "device",
                "email_otp",
                "google",
                name="auth_provider_enum",
                create_type=False,
            ),
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
        sa.Column(
            "type",
            postgresql.ENUM("subscription", "consumable", name="product_type_enum", create_type=False),
            nullable=False,
        ),
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
        sa.Column("date",
