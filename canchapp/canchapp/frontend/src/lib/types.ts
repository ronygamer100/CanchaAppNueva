export type ReservationStatus = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';

export interface Venue {
  id: number;
  slug: string;
  nombre: string;
  direccion: string;
  descripcion?: string | null;
  lat?: number | null;
  lng?: number | null;
  hora_apertura: string;
  hora_cierre: string;
  foto_url?: string | null;
  logo_url?: string | null;
  yape_qr_url?: string | null;
  telefono_publico?: string | null;
  fuente_nombre?: string | null;
  fuente_url?: string | null;
  es_referencial: boolean;
  reservas_habilitadas: boolean;
  distrito?: string | null;
  modo_confirmacion: 'manual' | 'auto';
  auto_confirm_minutes: number;
  amenities: string[];
}

export interface Court {
  id: number;
  venue_id: number;
  nombre: string;
  tipo?: string | null;
  precio_hora: number;
  adelanto_monto: number;
  activa: number;
  amenities: string[];
}

export interface CourtPublicLite {
  id: number;
  nombre: string;
  tipo?: string | null;
  precio_hora: number;
  adelanto_monto: number;
  amenities: string[];
}

export interface Player {
  id: number;
  email: string;
  nombre: string;
  avatar_url?: string | null;
  whatsapp?: string | null;
}

export interface PlayerReservation {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: ReservationStatus;
  cancel_token: string;
  horas: number;
  monto_total: number;
  venue_nombre: string;
  venue_slug: string;
  court_nombre: string;
  court_id: number;
  created_at?: string;
}

export interface VenuePublic extends Venue {
  owner_whatsapp: string;
  owner_nombre_negocio: string;
  culqi_ready: boolean;
  culqi_public_key?: string | null;
  courts: CourtPublicLite[];
}

export interface Slot {
  hora_inicio: string;
  hora_fin: string;
  estado: 'libre' | 'pendiente' | 'ocupado' | 'bloqueado';
}

export interface DayAvailability {
  fecha: string;
  slots: Slot[];
}

export interface Reservation {
  id: number;
  court_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  jugador_nombre: string;
  jugador_whatsapp: string;
  jugador_email?: string | null;
  yape_screenshot_url?: string | null;
  payment_provider?: string | null;
  payment_status?: string | null;
  payment_id?: string | null;
  payment_amount_cents?: number | null;
  payment_currency?: string | null;
  payment_paid_at?: string | null;
  estado: ReservationStatus;
  notas_dueno?: string | null;
  cancel_token?: string | null;
  created_at: string;
}

export interface ReservationCreated {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cancel_token: string;
  cancel_url: string;
  auto_confirm_at?: string | null;
  modo_confirmacion: 'manual' | 'auto';
  payment_status?: string | null;
  payment_amount_cents?: number | null;
}

export interface BlockedSlot {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string | null;
}

export interface ReservationPublic {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  jugador_nombre: string;
  estado: ReservationStatus;
  venue_nombre: string;
  court_nombre: string;
  court_tipo?: string | null;
  direccion: string;
  adelanto_monto: number;
  horas: number;
}

export interface Owner {
  id: number;
  email: string;
  nombre_negocio: string;
  whatsapp: string;
  trial_started_at: string;
  trial_ends_at: string;
  subscription_paid_until?: string | null;
}

export interface OwnerBilling {
  plan_status: 'trial' | 'active' | 'expired';
  trial_started_at: string;
  trial_ends_at: string;
  subscription_paid_until?: string | null;
  days_remaining: number;
  monthly_price_pen: number;
  billing_collection_enabled: boolean;
  culqi_connected: boolean;
  culqi_mode?: 'test' | 'live' | null;
  culqi_public_key_preview?: string | null;
}

// --- Dashboard avanzado ---
export interface WeekReservationItem {
  id: number;
  court_id: number;
  court_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  jugador_nombre: string;
  jugador_whatsapp: string;
  estado: ReservationStatus;
  horas: number;
  created_at: string;
}

export interface WeekReservations {
  week_start: string;
  week_end: string;
  items: WeekReservationItem[];
}

export interface MetricsKPIs {
  ingresos_mes: number;
  reservas_confirmadas: number;
  reservas_canceladas: number;
  reservas_rechazadas: number;
  horario_popular?: string | null;
  cancha_top?: string | null;
  tasa_ocupacion_pct: number;
}

export interface MetricsDailyIngreso {
  fecha: string;
  monto: number;
}

export interface MetricsHourly {
  hora: number;
  reservas: number;
}

export interface Metrics {
  period: 'month' | 'week';
  range_start: string;
  range_end: string;
  kpis: MetricsKPIs;
  ingresos_diarios: MetricsDailyIngreso[];
  ocupacion_horaria: MetricsHourly[];
}
