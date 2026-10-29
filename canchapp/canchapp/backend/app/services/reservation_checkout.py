from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import uuid4, uuid5, NAMESPACE_URL
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.timezone import now_peru
from app.models.reservation import Reservation, ReservationStatus
from app.services.availability import slot_is_available
from app.services.booking_integrity import lock_court, expire_holds, record_event
from app.services.credential_crypto import decrypt_secret
from app.services.payments import calculate_full_payment_cents
from app.services.culqi import create_yape_charge, CulqiPaymentRejected, CulqiPaymentUncertain
from app.schemas import ReservationCreatedOut


def checkout_result(item):
    return ReservationCreatedOut(
        id=item.id, fecha=item.fecha, hora_inicio=item.hora_inicio, hora_fin=item.hora_fin,
        cancel_token=item.cancel_token, cancel_url=f"{settings.FRONTEND_URL}/r/{item.cancel_token}",
        modo_confirmacion=item.court.venue.modo_confirmacion, estado=item.estado,
        payment_status=item.payment_status, payment_amount_cents=item.payment_amount_cents,
        hold_expires_at=item.hold_expires_at.replace(tzinfo=timezone.utc) if item.hold_expires_at else None,
    )


def prepare_checkout(db, slug, court_id, data, player):
    court = lock_court(db, court_id)
    if court.activa != 1 or court.venue.slug != slug:
        raise HTTPException(404, "Cancha no encontrada")
    expire_holds(db, court_id)
    key = str(data.request_key or (uuid5(NAMESPACE_URL, data.culqi_token) if data.culqi_token else uuid4()))
    existing = db.query(Reservation).filter(Reservation.request_key == key).first()
    if existing:
        actual = (existing.court_id, existing.fecha, existing.hora_inicio, existing.hora_fin,
                  existing.jugador_email, existing.jugador_whatsapp, existing.jugador_nombre)
        expected = (court_id, data.fecha, data.hora_inicio, data.hora_fin,
                    str(data.jugador_email).lower(), data.jugador_whatsapp.strip(), data.jugador_nombre.strip())
        if actual != expected:
            raise HTTPException(409, "Este intento ya corresponde a otra reserva.")
        db.commit()
        return existing
    if not court.venue.reservas_habilitadas:
        raise HTTPException(403, "Este local todavía no acepta reservas en Fubito.")
    if not slot_is_available(db, court, data.fecha, data.hora_inicio, data.hora_fin):
        raise HTTPException(409, "El horario ya no está disponible o ya pasó. Elige otro horario.")
    amount = calculate_full_payment_cents(court.precio_hora, data.fecha, data.hora_inicio, data.hora_fin)
    demo = court.venue.es_referencial
    if not demo:
        owner = court.venue.owner
        if not data.terms_accepted:
            raise HTTPException(400, "Acepta los Términos y la Política de devoluciones.")
        if not owner.culqi_public_key or not owner.culqi_secret_key_encrypted:
            raise HTTPException(409, "Este local todavía no ha conectado sus cobros por Yape.")
        if amount <= 0 or amount > 200000:
            raise HTTPException(400, "El monto debe estar entre S/0.01 y S/2000.")
    if data.expected_total_cents is not None and data.expected_total_cents != amount:
        raise HTTPException(409, "La tarifa cambió. Actualiza la página antes de pagar.")
    item = Reservation(
        court_id=court_id, fecha=data.fecha, hora_inicio=data.hora_inicio, hora_fin=data.hora_fin,
        jugador_nombre=data.jugador_nombre.strip(), jugador_whatsapp=data.jugador_whatsapp.strip(),
        jugador_email=str(data.jugador_email).lower(), player_id=player.id if player else None,
        request_key=key, quoted_total_cents=amount, quote_source="booking",
        terms_accepted_at=datetime.utcnow() if data.terms_accepted else None,
        estado=ReservationStatus.CONFIRMADA if demo else ReservationStatus.PENDIENTE,
        payment_provider="demo" if demo else "culqi_yape", payment_status="demo" if demo else "reservado",
        payment_amount_cents=0 if demo else amount, payment_currency="PEN",
        hold_expires_at=None if demo else min(datetime.utcnow() + timedelta(minutes=10),
            datetime.utcnow() + (datetime.combine(data.fecha, data.hora_inicio) - now_peru())),
    )
    db.add(item)
    try:
        db.flush()
        record_event(db, item, item.payment_status)
        if player and not player.whatsapp:
            player.whatsapp = data.jugador_whatsapp.strip()
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "El horario o el intento de reserva ya está ocupado.") from exc
    db.refresh(item)
    return item


def locked_reservation(db, token):
    item = db.query(Reservation).filter(Reservation.cancel_token == token).first()
    if not item:
        raise HTTPException(404, "Reserva no encontrada")
    lock_court(db, item.court_id)
    db.refresh(item, with_for_update=True)
    return item


def pay_checkout(db, token, source_token):
    item = locked_reservation(db, token)
    if item.payment_status in {"pagado", "demo", "procesando", "verificacion"}:
        db.commit()
        return item
    expire_holds(db, item.court_id)
    if item.estado != ReservationStatus.PENDIENTE or item.payment_status != "reservado":
        db.commit()
        raise HTTPException(409, "La separación del horario terminó. Elige un horario nuevamente.")
    owner = item.court.venue.owner
    if item.court.activa != 1 or not item.court.venue.reservas_habilitadas:
        raise HTTPException(409, "El local desactivó las reservas. No se realizó ningún cobro.")
    if not owner.culqi_mode or not source_token.startswith(f"ype_{owner.culqi_mode}_"):
        raise HTTPException(400, "El pago y las llaves de Culqi pertenecen a ambientes distintos.")
    if not owner.culqi_secret_key_encrypted:
        raise HTTPException(409, "El local desconectó su cuenta Culqi.")
    try:
        secret = decrypt_secret(owner.culqi_secret_key_encrypted)
    except ValueError as exc:
        raise HTTPException(503, "El local debe volver a conectar su cuenta Culqi.") from exc
    item.payment_source_hash = sha256(source_token.encode()).hexdigest()
    item.payment_status = "procesando"
    item.payment_started_at = datetime.utcnow()
    record_event(db, item, "procesando")
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Esta autorización de Yape ya se utilizó. Revisa tu reserva anterior.") from exc
    try:
        charge = create_yape_charge(
            secret_key=secret, token=source_token, amount_cents=item.quoted_total_cents,
            email=item.jugador_email, customer_name=item.jugador_nombre,
            customer_phone=item.jugador_whatsapp, reservation_id=item.id, venue_name=item.court.venue.nombre,
        )
    except CulqiPaymentRejected:
        item = locked_reservation(db, token)
        if item.payment_status in {"procesando", "verificacion"}:
            item.payment_status = "rechazado"
            item.estado = ReservationStatus.RECHAZADA
            record_event(db, item, "rechazado")
    except CulqiPaymentUncertain:
        item = locked_reservation(db, token)
        if item.payment_status in {"procesando", "verificacion"}:
            item.payment_status = "verificacion"
            record_event(db, item, "verificacion")
    else:
        item = locked_reservation(db, token)
        if item.payment_status in {"procesando", "verificacion"}:
            item.payment_id = charge.charge_id
            item.payment_status = "pagado"
            item.payment_paid_at = datetime.utcnow()
            item.estado = ReservationStatus.CONFIRMADA
            record_event(db, item, "pagado")
    db.commit()
    db.refresh(item)
    return item
