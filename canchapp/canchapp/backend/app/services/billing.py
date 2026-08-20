from datetime import datetime
from math import ceil

from app.models.owner import Owner


TRIAL_DAYS = 30
MONTHLY_PRICE_PEN = 50


def owner_plan_summary(owner: Owner, now: datetime | None = None) -> dict:
    current = now or datetime.utcnow()

    if owner.subscription_paid_until and owner.subscription_paid_until > current:
        status = "active"
        access_until = owner.subscription_paid_until
    elif owner.trial_ends_at and owner.trial_ends_at > current:
        status = "trial"
        access_until = owner.trial_ends_at
    else:
        status = "expired"
        access_until = owner.subscription_paid_until or owner.trial_ends_at

    seconds_remaining = max(
        0,
        (access_until - current).total_seconds() if access_until else 0,
    )

    return {
        "plan_status": status,
        "trial_started_at": owner.trial_started_at,
        "trial_ends_at": owner.trial_ends_at,
        "subscription_paid_until": owner.subscription_paid_until,
        "days_remaining": ceil(seconds_remaining / 86400),
        "monthly_price_pen": MONTHLY_PRICE_PEN,
        "billing_collection_enabled": False,
        "culqi_connected": bool(
            owner.culqi_public_key and owner.culqi_secret_key_encrypted
        ),
        "culqi_mode": owner.culqi_mode,
        "culqi_public_key_preview": _mask_key(owner.culqi_public_key),
    }


def _mask_key(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 12:
        return "*" * len(value)
    return f"{value[:8]}...{value[-4:]}"
