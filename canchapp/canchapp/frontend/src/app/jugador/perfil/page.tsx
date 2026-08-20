'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, MessageCircle, UserRound } from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import { LoadingScreen } from '@/components/Skeleton';
import { apiFetch, clearPlayerToken, getPlayerToken } from '@/lib/api';
import type { Player } from '@/lib/types';

export default function PlayerProfilePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!getPlayerToken()) {
      router.replace('/jugador/login?next=/jugador/perfil');
      return;
    }
    apiFetch<Player>('/api/player/me', { auth: 'player' })
      .then(setPlayer)
      .catch(() => {
        clearPlayerToken();
        router.replace('/jugador/login?next=/jugador/perfil');
      });
  }, [router]);

  function logout() {
    clearPlayerToken();
    router.push('/');
  }

  if (!player) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-cream pb-28">
      <header className="border-b border-forest/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <FubitoLogo size="sm" />
          <span className="text-sm font-semibold text-ink/60">Mi perfil</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-7 flex items-center gap-4">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-lg bg-sky text-forest">
              <UserRound size={36} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-pitch-700">Jugador</p>
            <h1 className="font-display text-3xl font-black leading-tight">{player.nombre}</h1>
          </div>
        </div>

        <section className="card !p-0 overflow-hidden" aria-label="Datos de tu cuenta">
          <div className="flex min-h-16 items-center gap-3 border-b border-forest/10 px-5 py-4">
            <Mail className="text-pitch-700" size={22} />
            <div className="min-w-0">
              <p className="text-sm text-ink/55">Correo</p>
              <p className="truncate font-semibold">{player.email}</p>
            </div>
          </div>
          <div className="flex min-h-16 items-center gap-3 px-5 py-4">
            <MessageCircle className="text-pitch-700" size={22} />
            <div>
              <p className="text-sm text-ink/55">WhatsApp</p>
              <p className="font-semibold">{player.whatsapp || 'Aún no registrado'}</p>
            </div>
          </div>
        </section>

        <button onClick={logout} className="btn-ghost mt-6 w-full text-clay">
          <LogOut size={21} />
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
