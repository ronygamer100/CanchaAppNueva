from datetime import date, time
import unittest

from app.services.payments import calculate_full_payment_cents


class FullPaymentCalculationTests(unittest.TestCase):
    def test_charges_every_reserved_hour(self):
        amount = calculate_full_payment_cents(
            80,
            date(2026, 8, 20),
            time(18, 0),
            time(20, 0),
        )

        self.assertEqual(amount, 16000)

    def test_supports_fractional_hours(self):
        amount = calculate_full_payment_cents(
            60,
            date(2026, 8, 20),
            time(18, 0),
            time(19, 30),
        )

        self.assertEqual(amount, 9000)

    def test_rounds_to_the_nearest_cent(self):
        amount = calculate_full_payment_cents(
            55.555,
            date(2026, 8, 20),
            time(18, 0),
            time(19, 0),
        )

        self.assertEqual(amount, 5556)


if __name__ == "__main__":
    unittest.main()
