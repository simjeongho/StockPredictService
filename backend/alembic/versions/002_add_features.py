"""기능 추가: is_admin, analysis_usage, daily_usage, analysis_history, market_issues_cache

Revision ID: 002_add_features
Revises: 001_initial_schema
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_add_features"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users 테이블에 is_admin 컬럼 추가
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )

    # 2. analysis_usage: 종목별 일일 분석 횟수
    op.create_table(
        "analysis_usage",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market", sa.String(10), nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "ticker", "market", "usage_date", name="uq_analysis_usage"),
    )
    op.create_index("ix_analysis_usage_user_date", "analysis_usage", ["user_id", "usage_date"])

    # 3. daily_usage: 엔드포인트별 일일 사용 횟수 (비교 분석, 시장 이슈 등)
    op.create_table(
        "daily_usage",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("endpoint", sa.String(50), nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "endpoint", "usage_date", name="uq_daily_usage"),
    )
    op.create_index("ix_daily_usage_user_date", "daily_usage", ["user_id", "usage_date"])

    # 4. analysis_history: 분석 기록 영구 저장
    op.create_table(
        "analysis_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market", sa.String(10), nullable=False),
        sa.Column("analysis_text", sa.Text(), nullable=False),
        sa.Column("buy_score_short", sa.SmallInteger(), nullable=True),
        sa.Column("buy_score_short_label", sa.String(20), nullable=True),
        sa.Column("buy_score_mid", sa.SmallInteger(), nullable=True),
        sa.Column("buy_score_mid_label", sa.String(20), nullable=True),
        sa.Column("buy_score_long", sa.SmallInteger(), nullable=True),
        sa.Column("buy_score_long_label", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_history_user_created", "analysis_history", ["user_id", "created_at"])

    # 5. market_issues_cache: 시장 이슈 캐시
    op.create_table(
        "market_issues_cache",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("issues_text", sa.Text(), nullable=False),
        sa.Column("issue_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("market_issues_cache")
    op.drop_index("ix_analysis_history_user_created", table_name="analysis_history")
    op.drop_table("analysis_history")
    op.drop_index("ix_daily_usage_user_date", table_name="daily_usage")
    op.drop_table("daily_usage")
    op.drop_index("ix_analysis_usage_user_date", table_name="analysis_usage")
    op.drop_table("analysis_usage")
    op.drop_column("users", "is_admin")
