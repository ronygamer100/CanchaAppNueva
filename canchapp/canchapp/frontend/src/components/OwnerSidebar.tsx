'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, Bell, CalendarDays, CreditCard, House, LogOut, Menu, Pencil, Plus, X,
} from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import { apiFetch, clearToken } from '@/lib/api';
import type { Owner, Venue } from '@/lib/types';

interface OwnerSidebarProps {
  children: React.ReactNode;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number | null;
}

export default function OwnerSidebar({ children }: OwnerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    apiFetch<Owner>('/api/auth/me', { auth: true }).then(setOwner).catch(() => {});
    apiFetch<Venue[]>('/api/venues', { auth: true }).then(setVenues).catch(() => {});
    apiFetch<{ count: number }>('/api/reservations/pending-count', { auth: true })
      .then((response) => setPendingCount(response.count))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  function logout() {
    clearToken();
    router.push('/');
  }

  const venueMatch = pathname.match(/\/dashboard\/venue\/(\d+)/);
  const activeVenueId = venueMatch ? Number(venueMatch[1]) : null;
  const activeVenue = venues.find((venue) => venue.id === activeVenueId);

  const mainItems: NavigationItem[] = [
    {
      label: 'Resumen', href: '/dashboard', icon: <House size={21} />,
      active: pathname === '/dashboard', badge: pendingCount,
    },
    {
      label: 'Pagos y plan', href: '/dashboard/pagos', icon: <CreditCard size={21} />,
      active: pathname === '/dashboard/pagos',
    },
  ];

  const venueItems: NavigationItem[] = activeVenue ? [
    {
      label: 'Calendario', href: `/dashboard/venue/${activeVenue.id}/calendario`,
      icon: <CalendarDays size={21} />,
      active: pathname === `/dashboard/venue/${activeVenue.id}/calendario`,
    },
    {
      label: 'Datos del negocio', href: `/dashboard/venue/${activeVenue.id}/editar`,
      icon: <Pencil size={21} />,
      active: pathname === `/dashboard/venue/${activeVenue.id}/editar`,
    },
    {
      label: 'Métricas', href: `/dashboard/venue/${activeVenue.id}/metricas`,
      icon: <BarChart3 size={21} />,
      active: pathname === `/dashboard/venue/${activeVenue.id}/metricas`,
    },
  ] : [];

  const secondaryItems: NavigationItem[] = [
    {
      label: 'Agregar negocio', href: '/dashboard/venue/nuevo', icon: <Plus size={21} />,
      active: pathname === '/dashboard/venue/nuevo',
    },
  ];

  const navigationProps = {
    owner, venues, activeVenue, mainItems, venueItems, secondaryItems,
    onLogout: logout,
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden h-screen w-72 shrink-0 flex-col bg-forest text-white lg:sticky lg:top-0 lg:flex">
        <SidebarContent {...navigationProps} />
      </aside>

      {drawerOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-forest/60 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-80 flex-col overflow-y-auto bg-forest text-white lg:hidden">
            <SidebarContent {...navigationProps} onClose={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between border-b border-forest/10 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-forest"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
            Menú
          </button>

          <FubitoLogo size="sm" />

          {pendingCount > 0 ? (
            <Link
              href="/dashboard"
              className="relative grid h-11 w-11 place-items-center rounded-lg bg-clay text-white"
              aria-label={`${pendingCount} reservas pendientes`}
            >
              <Bell size={21} />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[11px] text-white">
                {pendingCount}
              </span>
            </Link>
          ) : <div className="h-11 w-11" />}
        </header>

        {children}
      </div>
    </div>
  );
}

function SidebarContent({
  owner, venues, activeVenue, mainItems, venueItems, secondaryItems, onLogout, onClose,
}: {
  owner: Owner | null;
  venues: Venue[];
  activeVenue?: Venue;
  mainItems: NavigationItem[];
  venueItems: NavigationItem[];
  secondaryItems: NavigationItem[];
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <FubitoLogo size="sm" className="rounded-lg bg-white px-3 py-2" />
        {onClose && (
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {owner && (
        <div className="border-b border-white/10 p-5">
          <p className="mb-1 text-sm font-semibold text-pitch-400">Tu cuenta</p>
          <p className="truncate font-display text-lg font-extrabold">{owner.nombre_negocio}</p>
          <p className="truncate text-xs text-white/55">{owner.email}</p>
          <Link
            href="/dashboard/pagos"
            className="mt-3 inline-flex min-h-8 items-center rounded-md bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/15"
          >
            {ownerPlanLabel(owner)}
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3">
        <NavSection title="Principal">
          {mainItems.map((item) => <NavItem key={item.href} item={item} />)}
        </NavSection>

        {venues.length > 0 && (
          <NavSection title="Mis negocios">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/dashboard/venue/${venue.id}/calendario`}
                className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeVenue?.id === venue.id
                    ? 'bg-pitch-400 font-semibold text-forest'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${activeVenue?.id === venue.id ? 'bg-forest' : 'bg-white/30'}`} />
                <span className="truncate">{venue.nombre}</span>
              </Link>
            ))}
          </NavSection>
        )}

        {activeVenue && venueItems.length > 0 && (
          <NavSection title="Gestionar negocio">
            {venueItems.map((item) => <NavItem key={item.href} item={item} />)}
          </NavSection>
        )}

        <NavSection title="Otros">
          {secondaryItems.map((item) => <NavItem key={item.href} item={item} />)}
        </NavSection>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={onLogout}
          className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={21} />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

function ownerPlanLabel(owner: Owner) {
  if (owner.subscription_paid_until && new Date(owner.subscription_paid_until).getTime() > Date.now()) {
    return 'Plan mensual activo';
  }
  const milliseconds = new Date(owner.trial_ends_at).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(milliseconds / 86400000));
  return days > 0 ? `Prueba gratis · ${days} días` : 'Prueba gratuita finalizada';
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-xs font-semibold text-pitch-400/80">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function NavItem({ item }: { item: NavigationItem }) {
  return (
    <Link
      href={item.href}
      className={`flex min-h-12 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        item.active
          ? 'bg-pitch-400 font-semibold text-forest'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center">{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </span>
      {!!item.badge && (
        <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold ${item.active ? 'bg-forest text-white' : 'bg-clay text-white'}`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}
