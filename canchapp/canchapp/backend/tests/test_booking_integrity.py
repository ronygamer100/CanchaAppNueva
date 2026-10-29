"""Integration tests against a dedicated local PostgreSQL database, never production.

TEST_DATABASE_URL=postgresql+psycopg2://.../fubito_test pytest tests
All Culqi calls are replaced; these tests cannot debit a real account.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta, datetime, time
from unittest.mock import Mock
from uuid import uuid4
from threading import Barrier, Event

import pytest

TEST_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_URL:
    pytest.skip("Set TEST_DATABASE_URL to a dedicated local PostgreSQL database", allow_module_level=True)
from sqlalchemy.engine import make_url
url = make_url(TEST_URL)
assert url.host in {"127.0.0.1", "localhost"} and url.database.endswith("_test"), "Use a local disposable _test DB"
os.environ["DATABASE_URL"] = TEST_URL
os.environ["SEED_AREQUIPA_CATALOG"] = "false"
os.environ.setdefault("UPLOAD_DIR", "uploads")
os.environ["SECRET_KEY"] = "fubito-local-test-key-with-at-least-32-bytes"

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.main import app
from app.core.database import engine, SessionLocal
from app.core.security import create_access_token
from app.core.timezone import today_peru, now_peru
from app.models.owner import Owner
from app.models.venue import Venue
from app.models.court import Court
from app.models.reservation import Reservation, ReservationStatus
from app.models.payment_event import PaymentEvent
from app.services.credential_crypto import encrypt_secret
from app.services.culqi import CulqiChargeResult, CulqiPaymentUncertain, CulqiPaymentRejected
from app.services import reservation_checkout as checkout


@pytest.fixture()
def setup(monkeypatch):
    # Any unexpected provider call is a test failure, including charge lookup.
    monkeypatch.setattr("requests.post", Mock(side_effect=AssertionError("No external payment calls in tests")))
    monkeypatch.setattr("requests.get", Mock(side_effect=AssertionError("No external payment calls in tests")))
    with TestClient(app) as client:
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE payment_events, reservations, blocked_slots, courts, venues, owners, players RESTART IDENTITY CASCADE"))
        with SessionLocal() as db:
            owner = Owner(email="owner@example.com", nombre_negocio="Test", whatsapp="+51987654321",
                culqi_public_key="pk_test_example", culqi_secret_key_encrypted=encrypt_secret("sk_test_example"), culqi_mode="test")
            db.add(owner); db.flush()
            venue = Venue(owner_id=owner.id, slug="p0-test", nombre="Test", direccion="Arequipa",
                hora_apertura=time(8), hora_cierre=time(23), reservas_habilitadas=True, es_referencial=False)
            db.add(venue); db.flush()
            db.add_all([Court(venue_id=venue.id, nombre="A", precio_hora=80, adelanto_monto=80),
                        Court(venue_id=venue.id, nombre="B", precio_hora=80, adelanto_monto=80)])
            db.commit()
        yield client, {"Authorization": "Bearer " + create_access_token(1)}


def payload(**changes):
    data = dict(fecha=(today_peru()+timedelta(days=2)).isoformat(), hora_inicio="18:00", hora_fin="19:00",
                jugador_nombre="Jugador Test", jugador_whatsapp="+51987654321", jugador_email="player@example.com",
                request_key=str(uuid4()), expected_total_cents=8000, terms_accepted=True)
    data.update(changes)
    return data


def hold(client, data=None, court=1):
    return client.post(f"/api/public/venues/p0-test/courts/{court}/reservations", json=data or payload())


def pay(client, token, source="ype_test_authorization123"):
    return client.post(f"/api/public/reservations/{token}/pay", json={"culqi_token": source})


def approved(**kwargs):
    return CulqiChargeResult(f"chr_test_charge{kwargs['reservation_id']}", kwargs["amount_cents"], "PEN")


def test_hold_is_idempotent_and_does_not_charge(setup):
    client, _ = setup
    data = payload()
    first = hold(client, data)
    assert first.status_code == 201, first.text
    second = hold(client, data)
    assert second.status_code == 201
    assert second.json()["id"] == first.json()["id"]
    assert first.json()["payment_status"] == "reservado"
    assert first.json()["hold_expires_at"].endswith("Z")
    assert hold(client, dict(data, jugador_nombre="Otro jugador")).status_code == 409


def test_parallel_overlapping_holds_only_one_wins(setup):
    client, _ = setup
    barrier = Barrier(10)
    def attempt(_):
        barrier.wait()
        return hold(client).status_code
    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = list(pool.map(attempt, range(10)))
    assert codes.count(201) == 1, codes
    assert codes.count(409) == 9, codes


def test_adjacent_slots_and_overlapping_block(setup):
    client, auth = setup
    assert hold(client).status_code == 201
    assert hold(client, payload(hora_inicio="19:00", hora_fin="20:00")).status_code == 201
    assert client.post("/api/courts/1/blocks", headers=auth,
        json={"fecha": payload()["fecha"], "hora_inicio": "18:00", "hora_fin": "19:00"}).status_code == 409


def test_parallel_block_and_hold_cannot_both_succeed(setup):
    client, auth = setup
    barrier = Barrier(2)
    def attempt(kind):
        barrier.wait()
        if kind:
            return hold(client).status_code
        return client.post("/api/courts/1/blocks", headers=auth,
            json={"fecha": payload()["fecha"], "hora_inicio": "18:00", "hora_fin": "19:00"}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = list(pool.map(attempt, [0, 1]))
    assert sorted(codes) == [201, 409], codes


def test_database_rejects_overlap_even_without_api(setup):
    client, _ = setup
    first = hold(client).json()
    with SessionLocal() as db:
        row = db.get(Reservation, first["id"])
        db.add(Reservation(court_id=row.court_id, fecha=row.fecha, hora_inicio=row.hora_inicio,
                           hora_fin=row.hora_fin, jugador_nombre="Other", jugador_whatsapp="+51987654321"))
        with pytest.raises(IntegrityError):
            db.commit()


def test_expired_hold_releases_and_cannot_charge(setup):
    client, _ = setup
    first = hold(client).json()
    with SessionLocal() as db:
        db.get(Reservation, first["id"]).hold_expires_at = datetime.utcnow()-timedelta(minutes=1)
        db.commit()
    assert pay(client, first["cancel_token"]).status_code == 409
    assert hold(client).status_code == 201


def test_paid_retry_debits_once_and_preserves_price(setup, monkeypatch):
    client, auth = setup
    charge = Mock(side_effect=approved)
    monkeypatch.setattr(checkout, "create_yape_charge", charge)
    first = hold(client).json()
    for _ in range(2):
        result = pay(client, first["cancel_token"])
        assert result.status_code == 200, result.text
        assert result.json()["payment_status"] == "pagado"
    assert charge.call_count == 1
    assert client.patch("/api/courts/1", json={"precio_hora": 200}, headers=auth).status_code == 200
    public = client.get("/api/public/reservations/"+first["cancel_token"]).json()
    assert public["monto_total"] == public["monto_pagado"] == 80
    assert client.patch(f"/api/reservations/{first['id']}", headers=auth, json={"estado":"pendiente"}).status_code == 409


def test_parallel_payment_callbacks_debit_once(setup, monkeypatch):
    client, _ = setup
    started, release = Event(), Event()
    def blocked(**kwargs):
        started.set()
        assert release.wait(8)
        return approved(**kwargs)
    charge = Mock(side_effect=blocked)
    monkeypatch.setattr(checkout, "create_yape_charge", charge)
    first = hold(client).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        future = pool.submit(pay, client, first["cancel_token"])
        assert started.wait(5)
        duplicate = pay(client, first["cancel_token"])
        assert duplicate.status_code == 202, duplicate.text
        release.set()
        assert future.result().json()["payment_status"] == "pagado"
    assert charge.call_count == 1


def test_uncertain_payment_never_retries_or_releases(setup, monkeypatch):
    client, auth = setup
    charge = Mock(side_effect=CulqiPaymentUncertain("timeout"))
    monkeypatch.setattr(checkout, "create_yape_charge", charge)
    first = hold(client).json()
    for _ in range(2):
        result = pay(client, first["cancel_token"])
        assert result.status_code == 202
        assert result.json()["payment_status"] == "verificacion"
    assert charge.call_count == 1
    assert hold(client).status_code == 409
    assert client.post(f"/api/public/reservations/{first['cancel_token']}/cancel").status_code == 409
    for status in ("cancelada", "confirmada", "rechazada"):
        assert client.patch(f"/api/reservations/{first['id']}", headers=auth, json={"estado":status}).status_code == 409
    with SessionLocal() as db:
        assert db.query(PaymentEvent).filter_by(reservation_id=first["id"], status="verificacion").count() == 1


def test_rejected_payment_releases_slot(setup, monkeypatch):
    client, _ = setup
    monkeypatch.setattr(checkout, "create_yape_charge", Mock(side_effect=CulqiPaymentRejected("declined")))
    first = hold(client).json()
    assert pay(client, first["cancel_token"]).json()["estado"] == "rechazada"
    assert hold(client).status_code == 201


def test_source_token_cannot_pay_two_reservations(setup, monkeypatch):
    client, _ = setup
    charge = Mock(side_effect=approved)
    monkeypatch.setattr(checkout, "create_yape_charge", charge)
    first, second = hold(client).json(), hold(client, court=2).json()
    assert pay(client, first["cancel_token"]).status_code == 200
    assert pay(client, second["cancel_token"]).status_code == 409
    assert charge.call_count == 1


def test_cannot_manually_confirm_an_unpaid_hold_or_reactivate_cancellation(setup):
    client, auth = setup
    first = hold(client).json()
    assert client.patch(f"/api/reservations/{first['id']}", headers=auth, json={"estado":"confirmada"}).status_code == 409
    assert client.post(f"/api/public/reservations/{first['cancel_token']}/cancel").status_code == 200
    assert client.patch(f"/api/reservations/{first['id']}", headers=auth, json={"estado":"confirmada"}).status_code == 409
    assert hold(client).status_code == 201


def test_past_time_invalid_duration_and_changed_price(setup):
    client, _ = setup
    assert hold(client, payload(fecha=(today_peru()-timedelta(days=1)).isoformat())).status_code == 409
    assert hold(client, payload(hora_inicio="18:15",hora_fin="19:15")).status_code == 409
    assert hold(client, payload(hora_fin="18:00")).status_code == 422
    assert hold(client, payload(expected_total_cents=10)).status_code == 409
    assert hold(client, payload(terms_accepted=False)).status_code == 400


def test_today_filter_uses_slot_state(setup):
    client, _ = setup
    result = client.get("/api/public/venues?disponible_hoy=true")
    assert result.status_code == 200, result.text
    if now_peru().hour < 22:
        assert len(result.json()) == 1


def test_owner_reconciliation_checks_provider_before_confirmation(setup, monkeypatch):
    client, auth = setup
    monkeypatch.setattr(checkout, "create_yape_charge", Mock(side_effect=CulqiPaymentUncertain("timeout")))
    first = hold(client).json()
    pay(client, first["cancel_token"])
    lookup = Mock(return_value=CulqiChargeResult("chr_test_verified",8000,"PEN"))
    monkeypatch.setattr("app.services.culqi.retrieve_charge", lookup)
    result = client.post(f"/api/reservations/{first['id']}/reconcile", headers=auth,
                         json={"charge_id":"chr_test_verified"})
    assert result.status_code == 200, result.text
    assert result.json()["estado"] == "confirmada"
    assert lookup.call_args.kwargs["reservation_id"] == first["id"]


def test_legacy_receipts_are_private_and_download_requires_owner(setup, tmp_path):
    client, auth = setup
    first = hold(client).json()
    from app.core.config import settings
    from pathlib import Path
    path = Path(settings.UPLOAD_DIR) / "yape_private_test.png"
    path.write_bytes(b"test-image")
    try:
        with SessionLocal() as db:
            db.get(Reservation, first["id"]).yape_screenshot_url = "/uploads/"+path.name
            db.commit()
        assert client.get("/uploads/"+path.name).status_code == 404
        assert client.get(f"/api/reservations/{first['id']}/receipt").status_code == 401
        result = client.get(f"/api/reservations/{first['id']}/receipt", headers=auth)
        assert result.status_code == 200
        assert result.headers["cache-control"] == "private, no-store"
    finally:
        path.unlink()


def test_cancelled_paid_reservation_keeps_cash_and_refunds_update_net_cash(setup, monkeypatch):
    client, auth = setup
    monkeypatch.setattr(checkout, "create_yape_charge", Mock(side_effect=approved))
    first = hold(client).json()
    pay(client, first["cancel_token"])
    assert client.post(f"/api/public/reservations/{first['cancel_token']}/cancel").status_code == 200
    def income():
        result = client.get("/api/venues/1/metrics?period=week&week_start="+payload()["fecha"], headers=auth)
        assert result.status_code == 200, result.text
        return result.json()["kpis"]
    assert income()["ingresos_mes"] == 80
    assert income()["tasa_ocupacion_pct"] == 0
    monkeypatch.setattr("app.services.culqi.retrieve_charge", Mock(
        return_value=CulqiChargeResult("chr_test_charge1", 8000, "PEN", refunded_cents=8000)))
    result = client.post(f"/api/reservations/{first['id']}/reconcile", headers=auth,
        json={"charge_id":"chr_test_charge1"})
    assert result.status_code == 200, result.text
    assert result.json()["payment_status"] == "reembolsado"
    assert income()["ingresos_mes"] == 0
    assert client.get("/api/public/reservations/"+first["cancel_token"]).json()["monto_pagado"] == 0


def test_legacy_auto_confirmation_never_approves_an_unverified_payment(setup):
    client, _ = setup
    first = hold(client).json()
    with SessionLocal() as db:
        row = db.get(Reservation, first["id"])
        row.auto_confirm_at = datetime.utcnow()-timedelta(minutes=1)
        row.payment_status = None
        db.commit()
    result = client.get("/api/public/reservations/"+first["cancel_token"])
    assert result.json()["estado"] == "pendiente"
    assert result.json()["monto_pagado"] == 0


def test_reconciliation_rejects_unrelated_charge(setup, monkeypatch):
    client, auth = setup
    monkeypatch.setattr(checkout, "create_yape_charge", Mock(side_effect=CulqiPaymentUncertain("timeout")))
    first = hold(client).json()
    pay(client, first["cancel_token"])
    monkeypatch.setattr("app.services.culqi.retrieve_charge", Mock(side_effect=CulqiPaymentUncertain("wrong metadata")))
    result = client.post(f"/api/reservations/{first['id']}/reconcile", headers=auth,
                         json={"charge_id":"chr_test_unrelated"})
    assert result.status_code == 409
    assert client.get("/api/public/reservations/"+first["cancel_token"]).json()["estado"] == "pendiente"


def test_migration_preserves_snapshot_and_is_repeatable(setup):
    client, auth = setup
    from app.services.booking_migration import migrate_booking_integrity
    first = hold(client).json()
    migrate_booking_integrity(engine)
    assert client.patch("/api/courts/1", json={"precio_hora": 250}, headers=auth).status_code == 200
    migrate_booking_integrity(engine)
    result = client.get("/api/public/reservations/"+first["cancel_token"]).json()
    assert result["monto_total"] == 80


def test_migration_refuses_existing_overlap_without_deleting_it(setup):
    client, _ = setup
    from app.services.booking_migration import migrate_booking_integrity
    first = hold(client).json()
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE reservations DROP CONSTRAINT reservations_no_overlap"))
        conn.execute(text("""INSERT INTO reservations (court_id, fecha, hora_inicio, hora_fin,
            jugador_nombre, jugador_whatsapp, estado, cancel_token)
            SELECT court_id, fecha, hora_inicio, hora_fin, 'Conflicto', jugador_whatsapp, estado, 'migration-test-conflict'
            FROM reservations WHERE id=:id"""), {"id":first["id"]})
    try:
        with pytest.raises(RuntimeError, match="conflictos"):
            migrate_booking_integrity(engine)
        with SessionLocal() as db:
            assert db.query(Reservation).count() == 2
    finally:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM reservations WHERE cancel_token='migration-test-conflict'"))
        migrate_booking_integrity(engine)
