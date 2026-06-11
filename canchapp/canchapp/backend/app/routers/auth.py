from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_owner
from app.models.owner import Owner
from app.models.player import Player
from app.services.google_auth import verify_google_token
from app.schemas import OwnerRegister, Token, OwnerOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GoogleTokenIn(BaseModel):
    credential: str  # ID token devuelto por Google Sign-In


class GoogleOwnerRegisterIn(BaseModel):
    credential: str
    nombre_negocio: str = Field(min_length=2, max_length=120)
    whatsapp: str = Field(pattern=r"^\+519\d{8}$")


# --------- Registro/Login clásicos del dueño (legacy, sigue funcionando) ---------
@router.post("/register", response_model=Token, status_code=201)
def register(data: OwnerRegister, db: Session = Depends(get_db)):
    existing = db.query(Owner).filter(Owner.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    owner = Owner(
        email=data.email,
        password_hash=hash_password(data.password),
        nombre_negocio=data.nombre_negocio,
        whatsapp=data.whatsapp,
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    token = create_access_token(user_id=owner.id, kind="owner")
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    owner = db.query(Owner).filter(Owner.email == form_data.username).first()
    if not owner or not owner.password_hash or not verify_password(form_data.password, owner.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    token = create_access_token(user_id=owner.id, kind="owner")
    return Token(access_token=token)


@router.get("/me", response_model=OwnerOut)
def me(owner: Owner = Depends(get_current_owner)):
    return owner


# --------- Login con Google (dueño) ---------
@router.post("/google/owner/login", response_model=Token)
def google_owner_login(data: GoogleTokenIn, db: Session = Depends(get_db)):
    """Login del DUEÑO con Google. Solo funciona si el dueño ya tiene cuenta
    creada (vinculada o no a Google). Para registro nuevo, usar /google/owner/register.
    """
    g = verify_google_token(data.credential)
    if not g:
        raise HTTPException(status_code=401, detail="Token de Google inválido")

    # Buscar por google_id o por email
    owner = (
        db.query(Owner)
        .filter((Owner.google_id == g["sub"]) | (Owner.email == g["email"]))
        .first()
    )
    if not owner:
        raise HTTPException(
            status_code=404,
            detail="No existe una cuenta de dueño con este Google. Regístrate primero.",
        )
    # Si nunca había linkeado Google, lo enlazamos ahora
    if not owner.google_id:
        owner.google_id = g["sub"]
    if g.get("avatar_url"):
        owner.avatar_url = g["avatar_url"]
    db.commit()
    token = create_access_token(user_id=owner.id, kind="owner")
    return Token(access_token=token)


@router.post("/google/owner/register", response_model=Token, status_code=201)
def google_owner_register(data: GoogleOwnerRegisterIn, db: Session = Depends(get_db)):
    """Registro de un dueño nuevo usando Google. Requiere también nombre_negocio
    y whatsapp para completar el perfil."""
    g = verify_google_token(data.credential)
    if not g:
        raise HTTPException(status_code=401, detail="Token de Google inválido")

    # Si ya existe, devolver token (login implícito)
    existing = (
        db.query(Owner)
        .filter((Owner.google_id == g["sub"]) | (Owner.email == g["email"]))
        .first()
    )
    if existing:
        if not existing.google_id:
            existing.google_id = g["sub"]
            db.commit()
        token = create_access_token(user_id=existing.id, kind="owner")
        return Token(access_token=token)

    owner = Owner(
        email=g["email"],
        google_id=g["sub"],
        avatar_url=g.get("avatar_url"),
        nombre_negocio=data.nombre_negocio.strip(),
        whatsapp=data.whatsapp.strip(),
        password_hash=None,
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    token = create_access_token(user_id=owner.id, kind="owner")
    return Token(access_token=token)


# --------- Login/registro con Google (jugador) ---------
@router.post("/google/player", response_model=Token)
def google_player_auth(data: GoogleTokenIn, db: Session = Depends(get_db)):
    """Login/registro automático del jugador con Google."""
    g = verify_google_token(data.credential)
    if not g:
        raise HTTPException(status_code=401, detail="Token de Google inválido")

    player = (
        db.query(Player)
        .filter((Player.google_id == g["sub"]) | (Player.email == g["email"]))
        .first()
    )
    if not player:
        player = Player(
            google_id=g["sub"],
            email=g["email"],
            nombre=g["nombre"],
            avatar_url=g.get("avatar_url"),
        )
        db.add(player)
    else:
        if not player.google_id:
            player.google_id = g["sub"]
        if g.get("avatar_url"):
            player.avatar_url = g["avatar_url"]
        player.last_login_at = datetime.utcnow()

    db.commit()
    db.refresh(player)
    token = create_access_token(user_id=player.id, kind="player")
    return Token(access_token=token)
