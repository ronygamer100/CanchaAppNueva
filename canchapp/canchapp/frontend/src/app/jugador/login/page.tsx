'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, setPlayerToken } from '@/lib/api';
import GoogleSignIn from '@/components/GoogleSignIn';
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
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="bg-pitch-900 text-cream p-10 md:p-16 flex flex-col justify-between min-h-[40vh]">
        <Link href="/" className="flex items-center gap-2 self-start">
          <div className="w-8 h-8 bg-cream grid place-items-center">
            <div className="w-3 h-3 bg-pitch-900 rounded-full" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tightest">
            fubito
          </span>
        </Link>

        <div>
          <p className="eyebrow !text-pitch-400 mb-4">Para jugadores</p>
          <h1 className="display-lg mb-4">Tus reservas en un solo lugar.</h1>
          <p className="text-cream/70 text-lg max-w-md">
            Reserva más rápido (tus datos quedan guardados) y mira el historial de todas tus
            canchas favoritas.
          </p>
        </div>

        <p className="text-cream/40 text-sm font-mono">solo necesitas tu Google</p>
      </section>

      <section className="p-10 md:p-16 flex flex-col justify-center">
        <div className="max-w-md w-full">
          <h2 className="display-lg mb-4">Entra con Google</h2>
          <p className="text-ink/70 mb-8">
            Un click. Sin contraseñas, sin email de verificación. Si es tu primera vez, te creamos
            la cuenta automáticamente.
          </p>

          {onGoogle ? (
            <GoogleSignIn onCredential={onGoogle} text="continue_with" width={360} />
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
