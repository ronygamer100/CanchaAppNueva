from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.owner import Owner
from app.models.player import Player

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)
oauth2_scheme_opt = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _decode_or_401(token: str) -> dict:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def get_current_owner(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Owner:
    payload = _decode_or_401(token)
    if payload.get("kind") != "owner":
        raise HTTPException(status_code=403, detail="Esta acción es solo para dueños")
    owner = db.query(Owner).filter(Owner.id == payload["id"]).first()
    if not owner:
        raise HTTPException(status_code=401, detail="Dueño no encontrado")
    return owner


def get_current_player(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Player:
    payload = _decode_or_401(token)
    if payload.get("kind") != "player":
        raise HTTPException(status_code=403, detail="Esta acción es solo para jugadores")
    player = db.query(Player).filter(Player.id == payload["id"]).first()
    if not player:
        raise HTTPException(status_code=401, detail="Jugador no encontrado")
    return player


def get_optional_player(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[Player]:
    """Para endpoints públicos que opcionalmente vinculan a un jugador logueado."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    token = auth.split(None, 1)[1].strip()
    payload = decode_token(token)
    if not payload or payload.get("kind") != "player":
        return None
    return db.query(Player).filter(Player.id == payload["id"]).first()
