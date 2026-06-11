'use client';

import { useEffect, useRef } from 'react';

export const AREQUIPA_CENTER: [number, number] = [-16.4090, -71.5375];

interface MapPickerProps {
  lat?: number | null;
  lng?: number | null;
  onPick?: (lat: number, lng: number) => void;
  /** Callback con la dirección textual resuelta vía reverse geocoding (Nominatim). */
  onAddressResolved?: (address: string) => void;
  readOnly?: boolean;
  height?: number;
}

/**
 * Mapa Leaflet (OpenStreetMap, gratis sin API key).
 * Si onAddressResolved, llama a Nominatim (1 req/s) cuando el marker se mueve.
 */
export default function MapPicker({
  lat, lng, onPick, onAddressResolved, readOnly = false, height = 320,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  // Debounce para no abusar de Nominatim
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleReverseGeocode(la: number, ln: number) {
    if (!onAddressResolved) return;
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}&zoom=18&addressdetails=1&accept-language=es`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        // Construir dirección legible
        const a = data.address || {};
        const calle = a.road || a.pedestrian || '';
        const numero = a.house_number || '';
        const distrito = a.suburb || a.neighbourhood || a.city_district || '';
        const ciudad = a.city || a.town || a.village || 'Arequipa';
        const parts = [
          calle && numero ? `${calle} ${numero}` : calle,
          distrito,
          ciudad,
        ].filter(Boolean);
        const addr = parts.join(', ') || data.display_name || '';
        if (addr) onAddressResolved(addr);
      } catch {
        // Silencioso: la dirección queda como esté
      }
    }, 700); // espera 700ms tras el último cambio
  }

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    async function init() {
      if (!(window as any).L) await loadLeafletAssets();
      if (!isMounted) return;

      const L = (window as any).L;
      const initialLat = lat ?? AREQUIPA_CENTER[0];
      const initialLng = lng ?? AREQUIPA_CENTER[1];
      const initialZoom = (lat && lng) ? 16 : 13;

      if (!mapRef.current) {
        const map = L.map(containerRef.current!, {
          scrollWheelZoom: true,
          attributionControl: true,
        }).setView([initialLat, initialLng], initialZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], {
          draggable: !readOnly,
        }).addTo(map);

        if (!readOnly && onPick) {
          marker.on('dragend', (e: any) => {
            const { lat: la, lng: ln } = e.target.getLatLng();
            onPick(la, ln);
            scheduleReverseGeocode(la, ln);
          });
          map.on('click', (e: any) => {
            const { lat: la, lng: ln } = e.latlng;
            marker.setLatLng([la, ln]);
            onPick(la, ln);
            scheduleReverseGeocode(la, ln);
          });
        }

        mapRef.current = map;
        markerRef.current = marker;
      } else {
        const map = mapRef.current as any;
        const marker = markerRef.current as any;
        if (lat && lng) {
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], map.getZoom());
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      if (mapRef.current) {
        (mapRef.current as any).remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="border-2 border-ink"
    />
  );
}

async function loadLeafletAssets(): Promise<void> {
  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', 'true');
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    if ((window as any).L) return resolve();
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(script);
  });
}
