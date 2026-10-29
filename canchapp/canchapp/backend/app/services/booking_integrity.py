from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.court import Court
from app.models.reservation import Reservation, ReservationStatus
from app.models.payment_event import PaymentEvent

ACTIVE = (ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA)
IN_FLIGHT = {"procesando", "verificacion"}


def lock_court(db: Session, court_id: int) -> Court:
    court = db.query(Court).filter(Court.id == court_id).with_for_update().first()
    if not court:
        raise HTTPException(404, "Cancha no encontrada")
    return court


def expire_holds(db: Session, court_id: int | None = None) -> int:
    """Only an unpaid hold can expire. An uncertain debit keeps its slot."""
    if court_id is None:
        ids = db.query(Reservation.court_id).filter(
            Reservation.estado == ReservationStatus.PENDIENTE,
            Reservation.payment_status.in_(["reservado", "procesando"]),
        ).distinct().order_by(Reservation.court_id).all()
        return sum(expire_holds(db, row[0]) for row in ids)
    lock_court(db, court_id)
    now = datetime.utcnow()
    query = db.query(Reservation).filter(Reservation.estado == ReservationStatus.PENDIENTE)
    if court_id is not None:
        query = query.filter(Reservation.court_id == court_id)
    expired = query.filter(
        Reservation.payment_status == "reservado", Reservation.hold_expires_at <= now,
    ).all()
    for item in expired:
        item.estado = ReservationStatus.CANCELADA
        item.payment_status = "expirado"
        record_event(db, item, "expirado")
    # A process can die after sending a charge: never retry that debit automatically.
    query.filter(
        Reservation.payment_status == "procesando",
        Reservation.payment_started_at < now - timedelta(seconds=90),
    ).update({Reservation.payment_status: "verificacion"}, synchronize_session="fetch")
    db.flush()
    return len(expired)


def record_event(db: Session, item: Reservation, status: str) -> None:
    db.add(PaymentEvent(reservation_id=item.id, status=status,
                        amount_cents=item.payment_amount_cents, charge_id=item.payment_id,
                        refunded_cents=item.payment_refunded_cents or 0))


def change_status(db: Session, item: Reservation, target: ReservationStatus) -> None:
    if item.estado == target:
        return
    if item.estado not in ACTIVE:
        raise HTTPException(409, "Una reserva finalizada no puede reactivarse. Crea una nueva reserva.")
    if item.payment_status in IN_FLIGHT:
        raise HTTPException(409, "El pago está en verificación. Consulta Culqi antes de liberar el horario.")
    if target == ReservationStatus.PENDIENTE:
        raise HTTPException(409, "No se puede devolver una reserva confirmada a pendiente.")
    if target == ReservationStatus.CONFIRMADA and item.payment_status not in {"pagado", "demo"}:
        raise HTTPException(409, "Solo se puede confirmar una reserva con pago verificado.")
    if target == ReservationStatus.RECHAZADA and item.payment_status == "pagado":
        raise HTTPException(409, "La reserva está pagada. Usa cancelar y gestiona la devolución.")
    item.estado = target
    item.auto_confirm_at = None
    record_event(db, item, "reserva_" + target.value)
