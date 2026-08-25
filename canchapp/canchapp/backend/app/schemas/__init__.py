from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field

from app.models.reservation import ReservationStatus


# ---------- Auth / Owner ----------
class OwnerRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    nombre_negocio: str = Field(min_length=2, max_length=120)
    whatsapp: str = Field(pattern=r"^\+519\d{8}$")


class OwnerLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OwnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    nombre_negocio: str
    whatsapp: str
    trial_started_at: datetime
    trial_ends_at: datetime
    subscription_paid_until: Optional[datetime] = None


class OwnerBillingOut(BaseModel):
    plan_status: str
    trial_started_at: datetime
    trial_ends_at: datetime
    subscription_paid_until: Optional[datetime] = None
    days_remaining: int
    monthly_price_pen: int
    billing_collection_enabled: bool
    culqi_connected: bool
    culqi_mode: Optional[str] = None
    culqi_public_key_preview: Optional[str] = None


class CulqiConnectionIn(BaseModel):
    public_key: str = Field(min_length=16, max_length=255)
    secret_key: str = Field(min_length=16, max_length=255)


# ---------- Venue (Negocio) ----------
class VenueBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    direccion: str = Field(min_length=2, max_length=255)
    descripcion: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    hora_apertura: time
    hora_cierre: time
    distrito: Optional[str] = Field(default=None, max_length=60)
    modo_confirmacion: str = Field(default="manual", pattern="^(manual|auto)$")
    auto_confirm_minutes: int = Field(default=120, ge=15, le=1440)
    amenities: List[str] = Field(default_factory=list)


class VenueCreate(VenueBase):
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")


class VenueUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    descripcion: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    hora_apertura: Optional[time] = None
    hora_cierre: Optional[time] = None
    foto_url: Optional[str] = None
    logo_url: Optional[str] = None
    yape_qr_url: Optional[str] = None
    distrito: Optional[str] = Field(default=None, max_length=60)
    modo_confirmacion: Optional[str] = Field(default=None, pattern="^(manual|auto)$")
    auto_confirm_minutes: Optional[int] = Field(default=None, ge=15, le=1440)
    amenities: Optional[List[str]] = None


class VenueOut(VenueBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    foto_url: Optional[str] = None
    logo_url: Optional[str] = None
    yape_qr_url: Optional[str] = None
    telefono_publico: Optional[str] = None
    fuente_nombre: Optional[str] = None
    fuente_url: Optional[str] = None
    es_referencial: bool = False
    reservas_habilitadas: bool = True


# ---------- Court (Cancha dentro de un Venue) ----------
class CourtBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    tipo: Optional[str] = Field(default=None, max_length=60)
    precio_hora: float = Field(gt=0)
    amenities: List[str] = Field(default_factory=list)


class CourtCreate(CourtBase):
    # Compatibilidad temporal con clientes anteriores. El servidor siempre cobra
    # y guarda el precio completo por hora.
    adelanto_monto: Optional[float] = Field(default=None, ge=0)


class CourtUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    precio_hora: Optional[float] = Field(default=None, gt=0)
    adelanto_monto: Optional[float] = Field(default=None, ge=0)
    activa: Optional[int] = None
    amenities: Optional[List[str]] = None


class CourtOut(CourtBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    venue_id: int
    activa: int
    adelanto_monto: float


# ---------- Vista pública combinada ----------
class CourtPublicLite(BaseModel):
    """Datos de cancha para mostrar en la página pública del venue."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    tipo: Optional[str] = None
    precio_hora: float
    adelanto_monto: float
    amenities: List[str] = Field(default_factory=list)


class VenuePublicOut(VenueOut):
    """Datos del negocio + sus canchas activas + contacto del dueño."""
    owner_whatsapp: str
    owner_nombre_negocio: str
    culqi_ready: bool = False
    culqi_public_key: Optional[str] = None
    payment_mode: str = "full"
    courts: List[CourtPublicLite]


# ---------- Reservation ----------
class ReservationCreate(BaseModel):
    fecha: date
    hora_inicio: time
    hora_fin: time
    jugador_nombre: str = Field(min_length=2, max_length=120)
    jugador_whatsapp: str = Field(pattern=r"^\+519\d{8}$")


class ReservationPaymentCreate(ReservationCreate):
    jugador_email: EmailStr
    culqi_token: Optional[str] = Field(default=None, min_length=16, max_length=255)


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    court_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    jugador_nombre: str
    jugador_whatsapp: str
    jugador_email: Optional[EmailStr] = None
    yape_screenshot_url: Optional[str] = None
    payment_provider: Optional[str] = None
    payment_status: Optional[str] = None
    payment_id: Optional[str] = None
    payment_amount_cents: Optional[int] = None
    payment_currency: Optional[str] = None
    payment_paid_at: Optional[datetime] = None
    estado: ReservationStatus
    notas_dueno: Optional[str] = None
    cancel_token: Optional[str] = None
    created_at: datetime


class ReservationCreatedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    cancel_token: str
    cancel_url: str
    auto_confirm_at: Optional[datetime] = None
    modo_confirmacion: str  # "manual" | "auto"
    payment_status: Optional[str] = None
    payment_amount_cents: Optional[int] = None


class ReservationPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    jugador_nombre: str
    estado: ReservationStatus
    venue_nombre: str
    court_nombre: str
    court_tipo: Optional[str] = None
    direccion: str
    monto_total: float
    monto_pagado: float
    payment_status: Optional[str] = None

    # Compatibilidad con versiones anteriores del frontend.
    adelanto_monto: float
    horas: int


class PendingCountOut(BaseModel):
    total: int


class ReservationStatusUpdate(BaseModel):
    estado: ReservationStatus
    notas_dueno: Optional[str] = None


# ---------- Slots / disponibilidad ----------
class SlotInfo(BaseModel):
    hora_inicio: time
    hora_fin: time
    estado: str


class DayAvailability(BaseModel):
    fecha: date
    slots: List[SlotInfo]


# ---------- Libro de Reclamaciones ----------
class ComplaintCreate(BaseModel):
    venue_slug: Optional[str] = Field(default=None, max_length=80)
    consumer_name: str = Field(min_length=3, max_length=160)
    document_type: str = Field(pattern="^(DNI|CE|Pasaporte)$")
    document_number: str = Field(min_length=6, max_length=20)
    address: str = Field(min_length=4, max_length=255)
    phone: str = Field(min_length=7, max_length=30)
    email: EmailStr
    is_minor: bool = False
    guardian_name: Optional[str] = Field(default=None, max_length=160)
    request_type: str = Field(pattern="^(reclamo|queja)$")
    service_description: str = Field(min_length=4, max_length=255)
    amount: Optional[float] = Field(default=None, ge=0)
    detail: str = Field(min_length=10, max_length=3000)
    consumer_request: str = Field(min_length=4, max_length=1500)


class ComplaintCreatedOut(BaseModel):
    code: str
    created_at: datetime
    response_deadline_days: int = 30


# ---------- BlockedSlot ----------
class BlockedSlotCreate(BaseModel):
    fecha: date
    hora_inicio: time
    hora_fin: time
    motivo: Optional[str] = None


class BlockedSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    motivo: Optional[str] = None
