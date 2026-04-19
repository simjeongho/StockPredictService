from datetime import datetime
from sqlalchemy import Integer, Text, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MarketIssuesCache(Base):
    __tablename__ = "market_issues_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    issues_text: Mapped[str] = mapped_column(Text, nullable=False)
    issue_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
