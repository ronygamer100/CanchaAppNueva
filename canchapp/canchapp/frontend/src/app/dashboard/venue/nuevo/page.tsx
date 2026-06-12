'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Venue } from '@/lib/types';
import { DISTRITOS_AREQUIPA } from '@/lib/distritos';
import { showToast } from '@/components/Toast';
import MapPicker, { AREQUIPA_CENTER } from '@/components/MapPicker';
import ConfirmationModePicker from '@/components/ConfirmationModePicker';
import AmenitiesPicker from '@/components/AmenitiesPicker';

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);
}

export default function NuevoVenuePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    direccion: '',
    descripcion: '',
    distrito: '',
    hora_apertura: '06:00',
    hora_cierre: '23:00',
    lat: null as number | null,
    lng: null as number | null,
    modo_confirmacion: 'manual' as 'manual' | 'auto',
    auto_confirm_minutes: 120,
    amenities: [] as string[],
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [yapeQr, setYapeQr] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Si el usuario edita el slug manualmente, dejamos de autogenerar
  const [slugEdited, setSlugEdited] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const venue = await apiFetch<Venue>('/api/venues', {
        method: 'POST', auth: true,
        body: { ...form, slug: form.slug || slugify(form.nombre) },
      });
      const uploads: Promise<unknown>[] = [];
      if (foto) {
        const fd = new FormData();
        fd.append('kind', 'foto'); fd.append('file', foto);
        uploads.push(apiFetch(`/api/venues/${venue.id}/upload`, {
          method: 'POST', auth: true, formData: fd,
        }));
      }
      if (yapeQr) {
        const fd = new FormData();
        fd.append('kind', 'yape_qr'); fd.append('file', yapeQr);
        uploads.push(apiFetch(`/api/venues/${venue.id}/upload`, {
          method: 'POST', auth: true, formData: fd,
        }));
      }
      await Promise.all(uploads);
      showToast('¡Negocio creado! Ahora agrega tu primera cancha.');
      router.push(`/dashboard/venue/${venue.id}/cancha/nueva`);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            ← Volver al panel
          </Link>
          <p className="font-mono text-xs text-ink/50">Paso 1 de 2 · Datos del local</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="eyebrow mb-3">Nuevo negocio</p>
        <h1 className="display-lg mb-2">Cuéntanos del local.</h1>
        <p className="text-ink/70 mb-10">Después agregamos las canchas que tiene.</p>

        <form onSubmit={submit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="label-field">Nombre comercial</label>
              <input
                required value={form.nombre}
                onChange={(e) => {
                  const nombre = e.target.value;
                  update('nombre', nombre);
                  if (!slugEdited) {
                    update('slug', slugify(nombre));
                  }
                }}
                placeholder="Ej. Sintética Los Olivos"
                className="input-field"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label-field">URL pública</label>
              <div className="flex items-center border-2 border-ink/20 focus-within:border-ink">
                <span className="px-3 text-ink/50 font-mono text-sm bg-ink/5 py-3 border-r-2 border-ink/20 whitespace-nowrap">
                  cancha.pe/c/
                </span>
                <input
                  required value={form.slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    update('slug', slugify(e.target.value));
                  }}
                  placeholder="mis-canchas"
                  className="flex-1 px-3 py-3 bg-cream font-mono text-sm focus:outline-none min-w-0"
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="text-xs text-ink/50 mt-1">
                {form.slug
                  ? <>Se generó automáticamente del nombre. Puedes editarlo.</>
                  : <>Se genera automáticamente al escribir el nombre.</>
                }
              </p>
              {form.slug && (
                <p className="text-xs font-mono text-pitch-700 mt-1">
                  Preview: cancha.pe/c/{form.slug}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label-field">Dirección</label>
              <input
                required value={form.direccion}
                onChange={(e) => update('direccion', e.target.value)}
                placeholder="Av. Ejército 123, Cayma, Arequipa"
                className="input-field"
              />
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
              <p className="text-xs text-ink/50 mt-1">
                Ayuda a los jugadores a encontrarte filtrando por distrito.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="label-field">Ubicación en el mapa</label>
              <p className="text-xs text-ink/60 mb-2">
                Arrastra el pin o haz click. La dirección se completará sola.
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
              <input
                required type="time"
                value={form.hora_apertura}
                onChange={(e) => update('hora_apertura', e.target.value)}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="label-field">Hora de cierre</label>
              <input
                required type="time"
                value={form.hora_cierre}
                onChange={(e) => update('hora_cierre', e.target.value)}
                className="input-field font-mono"
              />
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
              <label className="label-field">Foto del local (opcional)</label>
              <input
                type="file" accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
                className="block w-full file:bg-ink file:text-cream file:border-0 file:px-4 file:py-2 file:font-semibold file:mr-4 file:cursor-pointer text-sm"
              />
            </div>
            <div>
              <label className="label-field">QR de Yape (opcional, se usa para todas tus canchas)</label>
              <input
                type="file" accept="image/*"
                onChange={(e) => setYapeQr(e.target.files?.[0] || null)}
                className="block w-full file:bg-ink file:text-cream file:border-0 file:px-4 file:py-2 file:font-semibold file:mr-4 file:cursor-pointer text-sm"
              />
            </div>
          </div>

          {error && <p className="text-clay text-sm font-medium">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-accent">
              {loading ? 'Guardando…' : 'Continuar a agregar canchas →'}
            </button>
            <Link href="/dashboard" className="btn-ghost">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
