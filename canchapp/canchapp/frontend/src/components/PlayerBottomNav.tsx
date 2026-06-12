'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/jugador',
    label: 'Mis reservas',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
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
    href: '/',
    label: 'Salir',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
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

  // Solo mostrar en rutas de jugador autenticado
  const isPlayerRoute =
    pathname === '/jugador' ||
    pathname.startsWith('/jugador/');

  if (!isPlayerRoute) return null;

  // No mostrar en /jugador/login (la pantalla de inicio de sesión no necesita nav)
  if (pathname === '/jugador/login') return null;

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    if (href === '/jugador') return pathname === '/jugador';
    return pathname.startsWith(href.split('#')[0]);
  }

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-cream border-t-2 border-ink/10 safe-area-pb">
      <div className="grid grid-cols-3 h-16">
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
