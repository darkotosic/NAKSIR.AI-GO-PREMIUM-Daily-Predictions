"""PR#140A: Add app_id columns + backfill (no constraint changes).

This is additive and backwards compatible.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "140a_add_app_id_columns"
down_revision = "0004_ai_analysis_cache"
branch_labels = None
depends_on = None

DEFAULT_APP_ID = "naksir.go_premium"


def upgrade() -> None:
    # ---- USERS ----
    # Replace "users" if your User.__tablename__ differs.
    op.add_column(
        "users",
        sa.Column("app_id", sa.String(length=64), nullable=True),
    )
    op.execute(f"UPDATE users SET app_id = '{DEFAULT_APP_ID}' WHERE app_id IS NULL")
    op.alter_column("users", "app_id", nullable=False, server_default=DEFAULT_APP_ID)

    # ---- AI ANALYSIS CACHE ----
    # Replace "ai_analysis_cache" with your real table name.
    op.add_column(
        "ai_analysis_cache",
        sa.Column("app_id", sa.String(length=64), nullable=True),
    )
    op.execute(
        f"UPDATE ai_analysis_cache SET app_id = '{DEFAULT_APP_ID}' WHERE app_id IS NULL"
    )
    op.alter_column(
        "ai_analysis_cache",
        "app_id",
        nullable=False,
        server_default=DEFAULT_APP_ID,
    )


def downgrade() -> None:
    op.drop_column("ai_analysis_cache", "app_id")
    op.drop_column("users", "app_id")
