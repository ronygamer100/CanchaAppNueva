'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, clearToken } from '@/lib/api';
import type { Owner, Venue } from '@/lib/types';

interface OwnerSidebarProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper que pone una sidebar lateral en desktop y un drawer en móvil
 * para todas las páginas de /dashboard/*.
 */
export default function OwnerSidebar({ children }: OwnerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cargar datos del owner y venues
  useEffect(() => {
    apiFetch<Owner>('/api/auth/me', { auth: true }).then(setOwner).catch(() => {});
    apiFetch<Venue[]>('/api/venues', { auth: true }).then(setVenues).catch(() => {});
    apiFetch<{ count: number }>('/api/reservations/pending-count', { auth: true })
      .then((r) => setPendingCount(r.count))
      .catch(() => {});
  }, [pathname]);

  // Cerrar drawer al navegar
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function logout() {
    clearToken();
    router.push('/');
  }

  // Detectar venue activo desde la URL
  const venueMatch = pathname.match(/\/dashboard\/venue\/(\d+)/);
  const activeVenueId = venueMatch ? parseInt(venueMatch[1]) : null;
  const activeVenue = venues.find((v) => v.id === activeVenueId);

  // Items principales (siempre visibles)
  const mainItems = [
    {
      label: 'Panel',
      href: '/dashboard',
      icon: <HomeIcon />,
      active: pathname === '/dashboard',
      badge: pendingCount > 0 ? pendingCount : null,
    },
  ];

  // Items de venue activo (solo si hay uno)
  const venueItems = activeVenue ? [
    {
      label: 'Editar negocio',
      href: `/dashboard/venue/${activeVenue.id}/editar`,
      icon: <EditIcon />,
      active: pathname === `/dashboard/venue/${activeVenue.id}/editar`,
    },
    {
      label: 'Calendario',
      href: `/dashboard/venue/${activeVenue.id}/calendario`,
      icon: <CalendarIcon />,
      active: pathname === `/dashboard/venue/${activeVenue.id}/calendario`,
    },
    {
      label: 'Métricas',
      href: `/dashboard/venue/${activeVenue.id}/metricas`,
      icon: <ChartIcon />,
      active: pathname === `/dashboard/venue/${activeVenue.id}/metricas`,
    },
  ] : [];

  // Items secundarios
  const secondaryItems = [
    {
      label: 'Nuevo negocio',
      href: '/dashboard/venue/nuevo',
      icon: <PlusIcon />,
      active: pathname === '/dashboard/venue/nuevo',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* SIDEBAR DESKTOP — fixed en lg+ */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-ink text-cream sticky top-0 h-screen border-r-2 border-pitch-400/20">
        <SidebarContent
          owner={owner}
          activeVenue={activeVenue}
          venues={venues}
          mainItems={mainItems}
          venueItems={venueItems}
          secondaryItems={secondaryItems}
          onLogout={logout}
        />
      </aside>

      {/* DRAWER MÓVIL */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-ink/60 z-40" onClick={() => setDrawerOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-72 bg-ink text-cream z-50 flex flex-col overflow-y-auto">
            <SidebarContent
              owner={owner}
              activeVenue={activeVenue}
              venues={venues}
              mainItems={mainItems}
              venueItems={venueItems}
              secondaryItems={secondaryItems}
              onLogout={logout}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        {/* Topbar móvil */}
        <header className="lg:hidden sticky top-0 z-30 bg-cream border-b-2 border-ink/10 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-ink"
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="font-semibold">Menú</span>
          </button>

          <Link href="/" className="font-display font-semibold tracking-tightest">
            fubito
          </Link>

          {pendingCount > 0 && (
            <Link
              href="/dashboard"
              className="relative bg-pitch-400 border-2 border-ink px-2 py-1 text-xs font-mono font-bold"
            >
              {pendingCount}
            </Link>
          )}
          {pendingCount === 0 && <div className="w-8" />}
        </header>

        {children}
      </div>
    </div>
  );
}

interface SidebarContentProps {
  owner: Owner | null;
  activeVenue: Venue | undefined;
  venues: Venue[];
  mainItems: { label: string; href: string; icon: React.ReactNode; active: boolean; badge?: number | null }[];
  venueItems: { label: string; href: string; icon: React.ReactNode; active: boolean }[];
  secondaryItems: { label: string; href: string; icon: React.ReactNode; active: boolean }[];
  onLogout: () => void;
  onClose?: () => void;
}

function SidebarContent({
  owner, activeVenue, venues, mainItems, venueItems, secondaryItems, onLogout, onClose,
}: SidebarContentProps) {
  return (
    <>
      {/* Header: logo */}
      <div className="p-5 border-b border-pitch-400/20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pitch-400 grid place-items-center">
            <svg viewBox="0 0 32 32" fill="#0E3B2E" className="w-5 h-5">
              <circle cx="16" cy="16" r="13" stroke="#0E3B2E" strokeWidth="2" fill="none" />
              <path d="M16 5L20 9L18 13L14 13L12 9L16 5Z" />
              <path d="M27 14L25 18L21 18L19 14L21 10L25 10L27 14Z" />
              <path d="M5 14L7 10L11 10L13 14L11 18L7 18L5 14Z" />
              <path d="M16 27L12 23L14 19L18 19L20 23L16 27Z" />
            </svg>
          </div>
          <span className="font-display font-semibold text-xl tracking-tightest text-cream">
            fubito
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-cream/60 hover:text-cream" aria-label="Cerrar menú">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Owner info */}
      {owner && (
        <div className="p-5 border-b border-pitch-400/20">
          <p className="text-pitch-400 text-[10px] font-mono uppercase tracking-widest mb-1">Negocio</p>
          <p className="font-display font-semibold text-base truncate">{owner.nombre_negocio}</p>
          <p className="text-cream/50 text-xs font-mono truncate">{owner.email}</p>
        </div>
      )}

      {/* Navegación principal */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <NavSection title="Principal">
          {mainItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </NavSection>

        {/* Venues */}
        {venues.length > 0 && (
          <NavSection title="Mis negocios">
            {venues.map((v) => (
              <Link
                key={v.id}
                href={`/dashboard/venue/${v.id}/calendario`}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  activeVenue?.id === v.id
                    ? 'bg-pitch-400/10 text-pitch-400'
                    : 'text-cream/70 hover:bg-cream/5 hover:text-cream'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  activeVenue?.id === v.id ? 'bg-pitch-400' : 'bg-cream/30'
                }`} />
                <span className="truncate">{v.nombre}</span>
              </Link>
            ))}
          </NavSection>
        )}

        {/* Acciones del venue activo */}
        {activeVenue && venueItems.length > 0 && (
          <NavSection title={`Gestionar ${activeVenue.nombre}`}>
            {venueItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </NavSection>
        )}

        <NavSection title="Otros">
          {secondaryItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </NavSection>
      </nav>

      {/* Footer: logout */}
      <div className="p-3 border-t border-pitch-400/20">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cream/60 hover:text-clay hover:bg-cream/5 transition-colors"
        >
          <LogoutIcon />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-pitch-400/60 text-[10px] font-mono uppercase tracking-widest px-3 mb-1">
        {title}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function NavItem({
  href, label, icon, active, badge,
}: {
  href: string; label: string; icon: React.ReactNode; active: boolean; badge?: number | null;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-pitch-400 text-ink font-medium'
          : 'text-cream/80 hover:bg-cream/5 hover:text-cream'
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="w-5 h-5 shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {badge != null && badge > 0 && (
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${
          active ? 'bg-ink text-pitch-400' : 'bg-pitch-400 text-ink'
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ====== Icons ====== */
function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M3 12L12 3L21 12V20A1 1 0 0 1 20 21H15V16H9V21H4A1 1 0 0 1 3 20Z" strokeLinejoin="round" /></svg>;
}
function EditIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><rect x="3" y="5" width="18" height="16" rx="1" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>;
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M3 21h18M5 21V9m6 12V5m6 16V13" strokeLinecap="round" /></svg>;
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function LogoutIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
