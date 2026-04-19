import uuid
from datetime import datetime
from sqlalchemy import Integer, String, Text, SmallInteger, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    market: Mapped[str] = mapped_column(String(10), nullable=False)
    analysis_text: Mapped[str] = mapped_column(Text, nullable=False)
    buy_score_short: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    buy_score_short_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buy_score_mid: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    buy_score_mid_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buy_score_long: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    buy_score_long_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    analysis_type: Mapped[str] = mapped_column(String(20), nullable=False, server_default="stock")
    tickers_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
