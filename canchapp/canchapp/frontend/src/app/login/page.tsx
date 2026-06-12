'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, apiFetch, setToken } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(credential: string) {
    setError(null);
    try {
      const data = await apiFetch<{ access_token: string }>(
        '/api/auth/google/owner/login',
        { method: 'POST', body: { credential } },
      );
      setToken(data.access_token);
      router.push('/dashboard');
    } catch (err) {
      const msg = humanizeError(err);
      if (msg.includes('No existe')) {
        setError('Esta cuenta no está registrada. Regístrate primero.');
      } else {
        setError(msg);
      }
    }
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="bg-pitch-900 text-cream p-10 md:p-16 flex flex-col justify-between min-h-[40vh]">
        <Link href="/" className="flex items-center gap-2 self-start">
          <div className="w-8 h-8 bg-cream grid place-items-center">
            <div className="w-3 h-3 bg-pitch-900 rounded-full" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tightest">
            cancha<span className="text-pitch-400">.</span>pe
          </span>
        </Link>

        <div>
          <p className="eyebrow !text-pitch-400 mb-4">Panel del dueño</p>
          <h1 className="display-lg mb-4">Bienvenido de vuelta.</h1>
          <p className="text-cream/70 text-lg max-w-md">
            Entra y mira tus reservas pendientes, confirma con un clic y deja de perseguir
            WhatsApps.
          </p>
        </div>

        <p className="text-cream/40 text-sm font-mono">v0.1</p>
      </section>

      <section className="p-10 md:p-16 flex flex-col justify-center">
        <div className="max-w-md w-full">
          <h2 className="display-lg mb-8">Inicia sesión</h2>

          <div className="mb-6">
            <GoogleSignIn onCredential={handleGoogle} text="signin_with" width={360} />
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-ink/10" />
            <span className="text-xs font-mono text-ink/40">O CON EMAIL</span>
            <div className="flex-1 h-px bg-ink/10" />
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label-field">Email</label>
              <input
                required type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Contraseña</label>
              <input
                required type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
            {error && <p className="text-clay text-sm font-medium">{error}</p>}
            <button type="submit" disabled={loading} className="btn-accent w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <p className="mt-6 text-sm text-ink/60">
            ¿Aún no estás?{' '}
            <Link href="/register" className="underline font-medium text-ink">Registra tu cancha</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
