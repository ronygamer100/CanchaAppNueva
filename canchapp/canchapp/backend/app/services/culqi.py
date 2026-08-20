from dataclasses import dataclass

import requests


CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"


@dataclass
class CulqiChargeResult:
    charge_id: str
    amount_cents: int
    currency: str
    response_code: str | None = None


class CulqiPaymentRejected(Exception):
    pass


class CulqiPaymentUncertain(Exception):
    pass


def create_yape_charge(
    *,
    secret_key: str,
    token: str,
    amount_cents: int,
    email: str,
    customer_name: str,
    customer_phone: str,
    reservation_id: int,
    venue_name: str,
) -> CulqiChargeResult:
    name_parts = customer_name.strip().split(maxsplit=1)
    payload = {
        "amount": amount_cents,
        "currency_code": "PEN",
        "email": email,
        "source_id": token,
        "description": f"Adelanto de reserva en {venue_name}"[:80],
        "antifraud_details": {
            "country_code": "PE",
            "first_name": name_parts[0],
            "last_name": name_parts[1] if len(name_parts) > 1 else "Cliente",
            "phone_number": customer_phone[-9:],
        },
        "metadata": {
            "fubito_reservation_id": str(reservation_id),
            "venue": venue_name[:80],
        },
    }
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            CULQI_CHARGES_URL,
            json=payload,
            headers=headers,
            timeout=25,
        )
    except requests.Timeout as exc:
        raise CulqiPaymentUncertain(
            "Culqi está demorando en responder. La reserva quedó en verificación; no repitas el pago."
        ) from exc
    except requests.RequestException as exc:
        raise CulqiPaymentUncertain(
            "No pudimos confirmar la respuesta de Culqi. La reserva quedó en verificación; no repitas el pago."
        ) from exc

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code not in (200, 201):
        message = (
            data.get("user_message")
            or data.get("merchant_message")
            or data.get("message")
            or "Yape rechazó el pago. Revisa tus datos e inténtalo nuevamente."
        )
        raise CulqiPaymentRejected(message)

    charge_id = data.get("id")
    if not charge_id:
        raise CulqiPaymentUncertain(
            "Culqi aprobó la solicitud sin devolver una confirmación completa. No repitas el pago."
        )

    return CulqiChargeResult(
        charge_id=charge_id,
        amount_cents=int(data.get("amount") or amount_cents),
        currency=data.get("currency") or data.get("currency_code") or "PEN",
        response_code=data.get("response_code"),
    )
