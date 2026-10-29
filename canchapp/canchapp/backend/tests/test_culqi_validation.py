from unittest.mock import Mock, patch
import pytest
from app.services.culqi import create_yape_charge, verified_charge, CulqiPaymentUncertain, CulqiPaymentRejected


def receipt(**changes):
    value = dict(id="chr_test_approved", amount=8000, currency_code="PEN", capture=True,
                 outcome={"type":"venta_exitosa"}, metadata={"fubito_reservation_id":"1"})
    value.update(changes)
    return value


@pytest.mark.parametrize("changes", [dict(amount=1), dict(currency_code="USD"), dict(capture=False),
    dict(outcome={"type":"venta_rechazada"}), dict(id=None), dict(metadata={}), dict(refunded=True),
    dict(amount_refunded=8000), dict(amount=None)])
def test_incomplete_or_mismatched_receipt_is_never_approved(changes):
    with pytest.raises(CulqiPaymentUncertain):
        verified_charge(receipt(**changes), 8000, 1)


@pytest.mark.parametrize("code", [408, 409, 429, 500, 502, 503])
def test_server_failures_are_uncertain_instead_of_declined(code):
    with patch("requests.post", return_value=Mock(status_code=code, json=lambda: {"object":"error"})):
        with pytest.raises(CulqiPaymentUncertain):
            charge()


def charge():
    return create_yape_charge(secret_key="sk_test_mock", token="ype_test_mock", amount_cents=8000,
        email="player@example.com", customer_name="Player Test", customer_phone="+51987654321",
        reservation_id=1, venue_name="Test")


def test_valid_receipt_and_definite_decline():
    with patch("requests.post", return_value=Mock(status_code=201, json=lambda: receipt())):
        assert charge().amount_cents == 8000
    with patch("requests.post", return_value=Mock(status_code=402, json=lambda: {"object":"error"})):
        with pytest.raises(CulqiPaymentRejected):
            charge()
