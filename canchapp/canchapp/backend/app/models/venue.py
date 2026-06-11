from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Time, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("owners.id", ondelete="CASCADE"), nullable=False)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    direccion = Column(String(255), nullable=False)
    descripcion = Column(String(500), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    foto_url = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    yape_qr_url = Column(String(500), nullable=True)
    hora_apertura = Column(Time, nullable=False)
    hora_cierre = Column(Time, nullable=False)

    # Distrito de Arequipa (Cayma, Yanahuara, JLBR, etc.)
    distrito = Column(String(60), nullable=True, index=True)

    # Modo de confirmación: "manual" o "auto"
    modo_confirmacion = Column(String(20), nullable=False, default="manual")
    auto_confirm_minutes = Column(Integer, nullable=False, default=120)

    # Características del local (parking, snacks, wifi, etc.) — array de slugs
    amenities = Column(JSON, nullable=False, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("Owner", back_populates="venues")
    courts = relationship("Court", back_populates="venue", cascade="all, delete-orphan")
