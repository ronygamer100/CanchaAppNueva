'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearPlayerToken } from '@/lib/api';

/**
 * Barra de navegación inferior solo para móvil en rutas de jugador.
 */
export default function PlayerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Solo mostrar en rutas /jugador/* (excepto /jugador/login)
  const isPlayerRoute = pathname === '/jugador' || pathname.startsWith('/jugador/');
  if (!isPlayerRoute) return null;
  if (pathname === '/jugador/login') return null;

  function handleLogout() {
    clearPlayerToken();
    router.push('/');
  }

  const isReservas = pathname === '/jugador';
  const isExplorar = pathname.startsWith('/jugador/explorar');

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-cream border-t-2 border-ink/10">
      <div className="grid grid-cols-3 h-16">
        <Link
          href="/jugador"
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            isReservas ? 'text-pitch-900' : 'text-ink/40'
          }`}
        >
          <svg viewBox="0 0 24 24" fill={isReservas ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
          </svg>
          <span className="text-[10px] font-medium">Reservas</span>
        </Link>

        <Link
          href="/jugador/explorar"
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            isExplorar ? 'text-pitch-900' : 'text-ink/40'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <circle cx="11" cy="11" r="8" fill={isExplorar ? 'currentColor' : 'none'} />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            {isExplorar && <circle cx="11" cy="11" r="4" fill="white" />}
          </svg>
          <span className="text-[10px] font-medium">Explorar</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 text-ink/40 hover:text-clay transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-[10px] font-medium">Salir</span>
        </button>
      </div>
    </nav>
  );
}
