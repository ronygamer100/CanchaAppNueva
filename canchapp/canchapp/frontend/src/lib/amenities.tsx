import type { ReactNode } from 'react';

export interface AmenityDef {
  slug: string;
  label: string;
  icon: ReactNode;
}

// SVG simples 24x24, currentColor. Trazo 1.8.
const sw = 1.8;

export const AMENITIES: AmenityDef[] = [
  {
    slug: 'parking',
    label: 'Estacionamiento',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
      </svg>
    ),
  },
  {
    slug: 'showers',
    label: 'Duchas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v9h16V4" />
        <path d="M12 4v-2" />
        <path d="M8 17v3M12 16v4M16 17v3" />
      </svg>
    ),
  },
  {
    slug: 'changing_rooms',
    label: 'Vestuarios',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l4-3 4 3M21 7l-4-3-4 3" />
        <rect x="3" y="7" width="8" height="13" />
        <rect x="13" y="7" width="8" height="13" />
      </svg>
    ),
  },
  {
    slug: 'lights',
    label: 'Iluminación nocturna',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 1 4 10.5V16H8v-2.5A6 6 0 0 1 12 3z" />
      </svg>
    ),
  },
  {
    slug: 'snacks',
    label: 'Snacks / Cafetería',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11h16a8 8 0 0 0-16 0z" />
        <path d="M3 15h18" />
        <path d="M5 18h14" />
      </svg>
    ),
  },
  {
    slug: 'drinks',
    label: 'Bebidas alcohólicas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l-1 8a5 5 0 0 1-10 0z" />
        <path d="M12 16v5" />
        <path d="M8 21h8" />
      </svg>
    ),
  },
  {
    slug: 'stands',
    label: 'Gradas para espectadores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" />
        <path d="M3 20v-3h18v3" />
        <path d="M5 17v-3h14v3" />
        <path d="M7 14v-3h10v3" />
        <path d="M9 11V8h6v3" />
      </svg>
    ),
  },
  {
    slug: 'wifi',
    label: 'Wi-Fi',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a16 16 0 0 1 20 0" />
        <path d="M5 13a11 11 0 0 1 14 0" />
        <path d="M8.5 16.5a6 6 0 0 1 7 0" />
        <circle cx="12" cy="20" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    slug: 'balls',
    label: 'Pelotas incluidas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3l3.5 5.5L12 12l-3.5-3.5z" />
        <path d="M12 12l3.5 3.5L12 21l-3.5-5.5z" />
        <path d="M3 12h6M15 12h6" />
      </svg>
    ),
  },
  {
    slug: 'bibs',
    label: 'Chalecos / Petos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3l-5 4 2 5h2v9h10v-9h2l2-5-5-4-2 3h-4z" />
      </svg>
    ),
  },
  {
    slug: 'roof',
    label: 'Techado / Cubierta',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l9-7 9 7" />
        <path d="M5 11v9h14v-9" />
      </svg>
    ),
  },
  {
    slug: 'referee',
    label: 'Servicio de árbitro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9l-4-4a3 3 0 0 0-4 4l4 4z" />
        <circle cx="16" cy="13" r="5" />
        <path d="M5 9l-2 2" />
      </svg>
    ),
  },
  {
    slug: 'kids',
    label: 'Zona para niños',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c0-4 3-7 7-7s7 3 7 7" />
        <circle cx="10" cy="8" r="0.8" fill="currentColor" />
        <circle cx="14" cy="8" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    slug: 'security',
    label: 'Seguridad / Cámaras',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" />
      </svg>
    ),
  },
];

export const AMENITIES_BY_SLUG: Record<string, AmenityDef> = Object.fromEntries(
  AMENITIES.map((a) => [a.slug, a]),
);
