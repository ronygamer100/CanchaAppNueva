'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { AREQUIPA_CENTER } from './MapPicker';

export interface VenueMapPin {
  slug: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  foto_url?: string | null;
  precio_desde?: number | null;
  court_count: number;
  es_referencial?: boolean;
}

interface VenuesMapProps {
  venues: VenueMapPin[];
  apiUrl: string;  // para construir URL de foto cuando no es absoluta
  height?: number;
}

/**
 * Mapa con un pin por cada venue. Click en pin → popup con foto + info + link.
 * Si solo hay un venue, hace zoom a su ubicación. Si hay varios, ajusta a bounds.
 */
export default function VenuesMap({ venues, apiUrl, height = 480 }: VenuesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    async function init() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).L) await loadLeafletAssets();
      if (!isMounted || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        tap: true,
      }).setView(AREQUIPA_CENTER, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Pin personalizado verde (DivIcon con SVG inline)
      const greenPin = L.divIcon({
        className: 'venue-pin',
        html: `
          <div style="
            width: 36px; height: 44px; position: relative;
            filter: drop-shadow(2px 4px 0 rgba(0,0,0,0.3));
          ">
            <svg viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#7CD992" stroke="#0E3B2E" stroke-width="2"/>
              <circle cx="18" cy="18" r="6" fill="#0E3B2E"/>
            </svg>
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -38],
      });

      const validVenues = venues.filter((v) => v.lat != null && v.lng != null);
      const markers: unknown[] = [];

      for (const v of validVenues) {
        const fotoSrc = v.foto_url
          ? (v.foto_url.startsWith('http') ? v.foto_url : `${apiUrl}${v.foto_url}`)
          : null;

        const popupHtml = `
          <div style="min-width: 200px; font-family: 'Plus Jakarta Sans', sans-serif;">
            ${fotoSrc ? `<img src="${fotoSrc}" alt="" style="width: 100%; height: 120px; object-fit: cover; border-bottom: 2px solid #0A0A0A; margin: -10px -12px 8px -12px; max-width: calc(100% + 24px); display: block;" />` : ''}
            <h3 style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 4px 0; line-height: 1.2;">
              ${escapeHtml(v.nombre)}
            </h3>
            <p style="font-size: 11px; color: #6B6B6B; margin: 0 0 8px 0;">
              ${escapeHtml(v.direccion)}
            </p>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #444; margin-bottom: 10px;">
              <span>${v.court_count} cancha${v.court_count > 1 ? 's' : ''}</span>
              ${v.precio_desde != null ? `<span>·</span><span>${v.es_referencial ? 'Precio ref.' : 'Desde'} S/${v.precio_desde}/h</span>` : ''}
            </div>
            ${v.es_referencial ? '<p style="font-size: 10px; text-transform: uppercase; font-family: JetBrains Mono, monospace; color: #666; margin: 0 0 8px 0;">Ficha referencial</p>' : ''}
            <a href="/c/${v.slug}" style="
              display: inline-block;
              background: #0A0A0A; color: #F5F1E8;
              padding: 6px 12px; font-size: 12px; font-weight: 600;
              text-decoration: none; border: 2px solid #0A0A0A;
            ">Ver cancha →</a>
          </div>
        `;

        const marker = L.marker([v.lat, v.lng], { icon: greenPin })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 260, minWidth: 180 });
        markers.push(marker);
      }

      // Ajustar vista para mostrar todos los pines
      if (validVenues.length === 1) {
        map.setView([validVenues[0].lat, validVenues[0].lng], 15);
      } else if (validVenues.length > 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const group = L.featureGroup(markers as any);
        map.fitBounds(group.getBounds().pad(0.2));
      }

      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
    }

    init();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isExpanded) document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 50);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  if (venues.length === 0) {
    return (
      <div
        style={{ '--map-height': `${height}px` } as CSSProperties}
        className="responsive-map border border-forest/15 grid place-items-center bg-ink/5 px-4 text-center"
      >
        <p className="text-sm text-ink/50">
          No hay canchas con ubicación geográfica todavía
        </p>
      </div>
    );
  }

  return (
    <div className={isExpanded ? 'fixed inset-0 z-[70] bg-white' : 'relative'}>
      <div
        ref={containerRef}
        style={{ '--map-height': `${height}px` } as CSSProperties}
        className={`responsive-map border border-forest/20 ${isExpanded ? 'map-expanded' : ''}`}
      />
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="absolute right-3 top-3 z-[1000] grid h-12 w-12 place-items-center rounded-lg border border-forest/15 bg-white text-forest shadow-md sm:hidden"
        aria-label={isExpanded ? 'Reducir mapa' : 'Ampliar mapa'}
        title={isExpanded ? 'Reducir mapa' : 'Ampliar mapa'}
      >
        {isExpanded
          ? <Minimize2 className="h-5 w-5" aria-hidden="true" />
          : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c] || c);
}

function loadLeafletAssets(): Promise<void> {
  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', 'true');
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) return resolve();
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(script);
  });
}
