'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/',
    label: 'Inicio',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M3 12L12 3L21 12V20A1 1 0 0 1 20 21H15V16H9V21H4A1 1 0 0 1 3 20Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/jugador/explorar',
    label: 'Explorar',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="11" cy="11" r="8" fill={active ? 'currentColor' : 'none'} />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        {active && <circle cx="11" cy="11" r="4" fill="white" />}
      </svg>
    ),
  },
  {
    href: '/jugador',
    label: 'Mis reservas',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
        {active && <path d="M8 14h8M8 17h5" stroke="white" strokeLinecap="round" />}
      </svg>
    ),
  },
  {
    href: '/jugador#perfil',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * Barra de navegación inferior solo para móvil en rutas de jugador.
 * No aparece en rutas de dueño ni en páginas públicas.
 */
export default function PlayerBottomNav() {
  const pathname = usePathname();

  // Solo mostrar en rutas de jugador
  const isPlayerRoute =
    pathname === '/jugador' ||
    pathname === '/jugador/explorar' ||
    pathname.startsWith('/jugador/');

  // También en la landing si es el tab de jugadores (no podemos saber el tab, la mostramos igual)
  const showOnLanding = pathname === '/';

  if (!isPlayerRoute && !showOnLanding) return null;

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    if (href === '/jugador') return pathname === '/jugador';
    return pathname.startsWith(href.split('#')[0]);
  }

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-cream border-t-2 border-ink/10 safe-area-pb">
      <div className="grid grid-cols-4 h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-pitch-900' : 'text-ink/40'
              }`}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? 'text-pitch-900' : 'text-ink/40'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
