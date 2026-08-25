'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, ChevronRight, Clock3, Home, List, Map, MapPin,
  Navigation, Search, Store, UserRound,
} from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import PublicFooter from '@/components/PublicFooter';
import VenuesMap, { type VenueMapPin } from '@/components/VenuesMap';
import { AMENITIES_BY_SLUG } from '@/lib/amenities';
import { apiFetch, API_URL } from '@/lib/api';

interface PublicVenue {
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
  distancia_km?: number;
}

type CatalogView = 'lista' | 'mapa';

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

export default function HomePage() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [onlyToday, setOnlyToday] = useState(false);
  const [cheapOnly, setCheapOnly] = useState(false);
  const [view, setView] = useState<CatalogView>('lista');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (onlyToday) params.set('disponible_hoy', 'true');
    setLoading(true);
    apiFetch<PublicVenue[]>(`/api/public/venues?${params.toString()}`)
      .then(setVenues)
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [onlyToday]);

  function locateMe() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPos({ lat: coords.latitude, lng: coords.longitude });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 },
    );
  }

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    let result = venues.filter((venue) => {
      const matchesSearch = !search ||
        `${venue.nombre} ${venue.direccion} ${venue.distrito || ''}`.toLowerCase().includes(search);
      const matchesPrice = !cheapOnly || (venue.precio_desde ?? Infinity) <= 80;
      return matchesSearch && matchesPrice;
    });

    if (userPos) {
      result = result
        .map((venue) => ({
          ...venue,
          distancia_km: venue.lat != null && venue.lng != null
            ? distanciaKm(userPos.lat, userPos.lng, venue.lat, venue.lng)
            : undefined,
        }))
        .sort((a, b) => (a.distancia_km ?? Infinity) - (b.distancia_km ?? Infinity));
    }
    return result;
  }, [cheapOnly, q, userPos, venues]);

  const mapVenues: VenueMapPin[] = filtered
    .filter((venue) => venue.lat != null && venue.lng != null)
    .map((venue) => ({
      slug: venue.slug,
      nombre: venue.nombre,
      direccion: venue.direccion,
      lat: venue.lat as number,
      lng: venue.lng as number,
      foto_url: venue.foto_url,
      precio_desde: venue.precio_desde,
      court_count: venue.court_count,
      es_referencial: venue.es_referencial,
    }));

  return (
    <main className="min-h-screen bg-cream pb-24 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-3 px-5 sm:px-6">
          <FubitoLogo size="sm" />
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-lg bg-sky px-3 py-2 text-sm font-semibold text-forest sm:flex">
              <MapPin size={18} />
              Arequipa
            </div>
            <Link href="/login" className="btn-ghost btn-sm hidden md:inline-flex">
              <Store size={18} />
              Administra tu cancha
            </Link>
            <Link
              href="/jugador/login"
              className="grid h-11 w-11 place-items-center rounded-lg border border-forest/15 bg-white text-forest"
              aria-label="Entrar a mi perfil"
            >
              <UserRound size={23} />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-forest/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-7 sm:px-6 sm:pb-10 sm:pt-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-base font-semibold text-pitch-700">Canchas en Arequipa</p>
              <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">
                ¿Dónde quieres jugar?
              </h1>
            </div>
            <div className="hidden rounded-lg bg-sky p-4 text-forest md:block">
              <Navigation size={30} />
            </div>
          </div>

          <label className="relative block max-w-3xl">
            <span className="sr-only">Busca una cancha o distrito</span>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" size={23} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Busca una cancha o distrito"
              className="input-field !pl-12 text-lg"
            />
          </label>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtros rápidos">
            <button
              onClick={locateMe}
              aria-pressed={!!userPos}
              className={`btn-ghost btn-sm shrink-0 ${userPos ? '!border-pitch-500 !bg-pitch-100' : ''}`}
            >
              <Navigation size={18} />
              {gpsLoading ? 'Buscando…' : userPos ? 'Más cerca primero' : 'Cerca de mí'}
            </button>
            <button
              onClick={() => setOnlyToday((value) => !value)}
              aria-pressed={onlyToday}
              className={`btn-ghost btn-sm shrink-0 ${onlyToday ? '!border-pitch-500 !bg-pitch-100' : ''}`}
            >
              <CalendarDays size={18} />
              Para hoy
            </button>
            <button
              onClick={() => setCheapOnly((value) => !value)}
              aria-pressed={cheapOnly}
              className={`btn-ghost btn-sm shrink-0 ${cheapOnly ? '!border-pitch-500 !bg-pitch-100' : ''}`}
            >
              Hasta S/ 80
            </button>
          </div>
        </div>
      </section>

      <section id="canchas" className="mx-auto max-w-6xl px-5 py-7 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-black sm:text-3xl">Canchas cerca de ti</h2>
            <p className="mt-1 text-sm text-ink/55">
              {loading ? 'Buscando canchas…' : `${filtered.length} opciones para comparar`}
            </p>
          </div>
          <div className="flex rounded-lg border border-forest/15 bg-white p-1">
            <button
              onClick={() => setView('lista')}
              aria-label="Ver lista"
              aria-pressed={view === 'lista'}
              className={`grid h-10 w-10 place-items-center rounded-md ${view === 'lista' ? 'bg-forest text-white' : 'text-ink/55'}`}
            >
              <List size={21} />
            </button>
            <button
              onClick={() => setView('mapa')}
              aria-label="Ver mapa"
              aria-pressed={view === 'mapa'}
              className={`grid h-10 w-10 place-items-center rounded-md ${view === 'mapa' ? 'bg-forest text-white' : 'text-ink/55'}`}
            >
              <Map size={21} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="skeleton h-80" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-forest/10 bg-white px-6 py-14 text-center">
            <Search className="mx-auto mb-4 text-ink/25" size={42} />
            <h3 className="font-display text-2xl font-black">No encontramos coincidencias</h3>
            <p className="mt-2 text-ink/60">Prueba otro nombre o quita alguno de los filtros.</p>
          </div>
        ) : view === 'mapa' ? (
          <VenuesMap venues={mapVenues} apiUrl={API_URL} height={540} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((venue) => <VenueCard key={venue.slug} venue={venue} />)}
          </div>
        )}
      </section>

      <section className="border-t border-forest/10 bg-sky/55">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-display text-2xl font-black">¿Administras una cancha?</p>
            <p className="mt-1 text-ink/65">Gestiona reservas, horarios y pagos desde un solo lugar.</p>
          </div>
          <Link href="/login" className="btn-primary w-full sm:w-auto">
            <Store size={20} />
            Ir al panel del dueño
          </Link>
        </div>
      </section>

      <PublicFooter />

      <PublicBottomNav />
    </main>
  );
}

function VenueCard({ venue }: { venue: PublicVenue }) {
  const image = venue.foto_url
    ? (venue.foto_url.startsWith('http') ? venue.foto_url : `${API_URL}${venue.foto_url}`)
    : null;
  const serviceLabels = venue.amenities
    .map((slug) => AMENITIES_BY_SLUG[slug]?.label)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <article className="overflow-hidden rounded-lg border border-forest/10 bg-white shadow-brut">
      <Link href={`/c/${venue.slug}`} className="block aspect-[16/9] overflow-hidden bg-sky">
        {image ? (
          <img src={image} alt={venue.nombre} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
        ) : (
          <div className="grid h-full place-items-center text-forest/35">
            <MapPin size={44} />
          </div>
        )}
      </Link>
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-black leading-tight">{venue.nombre}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink/60">
              <MapPin className="mt-0.5 shrink-0" size={16} />
              <span className="line-clamp-2">{venue.distrito || venue.direccion}</span>
            </p>
          </div>
          {venue.distancia_km !== undefined && (
            <span className="shrink-0 rounded-md bg-sky px-2 py-1 text-xs font-semibold">
              {venue.distancia_km.toFixed(1)} km
            </span>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/60">
          <span className="flex items-center gap-1.5"><Clock3 size={17} />{venue.hora_apertura} a {venue.hora_cierre}</span>
          {serviceLabels.map((label) => <span key={label}>• {label}</span>)}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-forest/10 pt-4">
          <div>
            <p className="text-xs text-ink/50">Desde</p>
            <p className="font-display text-2xl font-black text-clay">
              S/ {venue.precio_desde ?? '—'} <span className="text-sm font-semibold text-ink/55">por hora</span>
            </p>
          </div>
          <Link href={`/c/${venue.slug}`} className="btn-primary btn-sm shrink-0">
            Reservar ahora
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PublicBottomNav() {
  const items = [
    { label: 'Inicio', href: '/', icon: Home, active: true },
    { label: 'Explorar', href: '#canchas', icon: Search },
    { label: 'Reservas', href: '/jugador', icon: CalendarDays },
    { label: 'Perfil', href: '/jugador/login', icon: UserRound },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-forest/10 bg-white/95 backdrop-blur sm:hidden" aria-label="Navegación principal">
      <div className="grid min-h-[72px] grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={`flex flex-col items-center justify-center gap-1 py-2 text-xs font-semibold ${item.active ? 'text-forest' : 'text-ink/55'}`}>
              <span className={`grid h-8 w-12 place-items-center rounded-lg ${item.active ? 'bg-pitch-100' : ''}`}>
                <Icon size={23} strokeWidth={item.active ? 2.6 : 2} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
