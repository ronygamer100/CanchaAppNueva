from datetime import date, time, datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from app.models.court import Court
from app.models.reservation import Reservation, ReservationStatus
from app.models.blocked_slot import BlockedSlot
from app.schemas import SlotInfo


def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _overlaps(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    return _time_to_minutes(a_start) < _time_to_minutes(b_end) and \
           _time_to_minutes(b_start) < _time_to_minutes(a_end)


def get_day_availability(
    db: Session, court: Court, fecha: date, slot_minutes: int = 60,
    hora_apertura: time = None, hora_cierre: time = None,
) -> List[SlotInfo]:
    """
    Genera los slots horarios del día y los marca según reservas y bloqueos.
    Si hora_apertura/cierre no se pasan, se toman del venue de la cancha.
    """
    if hora_apertura is None:
        hora_apertura = court.venue.hora_apertura
    if hora_cierre is None:
        hora_cierre = court.venue.hora_cierre

    apertura_min = _time_to_minutes(hora_apertura)
    cierre_min = _time_to_minutes(hora_cierre)

    raw_slots: List[tuple[time, time]] = []
    cur = apertura_min
    while cur + slot_minutes <= cierre_min:
        h1 = time(hour=cur // 60, minute=cur % 60)
        h2 = time(hour=(cur + slot_minutes) // 60, minute=(cur + slot_minutes) % 60)
        raw_slots.append((h1, h2))
        cur += slot_minutes

    # Cargar reservas del día (todas las que no están rechazadas/canceladas)
    reservas = (
        db.query(Reservation)
        .filter(
            Reservation.court_id == court.id,
            Reservation.fecha == fecha,
            Reservation.estado.in_(
                [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA]
            ),
        )
        .all()
    )
    bloqueos = (
        db.query(BlockedSlot)
        .filter(BlockedSlot.court_id == court.id, BlockedSlot.fecha == fecha)
        .all()
    )

    result: List[SlotInfo] = []
    for h1, h2 in raw_slots:
        estado = "libre"
        # Prioridad: bloqueado > confirmada > pendiente > libre
        if any(_overlaps(h1, h2, b.hora_inicio, b.hora_fin) for b in bloqueos):
            estado = "bloqueado"
        elif any(
            _overlaps(h1, h2, r.hora_inicio, r.hora_fin)
            and r.estado == ReservationStatus.CONFIRMADA
            for r in reservas
        ):
            estado = "ocupado"
        elif any(
            _overlaps(h1, h2, r.hora_inicio, r.hora_fin)
            and r.estado == ReservationStatus.PENDIENTE
            for r in reservas
        ):
            estado = "pendiente"

        result.append(SlotInfo(hora_inicio=h1, hora_fin=h2, estado=estado))

    return result


def slot_is_available(
    db: Session, court: Court, fecha: date, hora_inicio: time, hora_fin: time
) -> bool:
    """Verifica si un rango horario está libre (sin reservas activas ni bloqueos)."""
    venue_apertura = court.venue.hora_apertura
    venue_cierre = court.venue.hora_cierre

    # Debe estar dentro del horario de apertura del venue
    if _time_to_minutes(hora_inicio) < _time_to_minutes(venue_apertura):
        return False
    if _time_to_minutes(hora_fin) > _time_to_minutes(venue_cierre):
        return False
    if _time_to_minutes(hora_inicio) >= _time_to_minutes(hora_fin):
        return False

    # No debe solapar con reservas activas
    reservas = (
        db.query(Reservation)
        .filter(
            Reservation.court_id == court.id,
            Reservation.fecha == fecha,
            Reservation.estado.in_(
                [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA]
            ),
        )
        .all()
    )
    for r in reservas:
        if _overlaps(hora_inicio, hora_fin, r.hora_inicio, r.hora_fin):
            return False

    bloqueos = (
        db.query(BlockedSlot)
        .filter(BlockedSlot.court_id == court.id, BlockedSlot.fecha == fecha)
        .all()
    )
    for b in bloqueos:
        if _overlaps(hora_inicio, hora_fin, b.hora_inicio, b.hora_fin):
            return False

    return True
