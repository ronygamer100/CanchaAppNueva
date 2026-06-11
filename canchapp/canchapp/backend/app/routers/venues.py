import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.deps import get_current_owner
from app.models.owner import Owner
from app.models.venue import Venue
from app.schemas import VenueCreate, VenueUpdate, VenueOut

router = APIRouter(prefix="/api/venues", tags=["venues"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("", response_model=VenueOut, status_code=201)
def create_venue(
    data: VenueCreate,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    if db.query(Venue).filter(Venue.slug == data.slug).first():
        raise HTTPException(status_code=400, detail="Ese slug ya está en uso")
    venue = Venue(owner_id=owner.id, **data.model_dump())
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return venue


@router.get("", response_model=List[VenueOut])
def list_my_venues(
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    return db.query(Venue).filter(Venue.owner_id == owner.id).all()


@router.get("/{venue_id}", response_model=VenueOut)
def get_venue(
    venue_id: int,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    venue = db.query(Venue).filter(
        Venue.id == venue_id, Venue.owner_id == owner.id
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return venue


@router.patch("/{venue_id}", response_model=VenueOut)
def update_venue(
    venue_id: int,
    data: VenueUpdate,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    venue = db.query(Venue).filter(
        Venue.id == venue_id, Venue.owner_id == owner.id
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(venue, k, v)
    db.commit()
    db.refresh(venue)
    return venue


@router.delete("/{venue_id}", status_code=204)
def delete_venue(
    venue_id: int,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    venue = db.query(Venue).filter(
        Venue.id == venue_id, Venue.owner_id == owner.id
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    db.delete(venue)
    db.commit()


@router.post("/{venue_id}/upload", response_model=VenueOut)
async def upload_image(
    venue_id: int,
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    if kind not in {"foto", "logo", "yape_qr"}:
        raise HTTPException(status_code=400, detail="kind inválido")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

    venue = db.query(Venue).filter(
        Venue.id == venue_id, Venue.owner_id == owner.id
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande (máx {settings.MAX_UPLOAD_SIZE_MB}MB)")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{kind}_v{venue.id}_{uuid.uuid4().hex}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)

    url = f"/uploads/{filename}"
    if kind == "foto":
        venue.foto_url = url
    elif kind == "logo":
        venue.logo_url = url
    elif kind == "yape_qr":
        venue.yape_qr_url = url
    db.commit()
    db.refresh(venue)
    return venue
