"""Verifica tokens de Google Sign-In (ID tokens JWT).

Cuando el usuario hace login con Google en el frontend, recibimos un
ID token JWT. Este módulo lo verifica contra los keys públicos de Google y
extrae los datos del usuario.
"""
from threading import Lock
from time import monotonic
from typing import Optional, TypedDict

from google.auth.exceptions import TransportError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings


class GoogleUser(TypedDict):
    sub: str          # Google user ID estable
    email: str
    nombre: str
    avatar_url: Optional[str]
    email_verified: bool


class GoogleAuthConfigurationError(RuntimeError):
    """Google Sign-In no tiene la configuración necesaria."""


class GoogleAuthUnavailableError(RuntimeError):
    """Google no pudo ser contactado a tiempo para validar el token."""


_google_request = google_requests.Request()
_certs_cache = None
_certs_cache_expires_at = 0.0
_certs_cache_lock = Lock()
_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs"
_CERTS_CACHE_SECONDS = 3600


def _request_with_timeout(url, method="GET", body=None, headers=None, timeout=None, **kwargs):
    """Reutiliza la conexión y evita que Google bloquee el login por 120 segundos."""
    global _certs_cache, _certs_cache_expires_at
    if url == _CERTS_URL and method == "GET":
        with _certs_cache_lock:
            if _certs_cache is not None and monotonic() < _certs_cache_expires_at:
                return _certs_cache

    effective_timeout = min(timeout or 5, 5)
    response = _google_request(
        url=url,
        method=method,
        body=body,
        headers=headers,
        timeout=effective_timeout,
        **kwargs,
    )
    if url == _CERTS_URL and method == "GET" and getattr(response, "status", 0) == 200:
        with _certs_cache_lock:
            _certs_cache = response
            _certs_cache_expires_at = monotonic() + _CERTS_CACHE_SECONDS
    return response


def verify_google_token(token: str) -> Optional[GoogleUser]:
    """Devuelve los datos del usuario o None si el token es inválido."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
    if not client_id:
        raise GoogleAuthConfigurationError(
            "GOOGLE_CLIENT_ID no está configurado. "
            "Agrégalo a backend/.env"
        )
    try:
        info = id_token.verify_oauth2_token(
            token,
            _request_with_timeout,
            client_id,
        )
    except ValueError:
        return None
    except TransportError as exc:
        raise GoogleAuthUnavailableError(
            "No se pudo contactar a Google para verificar el token"
        ) from exc

    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return None
    if not info.get("email") or not info.get("email_verified", False):
        return None

    return GoogleUser(
        sub=info["sub"],
        email=info["email"],
        nombre=info.get("name") or info["email"].split("@")[0],
        avatar_url=info.get("picture"),
        email_verified=info.get("email_verified", False),
    )
