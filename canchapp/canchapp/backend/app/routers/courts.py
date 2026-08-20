from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_owner
from app.models.owner import Owner
from app.models.venue import Venue
from app.models.court import Court
from app.schemas import CourtCreate, CourtUpdate, CourtOut

router = APIRouter(prefix="/api", tags=["courts"])


def _venue_or_404(db: Session, venue_id: int, owner: Owner) -> Venue:
    venue = db.query(Venue).filter(
        Venue.id == venue_id, Venue.owner_id == owner.id
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return venue


@router.post("/venues/{venue_id}/courts", response_model=CourtOut, status_code=201)
def create_court(
    venue_id: int,
    data: CourtCreate,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    _venue_or_404(db, venue_id, owner)
    payload = data.model_dump(exclude={"adelanto_monto"})
    court = Court(
        venue_id=venue_id,
        adelanto_monto=data.precio_hora,
        **payload,
    )
    db.add(court)
    db.commit()
    db.refresh(court)
    return court


@router.get("/venues/{venue_id}/courts", response_model=List[CourtOut])
def list_courts(
    venue_id: int,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    _venue_or_404(db, venue_id, owner)
    return db.query(Court).filter(Court.venue_id == venue_id).all()


@router.get("/courts/{court_id}", response_model=CourtOut)
def get_court(
    court_id: int,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    court = db.query(Court).join(Venue).filter(
        Court.id == court_id, Venue.owner_id == owner.id
    ).first()
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return court


@router.patch("/courts/{court_id}", response_model=CourtOut)
def update_court(
    court_id: int,
    data: CourtUpdate,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    court = db.query(Court).join(Venue).filter(
        Court.id == court_id, Venue.owner_id == owner.id
    ).first()
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    changes = data.model_dump(exclude_unset=True, exclude={"adelanto_monto"})
    for k, v in changes.items():
        setattr(court, k, v)
    if "precio_hora" in changes:
        court.adelanto_monto = court.precio_hora
    db.commit()
    db.refresh(court)
    return court


@router.delete("/courts/{court_id}", status_code=204)
def delete_court(
    court_id: int,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    court = db.query(Court).join(Venue).filter(
        Court.id == court_id, Venue.owner_id == owner.id
    ).first()
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    db.delete(court)
    db.commit()
