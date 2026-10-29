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
from app.services.booking_integrity import lock_court, change_status, expire_holds, record_event
from app.services.reservation_checkout import locked_reservation
from app.schemas import PaymentReconcile

router = APIRouter(prefix="/api", tags=["reservations"])


@router.get("/reservations/{reservation_id}/receipt")
def legacy_receipt(reservation_id: int, db: Session = Depends(get_db), owner: Owner = Depends(get_current_owner)):
    from pathlib import Path
    from urllib.parse import urlsplit
    from fastapi.responses import FileResponse, Response
    from app.core.config import settings
    item = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not item or item.court.venue.owner_id != owner.id or not item.yape_screenshot_url:
        raise HTTPException(404, "Comprobante no encontrado")
    url = item.yape_screenshot_url
    if url.startswith("/uploads/"):
        root = Path(settings.UPLOAD_DIR).resolve()
        path = (root / url.removeprefix("/uploads/")).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise HTTPException(404, "Comprobante no encontrado")
        return FileResponse(path, filename=path.name, headers={"Cache-Control": "private, no-store"})
    # Only fetch the configured storage, never a user-supplied host.
    import requests
    base = settings.SUPABASE_URL.rstrip("/")
    if not base or not url.startswith(base + "/storage/v1/object/"):
        raise HTTPException(404, "El comprobante requiere migración a almacenamiento privado.")
    private_url = url.replace("/object/public/", "/object/authenticated/", 1)
    try:
        result = requests.get(private_url, headers={"Authorization": "Bearer " + (
            settings.SUPABASE_SECRET_KEY or settings.SUPABASE_SERVICE_ROLE_KEY)}, timeout=15, allow_redirects=False)
        if result.status_code != 200 or not result.headers.get("Content-Type", "").startswith("image/"):
            raise HTTPException(404, "Comprobante no encontrado")
        return Response(result.content, media_type=result.headers["Content-Type"],
                        headers={"Cache-Control": "private, no-store"})
    except requests.RequestException as exc:
        raise HTTPException(503, "No se pudo descargar el comprobante.") from exc



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

    lock_court(db, reserva.court_id)
    db.refresh(reserva, with_for_update=True)
    change_status(db, reserva, data.estado)
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
    court = _court_or_404(db, court_id, owner)
    lock_court(db, court_id)
    expire_holds(db, court_id)
    from app.services.availability import slot_is_available
    if not slot_is_available(db, court, data.fecha, data.hora_inicio, data.hora_fin):
        raise HTTPException(409, "El horario no está disponible. Revisa las reservas antes de bloquear.")
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
    lock_court(db, block.court_id)
    db.delete(block)
    db.commit()


@router.post("/reservations/{reservation_id}/reconcile", response_model=ReservationOut)
def reconcile_payment(reservation_id: int, data: PaymentReconcile,
                      db: Session = Depends(get_db), owner: Owner = Depends(get_current_owner)):
    from app.services.culqi import retrieve_charge, CulqiPaymentUncertain
    from app.services.credential_crypto import decrypt_secret
    from datetime import datetime
    item = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not item or item.court.venue.owner_id != owner.id:
        raise HTTPException(404, "Reserva no encontrada")
    token = item.cancel_token
    if item.payment_id and item.payment_id != data.charge_id:
        raise HTTPException(409, "Esta reserva ya tiene otro cargo registrado.")
    if item.payment_status not in {"procesando", "verificacion", "pagado", "reembolsado"}:
        raise HTTPException(409, "Esta reserva no tiene un pago pendiente de verificación.")
    try:
        charge = retrieve_charge(secret_key=decrypt_secret(owner.culqi_secret_key_encrypted or ""),
            charge_id=data.charge_id, amount_cents=item.quoted_total_cents or item.payment_amount_cents,
            reservation_id=item.id)
    except (CulqiPaymentUncertain, ValueError) as exc:
        raise HTTPException(409, "Culqi no verificó el cargo para esta reserva. El horario sigue protegido.") from exc
    item = locked_reservation(db, token)
    if item.payment_id and item.payment_id != charge.charge_id:
        raise HTTPException(409, "Esta reserva ya tiene otro cargo verificado.")
    if item.estado != ReservationStatus.PENDIENTE and item.payment_status not in {"pagado", "reembolsado"}:
        raise HTTPException(409, "La reserva cambió de estado durante la verificación.")
    item.payment_id = charge.charge_id
    item.payment_refunded_cents = max(item.payment_refunded_cents or 0, charge.refunded_cents)
    item.payment_status = "reembolsado" if item.payment_refunded_cents == item.payment_amount_cents else "pagado"
    item.payment_paid_at = item.payment_paid_at or datetime.utcnow()
    if item.payment_status == "reembolsado":
        item.estado = ReservationStatus.CANCELADA
    elif item.estado == ReservationStatus.PENDIENTE:
        item.estado = ReservationStatus.CONFIRMADA
    record_event(db, item, "conciliado")
    db.commit()
    db.refresh(item)
    return item
