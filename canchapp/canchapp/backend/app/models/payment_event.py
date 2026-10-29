from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.database import Base


class PaymentEvent(Base):
    """Audit trail without credentials, source tokens, or customer payment data."""
    __tablename__ = "payment_events"
    id = Column(Integer, primary_key=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=False, index=True)
    status = Column(String(30), nullable=False)
    amount_cents = Column(Integer, nullable=True)
    refunded_cents = Column(Integer, nullable=False, default=0, server_default="0")
    charge_id = Column(String(120), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
