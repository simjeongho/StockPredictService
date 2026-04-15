import uuid
from datetime import datetime
from sqlalchemy import String, Text, SmallInteger, DateTime, text, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AnalysisCache(Base):
    __tablename__ = "analysis_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    market: Mapped[str] = mapped_column(String(5), nullable=False)
    analysis_text: Mapped[str] = mapped_column(Text, nullable=False)
    indicators_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    global_events_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 예측 점수 (0–100, 파싱 실패 시 NULL)
    buy_score_short: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    buy_score_short_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buy_score_mid: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    buy_score_mid_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buy_score_long: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    buy_score_long_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    score_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("buy_score_short BETWEEN 0 AND 100", name="ck_score_short"),
        CheckConstraint("buy_score_mid BETWEEN 0 AND 100", name="ck_score_mid"),
        CheckConstraint("buy_score_long BETWEEN 0 AND 100", name="ck_score_long"),
        Index("ix_analysis_cache_ticker_market_expires", "ticker", "market", "expires_at"),
        Index("ix_analysis_cache_expires_at", "expires_at"),
    )
