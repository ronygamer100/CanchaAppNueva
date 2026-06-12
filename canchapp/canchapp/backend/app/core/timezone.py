"""Helpers de zona horaria.

Railway corre en UTC. Arequipa, Perú es UTC-5. Usar estas funciones
en lugar de `date.today()` o `datetime.now()` directamente para que
las validaciones (fecha pasada, disponibilidad hoy, etc.) usen la hora local.
"""
from datetime import date, datetime, timezone, timedelta

# Perú: UTC-5 fijo, sin horario de verano
PERU_TZ = timezone(timedelta(hours=-5))


def now_peru() -> datetime:
    """Hora actual en Perú (UTC-5), como datetime naive."""
    return datetime.now(PERU_TZ).replace(tzinfo=None)


def today_peru() -> date:
    """Fecha actual en Perú."""
    return datetime.now(PERU_TZ).date()
