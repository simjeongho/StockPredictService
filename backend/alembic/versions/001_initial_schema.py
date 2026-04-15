"""초기 스키마 생성: users, watchlist, analysis_cache, chat_messages

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-04-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users 테이블
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("provider_account_id", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_account_id", name="uq_users_provider_account"),
        sa.CheckConstraint("provider IN ('google', 'kakao')", name="ck_users_provider"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # watchlist 테이블
    op.create_table(
        "watchlist",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market", sa.String(5), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "ticker", "market", name="uq_watchlist_user_ticker_market"),
        sa.CheckConstraint("market IN ('us', 'kr')", name="ck_watchlist_market"),
    )
    op.create_index("ix_watchlist_user_id", "watchlist", ["user_id"])

    # analysis_cache 테이블
    op.create_table(
        "analysis_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market", sa.String(5), nullable=False),
        sa.Column("analysis_text", sa.Text(), nullable=False),
        sa.Column("indicators_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("global_events_summary", sa.Text(), nullable=True),
        sa.Column("buy_score_short", sa.SmallInteger(), nullable=True),
        sa.Column("buy_score_short_label", sa.String(20), nullable=True),
        sa.Column("buy_score_mid", sa.SmallInteger(), nullable=True),
        sa.Column("buy_score_mid_label", sa.String(20), nullable=True),
        sa.Column("buy_score_long", sa.SmallInteger(), nullable=True),
        sa.Column("buy_score_long_label", sa.String(20), nullable=True),
        sa.Column("score_rationale", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("buy_score_short BETWEEN 0 AND 100", name="ck_score_short"),
        sa.CheckConstraint("buy_score_mid BETWEEN 0 AND 100", name="ck_score_mid"),
        sa.CheckConstraint("buy_score_long BETWEEN 0 AND 100", name="ck_score_long"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_cache_ticker_market_expires", "analysis_cache", ["ticker", "market", "expires_at"])
    op.create_index("ix_analysis_cache_expires_at", "analysis_cache", ["expires_at"])

    # chat_messages 테이블
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ticker", sa.String(20), nullable=True),
        sa.Column("market", sa.String(5), nullable=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_user_created", "chat_messages", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("analysis_cache")
    op.drop_table("watchlist")
    op.drop_table("users")
