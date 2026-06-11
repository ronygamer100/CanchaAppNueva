'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, API_URL, getPlayerToken, clearPlayerToken } from '@/lib/api';
import { AMENITIES, AMENITIES_BY_SLUG } from '@/lib/amenities';
import { DISTRITOS_AREQUIPA } from '@/lib/distritos';
import VenuesMap, { type VenueMapPin } from '@/components/VenuesMap';
import type { Player } from '@/lib/types';

interface ExploreVenue {
  slug: string;
  nombre: string;
  direccion: string;
  distrito?: string | null;
  foto_url?: string | null;
  hora_apertura: string;
  hora_cierre: string;
  amenities: string[];
  court_count: number;
  precio_desde?: number | null;
  lat?: number | null;
  lng?: number | null;
  distancia_km?: number;  // calculada en frontend si hay GPS
}

type Vista = 'lista' | 'mapa';
type Ordenar = 'recientes' | 'precio_asc' | 'precio_desc' | 'nombre' | 'distancia';

// Fórmula Haversine para distancia entre 2 puntos
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function ExplorarPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);

  // Filtros
  const [q, setQ] = useState('');
  const [distrito, setDistrito] = useState('');
  const [precioMax, setPrecioMax] = useState(150);
  const [amenitiesReq, setAmenitiesReq] = useState<string[]>([]);
  const [disponibleHoy, setDisponibleHoy] = useState(false);
  const [ordenar, setOrdenar] = useState<Ordenar>('recientes');

  // Resultados
  const [venues, setVenues] = useState<ExploreVenue[]>([]);
  const [loading, setLoading] = useState(true);

  // Vista
  const [vista, setVista] = useState<Vista>('lista');

  // Geolocalización
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'pidiendo' | 'ok' | 'denegado'>('idle');

  // Auth check
  useEffect(() => {
    if (!getPlayerToken()) {
      router.replace('/jugador/login?next=/jugador/explorar');
      return;
    }
    apiFetch<Player>('/api/player/me', { auth: 'player' })
      .then(setPlayer)
      .catch(() => {
        clearPlayerToken();
        router.replace('/jugador/login?next=/jugador/explorar');
      });
  }, [router]);

  // Fetch resultados con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (distrito) params.set('distrito', distrito);
      if (precioMax < 150) params.set('precio_max', String(precioMax));
      if (amenitiesReq.length) params.set('amenities', amenitiesReq.join(','));
      if (disponibleHoy) params.set('disponible_hoy', 'true');
      if (ordenar !== 'distancia') params.set('ordenar', ordenar);

      setLoading(true);
      apiFetch<ExploreVenue[]>(`/api/public/venues?${params.toString()}`)
        .then((data) => {
          // Calcular distancia si tenemos GPS
          if (userPos) {
            data = data.map((v) => ({
              ...v,
              distancia_km: v.lat != null && v.lng != null
                ? distanciaKm(userPos.lat, userPos.lng, v.lat, v.lng)
                : undefined,
            }));
            // Si ordenar=distancia, ordenar en frontend
            if (ordenar === 'distancia') {
              data.sort((a, b) => (a.distancia_km ?? 9999) - (b.distancia_km ?? 9999));
            }
          }
          setVenues(data);
        })
        .catch(() => setVenues([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, distrito, precioMax, amenitiesReq, disponibleHoy, ordenar, userPos]);

  function pedirGPS() {
    if (!navigator.geolocation) {
      setGpsState('denegado');
      return;
    }
    setGpsState('pidiendo');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState('ok');
      },
      () => setGpsState('denegado'),
      { timeout: 8000 },
    );
  }

  function toggleAmenity(slug: string) {
    setAmenitiesReq((curr) =>
      curr.includes(slug) ? curr.filter((s) => s !== slug) : [...curr, slug],
    );
  }

  function resetFilters() {
    setQ(''); setDistrito(''); setPrecioMax(150);
    setAmenitiesReq([]); setDisponibleHoy(false); setOrdenar('recientes');
  }

  const venuesWithGeo: VenueMapPin[] = useMemo(
    () => venues
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        slug: v.slug, nombre: v.nombre, direccion: v.direccion,
        lat: v.lat as number, lng: v.lng as number,
        foto_url: v.foto_url, precio_desde: v.precio_desde,
        court_count: v.court_count,
      })),
    [venues],
  );

  const activeFiltersCount =
    (q ? 1 : 0) +
    (distrito ? 1 : 0) +
    (precioMax < 150 ? 1 : 0) +
    amenitiesReq.length +
    (disponibleHoy ? 1 : 0);

  if (!player) {
    return <main className="min-h-screen grid place-items-center"><p className="font-mono text-sm text-ink/50">Cargando…</p></main>;
  }

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b-2 border-ink/10 bg-cream sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display font-semibold tracking-tightest">
              cancha<span className="text-pitch-700">.</span>pe
            </Link>
            <Link href="/jugador" className="text-sm hover:underline text-ink/70">
              ← Mis reservas
            </Link>
          </div>
          {player.avatar_url && (
            <img src={player.avatar_url} alt="" referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-ink/20" />
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow mb-2">Explorar</p>
            <h1 className="display-lg">Encuentra tu cancha perfecta</h1>
          </div>

          <div className="flex border-2 border-ink">
            <button
              onClick={() => setVista('lista')}
              className={`px-4 py-2 text-sm font-medium ${
                vista === 'lista' ? 'bg-ink text-cream' : 'bg-cream hover:bg-ink/5'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setVista('mapa')}
              className={`px-4 py-2 text-sm font-medium border-l-2 border-ink ${
                vista === 'mapa' ? 'bg-ink text-cream' : 'bg-cream hover:bg-ink/5'
              }`}
            >
              Mapa
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* SIDEBAR FILTROS */}
          <aside className="card-brut bg-cream lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Filtros</p>
              {activeFiltersCount > 0 && (
                <button onClick={resetFilters} className="text-xs underline text-ink/60 hover:text-ink">
                  Limpiar ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="label-field">Buscador</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre o dirección"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">Distrito</label>
                <select
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todos</option>
                  {DISTRITOS_AREQUIPA.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field flex items-center justify-between">
                  <span>Precio máximo</span>
                  <span className="font-mono text-pitch-700 normal-case tracking-normal">
                    S/{precioMax}/h
                  </span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={150}
                  step={5}
                  value={precioMax}
                  onChange={(e) => setPrecioMax(Number(e.target.value))}
                  className="w-full accent-pitch-700"
                />
                <div className="flex justify-between text-[10px] font-mono text-ink/40 mt-1">
                  <span>S/20</span>
                  <span>S/150</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disponibleHoy}
                    onChange={(e) => setDisponibleHoy(e.target.checked)}
                    className="w-4 h-4 accent-pitch-700"
                  />
                  <span className="text-sm font-medium">Disponible HOY</span>
                </label>
                <p className="text-xs text-ink/50 mt-1 ml-6">
                  Solo canchas con horarios libres hoy
                </p>
              </div>

              <div>
                <label className="label-field">Ordenar por</label>
                <select
                  value={ordenar}
                  onChange={(e) => setOrdenar(e.target.value as Ordenar)}
                  className="input-field"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="precio_asc">Precio: menor a mayor</option>
                  <option value="precio_desc">Precio: mayor a menor</option>
                  <option value="nombre">Nombre A-Z</option>
                  {userPos && <option value="distancia">Distancia (cerca primero)</option>}
                </select>
              </div>

              {!userPos && (
                <button
                  onClick={pedirGPS}
                  disabled={gpsState === 'pidiendo'}
                  className="w-full text-xs border-2 border-ink/20 hover:border-ink py-2 transition-colors"
                >
                  {gpsState === 'idle' && '📍 Usar mi ubicación'}
                  {gpsState === 'pidiendo' && 'Esperando permiso…'}
                  {gpsState === 'denegado' && 'No se pudo obtener ubicación'}
                </button>
              )}
              {userPos && (
                <p className="text-xs font-mono text-pitch-700">
                  ✓ Ubicación detectada
                </p>
              )}

              <div>
                <label className="label-field">Debe tener</label>
                <div className="grid grid-cols-2 gap-1">
                  {AMENITIES.map((a) => {
                    const on = amenitiesReq.includes(a.slug);
                    return (
                      <button
                        key={a.slug}
                        onClick={() => toggleAmenity(a.slug)}
                        className={`text-[10px] border p-1.5 flex flex-col items-center gap-1 transition-colors ${
                          on ? 'bg-ink text-cream border-ink' : 'border-ink/15 hover:border-ink'
                        }`}
                        title={a.label}
                      >
                        <div className="w-4 h-4">{a.icon}</div>
                        <span className="leading-tight text-center">{a.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* RESULTADOS */}
          <section>
            <p className="text-sm text-ink/60 mb-4 font-mono">
              {loading ? 'Buscando…' : `${venues.length} resultado${venues.length === 1 ? '' : 's'}`}
            </p>

            {!loading && venues.length === 0 ? (
              <div className="card-brut bg-cream text-center py-16">
                <SoccerBallIconLocal className="w-16 h-16 mx-auto text-ink/20 mb-4" />
                <p className="text-ink/60 mb-2">No encontramos canchas con esos filtros.</p>
                <button onClick={resetFilters} className="text-sm underline">
                  Limpiar filtros
                </button>
              </div>
            ) : vista === 'lista' ? (
              <div className="grid md:grid-cols-2 gap-4">
                {venues.map((v) => <ExploreCard key={v.slug} v={v} />)}
              </div>
            ) : (
              <VenuesMap venues={venuesWithGeo} apiUrl={API_URL} height={560} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ExploreCard({ v }: { v: ExploreVenue }) {
  const fotoSrc = v.foto_url
    ? (v.foto_url.startsWith('http') ? v.foto_url : `${API_URL}${v.foto_url}`)
    : null;

  return (
    <Link
      href={`/c/${v.slug}`}
      className="card-brut !p-0 overflow-hidden block hover:-translate-y-1 transition-transform"
    >
      <div className="bg-ink h-36 relative overflow-hidden">
        {fotoSrc ? (
          <img src={fotoSrc} alt={v.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-cream/30">
            <SoccerBallIconLocal className="w-12 h-12" />
          </div>
        )}
        {v.precio_desde !== null && v.precio_desde !== undefined && (
          <div className="absolute top-2 right-2 bg-pitch-400 border-2 border-ink px-2 py-1">
            <span className="text-[10px] font-mono uppercase block leading-none">Desde</span>
            <span className="font-display text-lg leading-none">S/{v.precio_desde}<span className="text-xs">/h</span></span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          {v.distrito && (
            <div className="bg-ink/90 text-cream text-[10px] font-mono uppercase px-2 py-1 tracking-wider">
              {v.distrito}
            </div>
          )}
          {v.distancia_km !== undefined && (
            <div className="bg-pitch-400 text-ink text-[10px] font-mono uppercase px-2 py-1 tracking-wider border border-ink">
              ~{v.distancia_km.toFixed(1)} km
            </div>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight mb-1">{v.nombre}</h3>
        <p className="text-xs text-ink/60 truncate">{v.direccion}</p>
        <div className="flex items-center gap-3 mt-3 text-xs font-mono text-ink/60">
          <span>{v.court_count} cancha{v.court_count > 1 ? 's' : ''}</span>
          <span className="opacity-50">·</span>
          <span>{v.hora_apertura}–{v.hora_cierre}</span>
        </div>
        {v.amenities && v.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-ink/10">
            {v.amenities.slice(0, 6).map((slug) => {
              const a = AMENITIES_BY_SLUG[slug];
              if (!a) return null;
              return (
                <div key={slug} className="w-4 h-4 text-ink/60" title={a.label}>
                  {a.icon}
                </div>
              );
            })}
            {v.amenities.length > 6 && (
              <span className="text-[10px] font-mono text-ink/40">+{v.amenities.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function SoccerBallIconLocal({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M16 5L20 9L18 13L14 13L12 9L16 5Z" fill="currentColor" />
      <path d="M27 14L25 18L21 18L19 14L21 10L25 10L27 14Z" fill="currentColor" />
      <path d="M5 14L7 10L11 10L13 14L11 18L7 18L5 14Z" fill="currentColor" />
      <path d="M16 27L12 23L14 19L18 19L20 23L16 27Z" fill="currentColor" />
    </svg>
  );
}
