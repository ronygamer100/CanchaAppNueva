'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, setPlayerToken } from '@/lib/api';
import GoogleSignIn from '@/components/GoogleSignIn';
import FubitoLogo from '@/components/FubitoLogo';
import { humanizeError } from '@/lib/errors';

export default function PlayerLoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <PlayerLoginContent />
    </Suspense>
  );
}

function PlayerLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/jugador';
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle(credential: string) {
    setError(null);
    try {
      const data = await apiFetch<{ access_token: string }>(
        '/api/auth/google/player',
        { method: 'POST', body: { credential } },
      );
      setPlayerToken(data.access_token);
      router.push(next);
    } catch (err) {
      setError(humanizeError(err));
    }
  }

  return (
    <LoginShell onGoogle={handleGoogle} error={error} />
  );
}

function LoginShell({
  onGoogle,
  error,
}: {
  onGoogle?: (credential: string) => void;
  error?: string | null;
}) {
  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      <section className="bg-forest text-white px-6 py-8 sm:p-10 md:p-14 flex flex-col justify-between min-h-[330px] md:min-h-screen">
        <FubitoLogo size="sm" className="self-start rounded-lg bg-white px-3 py-2" />

        <div>
          <p className="mb-2 font-semibold text-pitch-400">Para jugadores</p>
          <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">Juega sin complicarte.</h1>
          <p className="mt-4 max-w-md text-lg text-white/75">
            Guarda tus datos, encuentra horarios disponibles y revisa todas tus reservas.
          </p>
        </div>

        <p className="text-sm font-medium text-white/55">Solo necesitas tu cuenta de Google</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:p-10 md:p-14">
        <div className="max-w-md w-full">
          <h2 className="display-md mb-3">Entra con Google</h2>
          <p className="text-base text-ink/65 mb-7">
            Un solo paso. Si es tu primera vez, crearemos tu cuenta automáticamente.
          </p>

          {onGoogle ? (
            <GoogleSignIn onCredential={onGoogle} text="continue_with" width={320} />
          ) : (
            <div className="h-10 w-full max-w-[360px] skeleton" />
          )}

          {error && <p className="text-clay text-sm font-medium mt-4">{error}</p>}

          <p className="mt-8 text-sm text-ink/60">
            ¿Eres dueño de cancha?{' '}
            <Link href="/login" className="underline font-medium text-ink">
              Entra aquí
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
