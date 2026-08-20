from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings as app_settings
from app.core.timezone import today_peru, now_peru
from app.models.venue import Venue
from app.models.court import Court
from app.models.reservation import Reservation, ReservationStatus
from app.schemas import (
    VenuePublicOut,
    CourtPublicLite,
    DayAvailability,
    ReservationCreatedOut,
    ReservationPaymentCreate,
    ReservationPublicOut,
)
from app.services.availability import get_day_availability, slot_is_available
from app.services.auto_confirm import sweep_auto_confirms
from app.services.credential_crypto import decrypt_secret
from app.services.culqi import (
    CulqiPaymentRejected,
    CulqiPaymentUncertain,
    create_yape_charge,
)
from app.services.payments import calculate_full_payment_cents
from app.core.deps import get_optional_player
from app.models.player import Player

router = APIRouter(prefix="/api/public", tags=["public"])

@router.get("/venues")
def list_venues_public(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o dirección"),
    distrito: Optional[str] = Query(None),
    precio_max: Optional[float] = Query(None, ge=0),
    amenities: Optional[str] = Query(None, description="CSV de slugs requeridos"),
    disponible_hoy: bool = Query(False, description="Solo con al menos un slot libre hoy"),
    ordenar: str = Query("recientes", pattern="^(recientes|precio_asc|precio_desc|nombre)$"),
):
    """Catálogo público con filtros opcionales."""
    venues = (
        db.query(Venue)
        .order_by(Venue.created_at.desc())
        .all()
    )

    out = []
    amenities_req = set(s.strip() for s in (amenities or "").split(",") if s.strip())
    q_lower = q.lower().strip() if q else None

    for v in venues:
        canchas_activas = [c for c in v.courts if c.activa == 1]
        if not canchas_activas:
            continue

        # Filtro por amenities (venue + amenities de cancha agregadas)
        if amenities_req:
            venue_amenities = set(v.amenities or [])
            for c in canchas_activas:
                venue_amenities.update(c.amenities or [])
            if not amenities_req.issubset(venue_amenities):
                continue

        # Filtro por distrito
        if distrito and (not v.distrito or v.distrito.lower() != distrito.lower()):
            continue

        precios = [c.precio_hora for c in canchas_activas]
        precio_min = min(precios) if precios else None

        # Filtro por precio máximo (su menor precio debe estar dentro)
        if precio_max is not None and precio_min is not None and precio_min > precio_max:
            continue

        # Búsqueda por nombre/dirección
        if q_lower:
            blob = f"{v.nombre} {v.direccion} {v.distrito or ''}".lower()
            if q_lower not in blob:
                continue

        # Filtro "disponible hoy" — verificar que alguna cancha tenga al menos un slot libre
        if disponible_hoy:
            if not v.reservas_habilitadas:
                continue
            from app.services.availability import get_day_availability
            tiene_libre = False
            for c in canchas_activas:
                slots = get_day_availability(db, c, today_peru())
                if any(s.disponible for s in slots):
                    tiene_libre = True
                    break
            if not tiene_libre:
                continue

        out.append({
            "slug": v.slug,
            "nombre": v.nombre,
            "direccion": v.direccion,
            "distrito": v.distrito,
            "foto_url": v.foto_url,
            "hora_apertura": v.hora_apertura.strftime("%H:%M"),
            "hora_cierre": v.hora_cierre.strftime("%H:%M"),
            "amenities": v.amenities or [],
            "court_count": len(canchas_activas),
            "precio_desde": precio_min,
            "lat": v.lat,
            "lng": v.lng,
            "es_referencial": v.es_referencial,
            "reservas_habilitadas": v.reservas_habilitadas,
        })

    # Ordenar
    if ordenar == "precio_asc":
        out.sort(key=lambda x: x["precio_desde"] or 999999)
    elif ordenar == "precio_desc":
        out.sort(key=lambda x: -(x["precio_desde"] or 0))
    elif ordenar == "nombre":
        out.sort(key=lambda x: x["nombre"].lower())
    # "recientes" ya viene en ese orden

    return out


@router.get("/venues/{slug}", response_model=VenuePublicOut)
def get_venue_public(slug: str, db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.slug == slug).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    canchas_activas = [c for c in venue.courts if c.activa == 1]
    return VenuePublicOut(
        id=venue.id,
        slug=venue.slug,
        nombre=venue.nombre,
        direccion=venue.direccion,
        descripcion=venue.descripcion,
        lat=venue.lat,
        lng=venue.lng,
        distrito=venue.distrito,
        hora_apertura=venue.hora_apertura,
        hora_cierre=venue.hora_cierre,
        modo_confirmacion=venue.modo_confirmacion,
        auto_confirm_minutes=venue.auto_confirm_minutes,
        amenities=venue.amenities or [],
        foto_url=venue.foto_url,
        logo_url=venue.logo_url,
        yape_qr_url=venue.yape_qr_url,
        telefono_publico=venue.telefono_publico,
        fuente_nombre=venue.fuente_nombre,
        fuente_url=venue.fuente_url,
        es_referencial=venue.es_referencial,
        reservas_habilitadas=venue.reservas_habilitadas,
        owner_whatsapp=(
            venue.owner.whatsapp
            if venue.es_referencial
            else venue.telefono_publico or venue.owner.whatsapp
        ),
        owner_nombre_negocio=venue.owner.nombre_negocio,
        culqi_ready=bool(
            not venue.es_referencial
            and venue.owner.culqi_public_key
            and venue.owner.culqi_secret_key_encrypted
        ),
        culqi_public_key=(
            venue.owner.culqi_public_key
            if not venue.es_referencial
            and venue.owner.culqi_public_key
            and venue.owner.culqi_secret_key_encrypted
            else None
        ),
        courts=[CourtPublicLite.model_validate(c) for c in canchas_activas],
    )


@router.get("/venues/{slug}/courts/{court_id}/availability", response_model=DayAvailability)
def get_availability(
    slug: str,
    court_id: int,
    fecha: date,
    db: Session = Depends(get_db),
):
    court = (
        db.query(Court).join(Venue)
        .filter(Court.id == court_id, Venue.slug == slug)
        .first()
    )
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not court.venue.reservas_habilitadas:
        raise HTTPException(
            status_code=403,
            detail="Esta ficha es referencial y todavía no acepta reservas en fubito",
        )
    # Aplica auto-confirmaciones vencidas antes de calcular slots
    sweep_auto_confirms(db, owner_id=court.venue.owner_id)
    slots = get_day_availability(db, court, fecha)
    return DayAvailability(fecha=fecha, slots=slots)


@router.post(
    "/venues/{slug}/courts/{court_id}/reservations",
    response_model=ReservationCreatedOut, status_code=201,
)
def create_reservation(
    slug: str,
    court_id: int,
    data: ReservationPaymentCreate,
    db: Session = Depends(get_db),
    player: Optional[Player] = Depends(get_optional_player),
):
    court = (
        db.query(Court)
        .filter(Court.id == court_id, Court.activa == 1)
        .with_for_update()
        .first()
    )
    if not court or court.venue.slug != slug:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not court.venue.reservas_habilitadas:
        raise HTTPException(
            status_code=403,
            detail="Esta ficha es referencial y todavía no acepta reservas en fubito",
        )

    if data.fecha < today_peru():
        raise HTTPException(status_code=400, detail="La fecha no puede ser pasada")

    if not slot_is_available(db, court, data.fecha, data.hora_inicio, data.hora_fin):
        raise HTTPException(status_code=409, detail="El horario ya no está disponible")

    from datetime import datetime as _dt
    amount_cents = calculate_full_payment_cents(
        court.precio_hora,
        data.fecha,
        data.hora_inicio,
        data.hora_fin,
    )
    is_demo = court.venue.es_referencial

    secret_key = None
    if not is_demo:
        owner = court.venue.owner
        if not owner.culqi_public_key or not owner.culqi_secret_key_encrypted:
            raise HTTPException(
                status_code=409,
                detail="Este local todavía no ha conectado sus cobros por Yape.",
            )
        if not data.culqi_token:
            raise HTTPException(status_code=400, detail="Falta autorizar el pago con Yape")
        expected_prefix = f"ype_{owner.culqi_mode}_"
        if not data.culqi_token.startswith(expected_prefix):
            raise HTTPException(
                status_code=400,
                detail="El pago y las llaves de Culqi pertenecen a ambientes distintos.",
            )
        if amount_cents <= 0 or amount_cents > 200000:
            raise HTTPException(
                status_code=400,
                detail="El monto a pagar con Yape debe estar entre S/0.01 y S/2000.",
            )
        try:
            secret_key = decrypt_secret(owner.culqi_secret_key_encrypted)
        except ValueError as exc:
            raise HTTPException(
                status_code=503,
                detail="El local debe volver a conectar su cuenta Culqi.",
            ) from exc

    reserva = Reservation(
        court_id=court.id,
        fecha=data.fecha,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
        jugador_nombre=data.jugador_nombre.strip(),
        jugador_whatsapp=data.jugador_whatsapp.strip(),
        jugador_email=str(data.jugador_email).lower(),
        estado=ReservationStatus.CONFIRMADA if is_demo else ReservationStatus.PENDIENTE,
        auto_confirm_at=None,
        player_id=player.id if player else None,
        payment_provider="demo" if is_demo else "culqi_yape",
        payment_status="demo" if is_demo else "procesando",
        payment_amount_cents=0 if is_demo else amount_cents,
        payment_currency="PEN",
    )
    db.add(reserva)

    # Si está logueado y aún no tiene whatsapp en perfil, guardarlo
    if player and not player.whatsapp:
        player.whatsapp = data.jugador_whatsapp.strip()

    db.commit()
    db.refresh(reserva)

    if not is_demo and secret_key and data.culqi_token:
        try:
            charge = create_yape_charge(
                secret_key=secret_key,
                token=data.culqi_token,
                amount_cents=amount_cents,
                email=str(data.jugador_email).lower(),
                customer_name=data.jugador_nombre,
                customer_phone=data.jugador_whatsapp,
                reservation_id=reserva.id,
                venue_name=court.venue.nombre,
            )
        except CulqiPaymentRejected as exc:
            reserva.estado = ReservationStatus.RECHAZADA
            reserva.payment_status = "rechazado"
            db.commit()
            raise HTTPException(status_code=402, detail=str(exc)) from exc
        except CulqiPaymentUncertain as exc:
            reserva.payment_status = "verificacion"
            db.commit()
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        reserva.estado = ReservationStatus.CONFIRMADA
        reserva.payment_status = "pagado"
        reserva.payment_id = charge.charge_id
        reserva.payment_amount_cents = charge.amount_cents
        reserva.payment_currency = charge.currency
        reserva.payment_paid_at = _dt.utcnow()
        db.commit()
        db.refresh(reserva)

    cancel_url = f"{app_settings.FRONTEND_URL}/r/{reserva.cancel_token}"
    return ReservationCreatedOut(
        id=reserva.id,
        fecha=reserva.fecha,
        hora_inicio=reserva.hora_inicio,
        hora_fin=reserva.hora_fin,
        cancel_token=reserva.cancel_token,
        cancel_url=cancel_url,
        auto_confirm_at=None,
        modo_confirmacion=court.venue.modo_confirmacion,
        payment_status=reserva.payment_status,
        payment_amount_cents=reserva.payment_amount_cents,
    )


# ---- Vista / cancelación pública de la reserva ----
def _reservation_public(reserva: Reservation) -> ReservationPublicOut:
    from datetime import datetime as dt
    inicio = dt.combine(reserva.fecha, reserva.hora_inicio)
    fin = dt.combine(reserva.fecha, reserva.hora_fin)
    horas = int((fin - inicio).total_seconds() // 3600)
    monto_total = round(reserva.court.precio_hora * horas, 2)
    if reserva.payment_provider == "demo":
        monto_pagado = 0.0
    elif reserva.payment_status == "pagado" and reserva.payment_amount_cents is not None:
        monto_pagado = round(reserva.payment_amount_cents / 100, 2)
    elif reserva.payment_status in {"rechazado", "procesando", "verificacion"}:
        monto_pagado = 0.0
    else:
        # Reservas históricas anteriores a Culqi solo guardaban el adelanto.
        monto_pagado = round(reserva.court.adelanto_monto * horas, 2)

    return ReservationPublicOut(
        id=reserva.id,
        fecha=reserva.fecha,
        hora_inicio=reserva.hora_inicio,
        hora_fin=reserva.hora_fin,
        jugador_nombre=reserva.jugador_nombre,
        estado=reserva.estado,
        venue_nombre=reserva.court.venue.nombre,
        court_nombre=reserva.court.nombre,
        court_tipo=reserva.court.tipo,
        direccion=reserva.court.venue.direccion,
        monto_total=monto_total,
        monto_pagado=monto_pagado,
        payment_status=reserva.payment_status,
        adelanto_monto=monto_pagado,
        horas=horas,
    )


@router.get("/reservations/{token}", response_model=ReservationPublicOut)
def get_reservation_public(token: str, db: Session = Depends(get_db)):
    reserva = db.query(Reservation).filter(Reservation.cancel_token == token).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    # Si vencido el auto-confirm, marcarla como confirmada antes de devolver
    sweep_auto_confirms(db, owner_id=reserva.court.venue.owner_id)
    db.refresh(reserva)
    return _reservation_public(reserva)


@router.post("/reservations/{token}/cancel", response_model=ReservationPublicOut)
def cancel_reservation_public(token: str, db: Session = Depends(get_db)):
    reserva = db.query(Reservation).filter(Reservation.cancel_token == token).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.estado in (ReservationStatus.CANCELADA, ReservationStatus.RECHAZADA):
        raise HTTPException(status_code=400, detail=f"La reserva ya está {reserva.estado.value}")

    from datetime import datetime as dt
    inicio_reserva = dt.combine(reserva.fecha, reserva.hora_inicio)
    horas_restantes = (inicio_reserva - now_peru()).total_seconds() / 3600
    if horas_restantes < 2:
        raise HTTPException(status_code=400, detail="No se puede cancelar a menos de 2 horas del inicio.")

    reserva.estado = ReservationStatus.CANCELADA
    db.commit()
    db.refresh(reserva)
    return _reservation_public(reserva)
