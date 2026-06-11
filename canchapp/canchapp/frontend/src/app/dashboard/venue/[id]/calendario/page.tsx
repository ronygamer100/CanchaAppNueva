'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Venue, Court, WeekReservations, WeekReservationItem, ReservationStatus } from '@/lib/types';

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // 0 = Lunes
  const m = new Date(d);
  m.setDate(d.getDate() - dow);
  m.setHours(0, 0, 0, 0);
  return m;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(d.getDate() + n); return r;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'recién';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} días`;
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

const DOW_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

const statusStyle: Record<ReservationStatus, string> = {
  pendiente: 'bg-yellow-200 border-yellow-700 text-yellow-900',
  confirmada: 'bg-pitch-400 border-ink text-ink',
  rechazada: 'bg-clay/20 border-clay text-clay',
  cancelada: 'bg-ink/20 border-ink/40 text-ink/60',
};

export default function CalendarioPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [activeCourt, setActiveCourt] = useState<number | 'all'>('all');
  const [weekStart, setWeekStart] = useState<Date>(mondayOf(new Date()));
  const [data, setData] = useState<WeekReservations | null>(null);
  const [selected, setSelected] = useState<WeekReservationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar venue + canchas
  useEffect(() => {
    Promise.all([
      apiFetch<Venue>(`/api/venues/${venueId}`, { auth: true }),
      apiFetch<Court[]>(`/api/venues/${venueId}/courts`, { auth: true }),
    ]).then(([v, cs]) => { setVenue(v); setCourts(cs); })
      .catch((e) => setError(e.message));
  }, [venueId]);

  // Cargar reservas de la semana
  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    apiFetch<WeekReservations>(
      `/api/venues/${venueId}/week-reservations?week_start=${isoDate(weekStart)}`,
      { auth: true },
    )
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [venue, venueId, weekStart]);

  // Slots horarios del venue
  const hours = useMemo(() => {
    if (!venue) return [];
    const ini = parseInt(venue.hora_apertura.slice(0, 2));
    const fin = parseInt(venue.hora_cierre.slice(0, 2));
    const arr = [];
    for (let h = ini; h < fin; h++) arr.push(h);
    return arr;
  }, [venue]);

  // Filtrar por cancha
  const items = useMemo(() => {
    if (!data) return [];
    return activeCourt === 'all'
      ? data.items
      : data.items.filter((i) => i.court_id === activeCourt);
  }, [data, activeCourt]);

  // Agrupar items por (día, hora)
  const cellMap = useMemo(() => {
    const m = new Map<string, WeekReservationItem[]>();
    for (const it of items) {
      // calcular qué celdas cubre
      const iniH = timeToMin(it.hora_inicio) / 60;
      const finH = timeToMin(it.hora_fin) / 60;
      const dt = new Date(it.fecha + 'T00:00:00');
      const dow = (dt.getDay() + 6) % 7;
      for (let h = iniH; h < finH; h++) {
        const key = `${dow}_${Math.floor(h)}`;
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(it);
      }
    }
    return m;
  }, [items]);

  function shiftWeek(n: number) {
    setWeekStart((curr) => addDays(curr, n * 7));
  }

  async function reloadWeek() {
    if (!venue) return;
    const updated = await apiFetch<WeekReservations>(
      `/api/venues/${venueId}/week-reservations?week_start=${isoDate(weekStart)}`,
      { auth: true },
    );
    setData(updated);
  }

  async function actOnSelected(action: 'confirm' | 'reject' | 'cancel') {
    if (!selected) return;
    const estado = action === 'confirm' ? 'confirmada' : action === 'reject' ? 'rechazada' : 'cancelada';

    if (action === 'cancel' && !confirm(
      `¿Cancelar la reserva confirmada de ${selected.jugador_nombre}?\n\nSe abrirá WhatsApp para avisarle. El adelanto se devuelve.`
    )) return;

    try {
      await apiFetch(`/api/reservations/${selected.id}`, {
        method: 'PATCH', auth: true, body: { estado },
      });
      const { url } = await apiFetch<{ url: string }>(
        `/api/reservations/${selected.id}/whatsapp-link?action=${action}`,
        { auth: true },
      );
      window.open(url, '_blank');
      setSelected(null);
      await reloadWeek();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <p className="font-mono text-clay text-sm mb-2">ERROR</p>
          <p>{error}</p>
        </div>
      </main>
    );
  }
  if (!venue) {
    return <main className="min-h-screen grid place-items-center"><p className="font-mono text-sm text-ink/50">Cargando…</p></main>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow mb-2">Calendario · {venue.nombre}</p>
        <h1 className="display-lg mb-8">Vista semanal</h1>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWeek(-1)} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-mono">←</button>
            <button onClick={() => setWeekStart(mondayOf(new Date()))} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-medium">Hoy</button>
            <button onClick={() => shiftWeek(1)} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-mono">→</button>
            <span className="ml-3 font-mono text-sm text-ink/70">
              {weekStart.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} —
              {' '}{addDays(weekStart, 6).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {courts.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveCourt('all')}
                className={`px-3 py-1 text-xs font-medium border-2 ${
                  activeCourt === 'all' ? 'bg-ink text-cream border-ink' : 'border-ink/20'
                }`}
              >
                Todas
              </button>
              {courts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCourt(c.id)}
                  className={`px-3 py-1 text-xs font-medium border-2 ${
                    activeCourt === c.id ? 'bg-ink text-cream border-ink' : 'border-ink/20'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-pitch-400 border border-ink" />Confirmada
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-200 border border-yellow-700" />Pendiente
          </span>
        </div>

        {loading && <p className="font-mono text-xs text-ink/50 mb-3">Cargando…</p>}

        {/* Grilla del calendario */}
        <div className="border-2 border-ink overflow-x-auto bg-cream -mx-2 sm:mx-0">
          <p className="sm:hidden text-xs font-mono text-ink/40 px-3 py-2 bg-ink/5 border-b border-ink/10">
            ← Desliza para ver toda la semana
          </p>
          <div className="min-w-[640px]">
            {/* Header de días */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b-2 border-ink bg-ink text-cream">
              <div className="p-2 text-xs font-mono">HORA</div>
              {DOW_LABELS.map((label, i) => {
                const day = addDays(weekStart, i);
                const isToday = isoDate(day) === isoDate(new Date());
                return (
                  <div
                    key={i}
                    className={`p-2 text-center border-l border-cream/20 ${isToday ? 'bg-pitch-400 text-ink' : ''}`}
                  >
                    <div className="text-xs font-mono opacity-70">{label}</div>
                    <div className="text-lg font-display font-semibold leading-none mt-1">
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filas de horas */}
            {hours.map((h) => (
              <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-ink/10">
                <div className="p-2 text-xs font-mono text-ink/60 border-r border-ink/10">
                  {String(h).padStart(2, '0')}:00
                </div>
                {DOW_LABELS.map((_, dayIdx) => {
                  const cellKey = `${dayIdx}_${h}`;
                  const cellItems = cellMap.get(cellKey) || [];
                  return (
                    <div key={dayIdx} className="border-l border-ink/10 min-h-[56px] p-1 space-y-1">
                      {cellItems.map((it) => {
                        const startHour = timeToMin(it.hora_inicio) / 60;
                        // solo renderizar en su slot de inicio para no duplicar
                        if (Math.floor(startHour) !== h) return null;
                        return (
                          <button
                            key={it.id}
                            onClick={() => setSelected(it)}
                            className={`w-full text-left px-2 py-1 border-2 text-xs leading-tight ${statusStyle[it.estado]}`}
                            style={{ minHeight: `${Math.max(1, it.horas) * 52 - 8}px` }}
                            title={`${it.jugador_nombre} · ${it.hora_inicio.slice(0,5)}-${it.hora_fin.slice(0,5)}`}
                          >
                            <div className="font-semibold truncate">{it.jugador_nombre}</div>
                            <div className="font-mono opacity-70 truncate">
                              {it.court_nombre}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 bg-ink/60 z-50 grid place-items-center px-4" onClick={() => setSelected(null)}>
          <div className="card-brut bg-cream max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <p className={`eyebrow mb-3 ${selected.estado === 'pendiente' ? '!text-clay' : '!text-pitch-700'}`}>
              {selected.estado === 'pendiente' ? 'Reserva pendiente' : 'Reserva confirmada'}
            </p>
            <h3 className="display-lg mb-2 leading-none">{selected.jugador_nombre}</h3>
            <p className="font-mono text-sm text-ink/70 mb-1">{selected.jugador_whatsapp}</p>
            <p className="font-mono text-xs text-ink/50 mb-4" title={new Date(selected.created_at).toLocaleString('es-PE')}>
              Reservó {formatRelativeTime(selected.created_at)}
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink/60 text-sm">Cancha</span>
                <span className="font-semibold">{selected.court_nombre}</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink/60 text-sm">Fecha</span>
                <span className="font-mono">
                  {new Date(selected.fecha + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink/60 text-sm">Hora</span>
                <span className="font-mono">{selected.hora_inicio.slice(0,5)} – {selected.hora_fin.slice(0,5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60 text-sm">Duración</span>
                <span className="font-mono">{selected.horas}h</span>
              </div>
            </div>

            {/* Acciones según estado */}
            <div className="flex gap-2 flex-wrap mb-2">
              {selected.estado === 'pendiente' && (
                <>
                  <button onClick={() => actOnSelected('confirm')} className="btn-accent !py-2 !px-3 text-sm">
                    Confirmar
                  </button>
                  <button onClick={() => actOnSelected('reject')} className="text-sm text-ink/60 hover:text-clay border-2 border-ink/20 hover:border-clay px-3 py-2">
                    Rechazar
                  </button>
                </>
              )}
              {selected.estado === 'confirmada' && (
                <button onClick={() => actOnSelected('cancel')} className="text-sm text-clay border-2 border-clay px-3 py-2 hover:bg-clay hover:text-cream transition-colors">
                  Cancelar reserva
                </button>
              )}
              <a
                href={`https://wa.me/${selected.jugador_whatsapp.replace(/[^\d]/g, '')}`}
                target="_blank"
                className="btn-ghost !py-2 !px-3 text-sm"
              >
                WhatsApp ↗
              </a>
              <button onClick={() => setSelected(null)} className="ml-auto text-sm text-ink/50 hover:text-ink px-3 py-2">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
