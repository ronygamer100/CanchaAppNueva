'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Venue, Court } from '@/lib/types';

export default function NuevaCanchaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [existing, setExisting] = useState<Court[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    tipo: '',
    precio_hora: 60,
    adelanto_monto: 20,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Venue>(`/api/venues/${venueId}`, { auth: true }),
      apiFetch<Court[]>(`/api/venues/${venueId}/courts`, { auth: true }),
    ]).then(([v, cs]) => {
      setVenue(v);
      setExisting(cs);
      // Sugerir nombre incremental
      const next = String.fromCharCode(65 + cs.length); // A, B, C
      setForm((f) => ({ ...f, nombre: `Cancha ${next}` }));
    }).catch((e) => setError(e.message));
  }, [venueId]);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await apiFetch<Court>(`/api/venues/${venueId}/courts`, {
        method: 'POST', auth: true, body: form,
      });
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  async function submitAndAddAnother(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await apiFetch<Court>(`/api/venues/${venueId}/courts`, {
        method: 'POST', auth: true, body: form,
      });
      // Limpiar y refrescar canchas existentes
      const cs = await apiFetch<Court[]>(`/api/venues/${venueId}/courts`, { auth: true });
      setExisting(cs);
      const next = String.fromCharCode(65 + cs.length);
      setForm({ nombre: `Cancha ${next}`, tipo: '', precio_hora: 60, adelanto_monto: 20 });
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            ← Volver al panel
          </Link>
          {existing.length === 0 && (
            <p className="font-mono text-xs text-ink/50">Paso 2 de 2 · Primera cancha</p>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="eyebrow mb-3">{venue?.nombre || 'Nueva cancha'}</p>
        <h1 className="display-lg mb-2">
          {existing.length === 0 ? 'Tu primera cancha' : 'Agregar otra cancha'}
        </h1>
        {existing.length > 0 && (
          <p className="text-ink/70 mb-8">
            Ya tienes {existing.length} cancha{existing.length > 1 ? 's' : ''}: {existing.map((c) => c.nombre).join(', ')}.
          </p>
        )}

        <form onSubmit={submit} className="space-y-6 mt-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="label-field">Nombre interno</label>
              <input required value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Cancha A"
                className="input-field" />
              <p className="text-xs text-ink/50 mt-1">Cómo la verá el jugador.</p>
            </div>

            <div>
              <label className="label-field">Tipo / referencia (opcional)</label>
              <input value={form.tipo}
                onChange={(e) => update('tipo', e.target.value)}
                placeholder="Fútbol 7 / Fútbol 11 / Fútbol sala"
                className="input-field" />
              <p className="text-xs text-ink/50 mt-1">Ayuda al jugador a elegir.</p>
            </div>

            <div>
              <label className="label-field">Precio por hora (S/)</label>
              <input required type="number" min={1}
                value={form.precio_hora}
                onChange={(e) => update('precio_hora', Number(e.target.value))}
                className="input-field font-mono" />
            </div>

            <div>
              <label className="label-field">Adelanto requerido (S/)</label>
              <input required type="number" min={0}
                value={form.adelanto_monto}
                onChange={(e) => update('adelanto_monto', Number(e.target.value))}
                className="input-field font-mono" />
              <p className="text-xs text-ink/50 mt-1">Por hora reservada.</p>
            </div>
          </div>

          {error && <p className="text-clay text-sm font-medium">{error}</p>}

          <div className="flex gap-3 pt-4 flex-wrap">
            <button type="submit" disabled={loading} className="btn-accent">
              {loading ? 'Guardando…' : 'Crear cancha'}
            </button>
            <button type="button" onClick={submitAndAddAnother} disabled={loading} className="btn-ghost">
              Crear y agregar otra
            </button>
            <Link href="/dashboard" className="text-ink/60 hover:text-ink px-4 py-2">
              Volver al panel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
