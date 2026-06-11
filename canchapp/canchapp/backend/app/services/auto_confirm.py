"""
Servicio de auto-confirmación de reservas.

Cuando un Venue está en modo "auto", las reservas se crean con un timestamp
`auto_confirm_at` (= created_at + auto_confirm_minutes). Si el dueño no las
toca antes de ese momento, se consideran confirmadas.

En lugar de un cron job, usamos un "sweep" perezoso: cada vez que se
consulta algo importante (lista de pendientes, disponibilidad, etc.) se
ejecuta esta función para actualizar las que ya pasaron.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.reservation import Reservation, ReservationStatus


def sweep_auto_confirms(db: Session, owner_id: Optional[int] = None) -> int:
    """
    Marca como CONFIRMADAS todas las reservas que están PENDIENTES y
    cuyo auto_confirm_at ya pasó.

    Si se pasa owner_id, solo procesa las del dueño (más rápido).
    Devuelve el número de reservas actualizadas.
    """
    from app.models.venue import Venue
    from app.models.court import Court

    now = datetime.utcnow()
    q = db.query(Reservation).filter(
        Reservation.estado == ReservationStatus.PENDIENTE,
        Reservation.auto_confirm_at.isnot(None),
        Reservation.auto_confirm_at <= now,
    )
    if owner_id is not None:
        q = q.join(Court, Reservation.court_id == Court.id) \
             .join(Venue, Court.venue_id == Venue.id) \
             .filter(Venue.owner_id == owner_id)

    vencidas = q.all()
    for r in vencidas:
        r.estado = ReservationStatus.CONFIRMADA
        # Nota interna para distinguir auto vs manual al revisar historial
        if not r.notas_dueno:
            r.notas_dueno = "Auto-confirmada por inactividad"

    if vencidas:
        db.commit()
    return len(vencidas)
