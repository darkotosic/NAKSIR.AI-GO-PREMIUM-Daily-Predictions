"""PR#140C: Ensure purchase_token is globally unique."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "140c_purchase_token_unique"
down_revision = "140b_composite_uniques"
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
    _drop_unique_by_cols("purchases", {"purchase_token"})
    op.create_unique_constraint(
        "uq_purchases_purchase_token",
        "purchases",
        ["purchase_token"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_purchases_purchase_token",
        "purchases",
        type_="unique",
    )
