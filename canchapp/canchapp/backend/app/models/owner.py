from datetime import datetime, timedelta
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
    trial_started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    trial_ends_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.utcnow() + timedelta(days=30),
    )
    subscription_paid_until = Column(DateTime, nullable=True)

    # La llave pública puede mostrarse en el checkout. La privada siempre se cifra.
    culqi_public_key = Column(String(255), nullable=True)
    culqi_secret_key_encrypted = Column(String(1000), nullable=True)
    culqi_mode = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    venues = relationship("Venue", back_populates="owner", cascade="all, delete-orphan")
