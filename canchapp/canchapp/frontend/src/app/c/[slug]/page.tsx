'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, ExternalLink,
  Info, MapPin, Phone, Upload, UserRound,
} from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import { LoadingScreen } from '@/components/Skeleton';
import MapPicker from '@/components/MapPicker';
import { AMENITIES_BY_SLUG } from '@/lib/amenities';
import { apiFetch, API_URL, getPlayerToken } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import {
  displayPeruvianWhatsApp, isValidPeruvianWhatsApp, normalizePeruvianWhatsApp,
} from '@/lib/whatsapp';
import type {
  CourtPublicLite, DayAvailability, Player, ReservationCreated, Slot, VenuePublic,
} from '@/lib/types';

function dateToISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayISO() {
  return dateToISO(new Date());
}

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateToISO(date);
}

function formatHora(value: string) {
  return value.slice(0, 5);
}

function formatFechaLarga(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function dateTile(iso: string, index: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    label: index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
    day,
  };
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function VenuePublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [venue, setVenue] = useState<VenuePublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<CourtPublicLite | null>(null);
  const [fecha, setFecha] = useState(todayISO());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ReservationCreated | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!getPlayerToken()) return;
    apiFetch<Player>('/api/player/me', { auth: 'player' })
      .then((currentPlayer) => {
        setPlayer(currentPlayer);
        setNombre(currentPlayer.nombre);
        if (currentPlayer.whatsapp) setWhatsapp(currentPlayer.whatsapp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch<VenuePublic>(`/api/public/venues/${slug}`)
      .then((data) => {
        setVenue(data);
        if (data.courts.length > 0) setSelectedCourt(data.courts[0]);
      })
      .catch((requestError) => setError(requestError.message));
  }, [slug]);

  useEffect(() => {
    if (!selectedCourt || !venue?.reservas_habilitadas) return;
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    setAvailability(null);
    setSelectedSlots([]);

    apiFetch<DayAvailability>(
      `/api/public/venues/${slug}/courts/${selectedCourt.id}/availability?fecha=${fecha}`,
    )
      .then((data) => { if (active) setAvailability(data); })
      .catch((requestError) => {
        if (active) setAvailabilityError(humanizeError(requestError));
      })
      .finally(() => { if (active) setAvailabilityLoading(false); });

    return () => { active = false; };
  }, [fecha, selectedCourt, slug, venue?.reservas_habilitadas]);

  const hours = selectedSlots.length;
  const advanceTotal = selectedCourt ? selectedCourt.adelanto_monto * hours : 0;
  const priceTotal = selectedCourt ? selectedCourt.precio_hora * hours : 0;
  const startTime = selectedSlots[0]?.hora_inicio;
  const endTime = selectedSlots[selectedSlots.length - 1]?.hora_fin;
  const dateOptions = [addDaysISO(0), addDaysISO(1), addDaysISO(2)];

  function toggleSlot(slot: Slot) {
    if (slot.estado !== 'libre') return;
    setFormError(null);

    const index = selectedSlots.findIndex((item) => item.hora_inicio === slot.hora_inicio);
    if (index !== -1) {
      if (index === 0 || index === selectedSlots.length - 1) {
        setSelectedSlots((current) => current.filter((item) => item.hora_inicio !== slot.hora_inicio));
      } else {
        setSelectedSlots([slot]);
      }
      return;
    }

    if (selectedSlots.length === 0) {
      setSelectedSlots([slot]);
      return;
    }

    const slotStart = toMinutes(slot.hora_inicio);
    const slotEnd = toMinutes(slot.hora_fin);
    const selectionStart = toMinutes(selectedSlots[0].hora_inicio);
    const selectionEnd = toMinutes(selectedSlots[selectedSlots.length - 1].hora_fin);

    if (slotEnd === selectionStart) setSelectedSlots((current) => [slot, ...current]);
    else if (slotStart === selectionEnd) setSelectedSlots((current) => [...current, slot]);
    else setSelectedSlots([slot]);
  }

  function isSelectable(slot: Slot) {
    if (slot.estado !== 'libre') return false;
    if (selectedSlots.length === 0) return true;
    if (selectedSlots.some((item) => item.hora_inicio === slot.hora_inicio)) return true;

    const slotStart = toMinutes(slot.hora_inicio);
    const slotEnd = toMinutes(slot.hora_fin);
    const selectionStart = toMinutes(selectedSlots[0].hora_inicio);
    const selectionEnd = toMinutes(selectedSlots[selectedSlots.length - 1].hora_fin);
    return slotEnd === selectionStart || slotStart === selectionEnd;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!venue?.reservas_habilitadas) {
      setFormError('Esta cancha todavía no acepta reservas en fubito.');
      return;
    }
    if (!selectedCourt || !startTime || !endTime || selectedSlots.length === 0) return;
    if (!screenshot) {
      setFormError('Selecciona una imagen para probar el comprobante.');
      return;
    }

    const normalizedWhatsApp = normalizePeruvianWhatsApp(whatsapp);
    if (!normalizedWhatsApp) {
      setFormError('Escribe un celular peruano de 9 dígitos que empiece con 9.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fecha', fecha);
      formData.append('hora_inicio', startTime.slice(0, 5));
      formData.append('hora_fin', endTime.slice(0, 5));
      formData.append('jugador_nombre', nombre);
      formData.append('jugador_whatsapp', normalizedWhatsApp);
      formData.append('yape_screenshot', screenshot);

      const reservation = await apiFetch<ReservationCreated>(
        `/api/public/venues/${slug}/courts/${selectedCourt.id}/reservations`,
        { method: 'POST', formData, auth: player ? 'player' : undefined },
      );
      setSuccess(reservation);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setFormError(humanizeError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-md text-center">
          <MapPin className="mx-auto mb-4 text-clay" size={44} />
          <h1 className="display-md">No encontramos esta cancha</h1>
          <p className="mt-3 text-ink/60">Revisa el enlace o vuelve al inicio para elegir otra opción.</p>
          <Link href="/" className="btn-primary mt-6">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  if (!venue) return <LoadingScreen />;

  if (success) {
    return (
      <main className="min-h-screen bg-cream px-5 py-10">
        <div className="mx-auto max-w-lg">
          <FubitoLogo size="sm" />
          <div className="mt-10 rounded-lg bg-forest p-7 text-white shadow-brutLg">
            <div className="mb-6 grid h-16 w-16 place-items-center rounded-lg bg-pitch-400 text-forest">
              <CheckCircle2 size={38} strokeWidth={2.5} />
            </div>
            <p className="text-base font-semibold text-pitch-400">
              {venue.es_referencial ? 'Reserva de prueba creada' : 'Reserva enviada'}
            </p>
            <h1 className="mt-2 font-display text-4xl font-black leading-tight">
              ¡Tu horario quedó registrado!
            </h1>
            <p className="mt-4 text-white/75">
              {nombre.split(' ')[0]}, puedes revisar todos los datos antes del partido.
            </p>
          </div>

          <section className="card mt-5 !p-0 overflow-hidden">
            <ReservationDetail label="Lugar" value={venue.nombre} />
            <ReservationDetail label="Cancha" value={selectedCourt?.nombre || ''} />
            <ReservationDetail label="Fecha" value={formatFechaLarga(success.fecha)} />
            <ReservationDetail
              label="Horario"
              value={`${formatHora(success.hora_inicio)} a ${formatHora(success.hora_fin)}`}
              last
            />
          </section>

          <div className="mt-6 space-y-3">
            <Link href={player ? '/jugador' : '/jugador/login'} className="btn-accent w-full">
              <CalendarDays size={21} />
              {player ? 'Ver mis reservas' : 'Entrar para guardar mi reserva'}
            </Link>
            <Link href={`/c/${slug}`} className="btn-ghost w-full">Reservar otro horario</Link>
          </div>
        </div>
      </main>
    );
  }

  const venueImage = venue.foto_url
    ? (venue.foto_url.startsWith('http') ? venue.foto_url : `${API_URL}${venue.foto_url}`)
    : null;

  return (
    <main className={`min-h-screen bg-cream ${selectedSlots.length > 0 ? 'pb-32' : 'pb-12'}`}>
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-white/95 backdrop-blur">
        <div className="mx-auto grid min-h-[68px] max-w-4xl grid-cols-[44px_1fr_44px] items-center px-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg text-forest" aria-label="Volver">
            <ArrowLeft size={25} />
          </Link>
          <FubitoLogo size="sm" className="justify-self-center" />
          <Link
            href={`/jugador/login?next=/c/${slug}`}
            className="grid h-11 w-11 place-items-center rounded-lg text-forest"
            aria-label={player ? 'Ver mis reservas' : 'Entrar'}
          >
            <UserRound size={24} />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl">
        {venueImage && (
          <div className="aspect-[4/3] w-full overflow-hidden bg-sky sm:mt-6 sm:aspect-[16/8] sm:rounded-lg">
            <img src={venueImage} alt={venue.nombre} className="h-full w-full object-cover" />
          </div>
        )}

        <section className="bg-white px-5 py-7 sm:mt-4 sm:rounded-lg sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-sm font-semibold text-pitch-700">
                {venue.es_referencial ? 'Cancha demo' : 'Reserva en línea'}
              </p>
              <h1 className="font-display text-4xl font-black leading-tight">{venue.nombre}</h1>
            </div>
            {selectedCourt && (
              <div className="shrink-0 text-right">
                <p className="font-display text-3xl font-black text-clay">S/ {selectedCourt.precio_hora}</p>
                <p className="text-xs text-ink/50">por hora</p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3 text-base">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 shrink-0 text-pitch-700" size={22} />
              <span>{venue.direccion}</span>
            </p>
            <p className="flex items-center gap-3">
              <Clock3 className="shrink-0 text-pitch-700" size={22} />
              <span>Abierto de {formatHora(venue.hora_apertura)} a {formatHora(venue.hora_cierre)}</span>
            </p>
          </div>

          {venue.descripcion && <p className="mt-5 text-ink/65">{venue.descripcion}</p>}
        </section>

        {venue.es_referencial && (
          <section className="mx-5 mt-4 rounded-lg bg-sky p-5 sm:mx-0">
            <div className="flex gap-3">
              <Info className="mt-0.5 shrink-0 text-forest" size={24} />
              <div>
                <h2 className="font-display text-xl font-black">Información para esta demo</h2>
                <p className="mt-1 text-sm text-ink/70">
                  Los precios y servicios son referenciales. Puedes completar una reserva de prueba sin enviar dinero.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {venue.telefono_publico && (
                <a href={`tel:${venue.telefono_publico.replace(/\s/g, '')}`} className="btn-ghost bg-white">
                  <Phone size={19} />
                  Llamar al local
                </a>
              )}
              {venue.fuente_url && (
                <a href={venue.fuente_url} target="_blank" rel="noreferrer" className="btn-ghost bg-white">
                  <ExternalLink size={19} />
                  Ver información pública
                </a>
              )}
            </div>
          </section>
        )}

        {venue.amenities.length > 0 && (
          <section className="px-5 py-8 sm:px-0">
            <h2 className="font-display text-2xl font-black">Servicios del local</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {venue.amenities.map((amenitySlug) => {
                const amenity = AMENITIES_BY_SLUG[amenitySlug];
                if (!amenity) return null;
                return (
                  <div key={amenitySlug} className="flex min-h-16 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
                    <span className="h-6 w-6 shrink-0 text-pitch-700">{amenity.icon}</span>
                    <span className="text-sm font-semibold leading-tight">{amenity.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {venue.lat && venue.lng && (
          <section className="px-5 pb-8 sm:px-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-black">Ubicación</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-pitch-700"
              >
                Abrir en Maps
              </a>
            </div>
            <MapPicker lat={venue.lat} lng={venue.lng} readOnly height={260} />
          </section>
        )}

        <section className="border-t border-forest/10 bg-white px-5 py-8 sm:rounded-lg sm:px-7">
          <h2 className="font-display text-3xl font-black">Elige cancha, día y hora</h2>
          <p className="mt-2 text-ink/60">Los botones grandes te muestran cada paso en orden.</p>

          {venue.courts.length > 1 && (
            <div className="mt-7">
              <label className="label-field">1. Elige la cancha</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {venue.courts.map((court) => {
                  const active = selectedCourt?.id === court.id;
                  return (
                    <button
                      key={court.id}
                      onClick={() => setSelectedCourt(court)}
                      className={`flex min-h-16 items-center justify-between rounded-lg border px-4 py-3 text-left ${
                        active ? 'border-pitch-500 bg-pitch-100' : 'border-forest/15 bg-white'
                      }`}
                    >
                      <span>
                        <span className="block font-semibold">{court.nombre}</span>
                        <span className="text-sm text-ink/55">{court.tipo || 'Cancha'} · S/ {court.precio_hora}/hora</span>
                      </span>
                      {active && <Check className="text-pitch-700" size={23} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-7">
            <label className="label-field">{venue.courts.length > 1 ? '2.' : '1.'} Elige el día</label>
            <div className="grid grid-cols-3 gap-3">
              {dateOptions.map((date, index) => {
                const tile = dateTile(date, index);
                const active = fecha === date;
                return (
                  <button
                    key={date}
                    onClick={() => setFecha(date)}
                    className={`min-h-[92px] rounded-lg border p-3 text-center ${
                      active ? 'border-pitch-500 bg-pitch-400 text-forest' : 'border-forest/15 bg-white'
                    }`}
                  >
                    <span className="block text-sm font-semibold capitalize">{tile.label}</span>
                    <span className="mt-1 block font-display text-3xl font-black">{tile.day}</span>
                  </button>
                );
              })}
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm text-ink/60">Otra fecha</span>
              <input
                type="date"
                min={todayISO()}
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="input-field"
              />
            </label>
          </div>

          <div className="mt-7">
            <label className="label-field">{venue.courts.length > 1 ? '3.' : '2.'} Elige una hora</label>
            <p className="mb-4 text-sm text-ink/55 capitalize">{formatFechaLarga(fecha)}</p>

            {availabilityLoading && <div className="skeleton h-44" />}
            {availabilityError && (
              <div className="rounded-lg bg-clay/10 p-4 text-sm font-medium text-clay">{availabilityError}</div>
            )}
            {!availabilityLoading && !availabilityError && availability?.slots.length === 0 && (
              <div className="rounded-lg bg-sky p-5 text-center">No hay horarios configurados para este día.</div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(availability?.slots || []).map((slot) => {
                const selected = selectedSlots.some((item) => item.hora_inicio === slot.hora_inicio);
                const selectable = isSelectable(slot);
                const unavailable = slot.estado !== 'libre';
                return (
                  <button
                    key={slot.hora_inicio}
                    disabled={unavailable}
                    onClick={() => toggleSlot(slot)}
                    className={`min-h-[76px] rounded-lg border px-3 py-3 text-center transition-colors ${
                      selected
                        ? 'border-pitch-500 bg-pitch-400 text-forest'
                        : unavailable
                          ? 'cursor-not-allowed border-forest/5 bg-ink/5 text-ink/35'
                          : selectable
                            ? 'border-forest/20 bg-white hover:border-pitch-500'
                            : 'border-forest/10 bg-white text-ink/45'
                    }`}
                  >
                    <span className="block text-xs font-semibold">
                      {selected ? 'Elegido' : unavailable ? 'Ocupado' : 'Disponible'}
                    </span>
                    <span className="mt-1 block font-display text-2xl font-black">{formatHora(slot.hora_inicio)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {selectedSlots.length > 0 && selectedCourt && startTime && endTime && (
          <section id="datos-reserva" className="mt-4 bg-white px-5 py-9 sm:rounded-lg sm:px-7">
            <p className="text-sm font-semibold text-pitch-700">Último paso</p>
            <h2 className="mt-1 font-display text-3xl font-black">Completa tus datos</h2>
            <p className="mt-2 capitalize text-ink/60">
              {formatFechaLarga(fecha)} · {formatHora(startTime)} a {formatHora(endTime)}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 rounded-lg bg-sky p-4 text-center">
              <SummaryValue label="Duración" value={`${hours}h`} />
              <SummaryValue label="Total" value={`S/ ${priceTotal}`} />
              <SummaryValue label="Adelanto" value={`S/ ${advanceTotal}`} accent />
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-6">
              <div>
                <label className="label-field">Tu nombre</label>
                <input
                  required
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Diego Choque"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">Tu WhatsApp</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/45">+51</span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    placeholder="987 654 321"
                    className={`input-field !pl-14 ${whatsapp && !isValidPeruvianWhatsApp(whatsapp) ? 'input-error' : ''}`}
                  />
                </div>
                {isValidPeruvianWhatsApp(whatsapp) && (
                  <p className="mt-2 text-sm font-semibold text-pitch-700">Correcto: {displayPeruvianWhatsApp(whatsapp)}</p>
                )}
              </div>

              <div className={`rounded-lg p-5 ${venue.es_referencial ? 'bg-sky' : 'bg-pitch-100'}`}>
                <h3 className="font-display text-xl font-black">
                  {venue.es_referencial ? 'Comprobante de prueba' : 'Paga el adelanto'}
                </h3>
                <p className="mt-2 text-sm text-ink/70">
                  {venue.es_referencial
                    ? 'No envíes dinero. Sube cualquier imagen para probar el flujo completo.'
                    : `Paga S/ ${advanceTotal} por Yape y sube la captura.`}
                </p>
                {!venue.es_referencial && venue.yape_qr_url && (
                  <img
                    src={venue.yape_qr_url.startsWith('http') ? venue.yape_qr_url : `${API_URL}${venue.yape_qr_url}`}
                    alt="Código QR de Yape"
                    className="mt-4 h-36 w-36 rounded-lg bg-white object-contain p-2"
                  />
                )}

                <label className="mt-5 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-forest/20 bg-white px-4 py-3 font-semibold text-forest">
                  <Upload size={21} />
                  {screenshot ? 'Cambiar imagen' : 'Seleccionar imagen'}
                  <input
                    required
                    type="file"
                    accept="image/*"
                    onChange={(event) => setScreenshot(event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
                {screenshot && <p className="mt-2 truncate text-sm font-medium">{screenshot.name}</p>}
              </div>

              {formError && (
                <p className="rounded-lg bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">{formError}</p>
              )}

              <button type="submit" disabled={submitting} className="btn-accent btn-lg w-full">
                {submitting ? 'Creando reserva…' : venue.es_referencial ? 'Crear reserva de prueba' : 'Confirmar reserva'}
              </button>
            </form>
          </section>
        )}
      </div>

      {selectedSlots.length > 0 && startTime && endTime && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-forest/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(18,60,50,0.10)] backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize">{formatFechaLarga(fecha)}</p>
              <p className="font-display text-xl font-black">
                {formatHora(startTime)} a {formatHora(endTime)} · <span className="text-clay">S/ {priceTotal}</span>
              </p>
            </div>
            <a href="#datos-reserva" className="btn-accent shrink-0">Continuar</a>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryValue({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink/55">{label}</p>
      <p className={`font-display text-xl font-black ${accent ? 'text-clay' : ''}`}>{value}</p>
    </div>
  );
}

function ReservationDetail({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex min-h-16 items-center justify-between gap-4 px-5 py-4 ${last ? '' : 'border-b border-forest/10'}`}>
      <span className="text-sm text-ink/55">{label}</span>
      <span className="text-right font-semibold capitalize">{value}</span>
    </div>
  );
}
