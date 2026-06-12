import os
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
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
    ReservationPublicOut,
)
from app.services.availability import get_day_availability, slot_is_available
from app.services.auto_confirm import sweep_auto_confirms
from app.core.deps import get_optional_player
from app.models.player import Player

router = APIRouter(prefix="/api/public", tags=["public"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


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
        hora_apertura=venue.hora_apertura,
        hora_cierre=venue.hora_cierre,
        foto_url=venue.foto_url,
        logo_url=venue.logo_url,
        yape_qr_url=venue.yape_qr_url,
        owner_whatsapp=venue.owner.whatsapp,
        owner_nombre_negocio=venue.owner.nombre_negocio,
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
    # Aplica auto-confirmaciones vencidas antes de calcular slots
    sweep_auto_confirms(db, owner_id=court.venue.owner_id)
    slots = get_day_availability(db, court, fecha)
    return DayAvailability(fecha=fecha, slots=slots)


@router.post(
    "/venues/{slug}/courts/{court_id}/reservations",
    response_model=ReservationCreatedOut, status_code=201,
)
async def create_reservation(
    slug: str,
    court_id: int,
    fecha: date = Form(...),
    hora_inicio: str = Form(...),
    hora_fin: str = Form(...),
    jugador_nombre: str = Form(...),
    jugador_whatsapp: str = Form(...),
    yape_screenshot: UploadFile = File(...),
    db: Session = Depends(get_db),
    player: Optional[Player] = Depends(get_optional_player),
):
    court = (
        db.query(Court).join(Venue)
        .filter(Court.id == court_id, Venue.slug == slug, Court.activa == 1)
        .first()
    )
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    from datetime import time as dt_time
    try:
        h_ini = dt_time.fromisoformat(hora_inicio)
        h_fin = dt_time.fromisoformat(hora_fin)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de hora inválido (HH:MM)")

    if fecha < today_peru():
        raise HTTPException(status_code=400, detail="La fecha no puede ser pasada")

    if not slot_is_available(db, court, fecha, h_ini, h_fin):
        raise HTTPException(status_code=409, detail="El horario ya no está disponible")

    if len(jugador_nombre.strip()) < 2:
        raise HTTPException(status_code=400, detail="Nombre inválido")

    if yape_screenshot.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Sube JPG, PNG o WEBP.")
    content = await yape_screenshot.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="La captura de Yape es obligatoria")
    max_bytes = app_settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande (máx {app_settings.MAX_UPLOAD_SIZE_MB}MB)")
    os.makedirs(app_settings.UPLOAD_DIR, exist_ok=True)
    ext = (yape_screenshot.filename.rsplit(".", 1)[-1].lower()
           if "." in (yape_screenshot.filename or "") else "jpg")
    filename = f"yape_{court.id}_{uuid.uuid4().hex}.{ext}"
    path = os.path.join(app_settings.UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)
    yape_url = f"/uploads/{filename}"

    # Calcular auto_confirm_at según política del venue
    from datetime import datetime as _dt, timedelta as _td
    auto_confirm_at = None
    if court.venue.modo_confirmacion == "auto":
        auto_confirm_at = _dt.utcnow() + _td(minutes=court.venue.auto_confirm_minutes)

    reserva = Reservation(
        court_id=court.id,
        fecha=fecha,
        hora_inicio=h_ini,
        hora_fin=h_fin,
        jugador_nombre=jugador_nombre.strip(),
        jugador_whatsapp=jugador_whatsapp.strip(),
        yape_screenshot_url=yape_url,
        estado=ReservationStatus.PENDIENTE,
        auto_confirm_at=auto_confirm_at,
        player_id=player.id if player else None,
    )
    db.add(reserva)

    # Si está logueado y aún no tiene whatsapp en perfil, guardarlo
    if player and not player.whatsapp:
        player.whatsapp = jugador_whatsapp.strip()

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
        auto_confirm_at=auto_confirm_at,
        modo_confirmacion=court.venue.modo_confirmacion,
    )


# ---- Vista / cancelación pública de la reserva ----
def _reservation_public(reserva: Reservation) -> ReservationPublicOut:
    from datetime import datetime as dt
    inicio = dt.combine(reserva.fecha, reserva.hora_inicio)
    fin = dt.combine(reserva.fecha, reserva.hora_fin)
    horas = int((fin - inicio).total_seconds() // 3600)

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
        adelanto_monto=reserva.court.adelanto_monto * horas,
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
