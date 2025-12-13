"""Add AI usage period tracking and entitlement allowances

Revision ID: 0003_ai_usage_period
Revises: 0002_free_reward_used
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0003_ai_usage_period"
down_revision = "0002_free_reward_used"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("entitlements", sa.Column("total_allowance", sa.Integer(), nullable=True))
    op.add_column(
        "entitlements",
        sa.Column("unlimited", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.alter_column("entitlements", "unlimited", server_default=None)

    op.create_table(
        "ai_usage_period",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entitlement_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(["entitlement_id"], ["entitlements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "entitlement_id", name="uq_ai_usage_period_user_ent"),
    )
    op.create_index("ix_ai_usage_period_user_id", "ai_usage_period", ["user_id"], unique=False)
    op.create_index(
        "ix_ai_usage_period_entitlement_id", "ai_usage_period", ["entitlement_id"], unique=False
    )



def downgrade() -> None:
    op.drop_index("ix_ai_usage_period_entitlement_id", table_name="ai_usage_period")
    op.drop_index("ix_ai_usage_period_user_id", table_name="ai_usage_period")
    op.drop_table("ai_usage_period")
    op.drop_column("entitlements", "unlimited")
    op.drop_column("entitlements", "total_allowance")
