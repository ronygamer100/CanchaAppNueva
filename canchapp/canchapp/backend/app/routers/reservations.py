from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_owner
from app.models.owner import Owner
from app.models.venue import Venue
from app.models.court import Court
from app.models.reservation import Reservation, ReservationStatus
from app.models.blocked_slot import BlockedSlot
from app.schemas import (
    ReservationOut,
    ReservationStatusUpdate,
    BlockedSlotCreate,
    BlockedSlotOut,
    PendingCountOut,
)
from app.services.whatsapp import (
    wa_me_link,
    build_confirmation_message,
    build_rejection_message,
    build_owner_cancel_message,
)
from app.services.auto_confirm import sweep_auto_confirms

router = APIRouter(prefix="/api", tags=["reservations"])


@router.get("/reservations/pending-count", response_model=PendingCountOut)
def pending_count(
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    """Cuenta reservas pendientes en todas las canchas de todos los venues del dueño."""
    sweep_auto_confirms(db, owner_id=owner.id)
    total = (
        db.query(Reservation)
        .join(Court, Reservation.court_id == Court.id)
        .join(Venue, Court.venue_id == Venue.id)
        .filter(
            Venue.owner_id == owner.id,
            Reservation.estado == ReservationStatus.PENDIENTE,
        )
        .count()
    )
    return PendingCountOut(total=total)


@router.get("/reservations/pending", response_model=List[ReservationOut])
def list_all_pending(
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    sweep_auto_confirms(db, owner_id=owner.id)
    return (
        db.query(Reservation)
        .join(Court, Reservation.court_id == Court.id)
        .join(Venue, Court.venue_id == Venue.id)
        .filter(
            Venue.owner_id == owner.id,
            Reservation.estado == ReservationStatus.PENDIENTE,
        )
        .order_by(Reservation.created_at.desc())
        .all()
    )


def _court_or_404(db: Session, court_id: int, owner: Owner) -> Court:
    court = (
        db.query(Court).join(Venue)
        .filter(Court.id == court_id, Venue.owner_id == owner.id)
        .first()
    )
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return court


@router.get("/courts/{court_id}/reservations", response_model=List[ReservationOut])
def list_reservations(
    court_id: int,
    estado: Optional[ReservationStatus] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    _court_or_404(db, court_id, owner)
    sweep_auto_confirms(db, owner_id=owner.id)
    q = db.query(Reservation).filter(Reservation.court_id == court_id)
    if estado:
        q = q.filter(Reservation.estado == estado)
    if desde:
        q = q.filter(Reservation.fecha >= desde)
    if hasta:
        q = q.filter(Reservation.fecha <= hasta)
    return q.order_by(Reservation.fecha.desc(), Reservation.hora_inicio.desc()).all()


@router.patch("/reservations/{reservation_id}", response_model=ReservationOut)
def update_reservation_status(
    reservation_id: int,
    data: ReservationStatusUpdate,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    reserva = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.court.venue.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    reserva.estado = data.estado
    if data.notas_dueno is not None:
        reserva.notas_dueno = data.notas_dueno
    db.commit()
    db.refresh(reserva)
    return reserva


@router.get("/reservations/{reservation_id}/whatsapp-link")
def get_whatsapp_link(
    reservation_id: int,
    action: str = Query(..., pattern="^(confirm|reject|cancel)$"),
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    reserva = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.court.venue.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    fecha_str = reserva.fecha.strftime("%d/%m/%Y")
    hora_str = reserva.hora_inicio.strftime("%H:%M")
    nombre_local = reserva.court.venue.nombre
    if action == "confirm":
        msg = build_confirmation_message(nombre_local, fecha_str, hora_str)
    elif action == "reject":
        msg = build_rejection_message(
            nombre_local, fecha_str, hora_str, reserva.notas_dueno or "",
        )
    else:  # cancel
        msg = build_owner_cancel_message(
            nombre_local, fecha_str, hora_str, reserva.notas_dueno or "",
        )
    return {"url": wa_me_link(reserva.jugador_whatsapp, msg)}


# ---- Bloqueos manuales ----
@router.post("/courts/{court_id}/blocks", response_model=BlockedSlotOut, status_code=201)
def create_block(
    court_id: int,
    data: BlockedSlotCreate,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    _court_or_404(db, court_id, owner)
    block = BlockedSlot(court_id=court_id, **data.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.get("/courts/{court_id}/blocks", response_model=List[BlockedSlotOut])
def list_blocks(
    court_id: int,
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    _court_or_404(db, court_id, owner)
    q = db.query(BlockedSlot).filter(BlockedSlot.court_id == court_id)
    if desde:
        q = q.filter(BlockedSlot.fecha >= desde)
    if hasta:
        q = q.filter(BlockedSlot.fecha <= hasta)
    return q.order_by(BlockedSlot.fecha, BlockedSlot.hora_inicio).all()


@router.delete("/blocks/{block_id}", status_code=204)
def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    block = db.query(BlockedSlot).filter(BlockedSlot.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")
    if block.court.venue.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(block)
    db.commit()
