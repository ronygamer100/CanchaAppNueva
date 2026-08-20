'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, apiFetch, setToken } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import GoogleSignIn from '@/components/GoogleSignIn';
import FubitoLogo from '@/components/FubitoLogo';

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
    <main className="min-h-screen md:grid md:grid-cols-2">
      <section className="bg-forest text-white px-6 py-8 sm:p-10 md:p-14 flex flex-col justify-between min-h-[330px] md:min-h-screen">
        <FubitoLogo size="sm" className="self-start rounded-lg bg-white px-3 py-2" />

        <div>
          <p className="mb-2 font-semibold text-pitch-400">Panel del dueño</p>
          <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">Tu cancha, bajo control.</h1>
          <p className="mt-4 max-w-md text-lg text-white/75">
            Revisa reservas, confirma horarios y administra tu negocio con pasos claros.
          </p>
        </div>

        <p className="text-sm font-medium text-white/55">Hecho para negocios de Arequipa</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:p-10 md:p-14">
        <div className="max-w-md w-full">
          <h2 className="display-md mb-7">Inicia sesión</h2>

          <div className="mb-6">
            <GoogleSignIn onCredential={handleGoogle} text="signin_with" width={320} />
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-ink/10" />
            <span className="text-sm font-medium text-ink/45">O usa tu email</span>
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
