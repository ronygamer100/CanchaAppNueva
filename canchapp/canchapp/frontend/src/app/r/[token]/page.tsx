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
    apiFetch<ReservationPublic>(`/api/public/reservations/${token}`)
      .then(setReserva)
      .catch((e) => setError(e.message));
  }, [token]);

  async function handleCancel() {
    setCancelling(true); setError(null);
    try {
      const updated = await apiFetch<ReservationPublic>(
        `/api/public/reservations/${token}/cancel`, { method: 'POST' },
      );
      setReserva(updated); setConfirming(false);
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
            <p className="eyebrow mb-2">Adelanto pagado</p>
            <p className="font-display text-xl">S/ {reserva.adelanto_monto}</p>
          </div>
        </div>

        {finalizada ? (
          <div className="card-brut bg-cream">
            <p className="text-ink/70">
              {yaCancelada
                ? 'Tu reserva fue cancelada. El adelanto no se reembolsa.'
                : 'Tu reserva fue rechazada por el dueño. Debería haberte contactado por WhatsApp.'}
            </p>
          </div>
        ) : (
          <div className="card-brut bg-cream">
            <p className="eyebrow !text-clay mb-3">Cancelar reserva</p>
            <p className="text-ink/80 mb-4">
              Si cancelas, <strong>el adelanto no se reembolsa</strong>. Solo se puede cancelar hasta 2 horas antes del inicio.
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
        )}

        <p className="text-center text-xs text-ink/40 mt-8 font-mono">
          Guarda este link para consultar el estado de tu reserva.
        </p>
      </section>
    </main>
  );
}
