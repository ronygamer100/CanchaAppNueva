'use client';

import { LoadingScreen } from '@/components/Skeleton';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { humanizeError } from '@/lib/errors';
import type { ReservationPublic } from '@/lib/types';

function formatFechaLarga(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function CancelacionPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [reserva, setReserva] = useState<ReservationPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const item = await apiFetch<ReservationPublic>(`/api/public/reservations/${token}`);
        if (!active) return;
        setReserva(item);
        if (!['reservado', 'procesando', 'verificacion'].includes(item.payment_status || '')) {
          localStorage.removeItem(`fubito_checkout:${item.venue_slug}`);
        }
      } catch (err) { if (active) setError(humanizeError(err)); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 6000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token]);

  async function handleCancel() {
    setCancelling(true); setError(null);
    try {
      const updated = await apiFetch<ReservationPublic>(
        `/api/public/reservations/${token}/cancel`, { method: 'POST' },
      );
      setReserva(updated); setConfirming(false);
      localStorage.removeItem(`fubito_checkout:${updated.venue_slug}`);
    } catch (err) {
      setError(humanizeError(err));
    } finally { setCancelling(false); }
  }

  if (error && !reserva) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <p className="font-mono text-clay text-sm mb-2">ERROR</p>
          <h1 className="display-lg mb-3">Reserva no encontrada</h1>
          <p className="text-ink/70">El link no es válido o expiró.</p>
        </div>
      </main>
    );
  }
  if (!reserva) {
    return <LoadingScreen />;
  }

  const yaCancelada = reserva.estado === 'cancelada';
  const yaRechazada = reserva.estado === 'rechazada';
  const finalizada = yaCancelada || yaRechazada;
  const waiting = ['procesando', 'verificacion'].includes(reserva.payment_status || '');
  const held = reserva.payment_status === 'reservado';
  const esDemo = reserva.payment_status === 'demo';
  const montoPagado = reserva.monto_pagado ?? reserva.adelanto_monto ?? 0;
  const montoTotal = reserva.monto_total ?? montoPagado;

  return (
    <main className="min-h-screen">
      <section className={`${finalizada ? 'bg-ink/80' : 'bg-pitch-900'} text-cream`}>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <p className={`eyebrow ${finalizada ? '!text-clay' : '!text-pitch-400'} mb-4`}>
            {yaCancelada ? 'Reserva cancelada' : yaRechazada ? 'Reserva rechazada' : 'Tu reserva'}
          </p>
          <h1 className="display-lg mb-2">{reserva.venue_nombre}</h1>
          <p className="text-cream/80 text-base">
            {reserva.court_nombre}{reserva.court_tipo ? ` · ${reserva.court_tipo}` : ''}
          </p>
          <p className="text-cream/60 text-sm mt-2">{reserva.direccion}</p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-10">
        <div className="card-brut mb-6" role="status">
          <p className="font-semibold">{waiting ? 'Pago en verificación' : held ? 'Horario separado, pendiente de pago' : reserva.estado === 'confirmada' ? 'Reserva confirmada' : 'Solicitud finalizada'}</p>
          {waiting && <p className="mt-2">No vuelvas a pagar. El horario sigue protegido mientras el local verifica el resultado con Culqi. Esta página actualiza el estado automáticamente.</p>}
          {held && <p className="mt-2">La separación vence a las {new Date(reserva.hold_expires_at || '').toLocaleTimeString('es-PE')}. Puedes liberarla para elegir un horario nuevamente. Todavía no hay un pago verificado.</p>}
          {reserva.quote_source === 'legacy_estimated' && <p className="mt-2 text-sm">El importe histórico es una estimación conservada al actualizar el sistema.</p>}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card">
            <p className="eyebrow mb-2">Fecha</p>
            <p className="font-display text-xl capitalize">{formatFechaLarga(reserva.fecha)}</p>
          </div>
          <div className="card">
            <p className="eyebrow mb-2">Horario</p>
            <p className="font-display text-xl">
              {reserva.hora_inicio.slice(0, 5)} – {reserva.hora_fin.slice(0, 5)}
            </p>
            <p className="text-xs text-ink/60 font-mono mt-1">{reserva.horas}h</p>
          </div>
          <div className="card">
            <p className="eyebrow mb-2">Jugador</p>
            <p className="font-medium">{reserva.jugador_nombre}</p>
          </div>
          <div className="card">
            <p className="eyebrow mb-2">{esDemo ? 'Valor referencial' : waiting || held ? 'Importe solicitado' : 'Pago neto verificado'}</p>
            <p className="font-display text-xl">
              S/ {(esDemo || waiting || held ? montoTotal : montoPagado).toFixed(2)}
            </p>
          </div>
        </div>

        {finalizada ? (
          <div className="card-brut bg-cream">
            <p className="text-ink/70">
              {yaCancelada
                ? 'Tu reserva fue cancelada. El pago no se reembolsa automáticamente.'
                : 'Tu reserva fue rechazada por el dueño. Debería haberte contactado por WhatsApp.'}
            </p>
          </div>
        ) : !waiting ? (
          <div className="card-brut bg-cream">
            <p className="eyebrow !text-clay mb-3">Cancelar reserva</p>
            <p className="text-ink/80 mb-4">
              Si cancelas, <strong>el pago no se devuelve automáticamente</strong>. Solo se puede cancelar hasta 2 horas antes del inicio.
            </p>
            {!confirming ? (
              <button onClick={() => setConfirming(true)}
                className="bg-clay text-cream font-semibold border-2 border-ink shadow-brut px-4 py-2 hover:-translate-y-0.5 transition-transform">
                Quiero cancelar mi reserva
              </button>
            ) : (
              <>
                <p className="font-medium mb-3">¿Seguro? Esta acción no se puede deshacer.</p>
                <div className="flex gap-3">
                  <button onClick={handleCancel} disabled={cancelling}
                    className="bg-clay text-cream font-semibold border-2 border-ink shadow-brut px-4 py-2 hover:-translate-y-0.5 transition-transform">
                    {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
                  </button>
                  <button onClick={() => setConfirming(false)} className="btn-ghost">No, volver</button>
                </div>
              </>
            )}
            {error && <p className="text-clay text-sm mt-4 font-medium">{error}</p>}
          </div>
        ) : null}

        {finalizada && <a href={`/c/${reserva.venue_slug}`} className="btn-primary w-full mt-5">Elegir otro horario</a>}
        <p className="text-center text-xs text-ink/40 mt-8 font-mono">
          Guarda este link para consultar el estado de tu reserva.
        </p>
      </section>
    </main>
  );
}
