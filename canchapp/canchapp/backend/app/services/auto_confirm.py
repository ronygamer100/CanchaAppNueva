"""Compatibility entry point: expire unpaid holds; never time-approve a payment."""
from app.services.booking_integrity import expire_holds


def sweep_auto_confirms(db, owner_id=None):
    count = expire_holds(db)
    db.commit()
    return count
