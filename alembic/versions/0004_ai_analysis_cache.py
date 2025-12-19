"""Add AI analysis cache table

Revision ID: 0004_ai_analysis_cache
Revises: 0003_ai_usage_period
Create Date: 2025-12-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0004_ai_analysis_cache"
down_revision = "0003_ai_usage_period"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_analysis_cache",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fixture_id", sa.Integer(), nullable=False),
        sa.Column("cache_key", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'ok'")),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("analysis_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "analysis_version",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'v1'"),
        ),
        sa.Column(
            "lang",
            sa.String(length=10),
            nullable=False,
            server_default=sa.text("'en'"),
        ),
        sa.Column(
            "model",
            sa.String(length=80),
            nullable=False,
            server_default=sa.text("'default'"),
        ),
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
        sa.UniqueConstraint("cache_key", name="uq_ai_analysis_cache_cache_key"),
    )
    op.create_index("ix_ai_analysis_cache_fixture_id", "ai_analysis_cache", ["fixture_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_analysis_cache_fixture_id", table_name="ai_analysis_cache")
    op.drop_table("ai_analysis_cache")
