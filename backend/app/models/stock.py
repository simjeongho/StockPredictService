from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, CheckConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Stock(Base):
    __tablename__ = "stocks"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    market: Mapped[str] = mapped_column(String(5), primary_key=True, server_default="kr")
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    exchange: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        CheckConstraint("market IN ('us', 'kr')", name="ck_stocks_market"),
    )
