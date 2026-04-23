"""한국 주식 종목 마스터 테이블 추가

Revision ID: 004_add_stocks_master
Revises: 003_add_comparison_history
Create Date: 2026-04-22
"""
from alembic import op
import sqlalchemy as sa

revision = "004_add_stocks_master"
down_revision = "003_add_comparison_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stocks",
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market", sa.String(5), nullable=False, server_default="kr"),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("exchange", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("ticker", "market", name="pk_stocks"),
        sa.CheckConstraint("market IN ('us', 'kr')", name="ck_stocks_market"),
    )
    op.create_index("ix_stocks_name", "stocks", ["name"])
    op.create_index("ix_stocks_market_active", "stocks", ["market", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_stocks_market_active", table_name="stocks")
    op.drop_index("ix_stocks_name", table_name="stocks")
    op.drop_table("stocks")
