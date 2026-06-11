from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Court(Base):
    __tablename__ = "courts"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    tipo = Column(String(60), nullable=True)
    precio_hora = Column(Float, nullable=False, default=60.0)
    adelanto_monto = Column(Float, nullable=False, default=20.0)
    activa = Column(Integer, default=1)
    # Características específicas de la cancha (techada, iluminación, pelotas, etc.)
    amenities = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    venue = relationship("Venue", back_populates="courts")
    reservations = relationship("Reservation", back_populates="court", cascade="all, delete-orphan")
    blocked_slots = relationship("BlockedSlot", back_populates="court", cascade="all, delete-orphan")
