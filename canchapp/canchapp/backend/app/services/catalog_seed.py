from datetime import time

from app.core.database import SessionLocal
from app.data.arequipa_venues import AREQUIPA_VENUES
from app.models.court import Court
from app.models.owner import Owner
from app.models.venue import Venue


CATALOG_OWNER_EMAIL = "catalogo@fubito.local"


def _parse_time(value: str) -> time:
    return time.fromisoformat(value)


def seed_arequipa_catalog() -> None:
    """Create or refresh the public Arequipa directory without duplicating rows."""
    db = SessionLocal()
    try:
        owner = db.query(Owner).filter(Owner.email == CATALOG_OWNER_EMAIL).first()
        if not owner:
            owner = Owner(
                email=CATALOG_OWNER_EMAIL,
                password_hash=None,
                nombre_negocio="Directorio Fubito",
                whatsapp="+51900000000",
            )
            db.add(owner)
            db.flush()

        created = 0
        updated = 0

        for item in AREQUIPA_VENUES:
            venue = db.query(Venue).filter(Venue.slug == item["slug"]).first()
            if venue and venue.owner_id != owner.id:
                print(f"[catalog] slug in use, skipped: {item['slug']}")
                continue

            if not venue:
                venue = Venue(
                    owner_id=owner.id,
                    slug=item["slug"],
                    nombre=item["nombre"],
                    direccion=item["direccion"],
                    hora_apertura=_parse_time(item["hora_apertura"]),
                    hora_cierre=_parse_time(item["hora_cierre"]),
                )
                db.add(venue)
                db.flush()
                created += 1
            else:
                updated += 1

            for field in (
                "nombre",
                "direccion",
                "distrito",
                "descripcion",
                "lat",
                "lng",
                "telefono_publico",
                "foto_url",
                "amenities",
            ):
                setattr(venue, field, item.get(field))

            venue.hora_apertura = _parse_time(item["hora_apertura"])
            venue.hora_cierre = _parse_time(item["hora_cierre"])
            venue.fuente_nombre = "Google Maps y fuentes públicas"
            venue.fuente_url = (
                "https://www.google.com/maps/search/?api=1&query="
                f"{item['lat']},{item['lng']}"
            )
            venue.es_referencial = True
            venue.reservas_habilitadas = False
            venue.modo_confirmacion = "manual"

            for court_data in item["courts"]:
                court = (
                    db.query(Court)
                    .filter(Court.venue_id == venue.id, Court.nombre == court_data["nombre"])
                    .first()
                )
                if not court:
                    court = Court(venue_id=venue.id, nombre=court_data["nombre"])
                    db.add(court)

                court.tipo = court_data["tipo"]
                court.precio_hora = court_data["precio_hora"]
                court.adelanto_monto = court_data["adelanto_monto"]
                court.amenities = court_data["amenities"]
                court.activa = 1

        db.commit()
        print(f"[catalog] Arequipa venues ready: {created} created, {updated} refreshed")
    except Exception as exc:
        db.rollback()
        print(f"[catalog] seed failed: {exc}")
    finally:
        db.close()
