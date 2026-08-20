from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP


def calculate_full_payment_cents(
    hourly_price: float,
    reservation_date: date,
    start_time: time,
    end_time: time,
) -> int:
    """Calcula el precio total y redondea al centavo de forma determinista."""
    start = datetime.combine(reservation_date, start_time)
    end = datetime.combine(reservation_date, end_time)
    duration_seconds = Decimal(str((end - start).total_seconds()))
    amount = Decimal(str(hourly_price)) * duration_seconds / Decimal("3600")
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
