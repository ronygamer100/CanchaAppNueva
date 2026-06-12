'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import type { Court, BlockedSlot } from '@/lib/types';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFechaLarga(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function BloqueosPage() {
  const params = useParams<{ id: string; courtId: string }>();
  const courtId = params.courtId;

  const [court, setCourt] = useState<Court | null>(null);
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [form, setForm] = useState({
    fecha: todayISO(),
    hora_inicio: '18:00',
    hora_fin: '20:00',
    motivo: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadBlocks() {
    try {
      const data = await apiFetch<BlockedSlot[]>(
        `/api/courts/${courtId}/blocks?desde=${todayISO()}`,
        { auth: true },
      );
      setBlocks(data);
    } catch {/* */}
  }

  useEffect(() => {
    apiFetch<Court>(`/api/courts/${courtId}`, { auth: true })
      .then(setCourt)
      .catch((e) => setError(e.message));
    loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId]);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await apiFetch(`/api/courts/${courtId}/blocks`, {
        method: 'POST', auth: true, body: form,
      });
      setForm((f) => ({ ...f, motivo: '' }));
      await loadBlocks();
    } catch (err) {
      setError(humanizeError(err));
    } finally { setSaving(false); }
  }

  async function handleDelete(blockId: number) {
    if (!confirm('¿Eliminar este bloqueo? El horario quedará disponible para reservar.')) return;
    try {
      await apiFetch(`/api/blocks/${blockId}`, { method: 'DELETE', auth: true });
      await loadBlocks();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (!court) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p className="font-mono text-sm text-ink/50">{error || 'Cargando…'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="eyebrow mb-3">Bloqueos · {court.nombre}</p>
        <h1 className="display-lg mb-2">Horarios bloqueados</h1>
        <p className="text-ink/70 mb-10">
          Bloquea horarios para mantenimiento, torneos privados, o cualquier motivo. 
          Los jugadores no podrán reservar esos slots.
        </p>

        {/* Formulario para agregar bloqueo */}
        <section className="card-brut bg-cream mb-10">
          <p className="eyebrow mb-4">Agregar nuevo bloqueo</p>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-field">Fecha</label>
              <input required type="date"
                value={form.fecha} min={todayISO()}
                onChange={(e) => update('fecha', e.target.value)}
                className="input-field font-mono" />
            </div>
            <div>
              <label className="label-field">Hora inicio</label>
              <input required type="time"
                value={form.hora_inicio}
                onChange={(e) => update('hora_inicio', e.target.value)}
                className="input-field font-mono" />
            </div>
            <div>
              <label className="label-field">Hora fin</label>
              <input required type="time"
                value={form.hora_fin}
                onChange={(e) => update('hora_fin', e.target.value)}
                className="input-field font-mono" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Motivo (opcional)</label>
              <input value={form.motivo}
                onChange={(e) => update('motivo', e.target.value)}
                placeholder="Ej. Mantenimiento de pasto / Torneo privado"
                className="input-field" />
            </div>

            {error && <p className="text-clay text-sm font-medium sm:col-span-2">{error}</p>}

            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-accent">
                {saving ? 'Guardando…' : 'Bloquear horario'}
              </button>
            </div>
          </form>
        </section>

        {/* Lista de bloqueos */}
        <section>
          <p className="eyebrow mb-4">Bloqueos próximos ({blocks.length})</p>
          {blocks.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-ink/50 font-mono">No hay bloqueos próximos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => (
                <article key={b.id} className="card !p-0 overflow-hidden grid grid-cols-[auto_1fr_auto] items-center gap-0">
                  <div className="bg-ink text-cream p-4 min-w-[140px]">
                    <p className="font-mono text-clay text-xs uppercase tracking-widest">
                      {formatFechaLarga(b.fecha).split(',')[0]}
                    </p>
                    <p className="font-display text-2xl mt-1 leading-none">
                      {b.hora_inicio.slice(0, 5)}
                    </p>
                    <p className="text-cream/50 text-sm font-mono mt-1">
                      → {b.hora_fin.slice(0, 5)}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs capitalize text-ink/60">{formatFechaLarga(b.fecha)}</p>
                    <p className="font-medium mt-1">
                      {b.motivo || <span className="text-ink/40 italic">Sin motivo</span>}
                    </p>
                  </div>
                  <div className="p-4">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-clay text-sm font-medium hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
