'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import type { Court } from '@/lib/types';

export default function EditarCanchaPage() {
  const router = useRouter();
  const params = useParams<{ id: string; courtId: string }>();
  const courtId = params.courtId;

  const [court, setCourt] = useState<Court | null>(null);
  const [form, setForm] = useState<{
    nombre: string; tipo: string; precio_hora: number;
    activa: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<Court>(`/api/courts/${courtId}`, { auth: true })
      .then((c) => {
        setCourt(c);
        setForm({
          nombre: c.nombre, tipo: c.tipo || '',
          precio_hora: c.precio_hora,
          activa: c.activa,
        });
      })
      .catch((e) => setError(e.message));
  }, [courtId]);

  function update<K extends string>(k: K, v: unknown) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !court) return;
    setLoading(true); setError(null);
    try {
      await apiFetch(`/api/courts/${court.id}`, {
        method: 'PATCH', auth: true, body: form,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!court) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/courts/${court.id}`, { method: 'DELETE', auth: true });
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
      setDeleting(false);
    }
  }

  if (!form || !court) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p className="font-mono text-sm text-ink/50">{error || 'Cargando…'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="eyebrow mb-3">Editar cancha</p>
        <h1 className="display-lg mb-10">{court.nombre}</h1>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="label-field">Nombre interno</label>
              <input required value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="label-field">Tipo / referencia</label>
              <input value={form.tipo}
                onChange={(e) => update('tipo', e.target.value)}
                placeholder="Fútbol 7 / Fútbol 11 / Fútbol sala"
                className="input-field" />
            </div>
            <div>
              <label className="label-field">Precio por hora (S/)</label>
              <input required type="number" min={1}
                value={form.precio_hora}
                onChange={(e) => update('precio_hora', Number(e.target.value))}
                className="input-field font-mono" />
              <p className="text-xs text-ink/50 mt-1">El jugador pagará el total al reservar.</p>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={form.activa === 1}
                  onChange={(e) => update('activa', e.target.checked ? 1 : 0)}
                  className="w-4 h-4" />
                <span className="font-medium">Cancha disponible para reservar</span>
              </label>
              <p className="text-xs text-ink/60 mt-1 ml-7">
                Desmarcá si querés ocultar esta cancha temporalmente sin borrarla.
              </p>
            </div>
          </div>

          {error && <p className="text-clay text-sm font-medium">{error}</p>}

          <div className="flex gap-3 pt-4 flex-wrap">
            <button type="submit" disabled={loading} className="btn-accent">
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <Link href="/dashboard" className="btn-ghost">Cancelar</Link>
            <button type="button" onClick={() => setShowDelete(true)}
              className="ml-auto text-clay font-medium px-4 py-2 hover:underline">
              Eliminar cancha
            </button>
          </div>
        </form>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-ink/60 z-50 grid place-items-center px-4">
          <div className="card-brut bg-cream max-w-md w-full">
            <p className="eyebrow !text-clay mb-3">Eliminar cancha</p>
            <h3 className="display-lg mb-3 leading-none">¿Seguro?</h3>
            <p className="text-ink/70 mb-6">
              Vas a eliminar <strong>{court.nombre}</strong> con sus reservas. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="bg-clay text-cream font-semibold border-2 border-ink shadow-brut px-4 py-2 hover:-translate-y-0.5 transition-transform">
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setShowDelete(false)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
