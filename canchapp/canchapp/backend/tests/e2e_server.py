"""Disposable local browser-test server. Never imported by the production app."""
import os
from pathlib import Path
import sys
from contextlib import asynccontextmanager
from datetime import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy.engine import make_url

url = make_url(os.environ["TEST_DATABASE_URL"])
assert url.host in {"127.0.0.1", "localhost"} and url.database.endswith("_e2e_test")
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
os.environ["SEED_AREQUIPA_CATALOG"] = "false"
os.environ["FRONTEND_URL"] = "http://127.0.0.1:3059"
os.environ["SECRET_KEY"] = "fubito-local-browser-test-secret-32-characters"
os.environ["UPLOAD_DIR"] = str(Path(__file__).resolve().parents[1] / "uploads")
from sqlalchemy import text
from app.main import app, lifespan
from app.core.database import SessionLocal, engine
from app.models.owner import Owner
from app.models.venue import Venue
from app.models.court import Court
from app.services.credential_crypto import encrypt_secret
from app.services.culqi import CulqiChargeResult, CulqiPaymentRejected, CulqiPaymentUncertain
from app.services import reservation_checkout


def fake_charge(**kwargs):
    token = kwargs["token"]
    if "uncertain" in token:
        raise CulqiPaymentUncertain("Simulated provider timeout")
    if "declined" in token:
        raise CulqiPaymentRejected("Simulated decline")
    return CulqiChargeResult(f"chr_test_e2e{kwargs['reservation_id']}", kwargs["amount_cents"], "PEN")


reservation_checkout.create_yape_charge = fake_charge


def reset():
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE payment_events, reservations, blocked_slots, courts, venues, owners, players RESTART IDENTITY CASCADE"))
    with SessionLocal() as db:
        owner = Owner(email="e2e@example.com", nombre_negocio="Local de prueba", whatsapp="+51987654321",
            culqi_public_key="pk_test_fakebrowser", culqi_secret_key_encrypted=encrypt_secret("sk_test_fakebrowser"), culqi_mode="test")
        db.add(owner); db.flush()
        venue = Venue(owner_id=owner.id, slug="e2e-local", nombre="Fubito Cancha de prueba", direccion="Arequipa",
                      hora_apertura=time(8), hora_cierre=time(23), es_referencial=False, reservas_habilitadas=True)
        db.add(venue); db.flush()
        db.add(Court(venue_id=venue.id, nombre="Cancha 1", precio_hora=80, adelanto_monto=80))
        db.commit()


@asynccontextmanager
async def e2e_lifespan(application):
    async with lifespan(application):
        reset()
        yield


app.router.lifespan_context = e2e_lifespan
@app.post("/__test__/reset")
def reset_test():
    reset()
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8019)
