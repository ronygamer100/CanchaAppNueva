"""Endpoints del JUGADOR autenticado."""
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_player
from app.models.player import Player
from app.models.reservation import Reservation, ReservationStatus
from app.models.court import Court
from app.models.venue import Venue
from app.services.auto_confirm import sweep_auto_confirms


router = APIRouter(prefix="/api/player", tags=["player"])


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    nombre: str
    avatar_url: Optional[str] = None
    whatsapp: Optional[str] = None


class PlayerUpdate(BaseModel):
    whatsapp: Optional[str] = Field(default=None, max_length=20)
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=120)


def _is_pe_whatsapp(s: str) -> bool:
    import re
    return bool(re.match(r"^\+519\d{8}$", s))


class PlayerReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: date
    hora_inicio: str
    hora_fin: str
    estado: ReservationStatus
    cancel_token: str
    horas: int
    monto_total: float
    venue_nombre: str
    venue_slug: str
    court_nombre: str
    court_id: int
    created_at: Optional[datetime] = None


@router.get("/me", response_model=PlayerOut)
def me(player: Player = Depends(get_current_player)):
    return player


@router.patch("/me", response_model=PlayerOut)
def update_me(
    data: PlayerUpdate,
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
):
    if data.whatsapp is not None:
        if data.whatsapp.strip() == "":
            player.whatsapp = None
        elif not _is_pe_whatsapp(data.whatsapp.strip()):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="WhatsApp debe ser celular peruano: +519XXXXXXXX")
        else:
            player.whatsapp = data.whatsapp.strip()
    if data.nombre is not None:
        player.nombre = data.nombre.strip()
    db.commit()
    db.refresh(player)
    return player


@router.get("/reservations", response_model=List[PlayerReservationOut])
def list_my_reservations(
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
):
    """Historial completo de reservas del jugador, ordenadas por fecha descendente."""
    sweep_auto_confirms(db)  # no filtra por owner, hace todo
    from datetime import datetime as dt
    rows = (
        db.query(Reservation, Court, Venue)
        .join(Court, Reservation.court_id == Court.id)
        .join(Venue, Court.venue_id == Venue.id)
        .filter(Reservation.player_id == player.id)
        .order_by(Reservation.fecha.desc(), Reservation.hora_inicio.desc())
        .all()
    )

    out = []
    for r, court, venue in rows:
        inicio = dt.combine(r.fecha, r.hora_inicio)
        fin = dt.combine(r.fecha, r.hora_fin)
        horas = int((fin - inicio).total_seconds() // 3600)
        out.append(PlayerReservationOut(
            id=r.id,
            fecha=r.fecha,
            hora_inicio=r.hora_inicio.strftime("%H:%M:%S"),
            hora_fin=r.hora_fin.strftime("%H:%M:%S"),
            estado=r.estado,
            cancel_token=r.cancel_token,
            horas=horas,
            monto_total=round(court.precio_hora * horas, 2),
            venue_nombre=venue.nombre,
            venue_slug=venue.slug,
            court_nombre=court.nombre,
            court_id=court.id,
            created_at=r.created_at,
        ))
    return out
