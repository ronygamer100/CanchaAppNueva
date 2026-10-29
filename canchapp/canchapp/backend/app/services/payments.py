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


def reservation_total(item) -> float:
    if item.quoted_total_cents is not None:
        return item.quoted_total_cents / 100
    return calculate_full_payment_cents(item.court.precio_hora, item.fecha, item.hora_inicio, item.hora_fin) / 100


def reservation_paid(item) -> float:
    # A legacy screenshot and an estimated tariff never count as verified money.
    if item.payment_status in {"pagado", "reembolsado"} and item.payment_amount_cents is not None:
        return max(0, item.payment_amount_cents - (item.payment_refunded_cents or 0)) / 100
    return 0.0
