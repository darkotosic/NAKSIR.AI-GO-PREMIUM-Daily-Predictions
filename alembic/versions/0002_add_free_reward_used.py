"""Add free_reward_used flag to coins_wallet

Revision ID: 0002_free_reward_used
Revises: 0001_initial
Create Date: 2024-06-06
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_free_reward_used"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "coins_wallet",
        sa.Column(
            "free_reward_used",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.alter_column("coins_wallet", "free_reward_used", server_default=None)



def downgrade() -> None:
    op.drop_column("coins_wallet", "free_reward_used")
