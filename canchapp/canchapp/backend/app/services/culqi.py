from dataclasses import dataclass

import requests


CULQI_CHARGES_URL = "https://api.culqi.com/v2/charges"


@dataclass
class CulqiChargeResult:
    charge_id: str
    amount_cents: int
    currency: str
    response_code: str | None = None
    refunded_cents: int = 0


class CulqiPaymentRejected(Exception):
    pass


class CulqiPaymentUncertain(Exception):
    pass


def verified_charge(data: dict, amount_cents: int, reservation_id: int | None = None, *, allow_refunds=False) -> CulqiChargeResult:
    """Fail closed: an HTTP 201 or an id alone does not prove the expected payment."""
    if not isinstance(data, dict):
        raise CulqiPaymentUncertain("Respuesta incompleta de Culqi. No repitas el pago.")
    outcome = data.get("outcome") or {}
    try:
        correct_amount = int(data.get("amount", -1)) == amount_cents
    except (TypeError, ValueError):
        correct_amount = False
    try:
        refunded = int(data.get("amount_refunded") or 0)
    except (TypeError, ValueError) as exc:
        raise CulqiPaymentUncertain("Importe de devolución inválido en Culqi.") from exc
    if (not str(data.get("id", "")).startswith("chr_") or not correct_amount
            or (data.get("currency_code") or data.get("currency")) != "PEN"
            or data.get("capture") is not True
            or not isinstance(outcome, dict) or outcome.get("type") != "venta_exitosa"
            or refunded < 0 or refunded > amount_cents
            or (data.get("refunded") is True and refunded == 0)
            or (not allow_refunds and refunded > 0)):
        raise CulqiPaymentUncertain("El pago necesita verificación en Culqi. No repitas el pago.")
    if reservation_id is not None and str((data.get("metadata") or {}).get("fubito_reservation_id")) != str(reservation_id):
        raise CulqiPaymentUncertain("El cargo de Culqi no corresponde a esta reserva.")
    return CulqiChargeResult(data["id"], amount_cents, "PEN", data.get("response_code"), refunded)


def retrieve_charge(*, secret_key: str, charge_id: str, amount_cents: int, reservation_id: int):
    try:
        response = requests.get(f"{CULQI_CHARGES_URL}/{charge_id}",
                                headers={"Authorization": f"Bearer {secret_key}"}, timeout=25)
        if response.status_code != 200:
            raise CulqiPaymentUncertain("No se pudo verificar el cargo en Culqi.")
        data = response.json()
        if not isinstance(data, dict) or data.get("id") != charge_id:
            raise CulqiPaymentUncertain("El cargo devuelto no coincide con el solicitado.")
        return verified_charge(data, amount_cents, reservation_id, allow_refunds=True)
    except (requests.RequestException, ValueError) as exc:
        raise CulqiPaymentUncertain("Culqi no respondió. La reserva sigue en verificación.") from exc


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
        "capture": True,
        "description": f"Pago total de reserva en {venue_name}"[:80],
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

    if response.status_code >= 500 or response.status_code in (408, 409, 429):
        raise CulqiPaymentUncertain("Culqi no confirmó el resultado. No repitas el pago.")
    if response.status_code not in (200, 201):
        if not isinstance(data, dict) or data.get("object") != "error":
            raise CulqiPaymentUncertain("Respuesta incompleta de Culqi. No repitas el pago.")
        message = (
            data.get("user_message")
            or data.get("merchant_message")
            or data.get("message")
            or "Yape rechazó el pago. Revisa tus datos e inténtalo nuevamente."
        )
        raise CulqiPaymentRejected(message)

    return verified_charge(data, amount_cents, reservation_id)
