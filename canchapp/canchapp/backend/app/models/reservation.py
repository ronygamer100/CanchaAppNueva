from datetime import datetime
from enum import Enum as PyEnum
import uuid as uuid_lib
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Time, Enum
from sqlalchemy.orm import relationship

from app.core.database import Base


def _gen_cancel_token() -> str:
    return uuid_lib.uuid4().hex


class ReservationStatus(str, PyEnum):
    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    RECHAZADA = "rechazada"
    CANCELADA = "cancelada"


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    court_id = Column(Integer, ForeignKey("courts.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    jugador_nombre = Column(String(120), nullable=False)
    jugador_whatsapp = Column(String(20), nullable=False)
    jugador_email = Column(String(255), nullable=True)
    yape_screenshot_url = Column(String(500), nullable=True)
    payment_provider = Column(String(30), nullable=True)
    payment_status = Column(String(30), nullable=True)
    payment_id = Column(String(120), nullable=True, unique=True, index=True)
    payment_amount_cents = Column(Integer, nullable=True)
    payment_currency = Column(String(3), nullable=True)
    payment_paid_at = Column(DateTime, nullable=True)
    estado = Column(
        Enum(ReservationStatus, name="reservation_status"),
        default=ReservationStatus.PENDIENTE,
        nullable=False,
        index=True,
    )
    notas_dueno = Column(String(255), nullable=True)
    cancel_token = Column(String(64), unique=True, nullable=False, index=True, default=_gen_cancel_token)
    # Si la reserva se creó en modo auto, fecha-hora a partir de la cual debe auto-confirmarse
    auto_confirm_at = Column(DateTime, nullable=True, index=True)
    # Si el jugador estaba logueado al reservar, vincular con su cuenta
    player_id = Column(Integer, ForeignKey("players.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    court = relationship("Court", back_populates="reservations")
    player = relationship("Player", back_populates="reservations")
