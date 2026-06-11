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
  yape_screenshot_url?: string | null;
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
