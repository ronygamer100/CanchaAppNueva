'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, Search, UserRound } from 'lucide-react';

const items = [
  { label: 'Inicio', href: '/', icon: Home, active: (path: string) => path === '/' },
  {
    label: 'Explorar', href: '/jugador/explorar', icon: Search,
    active: (path: string) => path.startsWith('/jugador/explorar'),
  },
  {
    label: 'Reservas', href: '/jugador', icon: CalendarDays,
    active: (path: string) => path === '/jugador',
  },
  {
    label: 'Perfil', href: '/jugador/perfil', icon: UserRound,
    active: (path: string) => path.startsWith('/jugador/perfil'),
  },
];

export default function PlayerBottomNav() {
  const pathname = usePathname();
  const isPlayerRoute = pathname === '/jugador' || pathname.startsWith('/jugador/');

  if (!isPlayerRoute || pathname === '/jugador/login') return null;

  return (
    <nav
      aria-label="Navegación del jugador"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-forest/10 bg-white/95 backdrop-blur"
    >
      <div className="grid grid-cols-4 min-h-[72px] pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.active(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold transition-colors ${
                active ? 'text-forest' : 'text-ink/55 hover:text-forest'
              }`}
            >
              <span className={`grid h-8 w-12 place-items-center rounded-lg ${active ? 'bg-pitch-100' : ''}`}>
                <Icon size={23} strokeWidth={active ? 2.6 : 2} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
