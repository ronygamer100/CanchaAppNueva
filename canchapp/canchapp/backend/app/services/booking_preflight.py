"""Read-only conflict inspection: python -m app.services.booking_preflight."""
from sqlalchemy import text


def booking_conflicts(conn):
    queries = {
        "reservas_superpuestas": """SELECT count(*) FROM reservations a JOIN reservations b
            ON a.id < b.id AND a.court_id=b.court_id AND a.fecha=b.fecha
            AND a.hora_inicio < b.hora_fin AND b.hora_inicio < a.hora_fin
            WHERE a.estado IN ('PENDIENTE','CONFIRMADA') AND b.estado IN ('PENDIENTE','CONFIRMADA')""",
        "bloqueos_superpuestos": """SELECT count(*) FROM blocked_slots a JOIN blocked_slots b
            ON a.id < b.id AND a.court_id=b.court_id AND a.fecha=b.fecha
            AND a.hora_inicio < b.hora_fin AND b.hora_inicio < a.hora_fin""",
        "reservas_con_bloqueos": """SELECT count(*) FROM reservations r JOIN blocked_slots b
            ON r.court_id=b.court_id AND r.fecha=b.fecha
            AND r.hora_inicio < b.hora_fin AND b.hora_inicio < r.hora_fin
            WHERE r.estado IN ('PENDIENTE','CONFIRMADA')""",
        "rangos_invalidos": """SELECT (SELECT count(*) FROM reservations WHERE hora_fin <= hora_inicio)
                                   + (SELECT count(*) FROM blocked_slots WHERE hora_fin <= hora_inicio)""",
    }
    return {name: conn.execute(text(sql)).scalar_one() for name, sql in queries.items()}


if __name__ == "__main__":
    import json
    from app.core.database import engine
    with engine.connect() as conn:
        conflicts = booking_conflicts(conn)
    print(json.dumps(conflicts, ensure_ascii=False))
    raise SystemExit(1 if any(conflicts.values()) else 0)
