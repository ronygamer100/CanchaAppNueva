'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getPlayerToken, clearPlayerToken } from '@/lib/api';
import { normalizePeruvianWhatsApp, displayPeruvianWhatsApp } from '@/lib/whatsapp';
import type { Player, PlayerReservation } from '@/lib/types';
import { CalendarDays, ChevronRight, Search, UserRound } from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'long',
  });
}

const statusStyle: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-900',
  confirmada: 'bg-pitch-100 text-forest',
  rechazada: 'bg-clay/10 text-clay',
  cancelada: 'bg-ink/5 text-ink/60',
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
        <p className="text-sm text-ink/50">Cargando…</p>
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
    <main className="min-h-screen pb-24 lg:pb-0">
      <header className="border-b border-ink/10 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
          <FubitoLogo href="/jugador" />
          <div className="flex items-center gap-3">
            <Link href="/jugador/explorar" className="text-sm font-semibold text-forest hover:text-pitch-800 hidden sm:inline">
              Explorar
            </Link>
            <button onClick={logout} className="hidden sm:inline-flex text-sm text-ink/60 hover:text-ink">
              Cerrar sesión
            </button>
            <Link href="/jugador/perfil" className="icon-button" aria-label="Abrir mi perfil">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-7 sm:py-10">
        {/* Perfil */}
        <section className="card-brut bg-sky mb-7 sm:mb-10 flex items-start gap-4">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.nombre}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-lg border border-forest/10 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-white grid place-items-center font-display text-2xl text-forest shadow-sm">
              {player.nombre[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="eyebrow">Tu cuenta</p>
            <h1 className="display-lg mt-1 mb-1">Hola, {player.nombre.split(' ')[0]}</h1>
            <p className="text-sm text-ink/60 break-all">{player.email}</p>

            <div className="mt-3 text-sm">
              {editing ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="tel"
                    value={whatsappEdit}
                    onChange={(e) => setWhatsappEdit(e.target.value)}
                    placeholder="+51987654321"
                    className="input-field !text-sm sm:max-w-[240px]"
                  />
                  <div className="flex items-center gap-3">
                    <button onClick={saveWhatsapp} className="btn-accent">Guardar</button>
                    <button onClick={() => setEditing(false)} className="text-sm text-ink/60 underline">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-ink/70">WhatsApp:</span>
                  <span>
                    {player.whatsapp ? displayPeruvianWhatsApp(player.whatsapp) : <em className="text-ink/40">sin guardar</em>}
                  </span>
                  <button onClick={() => setEditing(true)} className="text-sm underline text-ink/60 hover:text-ink">
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
          className="block card-brut bg-pitch-100 mb-10 hover:border-pitch-700 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Tu próximo partido</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold leading-tight">Explorar canchas</h2>
              <p className="text-sm text-ink/70 mt-2 max-w-md">
                Busca por distrito, precio o disponibilidad de hoy.
              </p>
            </div>
            <div className="w-14 h-14 shrink-0 rounded-lg bg-white grid place-items-center text-forest shadow-sm">
              <Search className="w-7 h-7" aria-hidden="true" />
            </div>
          </div>
        </Link>

        {/* Futuras */}
        <section className="mb-10">
          <p className="eyebrow mb-4">Próximas reservas ({futuras.length})</p>
          {futuras.length === 0 ? (
            <div className="card-brut bg-white px-5 py-10 text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-4 bg-sky flex items-center justify-center">
                <CalendarDays className="w-8 h-8 text-forest" aria-hidden="true" />
              </div>
              <p className="font-display text-xl mb-2">No tienes partidos próximos</p>
              <p className="text-ink/60 text-sm mb-6">Encuentra una cancha disponible y arma tu próximo partido.</p>
              <Link href="/jugador/explorar" className="btn-accent">
                Encontrar cancha
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
      <div className="grid sm:grid-cols-[150px_1fr_auto] gap-0 items-stretch">
        <div className="bg-sky text-forest p-4">
          <p className="text-sm font-semibold">
            {formatFecha(r.fecha).split(',')[0]}
          </p>
          <p className="font-display text-2xl mt-1 leading-none">
            {r.hora_inicio.slice(0, 5)}
          </p>
          <p className="text-forest/60 text-sm mt-1">
            hasta {r.hora_fin.slice(0, 5)}
          </p>
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg leading-tight">{r.venue_nombre}</h3>
          <p className="text-sm text-ink/60">{r.court_nombre}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyle[r.estado]}`}>
              {r.estado}
            </span>
            <span className="text-xs text-ink/50">
              {r.horas}h · S/ {r.monto_total}
            </span>
          </div>
          {r.created_at && (
            <p className="text-xs text-ink/40 mt-2">
              Reservado el {new Date(r.created_at).toLocaleDateString('es-PE', {
                day: 'numeric', month: 'short', year: 'numeric',
              })} a las {new Date(r.created_at).toLocaleTimeString('es-PE', {
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <div className="p-4 flex flex-col items-stretch sm:items-end justify-center gap-2 border-t sm:border-t-0 sm:border-l border-ink/10">
          <Link
            href={`/r/${r.cancel_token}`}
            className="min-h-11 flex items-center justify-between gap-2 text-sm font-semibold text-forest hover:text-pitch-800"
          >
            Ver detalle <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href={`/c/${r.venue_slug}`}
            className="min-h-11 flex items-center justify-between gap-2 text-sm text-ink/60 hover:text-ink"
          >
            Ir a la cancha <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
