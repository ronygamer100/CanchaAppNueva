from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Time
from sqlalchemy.orm import relationship

from app.core.database import Base


class BlockedSlot(Base):
    __tablename__ = "blocked_slots"

    id = Column(Integer, primary_key=True, index=True)
    court_id = Column(Integer, ForeignKey("courts.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    motivo = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    court = relationship("Court", back_populates="blocked_slots")
