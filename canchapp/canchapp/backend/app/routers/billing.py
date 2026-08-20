import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_owner
from app.models.owner import Owner
from app.schemas import CulqiConnectionIn, OwnerBillingOut
from app.services.billing import owner_plan_summary
from app.services.credential_crypto import encrypt_secret


router = APIRouter(prefix="/api/billing", tags=["billing"])

PUBLIC_KEY_RE = re.compile(r"^pk_(test|live)_[A-Za-z0-9]+$")
SECRET_KEY_RE = re.compile(r"^sk_(test|live)_[A-Za-z0-9]+$")


@router.get("", response_model=OwnerBillingOut)
def get_billing(owner: Owner = Depends(get_current_owner)):
    return owner_plan_summary(owner)


@router.post("/culqi", response_model=OwnerBillingOut)
def connect_culqi(
    data: CulqiConnectionIn,
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    public_key = data.public_key.strip()
    secret_key = data.secret_key.strip()
    public_match = PUBLIC_KEY_RE.fullmatch(public_key)
    secret_match = SECRET_KEY_RE.fullmatch(secret_key)

    if not public_match or not secret_match:
        raise HTTPException(
            status_code=400,
            detail="Las llaves no tienen el formato de Culqi. Revisa API Keys en CulqiPanel.",
        )
    if public_match.group(1) != secret_match.group(1):
        raise HTTPException(
            status_code=400,
            detail="La llave pública y la privada deben ser ambas de prueba o ambas de producción.",
        )

    owner.culqi_public_key = public_key
    owner.culqi_secret_key_encrypted = encrypt_secret(secret_key)
    owner.culqi_mode = public_match.group(1)
    db.commit()
    db.refresh(owner)
    return owner_plan_summary(owner)


@router.delete("/culqi", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_culqi(
    db: Session = Depends(get_db),
    owner: Owner = Depends(get_current_owner),
):
    owner.culqi_public_key = None
    owner.culqi_secret_key_encrypted = None
    owner.culqi_mode = None
    db.commit()
