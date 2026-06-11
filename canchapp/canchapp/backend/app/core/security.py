from datetime import datetime, timedelta, timezone
from typing import Optional, Literal

import bcrypt
from jose import jwt, JWTError

from app.core.config import settings

ALGORITHM = "HS256"
BCRYPT_MAX_BYTES = 72

TokenKind = Literal["owner", "player"]


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw_bytes = plain.encode("utf-8")[:BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(
    user_id: int,
    kind: TokenKind = "owner",
    expires_delta: Optional[timedelta] = None,
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": str(user_id), "kind": kind, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Devuelve {'id': int, 'kind': 'owner'|'player'} o None si inválido."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "id": int(payload["sub"]),
            "kind": payload.get("kind", "owner"),
        }
    except (JWTError, ValueError, KeyError):
        return None
