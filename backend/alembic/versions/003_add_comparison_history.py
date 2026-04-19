"""analysis_history에 analysis_type, tickers_json 컬럼 추가

Revision ID: 003_add_comparison_history
Revises: 002_add_features
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = "003_add_comparison_history"
down_revision = "002_add_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analysis_history",
        sa.Column(
            "analysis_type",
            sa.String(20),
            nullable=False,
            server_default="stock",
        ),
    )
    op.add_column(
        "analysis_history",
        sa.Column("tickers_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analysis_history", "tickers_json")
    op.drop_column("analysis_history", "analysis_type")
