'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, setToken } from '@/lib/api';
import { normalizePeruvianWhatsApp } from '@/lib/whatsapp';
import GoogleSignIn from '@/components/GoogleSignIn';
import WhatsAppInput from '@/components/WhatsAppInput';

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
      setError((err as Error).message);
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
      setError((err as Error).message);
    }
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="bg-pitch-400 p-10 md:p-16 flex flex-col justify-between min-h-[40vh] border-r-2 border-ink">
        <Link href="/" className="flex items-center gap-2 self-start">
          <div className="w-8 h-8 bg-ink grid place-items-center">
            <div className="w-3 h-3 bg-pitch-400 rounded-full" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tightest">
            cancha<span className="text-pitch-900">.</span>pe
          </span>
        </Link>

        <div>
          <p className="eyebrow mb-4">Para dueños de cancha</p>
          <h1 className="display-xl mb-4">Empieza<br/>en 2 minutos.</h1>
          <p className="text-ink/80 text-lg max-w-md">
            Crea tu cuenta, registra tu cancha y compárte el link en Instagram el mismo día.
          </p>
        </div>

        <div className="font-mono text-sm space-y-1">
          <p>· Gratis los primeros 60 días</p>
          <p>· Sin contratos</p>
          <p>· Cancelas cuando quieras</p>
        </div>
      </section>

      <section className="p-10 md:p-16 flex flex-col justify-center">
        <div className="max-w-md w-full">
          <h2 className="display-lg mb-8">Crea tu cuenta</h2>

          {/* Opción Google */}
          {!showGoogleForm ? (
            <button
              type="button"
              onClick={() => setShowGoogleForm(true)}
              className="w-full border-2 border-ink p-3 mb-4 font-medium hover:bg-cream text-left flex items-center justify-between"
            >
              <span>Registrarme con Google</span>
              <span className="font-mono text-xs">→</span>
            </button>
          ) : (
            <div className="border-2 border-ink p-5 mb-4 bg-cream">
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
              <GoogleSignIn onCredential={handleGoogle} text="signup_with" width={360} />
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
                <span className="text-xs font-mono text-ink/40">O CON EMAIL</span>
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
