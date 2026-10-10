from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class Decision(Base):
    __tablename__ = "decisions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    model_version: Mapped[str] = mapped_column(String)
    applicant_label: Mapped[str] = mapped_column(String, default="Synthetic applicant")
    region: Mapped[str] = mapped_column(String, default="")
    age_band: Mapped[str] = mapped_column(String, default="")
    inputs: Mapped[dict] = mapped_column(JSON)
    predicted_class: Mapped[str] = mapped_column(String, index=True)
    risk_probability: Mapped[float] = mapped_column(Float)
    base_value: Mapped[float] = mapped_column(Float)
    explanations: Mapped[list] = mapped_column(JSON)
    reasons: Mapped[list] = mapped_column(JSON)
    review_status: Mapped[str] = mapped_column(String, default="pending", index=True)
    events: Mapped[list["AuditEvent"]] = relationship(back_populates="decision", order_by="AuditEvent.ts", cascade="all, delete-orphan")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(ForeignKey("decisions.id"), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    actor: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    detail: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[Decision] = relationship(back_populates="events")
