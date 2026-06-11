from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class Owner(Base):
    __tablename__ = "owners"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # null si se loguea con Google
    google_id = Column(String(80), unique=True, nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    nombre_negocio = Column(String(120), nullable=False)
    whatsapp = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    venues = relationship("Venue", back_populates="owner", cascade="all, delete-orphan")
