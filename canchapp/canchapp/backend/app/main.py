from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, inspect
import os
import uuid
import sys

from app.core.config import settings
from app.core.database import Base, engine
from app.models import Owner, Venue, Court, Reservation, BlockedSlot  # noqa: F401
from app.models.player import Player  # noqa: F401
from app.routers import auth, venues, courts, reservations, public, dashboard, player


def _check_and_migrate():
    """
    - Detecta si la BD tiene estructura v1 (courts con columna 'slug').
      Si sí: aborta con mensaje claro.
    - Idempotente: añade cancel_token en reservations si falta.
    """
    insp = inspect(engine)
    if insp.has_table("courts"):
        cols = {c["name"] for c in insp.get_columns("courts")}
        if "slug" in cols and "venue_id" not in cols:
            print("\n" + "=" * 70)
            print("⚠  BASE DE DATOS CON ESTRUCTURA ANTIGUA (v1) DETECTADA")
            print("=" * 70)
            print("Esta versión 0.2 introduce Venues (negocios) que contienen")
            print("varias canchas. La estructura de la BD cambió y los datos")
            print("de prueba anteriores ya no son compatibles.")
            print()
            print("Para arrancar limpio (perderás datos de prueba):")
            print("  docker compose down -v")
            print("  docker compose up -d")
            print()
            print("Luego vuelve a registrar tu cuenta y crear el negocio.")
            print("=" * 70 + "\n")
            sys.exit(1)

    # Crear tablas nuevas
    Base.metadata.create_all(bind=engine)

    # cancel_token en reservations (idempotente)
    with engine.begin() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE reservations "
                "ADD COLUMN IF NOT EXISTS cancel_token VARCHAR(64) UNIQUE"
            ))
            rows = conn.execute(text(
                "SELECT id FROM reservations WHERE cancel_token IS NULL"
            )).fetchall()
            for row in rows:
                conn.execute(
                    text("UPDATE reservations SET cancel_token = :t WHERE id = :id"),
                    {"t": uuid.uuid4().hex, "id": row[0]},
                )
        except Exception as e:
            print(f"[migrate] cancel_token: {e}")

        # Columnas nuevas para auto-confirmación en venues (idempotente)
        try:
            conn.execute(text(
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS "
                "modo_confirmacion VARCHAR(20) NOT NULL DEFAULT 'manual'"
            ))
            conn.execute(text(
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS "
                "auto_confirm_minutes INTEGER NOT NULL DEFAULT 120"
            ))
        except Exception as e:
            print(f"[migrate] venue auto-confirm: {e}")

        # Columna auto_confirm_at en reservations (idempotente)
        try:
            conn.execute(text(
                "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS "
                "auto_confirm_at TIMESTAMP NULL"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_reservations_auto_confirm_at "
                "ON reservations(auto_confirm_at)"
            ))
        except Exception as e:
            print(f"[migrate] reservations auto_confirm_at: {e}")

        # Columna amenities en venues (idempotente)
        try:
            conn.execute(text(
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS "
                "amenities JSONB NOT NULL DEFAULT '[]'::jsonb"
            ))
        except Exception as e:
            print(f"[migrate] venues amenities: {e}")

        # Columna distrito en venues (idempotente)
        try:
            conn.execute(text(
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS "
                "distrito VARCHAR(60)"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_venues_distrito "
                "ON venues(distrito)"
            ))
        except Exception as e:
            print(f"[migrate] venues distrito: {e}")

        # Columna amenities en courts (idempotente)
        try:
            conn.execute(text(
                "ALTER TABLE courts ADD COLUMN IF NOT EXISTS "
                "amenities JSONB NOT NULL DEFAULT '[]'::jsonb"
            ))
        except Exception as e:
            print(f"[migrate] courts amenities: {e}")

        # google_id + avatar_url en owners; password_hash pasa a nullable
        try:
            conn.execute(text(
                "ALTER TABLE owners ADD COLUMN IF NOT EXISTS "
                "google_id VARCHAR(80) UNIQUE"
            ))
            conn.execute(text(
                "ALTER TABLE owners ADD COLUMN IF NOT EXISTS "
                "avatar_url VARCHAR(500)"
            ))
            conn.execute(text(
                "ALTER TABLE owners ALTER COLUMN password_hash DROP NOT NULL"
            ))
        except Exception as e:
            print(f"[migrate] owners google: {e}")

        # player_id en reservations
        try:
            conn.execute(text(
                "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS "
                "player_id INTEGER REFERENCES players(id) ON DELETE SET NULL"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_reservations_player_id "
                "ON reservations(player_id)"
            ))
        except Exception as e:
            print(f"[migrate] reservations player_id: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_and_migrate()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="CanchApp API",
    description="API para reserva de canchas sintéticas",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(venues.router)
app.include_router(courts.router)
app.include_router(reservations.router)
app.include_router(public.router)
app.include_router(dashboard.router)
app.include_router(player.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "CanchApp API", "version": "0.2.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
