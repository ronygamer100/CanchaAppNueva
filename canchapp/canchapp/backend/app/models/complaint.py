import secrets
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.core.database import Base


def _complaint_code() -> str:
    return f"FUB-{datetime.utcnow():%Y%m%d}-{secrets.token_hex(4).upper()}"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True, default=_complaint_code)
    venue_slug = Column(String(80), nullable=True, index=True)
    consumer_name = Column(String(160), nullable=False)
    document_type = Column(String(20), nullable=False)
    document_number = Column(String(20), nullable=False)
    address = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(255), nullable=False)
    is_minor = Column(String(5), nullable=False, default="no")
    guardian_name = Column(String(160), nullable=True)
    request_type = Column(String(20), nullable=False)
    service_description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=True)
    detail = Column(Text, nullable=False)
    consumer_request = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pendiente")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
