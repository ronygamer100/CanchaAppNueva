'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, API_URL } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import { showToast } from '@/components/Toast';
import type { Venue } from '@/lib/types';
import { DISTRITOS_AREQUIPA } from '@/lib/distritos';
import MapPicker, { AREQUIPA_CENTER } from '@/components/MapPicker';
import ConfirmationModePicker from '@/components/ConfirmationModePicker';
import AmenitiesPicker from '@/components/AmenitiesPicker';
import PageHeader from '@/components/PageHeader';

type FormState = {
  nombre: string;
  direccion: string;
  descripcion: string;
  distrito: string;
  hora_apertura: string;
  hora_cierre: string;
  lat: number | null;
  lng: number | null;
  modo_confirmacion: 'manual' | 'auto';
  auto_confirm_minutes: number;
  amenities: string[];
};

export default function EditarVenuePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [yapeQr, setYapeQr] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<Venue>(`/api/venues/${venueId}`, { auth: true })
      .then((v) => {
        setVenue(v);
        setForm({
          nombre: v.nombre, direccion: v.direccion,
          descripcion: v.descripcion || '',
          distrito: v.distrito || '',
          hora_apertura: v.hora_apertura.slice(0, 5),
          hora_cierre: v.hora_cierre.slice(0, 5),
          lat: v.lat ?? null, lng: v.lng ?? null,
          modo_confirmacion: v.modo_confirmacion,
          auto_confirm_minutes: v.auto_confirm_minutes,
          amenities: v.amenities || [],
        });
      })
      .catch((e) => setError(e.message));
  }, [venueId]);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !venue) return;
    setLoading(true); setError(null);
    try {
      await apiFetch<Venue>(`/api/venues/${venue.id}`, {
        method: 'PATCH', auth: true, body: form,
      });
      const uploads: Promise<unknown>[] = [];
      if (foto) {
        const fd = new FormData(); fd.append('kind', 'foto'); fd.append('file', foto);
        uploads.push(apiFetch(`/api/venues/${venue.id}/upload`, {
          method: 'POST', auth: true, formData: fd,
        }));
      }
      if (yapeQr) {
        const fd = new FormData(); fd.append('kind', 'yape_qr'); fd.append('file', yapeQr);
        uploads.push(apiFetch(`/api/venues/${venue.id}/upload`, {
          method: 'POST', auth: true, formData: fd,
        }));
      }
      await Promise.all(uploads);
      showToast('Negocio actualizado correctamente');
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!venue) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/venues/${venue.id}`, { method: 'DELETE', auth: true });
      router.push('/dashboard');
    } catch (err) {
      setError(humanizeError(err));
      setDeleting(false);
    }
  }

  if (!form || !venue) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p className="font-mono text-sm text-ink/50">{error || 'Cargando…'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <PageHeader
          eyebrow="Editar negocio"
          title={venue.nombre}
          description="Configura los datos generales de tu local"
          backHref="/dashboard"
          backLabel="← Panel"
          actions={
            <a
              href={`/c/${venue.slug}`}
              target="_blank"
              className="btn-ghost btn-sm font-mono"
            >
              Ver público ↗
            </a>
          }
        />

        <form onSubmit={submit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="label-field">Nombre comercial</label>
              <input required value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="label-field">URL pública (no editable)</label>
              <div className="font-mono text-sm bg-ink/5 border-2 border-ink/20 px-3 py-3">
                fubito/c/{venue.slug}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label-field">Dirección</label>
              <input required value={form.direccion}
                onChange={(e) => update('direccion', e.target.value)}
                className="input-field" />
            </div>

            <div className="md:col-span-2">
              <label className="label-field">Distrito</label>
              <select
                value={form.distrito}
                onChange={(e) => update('distrito', e.target.value)}
                className="input-field"
              >
                <option value="">— Selecciona —</option>
                {DISTRITOS_AREQUIPA.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label-field">Ubicación</label>
              <p className="text-xs text-ink/60 mb-2">
                Arrastra el pin o haz click para mover. La dirección se actualiza sola.
              </p>
              <MapPicker
                lat={form.lat ?? AREQUIPA_CENTER[0]}
                lng={form.lng ?? AREQUIPA_CENTER[1]}
                onPick={(lat, lng) => { update('lat', lat); update('lng', lng); }}
                onAddressResolved={(addr) => update('direccion', addr)}
                height={280}
              />
              {form.lat && form.lng && (
                <p className="text-xs font-mono text-pitch-700 mt-2">
                  ✓ {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </p>
              )}
            </div>

            <div>
              <label className="label-field">Hora de apertura</label>
              <input required type="time" value={form.hora_apertura}
                onChange={(e) => update('hora_apertura', e.target.value)}
                className="input-field font-mono" />
            </div>
            <div>
              <label className="label-field">Hora de cierre</label>
              <input required type="time" value={form.hora_cierre}
                onChange={(e) => update('hora_cierre', e.target.value)}
                className="input-field font-mono" />
            </div>
          </div>

          <ConfirmationModePicker
            modo={form.modo_confirmacion}
            minutos={form.auto_confirm_minutes}
            onChangeModo={(m) => update('modo_confirmacion', m)}
            onChangeMinutos={(n) => update('auto_confirm_minutes', n)}
          />

          <AmenitiesPicker
            selected={form.amenities}
            onChange={(a) => update('amenities', a)}
          />

          <div className="grid md:grid-cols-2 gap-5 pt-4 border-t-2 border-ink/10">
            <div>
              <label className="label-field">
                Foto {venue.foto_url && '(sube para reemplazar)'}
              </label>
              {venue.foto_url && (
                <img
                  src={venue.foto_url.startsWith('http') ? venue.foto_url : `${API_URL}${venue.foto_url}`}
                  alt="" className="w-full h-32 object-cover border-2 border-ink/20 mb-2"
                />
              )}
              <input type="file" accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
                className="block w-full file:bg-ink file:text-cream file:border-0 file:px-4 file:py-2 file:font-semibold file:mr-4 file:cursor-pointer text-sm"
              />
            </div>
            <div>
              <label className="label-field">
                QR Yape {venue.yape_qr_url && '(sube para reemplazar)'}
              </label>
              {venue.yape_qr_url && (
                <img
                  src={venue.yape_qr_url.startsWith('http') ? venue.yape_qr_url : `${API_URL}${venue.yape_qr_url}`}
                  alt="" className="w-32 h-32 object-contain border-2 border-ink/20 mb-2"
                />
              )}
              <input type="file" accept="image/*"
                onChange={(e) => setYapeQr(e.target.files?.[0] || null)}
                className="block w-full file:bg-ink file:text-cream file:border-0 file:px-4 file:py-2 file:font-semibold file:mr-4 file:cursor-pointer text-sm"
              />
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
              Eliminar negocio
            </button>
          </div>
        </form>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-ink/60 z-50 grid place-items-center px-4">
          <div className="card-brut bg-cream max-w-md w-full">
            <p className="eyebrow !text-clay mb-3">Eliminar negocio</p>
            <h3 className="display-lg mb-3 leading-none">¿Seguro?</h3>
            <p className="text-ink/70 mb-6">
              Vas a eliminar <strong>{venue.nombre}</strong>, todas sus canchas, reservas y bloqueos. No se puede deshacer.
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
