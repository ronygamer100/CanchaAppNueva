"""Verifica tokens de Google Sign-In (ID tokens JWT).

Cuando el usuario hace login con Google en el frontend, recibimos un
ID token JWT. Este módulo lo verifica contra los keys públicos de Google y
extrae los datos del usuario.
"""
from typing import Optional, TypedDict

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings


class GoogleUser(TypedDict):
    sub: str          # Google user ID estable
    email: str
    nombre: str
    avatar_url: Optional[str]
    email_verified: bool


def verify_google_token(token: str) -> Optional[GoogleUser]:
    """Devuelve los datos del usuario o None si el token es inválido."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
    if not client_id:
        raise RuntimeError(
            "GOOGLE_CLIENT_ID no está configurado. "
            "Agrégalo a backend/.env"
        )
    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id,
        )
    except ValueError:
        return None

    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return None

    return GoogleUser(
        sub=info["sub"],
        email=info["email"],
        nombre=info.get("name") or info["email"].split("@")[0],
        avatar_url=info.get("picture"),
        email_verified=info.get("email_verified", False),
    )
