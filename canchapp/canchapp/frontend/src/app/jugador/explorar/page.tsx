'use client';

import { LoadingScreen } from '@/components/Skeleton';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, API_URL, getPlayerToken, clearPlayerToken } from '@/lib/api';
import { AMENITIES, AMENITIES_BY_SLUG } from '@/lib/amenities';
import { DISTRITOS_AREQUIPA } from '@/lib/distritos';
import VenuesMap, { type VenueMapPin } from '@/components/VenuesMap';
import type { Player } from '@/lib/types';
import FubitoLogo from '@/components/FubitoLogo';
import {
  ChevronRight,
  Clock3,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  SlidersHorizontal,
  X,
} from 'lucide-react';

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
  es_referencial?: boolean;
  reservas_habilitadas?: boolean;
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
  // Drawer de filtros en mobile
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    if (!showFiltersMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showFiltersMobile]);

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
        es_referencial: v.es_referencial,
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
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-cream pb-24 lg:pb-0">
      {/* Header */}
      <header className="border-b border-ink/10 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <FubitoLogo href="/jugador" />
            <Link href="/jugador" className="hidden sm:inline text-sm font-medium text-ink/60 hover:text-ink">
              Mis reservas
            </Link>
          </div>
          {player.avatar_url && (
            <img src={player.avatar_url} alt="" referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-ink/20" />
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-7">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="eyebrow mb-1">Explorar canchas</p>
            <h1 className="text-2xl sm:text-4xl font-display font-bold">¿Dónde quieres jugar?</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón filtros mobile */}
            <button
              type="button"
              onClick={() => setShowFiltersMobile(true)}
              className="lg:hidden min-h-12 flex items-center gap-2 rounded-lg border border-forest/20 bg-white px-4 text-sm font-semibold text-forest"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            <div className="flex rounded-lg border border-forest/20 bg-white p-1" aria-label="Tipo de vista">
              <button
                onClick={() => setVista('lista')}
                className={`min-h-10 flex items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                  vista === 'lista' ? 'bg-forest text-white' : 'text-forest hover:bg-sky/50'
                }`}
              >
                <List className="w-4 h-4" aria-hidden="true" /> Lista
              </button>
              <button
                onClick={() => setVista('mapa')}
                className={`min-h-10 flex items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                  vista === 'mapa' ? 'bg-forest text-white' : 'text-forest hover:bg-sky/50'
                }`}
              >
                <MapIcon className="w-4 h-4" aria-hidden="true" /> Mapa
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* SIDEBAR FILTROS — visible en lg+; en mobile aparece como drawer overlay */}
          {showFiltersMobile && (
            <div
              className="fixed inset-0 z-[1200] bg-forest/45 lg:hidden"
              onClick={() => setShowFiltersMobile(false)}
            />
          )}
          <aside className={`
            card-brut bg-white
            ${showFiltersMobile
              ? 'fixed inset-x-0 bottom-0 top-16 z-[1210] overflow-y-auto overscroll-contain !rounded-t-lg !rounded-b-none !border-x-0 !border-b-0'
              : 'hidden'
            }
            lg:!relative lg:!inset-auto lg:block lg:sticky lg:top-24 lg:self-start
          `}>
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Filtros</p>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="text-xs underline text-ink/60 hover:text-ink">
                    Limpiar ({activeFiltersCount})
                  </button>
                )}
                {/* Botón cerrar solo en mobile */}
                <button
                  onClick={() => setShowFiltersMobile(false)}
                  className="icon-button lg:hidden"
                  aria-label="Cerrar filtros"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
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
                  <span className="text-pitch-800 normal-case">
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
                <div className="flex justify-between text-xs text-ink/40 mt-1">
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
                  className="btn-ghost w-full text-sm"
                >
                  {gpsState === 'idle' && <><LocateFixed className="w-4 h-4" aria-hidden="true" /> Usar mi ubicación</>}
                  {gpsState === 'pidiendo' && 'Esperando permiso…'}
                  {gpsState === 'denegado' && 'No se pudo obtener ubicación'}
                </button>
              )}
              {userPos && (
                <p className="text-sm font-semibold text-pitch-800">
                  Ubicación detectada
                </p>
              )}

              <div>
                <label className="label-field">Debe tener</label>
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">
                  {AMENITIES.map((a) => {
                    const on = amenitiesReq.includes(a.slug);
                    return (
                      <button
                        key={a.slug}
                        onClick={() => toggleAmenity(a.slug)}
                        className={`min-h-16 rounded-lg border p-2 text-xs flex flex-col items-center justify-center gap-1 transition-colors ${
                          on ? 'bg-forest text-white border-forest' : 'bg-white border-forest/15 hover:border-forest'
                        }`}
                        title={a.label}
                      >
                        <div className="w-5 h-5">{a.icon}</div>
                        <span className="leading-tight text-center line-clamp-2">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer del drawer mobile: aplicar y cerrar */}
            <button
              onClick={() => setShowFiltersMobile(false)}
              className="lg:hidden btn-accent w-full mt-6"
            >
              Ver {venues.length} resultado{venues.length === 1 ? '' : 's'}
            </button>
          </aside>

          {/* RESULTADOS */}
          <section className={showFiltersMobile ? 'invisible lg:visible' : ''}>
            <p className="text-sm text-ink/60 mb-4">
              {loading ? 'Buscando…' : `${venues.length} resultado${venues.length === 1 ? '' : 's'}`}
            </p>

            {!loading && venues.length === 0 ? (
              <div className="card-brut bg-white text-center py-16">
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
      className="card-brut !p-0 overflow-hidden block bg-white hover:border-pitch-700 transition-colors"
    >
      <div className="bg-forest aspect-[16/9] relative overflow-hidden">
        {fotoSrc ? (
          <img src={fotoSrc} alt={v.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-cream/30">
            <SoccerBallIconLocal className="w-12 h-12" />
          </div>
        )}
        {v.precio_desde !== null && v.precio_desde !== undefined && (
          <div className="absolute top-3 right-3 rounded-lg bg-white px-3 py-2 shadow-md">
            <span className="text-xs text-ink/60 block leading-none">
              {v.es_referencial ? 'Precio ref.' : 'Desde'}
            </span>
            <span className="font-display text-xl leading-none text-forest">S/{v.precio_desde}<span className="text-xs">/h</span></span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          {v.distrito && (
            <div className="rounded-md bg-forest/95 text-white text-xs font-semibold px-2.5 py-1.5">
              {v.distrito}
            </div>
          )}
          {v.es_referencial && (
            <div className="rounded-md bg-white text-ink text-xs px-2.5 py-1.5">
              Referencial
            </div>
          )}
          {v.distancia_km !== undefined && (
            <div className="rounded-md bg-pitch-100 text-forest text-xs font-semibold px-2.5 py-1.5">
              ~{v.distancia_km.toFixed(1)} km
            </div>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl leading-tight mb-2">{v.nombre}</h3>
        <p className="flex items-center gap-1.5 text-sm text-ink/60 truncate">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> {v.direccion}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-ink/60">
          <span>{v.court_count} cancha{v.court_count > 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="w-4 h-4" aria-hidden="true" /> {v.hora_apertura} a {v.hora_cierre}
          </span>
        </div>
        {v.amenities && v.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ink/10">
            {v.amenities.slice(0, 6).map((slug) => {
              const a = AMENITIES_BY_SLUG[slug];
              if (!a) return null;
              return (
                <div key={slug} className="w-5 h-5 text-forest" title={a.label}>
                  {a.icon}
                </div>
              );
            })}
            {v.amenities.length > 6 && (
              <span className="text-xs text-ink/40">+{v.amenities.length - 6}</span>
            )}
          </div>
        )}
        <div className="mt-4 flex min-h-12 items-center justify-between border-t border-ink/10 pt-4 text-sm font-semibold text-forest">
          Ver horarios <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </div>
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
