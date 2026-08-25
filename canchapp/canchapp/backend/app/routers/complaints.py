from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.complaint import Complaint
from app.models.venue import Venue
from app.schemas import ComplaintCreate, ComplaintCreatedOut


router = APIRouter(prefix="/api/public/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintCreatedOut, status_code=status.HTTP_201_CREATED)
def create_complaint(data: ComplaintCreate, db: Session = Depends(get_db)):
    venue_slug = data.venue_slug.strip() if data.venue_slug else None
    if venue_slug and not db.query(Venue.id).filter(Venue.slug == venue_slug).first():
        raise HTTPException(status_code=404, detail="La cancha indicada no existe")

    if data.is_minor and not (data.guardian_name or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Indica el nombre del padre, madre o representante del menor",
        )

    complaint = Complaint(
        venue_slug=venue_slug,
        consumer_name=data.consumer_name.strip(),
        document_type=data.document_type,
        document_number=data.document_number.strip(),
        address=data.address.strip(),
        phone=data.phone.strip(),
        email=str(data.email).lower(),
        is_minor="si" if data.is_minor else "no",
        guardian_name=(data.guardian_name or "").strip() or None,
        request_type=data.request_type,
        service_description=data.service_description.strip(),
        amount=data.amount,
        detail=data.detail.strip(),
        consumer_request=data.consumer_request.strip(),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return ComplaintCreatedOut(code=complaint.code, created_at=complaint.created_at)
