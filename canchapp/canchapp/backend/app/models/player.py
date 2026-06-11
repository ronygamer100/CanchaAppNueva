from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    whatsapp = Column(String(20), nullable=True)  # opcional, se llena en primera reserva
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, default=datetime.utcnow)

    reservations = relationship("Reservation", back_populates="player")
