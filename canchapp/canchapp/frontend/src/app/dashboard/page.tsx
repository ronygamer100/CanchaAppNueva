'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, clearToken, getToken, API_URL } from '@/lib/api';
import type { Venue, Court, Owner, Reservation, ReservationStatus } from '@/lib/types';

function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
}

const statusStyle: Record<ReservationStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-900 border-yellow-700/40',
  confirmada: 'bg-pitch-100 text-pitch-900 border-pitch-700/40',
  rechazada: 'bg-clay/15 text-clay border-clay/40',
  cancelada: 'bg-ink/10 text-ink/60 border-ink/30',
};

const POLLING_MS = 30000;

export default function DashboardPage() {
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [activeVenue, setActiveVenue] = useState<Venue | null>(null);
  const [courtsByVenue, setCourtsByVenue] = useState<Record<number, Court[]>>({});
  const [activeCourt, setActiveCourt] = useState<Court | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'pendiente' | 'confirmada' | 'rechazada' | 'cancelada' | 'all'>('pendiente');
  const [loading, setLoading] = useState(true);

  const [pendingCount, setPendingCount] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxItems, setInboxItems] = useState<Reservation[]>([]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ total: number }>('/api/reservations/pending-count', { auth: true });
      setPendingCount(data.total);
    } catch {/* */}
  }, []);

  const fetchInbox = useCallback(async () => {
    try {
      const data = await apiFetch<Reservation[]>('/api/reservations/pending', { auth: true });
      setInboxItems(data);
    } catch {/* */}
  }, []);

  // Carga inicial
  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    (async () => {
      try {
        const o = await apiFetch<Owner>('/api/auth/me', { auth: true });
        setOwner(o);
        const vs = await apiFetch<Venue[]>('/api/venues', { auth: true });
        setVenues(vs);
        if (vs.length > 0) {
          setActiveVenue(vs[0]);
          // Cargar canchas de cada venue
          const all: Record<number, Court[]> = {};
          for (const v of vs) {
            try {
              all[v.id] = await apiFetch<Court[]>(`/api/venues/${v.id}/courts`, { auth: true });
            } catch { all[v.id] = []; }
          }
          setCourtsByVenue(all);
          if (all[vs[0].id]?.length > 0) setActiveCourt(all[vs[0].id][0]);
        }
      } catch {
        clearToken(); router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!owner) return;
    fetchPendingCount();
    const id = setInterval(fetchPendingCount, POLLING_MS);
    return () => clearInterval(id);
  }, [owner, fetchPendingCount]);

  useEffect(() => {
    if (inboxOpen) fetchInbox();
  }, [inboxOpen, fetchInbox]);

  // Cuando cambia venue activo, picar primera cancha
  useEffect(() => {
    if (!activeVenue) { setActiveCourt(null); return; }
    const list = courtsByVenue[activeVenue.id] || [];
    setActiveCourt(list[0] || null);
  }, [activeVenue, courtsByVenue]);

  // Cargar reservas de la cancha activa
  useEffect(() => {
    if (!activeCourt) { setReservations([]); return; }
    const q = filter === 'all' ? '' : `?estado=${filter}`;
    apiFetch<Reservation[]>(`/api/courts/${activeCourt.id}/reservations${q}`, { auth: true })
      .then(setReservations)
      .catch(() => setReservations([]));
  }, [activeCourt, filter]);

  async function actOn(reservation: Reservation, action: 'confirm' | 'reject') {
    const estado = action === 'confirm' ? 'confirmada' : 'rechazada';
    try {
      await apiFetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH', auth: true, body: { estado },
      });
      const { url } = await apiFetch<{ url: string }>(
        `/api/reservations/${reservation.id}/whatsapp-link?action=${action}`,
        { auth: true },
      );
      window.open(url, '_blank');
      // refresh
      if (activeCourt) {
        const q = filter === 'all' ? '' : `?estado=${filter}`;
        const updated = await apiFetch<Reservation[]>(
          `/api/courts/${activeCourt.id}/reservations${q}`, { auth: true },
        );
        setReservations(updated);
      }
      fetchPendingCount();
      if (inboxOpen) fetchInbox();
    } catch (err) { alert((err as Error).message); }
  }

  async function cancelConfirmed(reservation: Reservation) {
    if (!confirm(
      `¿Cancelar la reserva confirmada de ${reservation.jugador_nombre}?\n\n` +
      `Se abrirá WhatsApp para que le avises. El adelanto se devuelve.`
    )) return;
    try {
      await apiFetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH', auth: true, body: { estado: 'cancelada' },
      });
      const { url } = await apiFetch<{ url: string }>(
        `/api/reservations/${reservation.id}/whatsapp-link?action=cancel`,
        { auth: true },
      );
      window.open(url, '_blank');
      if (activeCourt) {
        const q = filter === 'all' ? '' : `?estado=${filter}`;
        const updated = await apiFetch<Reservation[]>(
          `/api/courts/${activeCourt.id}/reservations${q}`, { auth: true },
        );
        setReservations(updated);
      }
    } catch (err) { alert((err as Error).message); }
  }

  // Map para mostrar nombre del venue+cancha en inbox
  const courtMap = new Map<number, { court: Court; venue: Venue }>();
  for (const v of venues) {
    for (const c of (courtsByVenue[v.id] || [])) {
      courtMap.set(c.id, { court: c, venue: v });
    }
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center font-mono text-ink/50">Cargando…</main>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10 bg-cream sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-pitch-900 grid place-items-center">
              <div className="w-3 h-3 bg-pitch-400 rounded-full" />
            </div>
            <div>
              <p className="font-display font-semibold leading-none tracking-tightest">{owner?.nombre_negocio}</p>
              <p className="font-mono text-xs text-ink/50 mt-0.5">{owner?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInboxOpen((v) => !v)}
              className="relative px-3 py-2 border-2 border-ink/20 hover:border-ink font-medium text-sm"
            >
              <span className="mr-1">🔔</span> Pendientes
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-clay text-cream font-mono text-xs px-1.5 py-0.5 border-2 border-ink min-w-[24px] text-center">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
            <Link href="/dashboard/venue/nuevo" className="btn-ghost !py-2 !px-3 text-sm">
              + Nuevo negocio
            </Link>
            <button
              onClick={() => { clearToken(); router.push('/'); }}
              className="text-sm text-ink/60 hover:text-ink px-3 py-2"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {venues.length === 0 ? (
          <div className="card-brut bg-pitch-400 max-w-2xl mx-auto text-center py-12">
            <p className="eyebrow mb-3">¡Bienvenido!</p>
            <h2 className="display-lg mb-4">Registra tu negocio</h2>
            <p className="text-ink/80 mb-6">
              Datos del local primero (nombre, dirección, horario). Después agregas
              las canchas (F7, F11, sala, las que tengas).
            </p>
            <Link href="/dashboard/venue/nuevo" className="btn-primary">
              Crear negocio
            </Link>
          </div>
        ) : (
          <>
            {/* Selector de venue (si hay varios) */}
            {venues.length > 1 && (
              <div className="mb-8">
                <p className="eyebrow mb-3">Mis negocios</p>
                <div className="flex flex-wrap gap-2">
                  {venues.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setActiveVenue(v)}
                      className={`px-4 py-2 border-2 font-medium ${
                        activeVenue?.id === v.id
                          ? 'bg-ink text-cream border-ink'
                          : 'border-ink/20 hover:border-ink'
                      }`}
                    >
                      {v.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeVenue && (
              <>
                {/* Header del venue activo */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="eyebrow mb-1">Negocio</p>
                    <h2 className="font-display text-3xl tracking-tightest">{activeVenue.nombre}</h2>
                    <p className="text-sm text-ink/60 mt-1">{activeVenue.direccion}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <a
                      href={`/c/${activeVenue.slug}`}
                      target="_blank"
                      className="font-mono text-xs bg-pitch-400 border-2 border-ink px-3 py-2 hover:-translate-y-0.5 transition-transform"
                    >
                      /c/{activeVenue.slug} ↗
                    </a>
                    <Link
                      href={`/dashboard/venue/${activeVenue.id}/calendario`}
                      className="btn-ghost !py-2 !px-3 text-sm"
                    >
                      Calendario
                    </Link>
                    <Link
                      href={`/dashboard/venue/${activeVenue.id}/metricas`}
                      className="btn-ghost !py-2 !px-3 text-sm"
                    >
                      Métricas
                    </Link>
                    <Link
                      href={`/dashboard/venue/${activeVenue.id}/editar`}
                      className="btn-ghost !py-2 !px-3 text-sm"
                    >
                      Editar local
                    </Link>
                  </div>
                </div>

                {/* Canchas del venue activo */}
                <p className="eyebrow mb-3">
                  Canchas ({(courtsByVenue[activeVenue.id] || []).length})
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                  {(courtsByVenue[activeVenue.id] || []).map((c) => {
                    const isActive = activeCourt?.id === c.id;
                    return (
                      <article
                        key={c.id}
                        onClick={() => setActiveCourt(c)}
                        className={`border-2 p-4 cursor-pointer transition-all ${
                          isActive
                            ? 'border-ink bg-pitch-400 shadow-brut'
                            : 'border-ink/20 hover:border-ink bg-cream'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-display font-semibold text-lg leading-tight">{c.nombre}</h3>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Link
                              href={`/dashboard/venue/${activeVenue.id}/cancha/${c.id}/editar`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs underline text-ink/70 hover:text-ink"
                            >
                              editar
                            </Link>
                            <Link
                              href={`/dashboard/venue/${activeVenue.id}/cancha/${c.id}/bloqueos`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs underline text-ink/70 hover:text-ink"
                            >
                              bloqueos
                            </Link>
                          </div>
                        </div>
                        {c.tipo && (
                          <p className="text-xs uppercase tracking-wider font-mono text-ink/60 mb-2">
                            {c.tipo}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm font-mono">
                          <span>S/{c.precio_hora}/h</span>
                          <span className="text-ink/50">adelanto S/{c.adelanto_monto}</span>
                        </div>
                      </article>
                    );
                  })}
                  <Link
                    href={`/dashboard/venue/${activeVenue.id}/cancha/nueva`}
                    className="border-2 border-dashed border-ink/30 p-4 grid place-items-center text-ink/60 hover:border-ink hover:text-ink transition-colors min-h-[120px]"
                  >
                    + Agregar cancha
                  </Link>
                </div>

                {/* Reservas de la cancha activa */}
                {activeCourt && (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pt-6 border-t-2 border-ink/10">
                      <div>
                        <p className="eyebrow mb-1">Reservas de</p>
                        <h3 className="font-display text-2xl">{activeCourt.nombre}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {([
                          { v: 'pendiente', label: 'Pendientes', color: 'bg-clay text-cream border-clay' },
                          { v: 'confirmada', label: 'Confirmadas', color: 'bg-pitch-400 border-ink' },
                          { v: 'rechazada', label: 'Rechazadas', color: 'bg-ink text-cream border-ink' },
                          { v: 'cancelada', label: 'Canceladas', color: 'bg-ink text-cream border-ink' },
                          { v: 'all', label: 'Todas', color: 'bg-ink text-cream border-ink' },
                        ] as const).map((f) => (
                          <button
                            key={f.v}
                            onClick={() => setFilter(f.v)}
                            className={`px-3 py-2 text-xs font-medium border-2 ${
                              filter === f.v ? f.color : 'border-ink/20'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {reservations.length === 0 ? (
                      <div className="card text-center py-16">
                        <p className="text-ink/50 font-mono">
                          No hay reservas {filter !== 'all' ? filter + 's' : ''}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reservations.map((r) => (
                          <ReservationCard
                            key={r.id} r={r}
                            courtMap={courtMap}
                            onConfirm={() => actOn(r, 'confirm')}
                            onReject={() => actOn(r, 'reject')}
                            onCancel={() => cancelConfirmed(r)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Inbox lateral */}
      {inboxOpen && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setInboxOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-cream z-50 border-l-2 border-ink overflow-y-auto">
            <div className="sticky top-0 bg-cream border-b-2 border-ink/10 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Buzón</p>
                <h2 className="font-display text-2xl leading-none mt-1">
                  Pendientes <span className="text-clay">({pendingCount})</span>
                </h2>
              </div>
              <button onClick={() => setInboxOpen(false)} className="text-ink/60 hover:text-ink text-2xl px-2">×</button>
            </div>
            <div className="p-6">
              {inboxItems.length === 0 ? (
                <p className="text-ink/50 font-mono text-center py-12">Sin pendientes 🎉</p>
              ) : (
                <div className="space-y-3">
                  {inboxItems.map((r) => (
                    <ReservationCard
                      key={r.id} r={r}
                      courtMap={courtMap}
                      compact
                      onConfirm={() => actOn(r, 'confirm')}
                      onReject={() => actOn(r, 'reject')}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </main>
  );
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
  if (diffD === 1) return 'ayer ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (diffD < 7) return `hace ${diffD} días`;
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function ReservationCard({
  r, courtMap, compact = false, onConfirm, onReject, onCancel,
}: {
  r: Reservation;
  courtMap: Map<number, { court: Court; venue: Venue }>;
  compact?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onCancel?: () => void;
}) {
  const info = courtMap.get(r.court_id);

  return (
    <article className="card-brut !p-0 overflow-hidden">
      <div className={compact ? 'grid grid-cols-1 gap-0' : 'grid md:grid-cols-12 gap-0'}>
        <div className={`bg-ink text-cream p-4 ${compact ? '' : 'md:col-span-3 flex flex-col justify-center'}`}>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-pitch-400 text-xs uppercase tracking-widest">
                {formatFecha(r.fecha)}
              </p>
              <p className="font-display text-3xl mt-1 leading-none">
                {r.hora_inicio.slice(0, 5)}
              </p>
              <p className="text-cream/50 text-sm font-mono mt-1">
                → {r.hora_fin.slice(0, 5)}
              </p>
            </div>
            {compact && info && (
              <p className="font-mono text-xs text-cream/60 text-right max-w-[60%] truncate">
                {info.venue.nombre} · {info.court.nombre}
              </p>
            )}
          </div>
        </div>

        <div className={`p-4 ${compact ? '' : 'md:col-span-5'}`}>
          <p className="eyebrow mb-1">Jugador</p>
          <p className="font-semibold">{r.jugador_nombre}</p>
          <p className="font-mono text-sm text-ink/60 mt-1">{r.jugador_whatsapp}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle[r.estado]}`}>
              {r.estado}
            </span>
            <span className="text-xs font-mono text-ink/50" title={new Date(r.created_at).toLocaleString('es-PE')}>
              reservó {formatRelativeTime(r.created_at)}
            </span>
          </div>
        </div>

        {!compact && (
          <div className="md:col-span-2 p-4 border-l-2 border-ink/10">
            <p className="eyebrow mb-1">Yape</p>
            {r.yape_screenshot_url ? (
              <a
                href={r.yape_screenshot_url.startsWith('http') ? r.yape_screenshot_url : `${API_URL}${r.yape_screenshot_url}`}
                target="_blank"
                className="block w-full h-20 bg-ink/5 border border-ink/20 overflow-hidden hover:border-ink"
              >
                <img
                  src={r.yape_screenshot_url.startsWith('http') ? r.yape_screenshot_url : `${API_URL}${r.yape_screenshot_url}`}
                  alt="captura"
                  className="w-full h-full object-cover"
                />
              </a>
            ) : (
              <p className="text-ink/40 text-sm font-mono">sin captura</p>
            )}
          </div>
        )}

        <div className={`p-4 ${compact ? 'border-t-2 border-ink/10' : 'md:col-span-2 border-l-2 border-ink/10'} flex ${compact ? 'flex-row gap-2' : 'flex-col gap-2'} justify-center`}>
          {r.estado === 'pendiente' ? (
            <>
              {compact && r.yape_screenshot_url && (
                <a
                  href={r.yape_screenshot_url.startsWith('http') ? r.yape_screenshot_url : `${API_URL}${r.yape_screenshot_url}`}
                  target="_blank"
                  className="text-xs underline text-ink/70 hover:text-ink py-2"
                >
                  Ver Yape
                </a>
              )}
              <button onClick={onConfirm} className="btn-accent !py-2 !px-3 text-sm flex-1">
                Confirmar
              </button>
              <button onClick={onReject} className="text-sm text-ink/60 hover:text-clay py-2 px-2">
                Rechazar
              </button>
            </>
          ) : r.estado === 'confirmada' && onCancel ? (
            <button onClick={onCancel} className="text-xs text-clay hover:underline font-medium">
              Cancelar reserva
            </button>
          ) : (
            <span className="text-xs text-ink/40 text-center font-mono">
              {new Date(r.created_at).toLocaleDateString('es-PE')}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
