'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getPlayerToken, clearPlayerToken } from '@/lib/api';
import { normalizePeruvianWhatsApp, displayPeruvianWhatsApp } from '@/lib/whatsapp';
import type { Player, PlayerReservation } from '@/lib/types';

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'long',
  });
}

const statusStyle: Record<string, string> = {
  pendiente: 'bg-yellow-200 border-yellow-700 text-yellow-900',
  confirmada: 'bg-pitch-400 border-ink text-ink',
  rechazada: 'bg-clay/20 border-clay text-clay',
  cancelada: 'bg-ink/20 border-ink/40 text-ink/60',
};

export default function PlayerPanelPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [reservations, setReservations] = useState<PlayerReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edición de perfil
  const [editing, setEditing] = useState(false);
  const [whatsappEdit, setWhatsappEdit] = useState('');

  useEffect(() => {
    if (!getPlayerToken()) {
      router.replace('/jugador/login');
      return;
    }
    Promise.all([
      apiFetch<Player>('/api/player/me', { auth: 'player' }),
      apiFetch<PlayerReservation[]>('/api/player/reservations', { auth: 'player' }),
    ])
      .then(([p, rs]) => {
        setPlayer(p);
        setReservations(rs);
        setWhatsappEdit(p.whatsapp || '');
      })
      .catch((err) => {
        setError((err as Error).message);
        if ((err as Error).message.includes('401')) {
          clearPlayerToken();
          router.replace('/jugador/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function saveWhatsapp() {
    if (whatsappEdit.trim() === '') {
      // permitir borrarlo
      try {
        const updated = await apiFetch<Player>('/api/player/me', {
          method: 'PATCH', auth: 'player',
          body: { whatsapp: '' },
        });
        setPlayer(updated); setEditing(false);
      } catch (err) { alert((err as Error).message); }
      return;
    }
    const norm = normalizePeruvianWhatsApp(whatsappEdit);
    if (!norm) {
      alert('Tiene que ser un celular peruano: 9 dígitos empezando por 9.');
      return;
    }
    try {
      const updated = await apiFetch<Player>('/api/player/me', {
        method: 'PATCH', auth: 'player',
        body: { whatsapp: norm },
      });
      setPlayer(updated); setEditing(false);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function logout() {
    clearPlayerToken();
    router.push('/');
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p className="font-mono text-sm text-ink/50">Cargando…</p>
      </main>
    );
  }
  if (!player) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center">
          <p className="text-clay mb-4">{error || 'Sesión no válida'}</p>
          <Link href="/jugador/login" className="btn-accent">Iniciar sesión</Link>
        </div>
      </main>
    );
  }

  // Separar reservas pasadas y futuras
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futuras = reservations.filter((r) => new Date(r.fecha + 'T00:00:00') >= today);
  const pasadas = reservations.filter((r) => new Date(r.fecha + 'T00:00:00') < today);

  return (
    <main className="min-h-screen pb-20 lg:pb-0">
      <header className="border-b-2 border-ink/10 bg-cream sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/jugador" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink grid place-items-center">
              <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 text-pitch-400">
                <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
                <path d="M16 5L20 9L18 13L14 13L12 9L16 5Z" fill="currentColor" />
                <path d="M27 14L25 18L21 18L19 14L21 10L25 10L27 14Z" fill="currentColor" />
                <path d="M5 14L7 10L11 10L13 14L11 18L7 18L5 14Z" fill="currentColor" />
                <path d="M16 27L12 23L14 19L18 19L20 23L16 27Z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-display font-semibold tracking-tightest">
              cancha<span className="text-pitch-700">.</span>pe
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/jugador/explorar" className="text-sm font-medium hover:underline hidden sm:inline">
              Explorar
            </Link>
            <button onClick={logout} className="text-sm text-ink/60 hover:text-ink">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Perfil */}
        <section className="card-brut bg-cream mb-10 flex items-start gap-4">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.nombre}
              referrerPolicy="no-referrer"
              className="w-16 h-16 border-2 border-ink object-cover"
            />
          ) : (
            <div className="w-16 h-16 border-2 border-ink bg-pitch-400 grid place-items-center font-display text-2xl">
              {player.nombre[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="eyebrow">Tu cuenta</p>
            <h1 className="display-lg mt-1 mb-1">Hola, {player.nombre.split(' ')[0]}</h1>
            <p className="text-sm font-mono text-ink/60">{player.email}</p>

            <div className="mt-3 text-sm">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={whatsappEdit}
                    onChange={(e) => setWhatsappEdit(e.target.value)}
                    placeholder="+51987654321"
                    className="input-field font-mono !py-1.5 !text-sm max-w-[200px]"
                  />
                  <button onClick={saveWhatsapp} className="btn-accent !py-1.5 !px-3 text-xs">Guardar</button>
                  <button onClick={() => setEditing(false)} className="text-xs text-ink/50 underline">Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-ink/70">WhatsApp:</span>
                  <span className="font-mono">
                    {player.whatsapp ? displayPeruvianWhatsApp(player.whatsapp) : <em className="text-ink/40">sin guardar</em>}
                  </span>
                  <button onClick={() => setEditing(true)} className="text-xs underline text-ink/60 hover:text-ink">
                    editar
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Explorar */}
        <Link
          href="/jugador/explorar"
          className="block card-brut bg-pitch-400 mb-10 hover:-translate-y-1 transition-transform"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="eyebrow mb-2">Encuentra tu cancha</p>
              <h2 className="display-lg leading-tight">Explorar canchas →</h2>
              <p className="text-sm text-ink/70 mt-2 max-w-md">
                Busca por distrito, precio, características o disponibilidad de hoy.
                Mira en mapa, ordena por distancia.
              </p>
            </div>
            <div className="text-6xl opacity-30">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" className="w-16 h-16">
                <circle cx="28" cy="28" r="14" />
                <line x1="50" y1="50" x2="38" y2="38" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Futuras */}
        <section className="mb-10">
          <p className="eyebrow mb-4">Próximas reservas ({futuras.length})</p>
          {futuras.length === 0 ? (
            <div className="border-2 border-ink/10 p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-pitch-400/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-pitch-700">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                </svg>
              </div>
              <p className="font-display text-xl mb-2">No tienes partidos próximos</p>
              <p className="text-ink/60 text-sm mb-6">¿Cuándo fue la última vez que jugaste? Busca una cancha disponible ahora.</p>
              <Link href="/jugador/explorar" className="btn-accent">
                Encontrar cancha →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {futuras.map((r) => <ReservationRow key={r.id} r={r} />)}
            </div>
          )}
        </section>

        {/* Pasadas */}
        {pasadas.length > 0 && (
          <section>
            <p className="eyebrow mb-4">Historial ({pasadas.length})</p>
            <div className="space-y-3">
              {pasadas.map((r) => <ReservationRow key={r.id} r={r} faded />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ReservationRow({ r, faded = false }: { r: PlayerReservation; faded?: boolean }) {
  return (
    <article className={`card-brut !p-0 overflow-hidden ${faded ? 'opacity-70' : ''}`}>
      <div className="grid sm:grid-cols-[140px_1fr_auto] gap-0 items-stretch">
        <div className="bg-ink text-cream p-4">
          <p className="font-mono text-pitch-400 text-xs uppercase tracking-widest">
            {formatFecha(r.fecha).split(',')[0]}
          </p>
          <p className="font-display text-2xl mt-1 leading-none">
            {r.hora_inicio.slice(0, 5)}
          </p>
          <p className="text-cream/50 text-sm font-mono mt-1">
            → {r.hora_fin.slice(0, 5)}
          </p>
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg leading-tight">{r.venue_nombre}</h3>
          <p className="text-sm text-ink/60">{r.court_nombre}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle[r.estado]}`}>
              {r.estado}
            </span>
            <span className="text-xs font-mono text-ink/50">
              {r.horas}h · S/ {r.monto_total}
            </span>
          </div>
          {r.created_at && (
            <p className="text-[10px] font-mono text-ink/40 mt-1">
              Reservado el {new Date(r.created_at).toLocaleDateString('es-PE', {
                day: 'numeric', month: 'short', year: 'numeric',
              })} a las {new Date(r.created_at).toLocaleTimeString('es-PE', {
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <div className="p-4 flex flex-row sm:flex-col items-center sm:items-end justify-center gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-ink/10">
          <Link
            href={`/r/${r.cancel_token}`}
            className="text-xs underline text-ink/70 hover:text-ink"
          >
            ver detalle
          </Link>
          <Link
            href={`/c/${r.venue_slug}`}
            className="text-xs underline text-ink/70 hover:text-ink"
          >
            ir a la cancha
          </Link>
        </div>
      </div>
    </article>
  );
}
