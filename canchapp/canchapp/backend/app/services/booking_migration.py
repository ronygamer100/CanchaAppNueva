from sqlalchemy import text


def migrate_booking_integrity(engine):
    """Atomic and repeatable. Existing conflicts stop deployment without deleting data."""
    with engine.begin() as conn:
        conn.execute(text("SELECT pg_advisory_xact_lock(783612405)"))
        from app.services.booking_preflight import booking_conflicts
        conflicts = booking_conflicts(conn)
        if any(conflicts.values()):
            raise RuntimeError(f"Corrige los conflictos antes de migrar: {conflicts}. No se eliminó ningún dato.")
        conn.execute(text("ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS refunded_cents INTEGER NOT NULL DEFAULT 0"))
        for column in (
            "request_key VARCHAR(36) UNIQUE", "payment_source_hash VARCHAR(64) UNIQUE",
            "quoted_total_cents INTEGER", "quote_source VARCHAR(30)",
            "hold_expires_at TIMESTAMP", "payment_started_at TIMESTAMP",
            "payment_refunded_cents INTEGER NOT NULL DEFAULT 0", "terms_accepted_at TIMESTAMP",
        ):
            conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS " + column))
        conn.execute(text("""
            UPDATE reservations r SET
                quoted_total_cents = CASE
                    WHEN payment_provider = 'culqi_yape' AND payment_amount_cents IS NOT NULL
                    THEN payment_amount_cents
                    ELSE round((c.precio_hora * EXTRACT(EPOCH FROM (r.hora_fin-r.hora_inicio))/3600 * 100)::numeric)::int END,
                quote_source = CASE WHEN payment_provider = 'culqi_yape' AND payment_amount_cents IS NOT NULL
                    THEN 'payment_record' ELSE 'legacy_estimated' END
            FROM courts c WHERE c.id = r.court_id AND r.quoted_total_cents IS NULL
        """))
        conn.execute(text("""UPDATE reservations SET auto_confirm_at = NULL
                             WHERE auto_confirm_at IS NOT NULL"""))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist"))
        for table, constraint, condition in (
            ("reservations", "reservations_no_overlap", "WHERE (estado IN ('PENDIENTE', 'CONFIRMADA'))"),
            ("blocked_slots", "blocked_slots_no_overlap", ""),
        ):
            exists = conn.execute(text("SELECT 1 FROM pg_constraint WHERE conname=:name"),
                                  {"name": constraint}).scalar()
            if not exists:
                conn.execute(text(f"""ALTER TABLE {table} ADD CONSTRAINT {constraint}
                    EXCLUDE USING gist (court_id WITH =,
                    tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') WITH &&) {condition}"""))
            check = constraint + "_valid_range"
            if not conn.execute(text("SELECT 1 FROM pg_constraint WHERE conname=:name"), {"name": check}).scalar():
                conn.execute(text(f"ALTER TABLE {table} ADD CONSTRAINT {check} CHECK (hora_fin > hora_inicio)"))
        # Cross-table conflicts use the same court lock even when writes bypass the API.
        conn.execute(text("""
          CREATE OR REPLACE FUNCTION guard_booking_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN
            PERFORM id FROM courts WHERE id = NEW.court_id FOR UPDATE;
            IF TG_TABLE_NAME = 'reservations' THEN
              IF NEW.estado::text NOT IN ('PENDIENTE', 'CONFIRMADA') THEN RETURN NEW; END IF;
              IF EXISTS (SELECT 1 FROM blocked_slots b WHERE b.court_id=NEW.court_id AND b.fecha=NEW.fecha
                         AND b.hora_inicio < NEW.hora_fin AND NEW.hora_inicio < b.hora_fin) THEN
                RAISE EXCEPTION 'Horario bloqueado' USING ERRCODE='23P01';
              END IF;
            ELSE
              IF EXISTS (SELECT 1 FROM reservations r WHERE r.court_id=NEW.court_id AND r.fecha=NEW.fecha
                         AND r.estado::text IN ('PENDIENTE','CONFIRMADA')
                         AND r.hora_inicio < NEW.hora_fin AND NEW.hora_inicio < r.hora_fin) THEN
                RAISE EXCEPTION 'Horario reservado' USING ERRCODE='23P01';
              END IF;
            END IF;
            RETURN NEW;
          END $$
        """))
        for table in ("reservations", "blocked_slots"):
            conn.execute(text(f"DROP TRIGGER IF EXISTS guard_booking_overlap ON {table}"))
            conn.execute(text(f"""CREATE TRIGGER guard_booking_overlap BEFORE INSERT OR UPDATE ON {table}
                                FOR EACH ROW EXECUTE FUNCTION guard_booking_overlap()"""))
