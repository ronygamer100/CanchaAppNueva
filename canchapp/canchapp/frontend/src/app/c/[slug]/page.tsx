'use client';

import { LoadingScreen } from '@/components/Skeleton';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, API_URL, getPlayerToken } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import { normalizePeruvianWhatsApp, isValidPeruvianWhatsApp, displayPeruvianWhatsApp } from '@/lib/whatsapp';
import type {
  VenuePublic, CourtPublicLite, DayAvailability, Slot, ReservationCreated, Player,
} from '@/lib/types';
import MapPicker from '@/components/MapPicker';
import { AMENITIES_BY_SLUG } from '@/lib/amenities';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatHora(h: string) { return h.slice(0, 5); }
function formatFechaLarga(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}
function toMin(h: string): number {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
}

export default function VenuePublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [venue, setVenue] = useState<VenuePublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<CourtPublicLite | null>(null);
  const [fecha, setFecha] = useState(todayISO());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);

  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ReservationCreated | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [player, setPlayer] = useState<Player | null>(null);

  // Cargar player si está logueado y pre-llenar nombre/whatsapp
  useEffect(() => {
    if (!getPlayerToken()) return;
    apiFetch<Player>('/api/player/me', { auth: 'player' })
      .then((p) => {
        setPlayer(p);
        setNombre(p.nombre);
        if (p.whatsapp) setWhatsapp(p.whatsapp);
      })
      .catch(() => {/* token inválido, ignora */});
  }, []);

  useEffect(() => {
    apiFetch<VenuePublic>(`/api/public/venues/${slug}`)
      .then((v) => {
        setVenue(v);
        if (v.courts.length === 1) setSelectedCourt(v.courts[0]); // auto-pick si hay una sola
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (!selectedCourt || !venue?.reservas_habilitadas) return;
    apiFetch<DayAvailability>(
      `/api/public/venues/${slug}/courts/${selectedCourt.id}/availability?fecha=${fecha}`,
    )
      .then(setAvailability)
      .catch(() => setAvailability(null));
    setSelectedSlots([]);
  }, [slug, selectedCourt, fecha, venue?.reservas_habilitadas]);

  const horas = selectedSlots.length;
  const adelantoTotal = selectedCourt ? selectedCourt.adelanto_monto * horas : 0;
  const precioTotal = selectedCourt ? selectedCourt.precio_hora * horas : 0;
  const horaInicio = selectedSlots[0]?.hora_inicio;
  const horaFin = selectedSlots[selectedSlots.length - 1]?.hora_fin;

  function toggleSlot(slot: Slot) {
    if (slot.estado !== 'libre') return;
    setFormError(null);

    const idx = selectedSlots.findIndex((s) => s.hora_inicio === slot.hora_inicio);
    if (idx !== -1) {
      if (idx === 0 || idx === selectedSlots.length - 1) {
        setSelectedSlots((curr) => curr.filter((s) => s.hora_inicio !== slot.hora_inicio));
      } else {
        setSelectedSlots([slot]);
      }
      return;
    }
    if (selectedSlots.length === 0) {
      setSelectedSlots([slot]); return;
    }
    const slotIni = toMin(slot.hora_inicio), slotFin = toMin(slot.hora_fin);
    const selIni = toMin(selectedSlots[0].hora_inicio);
    const selFin = toMin(selectedSlots[selectedSlots.length - 1].hora_fin);
    if (slotFin === selIni) setSelectedSlots((curr) => [slot, ...curr]);
    else if (slotIni === selFin) setSelectedSlots((curr) => [...curr, slot]);
    else setSelectedSlots([slot]);
  }

  function isSelectable(slot: Slot): boolean {
    if (slot.estado !== 'libre') return false;
    if (selectedSlots.length === 0) return true;
    if (selectedSlots.some((s) => s.hora_inicio === slot.hora_inicio)) return true;
    const slotIni = toMin(slot.hora_inicio), slotFin = toMin(slot.hora_fin);
    const selIni = toMin(selectedSlots[0].hora_inicio);
    const selFin = toMin(selectedSlots[selectedSlots.length - 1].hora_fin);
    return slotFin === selIni || slotIni === selFin;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!venue?.reservas_habilitadas) {
      setFormError('Esta ficha todavía no acepta reservas en fubito.');
      return;
    }
    if (selectedSlots.length === 0 || !selectedCourt || !horaInicio || !horaFin) return;
    if (!screenshot) {
      setFormError('Debes subir la captura del Yape para confirmar la reserva.');
      return;
    }
    const waNorm = normalizePeruvianWhatsApp(whatsapp);
    if (!waNorm) {
      setFormError('Tu WhatsApp tiene que ser un celular peruano (9 dígitos que empiezan con 9).');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('fecha', fecha);
      fd.append('hora_inicio', horaInicio.slice(0, 5));
      fd.append('hora_fin', horaFin.slice(0, 5));
      fd.append('jugador_nombre', nombre);
      fd.append('jugador_whatsapp', waNorm);
      fd.append('yape_screenshot', screenshot);
      const created = await apiFetch<ReservationCreated>(
        `/api/public/venues/${slug}/courts/${selectedCourt.id}/reservations`,
        { method: 'POST', formData: fd, auth: player ? 'player' : undefined },
      );
      setSuccess(created);
    } catch (err) {
      setFormError(humanizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <p className="font-mono text-clay text-sm mb-2">ERROR 404</p>
          <h1 className="display-lg mb-3">Negocio no encontrado</h1>
          <p className="text-ink/70">El link que abriste no corresponde a ningún negocio activo.</p>
        </div>
      </main>
    );
  }
  if (!venue) {
    return <LoadingScreen />;
  }

  if (success) {
    const esAuto = success.modo_confirmacion === 'auto';
    const autoAt = success.auto_confirm_at ? new Date(success.auto_confirm_at) : null;

    return (
      <main className="min-h-screen bg-pitch-900 text-cream flex flex-col">
        <div className="px-6 pt-12 pb-8 text-center">
          {/* Ícono de éxito */}
          <div className="w-20 h-20 mx-auto mb-6 bg-pitch-400 flex items-center justify-center">
            <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
              <path d="M8 20L17 29L32 12" stroke="#0A0A0A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-4xl font-bold mb-2">¡Reserva enviada!</h1>
          <p className="text-cream/70 text-lg">
            {nombre.split(' ')[0]}, tu cancha está separada.
          </p>
        </div>

        {/* Card de detalle */}
        <div className="flex-1 bg-cream text-ink rounded-t-3xl px-6 pt-8 pb-12">
          {/* Estado */}
          <div className="bg-pitch-400 border-2 border-ink p-4 mb-6 text-center">
            <p className="font-display text-xl font-bold mb-1">Pendiente de confirmación</p>
            <p className="text-sm text-ink/70">
              {esAuto && autoAt
                ? `Se confirma automáticamente a las ${autoAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                : `${venue.owner_nombre_negocio} confirmará pronto`}
            </p>
          </div>

          {/* Detalle */}
          <div className="border-2 border-ink/10 mb-6">
            <div className="bg-ink text-cream px-4 py-2">
              <p className="eyebrow text-pitch-400">Tu reserva</p>
            </div>
            <div className="divide-y divide-ink/10">
              <div className="flex justify-between px-4 py-3">
                <span className="text-ink/60 text-sm">Local</span>
                <span className="font-semibold text-right max-w-[60%] truncate">{venue.nombre}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-ink/60 text-sm">Cancha</span>
                <span className="font-semibold">{selectedCourt?.nombre}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-ink/60 text-sm">Fecha</span>
                <span className="font-mono font-semibold">
                  {new Date(success.fecha + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-ink/60 text-sm">Hora</span>
                <span className="font-mono font-semibold">
                  {success.hora_inicio.slice(0,5)} – {success.hora_fin.slice(0,5)}
                </span>
              </div>
            </div>
          </div>

          {/* CTA principal: Ir a mis reservas */}
          {player ? (
            <Link
              href="/jugador"
              className="btn-accent w-full block text-center text-base py-4"
            >
              Ir a mis reservas →
            </Link>
          ) : (
            <Link
              href="/jugador/login"
              className="btn-accent w-full block text-center text-base py-4"
            >
              Entrar con Google para ver mis reservas →
            </Link>
          )}

          <Link
            href={`/c/${slug}`}
            className="block text-center text-sm text-ink/60 hover:text-ink underline mt-4"
          >
            Reservar otra hora aquí
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Mini header con sesión */}
      <div className="bg-pitch-900 border-b border-cream/10">
        <div className="max-w-6xl mx-auto px-6 py-2 flex justify-end items-center text-xs">
          {player ? (
            <Link
              href="/jugador"
              className="flex items-center gap-2 text-cream/70 hover:text-cream"
            >
              {player.avatar_url && (
                <img src={player.avatar_url} referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full" alt="" />
              )}
              <span>Hola, {player.nombre.split(' ')[0]}</span>
              <span className="text-pitch-400">· Mis reservas →</span>
            </Link>
          ) : (
            <Link
              href={`/jugador/login?next=/c/${slug}`}
              className="text-cream/70 hover:text-cream"
            >
              Entrar como jugador →
            </Link>
          )}
        </div>
      </div>

      {/* Hero del venue */}
      <section className="bg-pitch-900 text-cream">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <p className="eyebrow !text-pitch-400 mb-4">
            {venue.es_referencial ? 'Ficha referencial' : 'Reserva online'}
          </p>
          <h1 className="display-xl break-words">{venue.nombre}</h1>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <span className="flex items-center gap-2"><span className="text-pitch-400">📍</span>{venue.direccion}</span>
            <span className="flex items-center gap-2 font-mono">
              <span className="text-pitch-400">🕐</span>
              {formatHora(venue.hora_apertura)} – {formatHora(venue.hora_cierre)}
            </span>
          </div>
          {venue.descripcion && <p className="mt-4 text-cream/70 max-w-2xl">{venue.descripcion}</p>}
        </div>
      </section>

      {venue.foto_url && (
        <div className="max-w-6xl mx-auto px-6 -mt-8 mb-8">
          <img
            src={venue.foto_url.startsWith('http') ? venue.foto_url : `${API_URL}${venue.foto_url}`}
            alt={venue.nombre}
            className="w-full h-64 md:h-80 object-cover border-2 border-ink"
          />
        </div>
      )}

      {venue.es_referencial && (
        <section className="max-w-6xl mx-auto px-6 mb-8">
          <div className="border-2 border-ink bg-pitch-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-3xl">
              <p className="eyebrow mb-2">Información por validar</p>
              <p className="text-sm text-ink/70">
                Esta ficha se preparó con información pública. La foto, los servicios,
                horarios y precios son referenciales hasta que el negocio los confirme.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {venue.telefono_publico && (
                <a
                  href={`tel:${venue.telefono_publico.replace(/\s/g, '')}`}
                  className="btn-ghost text-center"
                >
                  Llamar al local
                </a>
              )}
              {venue.fuente_url && (
                <a
                  href={venue.fuente_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-center"
                >
                  Ver fuente
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {venue.lat && venue.lng && (
        <div className="max-w-6xl mx-auto px-6 mb-4">
          <p className="eyebrow mb-2">Ubicación</p>
          <MapPicker lat={venue.lat} lng={venue.lng} readOnly height={240} />
          <a href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`}
             target="_blank"
             className="inline-block mt-2 text-sm font-medium text-pitch-700 hover:underline">
            Abrir en Google Maps ↗
          </a>
        </div>
      )}

      {/* Amenities */}
      {venue.amenities && venue.amenities.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <p className="eyebrow mb-3">El local te ofrece</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {venue.amenities.map((slug) => {
              const a = AMENITIES_BY_SLUG[slug];
              if (!a) return null;
              return (
                <div key={slug} className="flex flex-col items-center gap-2 text-center py-3 border-2 border-ink/10">
                  <div className="w-7 h-7 text-pitch-700">{a.icon}</div>
                  <span className="text-xs font-medium leading-tight">{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selector de canchas */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="eyebrow mb-3">Elige la cancha</p>
        {venue.courts.length === 0 ? (
          <p className="text-ink/60">Este negocio aún no tiene canchas disponibles.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-12">
            {venue.courts.map((c) => {
              const isActive = selectedCourt?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourt(c)}
                  className={`border-2 p-4 text-left transition-all ${
                    isActive
                      ? 'border-ink bg-pitch-400 shadow-brut'
                      : 'border-ink/20 hover:border-ink bg-cream'
                  }`}
                >
                  <h3 className="font-display font-semibold text-lg">{c.nombre}</h3>
                  {c.tipo && (
                    <p className="text-xs uppercase tracking-wider font-mono text-ink/60 mt-1">
                      {c.tipo}
                    </p>
                  )}
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="font-display text-2xl">S/{c.precio_hora}<span className="text-sm">/h</span></span>
                    <span className="text-xs text-ink/50 font-mono">
                      {venue.es_referencial ? 'precio referencial' : `adelanto S/${c.adelanto_monto}`}
                    </span>
                  </div>
                  {/* Características de la cancha */}
                  {c.amenities && c.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-ink/10">
                      {c.amenities.slice(0, 6).map((slug) => {
                        const a = AMENITIES_BY_SLUG[slug];
                        if (!a) return null;
                        return (
                          <div key={slug} className="w-5 h-5 text-ink/70" title={a.label}>
                            {a.icon}
                          </div>
                        );
                      })}
                      {c.amenities.length > 6 && (
                        <span className="text-[10px] font-mono text-ink/50 self-center">
                          +{c.amenities.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Disponibilidad de la cancha seleccionada */}
        {selectedCourt && venue.reservas_habilitadas && (
          <>
            {selectedCourt.amenities && selectedCourt.amenities.length > 0 && (
              <div className="mb-8 border-2 border-ink/10 p-4">
                <p className="eyebrow mb-3">Esta cancha incluye</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                  {selectedCourt.amenities.map((slug) => {
                    const a = AMENITIES_BY_SLUG[slug];
                    if (!a) return null;
                    return (
                      <div key={slug} className="flex flex-col items-center gap-1 text-center">
                        <div className="w-6 h-6 text-pitch-700">{a.icon}</div>
                        <span className="text-[11px] leading-tight">{a.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
              <div className="min-w-0">
                <p className="eyebrow mb-2">Disponibilidad · {selectedCourt.nombre}</p>
                <h2 className="display-lg capitalize break-words">{formatFechaLarga(fecha)}</h2>
              </div>
              <input
                type="date" value={fecha} min={todayISO()}
                onChange={(e) => setFecha(e.target.value)}
                className="input-field md:w-auto font-mono"
              />
            </div>
            <p className="text-sm text-ink/60 mb-6">
              Toca uno o varios horarios <strong>seguidos</strong> para reservar más de una hora.
            </p>

            <div className="grid grid-cols-2 min-[420px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {(availability?.slots || []).map((slot) => {
                const isSelected = selectedSlots.some((s) => s.hora_inicio === slot.hora_inicio);
                const selectable = isSelectable(slot);
                let classes = '';
                if (slot.estado === 'libre') {
                  if (isSelected) classes = 'bg-pitch-400 border-ink shadow-brut text-ink';
                  else if (selectable) classes = 'bg-cream border-ink hover:bg-pitch-100 cursor-pointer';
                  else classes = 'bg-cream border-ink/30 text-ink/40 cursor-pointer';
                } else if (slot.estado === 'pendiente') {
                  classes = 'bg-yellow-100 border-yellow-700/40 text-yellow-900/70 cursor-not-allowed';
                } else {
                  classes = 'bg-ink/10 border-ink/20 text-ink/40 cursor-not-allowed line-through';
                }
                return (
                  <button
                    key={slot.hora_inicio}
                    disabled={slot.estado !== 'libre'}
                    onClick={() => toggleSlot(slot)}
                    className={`border-2 px-3 py-4 font-mono text-center transition-all min-h-[86px] ${classes}`}
                  >
                    <div className="text-xs uppercase tracking-wider opacity-60">
                      {slot.estado === 'libre' ? (isSelected ? 'elegido' : 'libre') : slot.estado === 'pendiente' ? 'reservando' : 'ocupado'}
                    </div>
                    <div className="text-lg font-semibold mt-1">{formatHora(slot.hora_inicio)}</div>
                  </button>
                );
              })}
            </div>

            {availability && availability.slots.length === 0 && (
              <p className="text-ink/60 text-center py-12">No hay horarios configurados.</p>
            )}
          </>
        )}

        {!venue.reservas_habilitadas && (
          <div className="border-t-2 border-ink/10 pt-6 text-sm text-ink/60">
            La reserva online se activará cuando el negocio valide y administre esta ficha.
          </div>
        )}
      </section>

      {/* Formulario */}
      {selectedSlots.length > 0 && horaInicio && horaFin && selectedCourt && (
        <section className="bg-ink text-cream py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-6">
            <p className="eyebrow !text-pitch-400 mb-2">Reservar</p>
            <h2 className="display-lg mb-2 break-words">
              {selectedCourt.nombre} · {formatHora(horaInicio)} – {formatHora(horaFin)}
            </h2>
            <p className="text-cream/70 mb-2 capitalize">{formatFechaLarga(fecha)}</p>

            <div className="mt-6 mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4 border-2 border-pitch-400/30 p-4">
              <div>
                <p className="text-pitch-400 text-xs uppercase tracking-wider font-mono">Duración</p>
                <p className="font-display text-2xl mt-1">{horas}h</p>
              </div>
              <div>
                <p className="text-pitch-400 text-xs uppercase tracking-wider font-mono">Total cancha</p>
                <p className="font-display text-2xl mt-1">S/ {precioTotal}</p>
              </div>
              <div>
                <p className="text-pitch-400 text-xs uppercase tracking-wider font-mono">Adelanto</p>
                <p className="font-display text-2xl mt-1 text-pitch-400">S/ {adelantoTotal}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="label-field !text-pitch-400">Tu nombre</label>
                <input required value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Diego Choque"
                  className="input-field !bg-ink !text-cream !border-cream/30 focus:!border-pitch-400" />
              </div>
              <div>
                <label className="label-field !text-pitch-400 flex items-center justify-between">
                  <span>WhatsApp</span>
                  {isValidPeruvianWhatsApp(whatsapp) && (
                    <span className="text-pitch-400 text-xs font-mono normal-case tracking-normal">
                      ✓ {displayPeruvianWhatsApp(whatsapp)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-cream/40 text-sm pointer-events-none">
                    +51
                  </span>
                  <input
                    required type="tel" inputMode="numeric"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="987 654 321"
                    className={`input-field !bg-ink !text-cream pl-12 ${
                      whatsapp && !isValidPeruvianWhatsApp(whatsapp)
                        ? '!border-clay'
                        : '!border-cream/30 focus:!border-pitch-400'
                    }`}
                  />
                </div>
                <p className="text-cream/50 text-xs mt-1">
                  9 dígitos, ejemplo 987 654 321
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="card !bg-cream !text-ink mb-4">
                  <p className="eyebrow mb-3">Paso 1 · Paga el adelanto</p>
                  {venue.yape_qr_url ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <img
                        src={venue.yape_qr_url.startsWith('http') ? venue.yape_qr_url : `${API_URL}${venue.yape_qr_url}`}
                        alt="QR Yape"
                        className="w-32 h-32 object-contain border-2 border-ink"
                      />
                      <div>
                        <p className="text-sm">Escanea con Yape y paga</p>
                        <p className="font-display text-3xl">S/ {adelantoTotal}</p>
                        <p className="text-xs text-ink/60 mt-1">
                          {horas} hora{horas > 1 ? 's' : ''} × S/ {selectedCourt.adelanto_monto}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">
                      Yapea <strong>S/ {adelantoTotal}</strong> al{' '}
                      <span className="font-mono font-semibold">{venue.owner_whatsapp}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label-field !text-pitch-400">
                  Paso 2 · Sube la captura del Yape <span className="text-clay">*</span>
                </label>
                <input required type="file" accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="block w-full text-cream file:bg-pitch-400 file:text-ink file:border-0 file:px-4 file:py-2 file:font-semibold file:mr-4 file:cursor-pointer" />
                {screenshot && <p className="text-pitch-400 text-xs mt-2 font-mono">✓ {screenshot.name}</p>}
                <p className="text-cream/50 text-xs mt-2">
                  Sin captura del pago no se puede confirmar la reserva.
                </p>
              </div>

              {formError && (
                <div className="md:col-span-2">
                  <p className="text-clay font-medium bg-clay/10 border-2 border-clay/30 px-4 py-3">{formError}</p>
                </div>
              )}

              <div className="md:col-span-2 flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-accent w-full sm:w-auto">
                  {submitting ? 'Enviando…' : `Confirmar reserva (S/ ${adelantoTotal})`}
                </button>
                <button type="button"
                  onClick={() => { setSelectedSlots([]); setFormError(null); }}
                  className="btn-ghost !text-cream !border-cream/30 hover:!border-cream w-full sm:w-auto">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <footer className="py-8 text-center text-sm text-ink/40">
        Powered by <a href="/" className="underline hover:text-ink">fubito</a>
      </footer>
    </main>
  );
}
