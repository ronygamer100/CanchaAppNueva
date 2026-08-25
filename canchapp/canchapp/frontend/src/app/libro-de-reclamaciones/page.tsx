'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpenText, CheckCircle2, Printer } from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import PublicFooter from '@/components/PublicFooter';
import { apiFetch } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import { LEGAL_PROVIDER } from '@/lib/legal';

interface ComplaintReceipt {
  code: string;
  created_at: string;
  response_deadline_days: number;
}

const initialForm = {
  venue_slug: 'cancha-uwu',
  consumer_name: '',
  document_type: 'DNI',
  document_number: '',
  address: '',
  phone: '',
  email: '',
  is_minor: false,
  guardian_name: '',
  request_type: 'reclamo',
  service_description: 'Reserva de cancha mediante Fubito',
  amount: '',
  detail: '',
  consumer_request: '',
};

export default function ComplaintBookPage() {
  const [form, setForm] = useState(initialForm);
  const [receipt, setReceipt] = useState<ComplaintReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(name: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch<ComplaintReceipt>('/api/public/complaints', {
        method: 'POST',
        body: {
          ...form,
          amount: form.amount ? Number(form.amount) : null,
          guardian_name: form.is_minor ? form.guardian_name : null,
        },
      });
      setReceipt(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (receipt) {
    return (
      <main className="min-h-screen bg-cream">
        <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
          <FubitoLogo size="sm" />
          <section className="mt-8 rounded-lg bg-white p-6 shadow-brut sm:p-8">
            <CheckCircle2 className="text-pitch-700" size={46} />
            <p className="mt-5 font-semibold text-pitch-700">Hoja de reclamación registrada</p>
            <h1 className="mt-1 font-display text-4xl font-black">Guardamos tu solicitud</h1>
            <div className="mt-6 rounded-lg bg-sky p-5">
              <p className="text-sm text-ink/60">Código de identificación</p>
              <p className="mt-1 break-all font-display text-2xl font-black">{receipt.code}</p>
              <p className="mt-3 text-sm text-ink/65">
                Fecha: {new Date(receipt.created_at).toLocaleString('es-PE')}
              </p>
            </div>
            <p className="mt-6 text-ink/70">
              TECHDG responderá en un plazo máximo de {receipt.response_deadline_days} días calendario.
              Conserva este código como constancia.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row print:hidden">
              <button onClick={() => window.print()} className="btn-primary">
                <Printer size={20} /> Imprimir constancia
              </button>
              <Link href="/" className="btn-ghost">Volver a Fubito</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-forest/10 bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between px-5 sm:px-6">
          <FubitoLogo size="sm" />
          <Link href="/" className="text-sm font-semibold text-forest">Volver al inicio</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <BookOpenText className="text-pitch-700" size={44} />
        <p className="eyebrow mt-5">Libro de Reclamaciones Virtual</p>
        <h1 className="mt-2 font-display text-4xl font-black leading-tight sm:text-5xl">Hoja de reclamación</h1>
        <p className="mt-4 max-w-3xl text-ink/65">
          Registra aquí un reclamo sobre el servicio o una queja sobre la atención. Recibirás un
          código y podrás imprimir tu constancia.
        </p>

        <section className="mt-8 rounded-lg bg-sky p-5 sm:p-6">
          <h2 className="font-display text-xl font-black">Datos del proveedor</h2>
          <div className="mt-3 grid gap-1 text-sm text-ink/70 sm:grid-cols-2">
            <p><strong>Razón social:</strong> {LEGAL_PROVIDER.legalName}</p>
            <p><strong>Nombre comercial:</strong> {LEGAL_PROVIDER.tradeName}</p>
            <p><strong>RUC:</strong> {LEGAL_PROVIDER.ruc}</p>
            <p><strong>Teléfono:</strong> {LEGAL_PROVIDER.phone}</p>
            <p className="sm:col-span-2"><strong>Dirección:</strong> {LEGAL_PROVIDER.address}</p>
          </div>
        </section>

        <form onSubmit={submit} className="mt-6 space-y-8 rounded-lg bg-white p-5 shadow-sm sm:p-7">
          <FormSection title="1. Identificación del consumidor">
            <Field label="Nombres y apellidos">
              <input required value={form.consumer_name} onChange={(e) => update('consumer_name', e.target.value)} className="input-field" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="Documento">
                <select value={form.document_type} onChange={(e) => update('document_type', e.target.value)} className="input-field">
                  <option>DNI</option><option>CE</option><option>Pasaporte</option>
                </select>
              </Field>
              <Field label="Número de documento">
                <input required value={form.document_number} onChange={(e) => update('document_number', e.target.value)} className="input-field" />
              </Field>
            </div>
            <Field label="Domicilio">
              <input required value={form.address} onChange={(e) => update('address', e.target.value)} className="input-field" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono">
                <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input-field" />
              </Field>
              <Field label="Correo electrónico">
                <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input-field" />
              </Field>
            </div>
            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-forest/15 px-4 py-3">
              <input type="checkbox" checked={form.is_minor} onChange={(e) => update('is_minor', e.target.checked)} className="h-5 w-5 accent-[#19763A]" />
              <span className="font-semibold">El consumidor es menor de edad</span>
            </label>
            {form.is_minor && (
              <Field label="Padre, madre o representante">
                <input required value={form.guardian_name} onChange={(e) => update('guardian_name', e.target.value)} className="input-field" />
              </Field>
            )}
          </FormSection>

          <FormSection title="2. Servicio contratado">
            <Field label="Cancha o local">
              <select value={form.venue_slug} onChange={(e) => update('venue_slug', e.target.value)} className="input-field">
                <option value="cancha-uwu">Cancha Uwu</option>
                <option value="">Fubito / TECHDG</option>
              </select>
            </Field>
            <Field label="Descripción del servicio">
              <input required value={form.service_description} onChange={(e) => update('service_description', e.target.value)} className="input-field" />
            </Field>
            <Field label="Monto reclamado en soles (opcional)">
              <input type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => update('amount', e.target.value)} className="input-field" />
            </Field>
          </FormSection>

          <FormSection title="3. Reclamo o queja">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice active={form.request_type === 'reclamo'} title="Reclamo" description="Disconformidad con el servicio o pago" onClick={() => update('request_type', 'reclamo')} />
              <Choice active={form.request_type === 'queja'} title="Queja" description="Malestar por la atención recibida" onClick={() => update('request_type', 'queja')} />
            </div>
            <Field label="Detalle de lo ocurrido">
              <textarea required minLength={10} rows={6} value={form.detail} onChange={(e) => update('detail', e.target.value)} className="input-field min-h-40 resize-y" />
            </Field>
            <Field label="Pedido concreto del consumidor">
              <textarea required rows={4} value={form.consumer_request} onChange={(e) => update('consumer_request', e.target.value)} className="input-field min-h-32 resize-y" />
            </Field>
          </FormSection>

          <div className="rounded-lg bg-pitch-100 p-4 text-sm text-ink/70">
            TECHDG responderá en un plazo máximo de 30 días calendario. La presentación de esta
            hoja no impide acudir a otras vías de solución de controversias ni es requisito previo
            para presentar una denuncia ante INDECOPI.
          </div>
          {error && <p className="rounded-lg bg-clay/10 p-4 text-sm font-semibold text-clay">{error}</p>}
          <button type="submit" disabled={saving} className="btn-accent btn-lg w-full">
            {saving ? 'Registrando...' : 'Enviar hoja de reclamación'}
          </button>
        </form>
      </div>
      <PublicFooter />
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="space-y-5"><legend className="mb-5 font-display text-2xl font-black">{title}</legend>{children}</fieldset>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label-field">{label}</span>{children}</label>;
}

function Choice({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-20 rounded-lg border p-4 text-left ${active ? 'border-pitch-500 bg-pitch-100' : 'border-forest/15 bg-white'}`}>
      <span className="block font-bold">{title}</span><span className="mt-1 block text-sm text-ink/60">{description}</span>
    </button>
  );
}
