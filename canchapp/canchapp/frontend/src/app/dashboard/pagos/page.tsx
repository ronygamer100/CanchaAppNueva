'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, CreditCard, Eye, EyeOff, KeyRound, ShieldCheck, Smartphone,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import type { OwnerBilling } from '@/lib/types';
import { showToast } from '@/components/Toast';


function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}


export default function PaymentsPage() {
  const [billing, setBilling] = useState<OwnerBilling | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OwnerBilling>('/api/billing', { auth: true })
      .then(setBilling)
      .catch((requestError) => setError(humanizeError(requestError)));
  }, []);

  async function connectCulqi(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<OwnerBilling>('/api/billing/culqi', {
        method: 'POST', auth: true, body: { public_key: publicKey, secret_key: secretKey },
      });
      setBilling(updated);
      setPublicKey('');
      setSecretKey('');
      showToast('Culqi quedó conectado a tus reservas');
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function disconnectCulqi() {
    if (!confirm('¿Desconectar Culqi? Tus canchas dejarán de aceptar pagos en línea.')) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/billing/culqi', { method: 'DELETE', auth: true });
      const updated = await apiFetch<OwnerBilling>('/api/billing', { auth: true });
      setBilling(updated);
      showToast('Culqi fue desconectado');
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (!billing && !error) {
    return <main className="grid min-h-screen place-items-center text-ink/55">Cargando tu plan...</main>;
  }

  return (
    <main className="min-h-screen bg-cream px-5 py-8 sm:px-7 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Tu cuenta</p>
        <h1 className="mt-1 font-display text-4xl font-black">Pagos y plan</h1>
        <p className="mt-2 max-w-2xl text-ink/65">
          Aquí controlas lo que paga tu negocio por usar Fubito y dónde recibes los adelantos de tus clientes.
        </p>

        {billing && (
          <section className="mt-7 rounded-lg bg-forest p-6 text-white sm:p-7">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-pitch-400">
                  {billing.plan_status === 'trial' ? 'Prueba gratuita activa' : billing.plan_status === 'active' ? 'Plan activo' : 'Prueba finalizada'}
                </p>
                <h2 className="mt-1 font-display text-3xl font-black">
                  {billing.plan_status === 'trial'
                    ? `${billing.days_remaining} ${billing.days_remaining === 1 ? 'día gratis' : 'días gratis'}`
                    : billing.plan_status === 'active' ? 'Fubito mensual' : 'Plan por renovar'}
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  {billing.plan_status === 'trial'
                    ? `Tu prueba termina el ${formatDate(billing.trial_ends_at)}.`
                    : 'Tus datos y reservas se mantienen guardados.'}
                </p>
              </div>
              <div className="rounded-lg bg-white/10 px-5 py-4 sm:text-right">
                <p className="text-sm text-white/65">Después de la prueba</p>
                <p className="font-display text-3xl font-black">S/ {billing.monthly_price_pen}</p>
                <p className="text-sm text-white/65">al mes</p>
              </div>
            </div>
            {!billing.billing_collection_enabled && (
              <p className="mt-5 border-t border-white/15 pt-4 text-sm text-white/75">
                Todavía no te cobraremos nada. Te avisaremos antes de activar la mensualidad.
              </p>
            )}
          </section>
        )}

        <section className="mt-8 border-t border-forest/15 pt-8">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-pitch-100 text-pitch-700">
              <Smartphone size={25} />
            </span>
            <div>
              <p className="eyebrow">Cobros de las reservas</p>
              <h2 className="font-display text-3xl font-black">Recibe Yape con Culqi</h2>
              <p className="mt-2 max-w-2xl text-ink/65">
                Cada pago entra directamente a tu propio comercio Culqi. Fubito no recibe ni reparte ese dinero.
              </p>
            </div>
          </div>

          {billing?.culqi_connected ? (
            <div className="mt-6 rounded-lg border border-pitch-500/30 bg-pitch-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-pitch-700" size={26} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-black">Culqi está conectado</h3>
                  <p className="mt-1 text-sm text-ink/65">
                    Ambiente {billing.culqi_mode === 'live' ? 'de producción' : 'de prueba'} · {billing.culqi_public_key_preview}
                  </p>
                  <p className="mt-3 text-sm text-ink/70">
                    Tus páginas de reserva ya pueden abrir el checkout de Yape.
                  </p>
                  <button
                    onClick={disconnectCulqi}
                    disabled={saving}
                    className="mt-5 text-sm font-semibold text-clay underline underline-offset-4"
                  >
                    Desconectar Culqi
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  ['1', 'Crea tu comercio', 'Regístrate en Culqi y completa la validación de tu negocio.'],
                  ['2', 'Busca API Keys', 'En CulqiPanel entra a Desarrollo y luego a API Keys.'],
                  ['3', 'Pega tus llaves', 'Empieza con las llaves test; cambia a live cuando Culqi te apruebe.'],
                ].map(([number, title, description]) => (
                  <div key={number} className="border-t border-forest/20 pt-4">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest font-bold text-white">{number}</span>
                    <h3 className="mt-3 font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-ink/60">{description}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={connectCulqi} className="mt-7 space-y-5 rounded-lg bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <label className="label-field" htmlFor="culqi-public">Llave pública</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={20} />
                    <input
                      id="culqi-public"
                      required
                      autoComplete="off"
                      value={publicKey}
                      onChange={(event) => setPublicKey(event.target.value)}
                      placeholder="pk_test_..."
                      className="input-field !pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-field" htmlFor="culqi-secret">Llave privada</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={20} />
                    <input
                      id="culqi-secret"
                      required
                      type={showSecret ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={secretKey}
                      onChange={(event) => setSecretKey(event.target.value)}
                      placeholder="sk_test_..."
                      className="input-field !px-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((current) => !current)}
                      className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-ink/55"
                      aria-label={showSecret ? 'Ocultar llave privada' : 'Mostrar llave privada'}
                    >
                      {showSecret ? <EyeOff size={21} /> : <Eye size={21} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg bg-sky p-4 text-sm text-ink/70">
                  <ShieldCheck className="shrink-0 text-forest" size={23} />
                  <p>La llave privada se guarda cifrada y nunca se muestra en la página pública ni en el teléfono del cliente.</p>
                </div>

                {error && <p className="rounded-lg bg-clay/10 p-4 text-sm font-semibold text-clay">{error}</p>}

                <button type="submit" disabled={saving} className="btn-primary btn-lg w-full sm:w-auto">
                  <CreditCard size={21} />
                  {saving ? 'Conectando...' : 'Conectar Culqi'}
                </button>
              </form>
            </>
          )}

          <p className="mt-5 text-sm text-ink/60">
            ¿Primera vez con Culqi? Revisa la{' '}
            <Link href="https://docs.culqi.com/es/documentacion/pagos-online" target="_blank" className="link">
              guía oficial de activación
            </Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
