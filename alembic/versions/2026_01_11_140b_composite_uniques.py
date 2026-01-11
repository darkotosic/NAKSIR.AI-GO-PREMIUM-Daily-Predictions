"""PR#140B: Composite unique constraints for multi-app tenantization.

- users: UNIQUE(app_id, device_id), UNIQUE(app_id, email)
- ai_analysis_cache: UNIQUE(app_id, cache_key)

This migration is robust: it drops existing UNIQUE constraints by matching their column sets,
so it doesn't depend on the current constraint naming.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "140b_composite_uniques"
down_revision = "140a_add_app_id_columns"
branch_labels = None
depends_on = None


def _drop_unique_by_cols(table: str, cols: set[str]) -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    for uc in insp.get_unique_constraints(table):
        uc_cols = set(uc.get("column_names") or [])
        if uc_cols == cols:
            op.drop_constraint(uc["name"], table, type_="unique")


def upgrade() -> None:
    # ---- USERS ----
    _drop_unique_by_cols("users", {"device_id"})
    _drop_unique_by_cols("users", {"email"})

    # Composite uniques
    op.create_unique_constraint(
        "uq_users_app_id_device_id", "users", ["app_id", "device_id"]
    )
    op.create_unique_constraint(
        "uq_users_app_id_email", "users", ["app_id", "email"]
    )

    # ---- AI ANALYSIS CACHE ----
    _drop_unique_by_cols("ai_analysis_cache", {"cache_key"})

    op.create_unique_constraint(
        "uq_ai_analysis_cache_app_id_cache_key",
        "ai_analysis_cache",
        ["app_id", "cache_key"],
    )


def downgrade() -> None:
    # Revert AI cache
    op.drop_constraint(
        "uq_ai_analysis_cache_app_id_cache_key",
        "ai_analysis_cache",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_ai_analysis_cache_cache_key", "ai_analysis_cache", ["cache_key"]
    )

    # Revert users
    op.drop_constraint("uq_users_app_id_email", "users", type_="unique")
    op.drop_constraint("uq_users_app_id_device_id", "users", type_="unique")
    op.create_unique_constraint("uq_users_device_id", "users", ["device_id"])
    op.create_unique_constraint("uq_users_email", "users", ["email"])
