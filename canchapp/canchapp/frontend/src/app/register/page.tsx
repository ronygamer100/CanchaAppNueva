'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, setToken } from '@/lib/api';
import { normalizePeruvianWhatsApp } from '@/lib/whatsapp';
import GoogleSignIn from '@/components/GoogleSignIn';
import { humanizeError } from '@/lib/errors';
import WhatsAppInput from '@/components/WhatsAppInput';
import FubitoLogo from '@/components/FubitoLogo';

export default function RegisterPage() {
  const router = useRouter();

  // Estado para registro tradicional (email/password)
  const [form, setForm] = useState({
    nombre_negocio: '',
    email: '',
    whatsapp: '',
    password: '',
  });

  // Estado para registro con Google
  // Cuando hace click en Google, primero llenamos los datos del negocio
  // y luego él hace el sign-in
  const [googleData, setGoogleData] = useState({
    nombre_negocio: '',
    whatsapp: '',
  });
  const [showGoogleForm, setShowGoogleForm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function updateGoogle<K extends keyof typeof googleData>(k: K, v: string) {
    setGoogleData((g) => ({ ...g, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const wa = normalizePeruvianWhatsApp(form.whatsapp);
    if (!wa) {
      setError('Verifica el número de WhatsApp (debe ser celular peruano)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ access_token: string }>('/api/auth/register', {
        method: 'POST', body: { ...form, whatsapp: wa },
      });
      setToken(data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
    } finally { setLoading(false); }
  }

  async function handleGoogle(credential: string) {
    if (!googleData.nombre_negocio.trim()) {
      setError('Completa el nombre del negocio antes de continuar con Google');
      return;
    }
    const wa = normalizePeruvianWhatsApp(googleData.whatsapp);
    if (!wa) {
      setError('Verifica el número de WhatsApp (debe ser celular peruano)');
      return;
    }
    setError(null);
    try {
      const data = await apiFetch<{ access_token: string }>(
        '/api/auth/google/owner/register',
        { method: 'POST', body: {
          credential,
          nombre_negocio: googleData.nombre_negocio,
          whatsapp: wa,
        } },
      );
      setToken(data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
    }
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      <section className="bg-sky px-6 py-8 sm:p-10 md:p-14 flex flex-col justify-between min-h-[350px] md:min-h-screen">
        <FubitoLogo size="sm" className="self-start rounded-lg bg-white px-3 py-2" />

        <div>
          <p className="mb-2 font-semibold text-pitch-700">Para dueños de cancha</p>
          <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">Empieza en pocos minutos.</h1>
          <p className="mt-4 max-w-md text-lg text-ink/70">
            Crea tu cuenta, registra tu cancha y empieza a recibir reservas.
          </p>
        </div>

        <div className="space-y-1 text-sm font-semibold text-forest">
          <p>✓ Configuración guiada</p>
          <p>✓ Reservas y calendario en un lugar</p>
          <p>✓ Sin contratos</p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:p-10 md:p-14">
        <div className="max-w-md w-full">
          <h2 className="display-md mb-7">Crea tu cuenta</h2>

          {/* Opción Google */}
          {!showGoogleForm ? (
            <button
              type="button"
              onClick={() => setShowGoogleForm(true)}
              className="btn-ghost w-full mb-4 justify-between"
            >
              <span>Registrarme con Google</span>
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <div className="card mb-4">
              <p className="eyebrow mb-3">Cuenta con Google</p>
              <p className="text-sm text-ink/70 mb-4">
                Primero completa los datos del negocio, después dale click al botón de Google.
              </p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="label-field">Nombre del negocio</label>
                  <input
                    value={googleData.nombre_negocio}
                    onChange={(e) => updateGoogle('nombre_negocio', e.target.value)}
                    placeholder="Cancha Sintética Los Olivos"
                    className="input-field"
                  />
                </div>
                <WhatsAppInput
                  value={googleData.whatsapp}
                  onChange={(raw) => updateGoogle('whatsapp', raw)}
                  label="WhatsApp del negocio"
                />
              </div>
              <GoogleSignIn onCredential={handleGoogle} text="signup_with" width={320} />
              <button
                type="button"
                onClick={() => { setShowGoogleForm(false); setError(null); }}
                className="text-xs text-ink/60 underline mt-3"
              >
                Cancelar y volver
              </button>
            </div>
          )}

          {!showGoogleForm && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-ink/10" />
                <span className="text-sm font-medium text-ink/45">O usa tu email</span>
                <div className="flex-1 h-px bg-ink/10" />
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="label-field">Nombre del negocio</label>
                  <input required value={form.nombre_negocio}
                    onChange={(e) => update('nombre_negocio', e.target.value)}
                    placeholder="Ej. Cancha Sintética Los Olivos"
                    className="input-field" />
                </div>
                <div>
                  <label className="label-field">Email</label>
                  <input required type="email" value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="input-field" />
                </div>
                <WhatsAppInput
                  value={form.whatsapp}
                  onChange={(raw) => update('whatsapp', raw)}
                  required
                />
                <div>
                  <label className="label-field">Contraseña (min 8 caracteres)</label>
                  <input required type="password" minLength={8} value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="input-field" />
                </div>
                <button type="submit" disabled={loading} className="btn-accent w-full">
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </form>
            </>
          )}

          {error && <p className="text-clay text-sm font-medium mt-3">{error}</p>}

          <p className="mt-6 text-sm text-ink/60">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="underline font-medium text-ink">Inicia sesión</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
