'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, API_URL } from '@/lib/api';
import { AMENITIES_BY_SLUG } from '@/lib/amenities';
import VenuesMap, { type VenueMapPin } from '@/components/VenuesMap';

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
}

type Tab = 'duenos' | 'jugadores';
type CatalogView = 'lista' | 'mapa';

// Foto Unsplash de dashboard/laptop business
const HERO_BG_DUENOS = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=80';
// Foto Unsplash de cancha con jugadores
const HERO_BG_JUGADORES = 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=2000&q=80';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('duenos');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [catalogView, setCatalogView] = useState<CatalogView>('lista');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#jugadores') {
      setTab('jugadores');
    }
  }, []);

  // Cuando cambia el tab, resetear vista del catálogo a lista (dueños no tienen mapa)
  useEffect(() => {
    if (tab === 'duenos') setCatalogView('lista');
  }, [tab]);

  useEffect(() => {
    apiFetch<PublicVenue[]>('/api/public/venues')
      .then(setVenues)
      .catch(() => setVenues([]))
      .finally(() => setLoadingVenues(false));
  }, []);

  const venuesWithGeo: VenueMapPin[] = venues
    .filter((v) => v.lat != null && v.lng != null)
    .map((v) => ({
      slug: v.slug, nombre: v.nombre, direccion: v.direccion,
      lat: v.lat as number, lng: v.lng as number,
      foto_url: v.foto_url, precio_desde: v.precio_desde,
      court_count: v.court_count,
      es_referencial: v.es_referencial,
    }));

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className={`border-b-2 sticky top-0 z-30 transition-colors ${
        tab === 'duenos' ? 'border-ink/10 bg-cream' : 'border-pitch-400/30 bg-pitch-900'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2">
            <div className={`w-8 h-8 grid place-items-center ${
              tab === 'duenos' ? 'bg-pitch-900' : 'bg-pitch-400'
            }`}>
              <SoccerBallIcon className={`w-5 h-5 ${tab === 'duenos' ? 'text-pitch-400' : 'text-pitch-900'}`} />
            </div>
            <span className={`font-display font-semibold text-xl tracking-tightest ${
              tab === 'duenos' ? 'text-ink' : 'text-cream'
            }`}>
              fubito
            </span>
          </Link>

          <div className={`flex border-2 ${tab === 'duenos' ? 'border-ink' : 'border-pitch-400'}`}>
            <button
              onClick={() => setTab('duenos')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'duenos'
                  ? 'bg-ink text-cream'
                  : 'bg-transparent text-cream hover:bg-cream/10'
              }`}
            >
              Soy dueño
            </button>
            <button
              onClick={() => setTab('jugadores')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l-2 ${
                tab === 'jugadores'
                  ? 'bg-pitch-400 text-pitch-900 border-pitch-400'
                  : 'bg-transparent text-ink hover:bg-ink/5 border-ink'
              }`}
            >
              Soy jugador
            </button>
          </div>

          <nav className="flex items-center gap-2">
            {tab === 'duenos' ? (
              <>
                <Link href="/login" className="text-sm font-medium px-3 py-2 hover:underline">
                  Entrar
                </Link>
                <Link href="/register" className="btn-accent !py-2 !px-4 text-sm">
                  Registrar cancha
                </Link>
              </>
            ) : (
              <Link
                href="/jugador/login"
                className="bg-pitch-400 text-pitch-900 border-2 border-pitch-400 hover:bg-pitch-500 !py-2 !px-4 text-sm font-semibold transition-colors"
              >
                Entrar con Google
              </Link>
            )}
          </nav>
        </div>
      </header>

      {tab === 'duenos' ? <HeroDuenos /> : <HeroJugadores />}

      {/* CATÁLOGO */}
      <section id="catalogo" className={`border-t-2 ${
        tab === 'duenos' ? 'bg-cream border-ink/10' : 'bg-pitch-50 border-pitch-400/30'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <p className="eyebrow mb-3">
                {tab === 'duenos' ? 'La competencia local' : 'Encuentra tu cancha'}
              </p>
              <h2 className="display-lg">
                {venues.length > 0
                  ? `${venues.length} canchas en Arequipa`
                  : 'Aún no hay canchas registradas'}
              </h2>
              {tab === 'jugadores' && venues.length > 0 && (
                <p className="text-ink/70 mt-2 text-sm">
                  ¿Buscas algo más específico? <Link href="/jugador/explorar" className="underline font-medium">Usa los filtros avanzados →</Link>
                </p>
              )}
            </div>

            {/* Toggle Lista/Mapa SOLO en sección jugadores */}
            {venues.length > 0 && tab === 'jugadores' && (
              <div className="flex border-2 border-ink">
                <button
                  onClick={() => setCatalogView('lista')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    catalogView === 'lista' ? 'bg-ink text-cream' : 'bg-cream hover:bg-ink/5'
                  }`}
                >
                  <ListIcon className="w-4 h-4" /> Lista
                </button>
                <button
                  onClick={() => setCatalogView('mapa')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-l-2 border-ink ${
                    catalogView === 'mapa' ? 'bg-ink text-cream' : 'bg-cream hover:bg-ink/5'
                  }`}
                >
                  <MapIcon className="w-4 h-4" /> Mapa
                  {venuesWithGeo.length > 0 && (
                    <span className="font-mono text-xs opacity-60">({venuesWithGeo.length})</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {loadingVenues ? (
            <p className="font-mono text-sm text-ink/50">Cargando…</p>
          ) : venues.length === 0 ? (
            <div className="border-2 border-ink/10 p-10 text-center">
              <SoccerBallIcon className="w-16 h-16 mx-auto text-ink/20 mb-4" />
              <p className="text-ink/60 mb-4">
                Sé el primer local en Arequipa. Es gratis los primeros 60 días.
              </p>
              <Link href="/register" className="btn-accent">Registrar mi cancha</Link>
            </div>
          ) : catalogView === 'lista' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {venues.map((v) => <VenueCard key={v.slug} v={v} />)}
            </div>
          ) : (
            <div>
              <VenuesMap venues={venuesWithGeo} apiUrl={API_URL} height={520} />
              {venuesWithGeo.length < venues.length && (
                <p className="text-xs text-ink/50 mt-3 font-mono">
                  Mostrando {venuesWithGeo.length} de {venues.length} canchas. Las que no aparecen no tienen ubicación geográfica.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-pitch-900 text-cream/70 py-10 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 bg-cream grid place-items-center">
              <SoccerBallIcon className="w-4 h-4 text-pitch-900" />
            </div>
            <p className="font-display text-cream text-lg">
              fubito
            </p>
          </div>
          <p>Hecho en Arequipa, para Arequipa.</p>
        </div>
      </footer>
    </main>
  );
}

// ============ Hero DUEÑOS — paleta profesional, foto laptop ============
function HeroDuenos() {
  return (
    <>
      <section
        className="relative min-h-[520px] flex items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 30, 22, 0.92), rgba(10, 30, 22, 0.85)), url(${HERO_BG_DUENOS})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20 relative w-full">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8 text-cream">
              <div className="inline-flex items-center gap-2 bg-pitch-400/10 border border-pitch-400/30 px-3 py-1 mb-6">
                <ChartIcon className="w-4 h-4 text-pitch-400" />
                <span className="font-mono text-xs text-pitch-400 uppercase tracking-widest">
                  Panel para dueños
                </span>
              </div>
              <h1 className="display-xl mb-6 leading-[0.95]">
                Tu cancha,<br />
                <span className="text-pitch-400">como un negocio.</span>
              </h1>
              <p className="text-lg text-cream/80 max-w-2xl mb-8">
                Reservas online, dashboard de ingresos, métricas exportables a Excel.
                Operación profesional sin perseguir WhatsApps todo el día.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register" className="btn-accent">
                  Registrar mi cancha →
                </Link>
                <Link href="/login" className="bg-cream/10 hover:bg-cream/20 text-cream border-2 border-cream/20 hover:border-cream/40 px-5 py-3 font-medium transition-colors">
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
            <div className="md:col-span-4 text-sm space-y-3 text-cream md:border-l-2 md:border-pitch-400/30 md:pl-6">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl text-pitch-400">60</span>
                <span className="text-cream/70">días gratis</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl text-pitch-400">5</span>
                <span className="text-cream/70">min para empezar</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl text-pitch-400">0</span>
                <span className="text-cream/70">contratos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — tono business */}
      <section className="bg-cream py-20 md:py-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <p className="eyebrow mb-3">Herramientas que obtienes</p>
          <h2 className="display-lg mb-12 max-w-2xl">Software de gestión, no solo un link.</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-ink/10 border-2 border-ink">
            <FeatureLight icon={<ChartIcon />} num="01" titulo="Dashboard de ingresos"
              desc="Ingresos por día, hora más popular, cancha top. Exportable a Excel." />
            <FeatureLight icon={<CalendarIcon />} num="02" titulo="Calendario semanal"
              desc="Vista grid de todas las reservas. Filtra por cancha." />
            <FeatureLight icon={<InboxIcon />} num="03" titulo="Buzón de pendientes"
              desc="Reservas nuevas con captura Yape. Confirmas con un click." />
            <FeatureLight icon={<ClockIcon />} num="04" titulo="Auto-confirmación"
              desc="Si no quieres revisar todo, configura 30 min / 1h / 2h y se confirman solas." />
            <FeatureLight icon={<LockIcon />} num="05" titulo="Bloqueos de horario"
              desc="Mantenimiento, torneos privados, eventos. Bloqueas y nadie reserva." />
            <FeatureLight icon={<UsersIcon />} num="06" titulo="Múltiples canchas"
              desc="Un local con varias canchas. Cada una con su precio y características." />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-pitch-900 text-cream">
        <div className="max-w-4xl mx-auto">
          <p className="eyebrow !text-pitch-400 mb-3">Cómo empezar</p>
          <h2 className="display-lg mb-12">3 pasos, 5 minutos.</h2>
          <div className="space-y-6">
            <StepDark n="1" title="Crea tu cuenta con Google"
              desc="Un click. No necesitas contraseña ni email de verificación." />
            <StepDark n="2" title="Registra tu local y tus canchas"
              desc="Datos básicos, foto, ubicación en el mapa, precio y QR Yape." />
            <StepDark n="3" title="Comparte el link con tus clientes"
              desc="Te queda una URL tipo fubito/c/tu-negocio. Pégala en Instagram, WhatsApp, Google Maps." />
          </div>
          <div className="mt-12 text-center">
            <Link href="/register" className="btn-accent">Empezar ahora →</Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ============ Hero JUGADORES — paleta deportiva, foto cancha ============
function HeroJugadores() {
  return (
    <>
      <section
        className="relative min-h-[520px] flex items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(14, 59, 46, 0.7), rgba(14, 59, 46, 0.55)), url(${HERO_BG_JUGADORES})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20 relative w-full">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8 text-cream">
              <div className="inline-flex items-center gap-2 bg-pitch-400 text-pitch-900 px-3 py-1 mb-6 font-semibold">
                <SoccerBallIcon className="w-4 h-4" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  Para jugadores
                </span>
              </div>
              <h1 className="display-xl mb-6 leading-[0.95]">
                Encuentra tu cancha,<br />
                <span className="text-pitch-400">arma el partido.</span>
              </h1>
              <p className="text-lg text-cream/90 max-w-2xl mb-8">
                Reserva online en minutos. Paga adelanto con Yape. Sin llamadas,
                sin esperar al dueño en la puerta.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/jugador/login"
                  className="bg-pitch-400 text-pitch-900 border-2 border-pitch-400 hover:bg-pitch-500 px-5 py-3 font-semibold transition-colors"
                >
                  Entrar con Google →
                </Link>
                <a href="#catalogo" className="bg-cream/10 hover:bg-cream/20 text-cream border-2 border-cream/30 hover:border-cream/50 px-5 py-3 font-medium transition-colors">
                  Ver canchas disponibles
                </a>
              </div>
            </div>
            <div className="md:col-span-4 text-cream/90 md:border-l-2 md:border-pitch-400/40 md:pl-6 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <SoccerBallIcon className="w-5 h-5 text-pitch-400 shrink-0" />
                <span>Reservas 24/7 desde el cel</span>
              </div>
              <div className="flex items-center gap-3">
                <YapeIcon className="w-5 h-5 text-pitch-400 shrink-0" />
                <span>Pagas con Yape</span>
              </div>
              <div className="flex items-center gap-3">
                <HistoryIcon className="w-5 h-5 text-pitch-400 shrink-0" />
                <span>Historial de tus partidos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features jugadores — paleta verde lima */}
      <section className="bg-pitch-400 py-20 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <SoccerFieldDecor className="w-[600px] h-[600px]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative">
          <p className="eyebrow mb-3">Cómo funciona</p>
          <h2 className="display-lg mb-12 max-w-2xl">Tan simple como pedir un Uber.</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureLime icon={<SearchIcon />} num="01" titulo="Eliges horario libre"
              desc="Ves la disponibilidad de la cancha en tiempo real. Marca los slots y listo." />
            <FeatureLime icon={<YapeIcon />} num="02" titulo="Pagas con Yape"
              desc="Subes captura del Yape. Mantienes tu reserva segura desde el inicio." />
            <FeatureLime icon={<BellIcon />} num="03" titulo="Confirmación al toque"
              desc="El dueño confirma desde su panel. Te llega un link con todos los datos." />
            <FeatureLime icon={<CancelIcon />} num="04" titulo="Cancela hasta 2h antes"
              desc="¿Cambio de planes? Cancela desde el link. Sin llamar a nadie." />
            <FeatureLime icon={<GoogleIcon />} num="05" titulo="Cuenta con Google"
              desc="Login en un click. Tus datos se pre-llenan para reservar más rápido." />
            <FeatureLime icon={<HistoryIcon />} num="06" titulo="Filtros avanzados"
              desc="Busca por distrito, precio, características o mira solo las disponibles HOY." />
          </div>
        </div>
      </section>

      <section className="py-12 bg-cream">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="eyebrow mb-3">Encuentra tu cancha</p>
          <h2 className="display-lg mb-2">Mira las opciones abajo ↓</h2>
          <p className="text-ink/60 mt-2">
            ¿Quieres filtros más detallados? <Link href="/jugador/login" className="underline font-medium">Entra con Google</Link> para acceder.
          </p>
        </div>
      </section>
    </>
  );
}

// ============ Pieces ============
function FeatureLight({ icon, num, titulo, desc }: { icon: React.ReactNode; num: string; titulo: string; desc: string }) {
  return (
    <div className="p-6 bg-cream">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-pitch-900 text-pitch-400 grid place-items-center">
          <div className="w-5 h-5">{icon}</div>
        </div>
        <span className="font-mono text-xs text-ink/40">{num}</span>
      </div>
      <h3 className="font-display text-xl mb-2 text-ink">{titulo}</h3>
      <p className="text-sm text-ink/60">{desc}</p>
    </div>
  );
}

function FeatureLime({ icon, num, titulo, desc }: { icon: React.ReactNode; num: string; titulo: string; desc: string }) {
  return (
    <div className="p-6 bg-pitch-900 text-cream shadow-brut border-2 border-ink">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-pitch-400 text-pitch-900 grid place-items-center">
          <div className="w-5 h-5">{icon}</div>
        </div>
        <span className="font-mono text-xs text-pitch-400/60">{num}</span>
      </div>
      <h3 className="font-display text-xl mb-2">{titulo}</h3>
      <p className="text-sm text-cream/70">{desc}</p>
    </div>
  );
}

function StepDark({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-4 items-start">
      <div className="w-12 h-12 bg-pitch-400 text-pitch-900 grid place-items-center font-display text-xl">
        {n}
      </div>
      <div>
        <h3 className="font-display text-xl mb-1 text-cream">{title}</h3>
        <p className="text-cream/60">{desc}</p>
      </div>
    </div>
  );
}

function VenueCard({ v }: { v: PublicVenue }) {
  const fotoSrc = v.foto_url
    ? (v.foto_url.startsWith('http') ? v.foto_url : `${API_URL}${v.foto_url}`)
    : null;
  return (
    <Link
      href={`/c/${v.slug}`}
      className="card-brut !p-0 overflow-hidden block hover:-translate-y-1 transition-transform"
    >
      <div className="bg-ink h-40 relative overflow-hidden">
        {fotoSrc ? (
          <img src={fotoSrc} alt={v.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-cream/30">
            <SoccerBallIcon className="w-16 h-16" />
          </div>
        )}
        {v.precio_desde !== null && v.precio_desde !== undefined && (
          <div className="absolute top-2 right-2 bg-pitch-400 border-2 border-ink px-2 py-1">
            <span className="text-[10px] font-mono uppercase block leading-none">
              {v.es_referencial ? 'Precio ref.' : 'Desde'}
            </span>
            <span className="font-display text-lg leading-none">S/{v.precio_desde}<span className="text-xs">/h</span></span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
          {v.distrito && (
            <div className="bg-ink/90 text-cream text-[10px] font-mono uppercase px-2 py-1 tracking-wider">
              {v.distrito}
            </div>
          )}
          {v.es_referencial && (
            <div className="bg-cream text-ink text-[10px] font-mono uppercase px-2 py-1 border border-ink">
              Referencial
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

// ============ SVG Icons ============
function SoccerBallIcon({ className = '' }: { className?: string }) {
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

function ListIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" />
      <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function MapIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3 4.5 8 4.5 8s4.5-5 4.5-8c0-2.5-2-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function SoccerFieldDecor({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="360" height="360" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="200" x2="380" y2="200" stroke="currentColor" strokeWidth="2" />
      <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="2" />
      <circle cx="200" cy="200" r="4" fill="currentColor" />
      <rect x="20" y="120" width="60" height="160" stroke="currentColor" strokeWidth="2" />
      <rect x="320" y="120" width="60" height="160" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChartIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M3 21h18M5 21V9m6 12V5m6 16V13" strokeLinecap="round" /></svg>;
}
function CalendarIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="5" width="18" height="16" rx="1" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>;
}
function InboxIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
}
function ClockIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function LockIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function UsersIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function SearchIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function YapeIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="6" width="18" height="13" rx="1" /><path d="M3 10h18" /><path d="M8 15h4" /></svg>;
}
function BellIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function CancelIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
}
function GoogleIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".7"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".5"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".6"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".7"/></svg>;
}
function HistoryIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /><polyline points="12 7 12 12 15 14" /></svg>;
}
