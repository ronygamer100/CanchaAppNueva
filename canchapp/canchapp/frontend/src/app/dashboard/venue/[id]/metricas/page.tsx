'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, apiDownload } from '@/lib/api';
import type { Venue, Metrics } from '@/lib/types';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d: Date): Date {
  const dow = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setDate(d.getDate() - dow);
  m.setHours(0, 0, 0, 0);
  return m;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(d.getDate() + n); return r;
}

export default function MetricasPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const [venue, setVenue] = useState<Venue | null>(null);
  const today = new Date();
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [weekStart, setWeekStart] = useState<Date>(mondayOf(today));
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Venue>(`/api/venues/${venueId}`, { auth: true })
      .then(setVenue)
      .catch((e) => setError(e.message));
  }, [venueId]);

  useEffect(() => {
    setLoading(true);
    const qs = period === 'month'
      ? `period=month&year=${year}&month=${month}`
      : `period=week&week_start=${isoDate(weekStart)}`;
    apiFetch<Metrics>(`/api/venues/${venueId}/metrics?${qs}`, { auth: true })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [venueId, period, year, month, weekStart]);

  function shiftMonth(n: number) {
    let m = month + n;
    let y = year;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    setMonth(m); setYear(y);
  }
  function shiftWeek(n: number) {
    setWeekStart((curr) => addDays(curr, n * 7));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const qs = period === 'month'
        ? `period=month&year=${year}&month=${month}`
        : `period=week&week_start=${isoDate(weekStart)}`;
      await apiDownload(`/api/venues/${venueId}/metrics/export?${qs}`);
    } catch (err) {
      alert('No se pudo exportar: ' + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const maxIngreso = useMemo(() =>
    data ? Math.max(1, ...data.ingresos_diarios.map((d) => d.monto)) : 1,
  [data]);

  const maxOcup = useMemo(() =>
    data ? Math.max(1, ...data.ocupacion_horaria.map((h) => h.reservas)) : 1,
  [data]);

  const periodLabel = useMemo(() => {
    if (!data) return '';
    if (period === 'month') return `${MESES_ES[month - 1]} ${year}`;
    const ws = new Date(weekStart);
    const we = addDays(ws, 6);
    return `Semana ${ws.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`;
  }, [data, period, year, month, weekStart]);

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <p className="font-mono text-clay text-sm mb-2">ERROR</p>
          <p>{error}</p>
        </div>
      </main>
    );
  }
  if (!venue || !data) {
    return <main className="min-h-screen grid place-items-center"><p className="font-mono text-sm text-ink/50">Cargando…</p></main>;
  }

  const k = data.kpis;

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-ink/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow mb-2">Métricas · {venue.nombre}</p>

        {/* Toggle período */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 text-sm font-medium border-2 ${
              period === 'month' ? 'bg-ink text-cream border-ink' : 'border-ink/20'
            }`}
          >
            Por mes
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 text-sm font-medium border-2 ${
              period === 'week' ? 'bg-ink text-cream border-ink' : 'border-ink/20'
            }`}
          >
            Por semana
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <h1 className="display-lg leading-none capitalize">{periodLabel}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {period === 'month' ? (
              <>
                <button onClick={() => shiftMonth(-1)} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-mono">←</button>
                <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
                  className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-medium">
                  Mes actual
                </button>
                <button onClick={() => shiftMonth(1)} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-mono">→</button>
              </>
            ) : (
              <>
                <button onClick={() => shiftWeek(-1)} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-mono">←</button>
                <button onClick={() => setWeekStart(mondayOf(new Date()))}
                  className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-medium">
                  Esta semana
                </button>
                <button onClick={() => shiftWeek(1)} className="border-2 border-ink/20 hover:border-ink px-3 py-2 text-sm font-mono">→</button>
              </>
            )}

            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-accent !py-2 !px-3 text-sm ml-2"
            >
              {exporting ? 'Exportando…' : '↓ Excel'}
            </button>
          </div>
        </div>

        {loading && <p className="font-mono text-xs text-ink/50 mb-3">Cargando…</p>}

        {/* KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KpiCard
            label={period === 'month' ? 'Ingresos del mes' : 'Ingresos de la semana'}
            value={`S/ ${k.ingresos_mes.toFixed(2)}`}
            sub="Solo reservas confirmadas"
            color="pitch"
            big
          />
          <KpiCard
            label="Reservas confirmadas"
            value={String(k.reservas_confirmadas)}
            sub={`${k.reservas_canceladas} canceladas · ${k.reservas_rechazadas} rechazadas`}
          />
          <KpiCard
            label="Hora más popular"
            value={k.horario_popular || '—'}
            sub="Cuando más reservan"
          />
          <KpiCard
            label="Tasa de ocupación"
            value={`${k.tasa_ocupacion_pct}%`}
            sub={k.cancha_top ? `Top: ${k.cancha_top}` : 'Sin datos aún'}
          />
        </div>

        {/* Gráfico ingresos */}
        <section className="card-brut bg-cream mb-10">
          <p className="eyebrow mb-1">
            {period === 'month' ? 'Ingresos por día del mes' : 'Ingresos por día de la semana'}
          </p>
          <p className="text-sm text-ink/60 mb-6">Cada barra es el ingreso confirmado de ese día.</p>
          {data.ingresos_diarios.every((d) => d.monto === 0) ? (
            <p className="text-ink/40 font-mono text-sm py-12 text-center">Sin reservas confirmadas.</p>
          ) : (
            <div className="flex items-end gap-1 h-48" style={{ minHeight: '12rem' }}>
              {data.ingresos_diarios.map((d) => {
                const day = parseInt(d.fecha.slice(8, 10));
                const pct = d.monto / maxIngreso * 100;
                return (
                  <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1 min-w-[18px]">
                    <div
                      className="w-full bg-pitch-400 border-2 border-ink relative group"
                      style={{ height: `${Math.max(pct, 1)}%` }}
                    >
                      {d.monto > 0 && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-ink text-cream px-1 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          S/{d.monto}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-ink/50">{day}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Gráfico ocupación */}
        <section className="card-brut bg-cream">
          <p className="eyebrow mb-1">Ocupación por hora del día</p>
          <p className="text-sm text-ink/60 mb-6">Total de reservas que tocan cada hora durante el período.</p>
          {data.ocupacion_horaria.every((h) => h.reservas === 0) ? (
            <p className="text-ink/40 font-mono text-sm py-12 text-center">Sin datos aún.</p>
          ) : (
            <div className="flex items-end gap-1 h-48" style={{ minHeight: '12rem' }}>
              {data.ocupacion_horaria.map((h) => {
                const pct = h.reservas / maxOcup * 100;
                return (
                  <div key={h.hora} className="flex-1 flex flex-col items-center gap-1 min-w-[24px]">
                    <div
                      className="w-full bg-ink relative group"
                      style={{ height: `${Math.max(pct, 1)}%` }}
                    >
                      {h.reservas > 0 && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-pitch-400 text-ink px-1 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-ink">
                          {h.reservas}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-ink/50">{String(h.hora).padStart(2, '0')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label, value, sub, color, big = false,
}: { label: string; value: string; sub?: string; color?: 'pitch'; big?: boolean }) {
  const bg = color === 'pitch' ? 'bg-pitch-400 border-ink shadow-brut' : 'bg-cream border-ink/20';
  return (
    <article className={`border-2 p-5 ${bg}`}>
      <p className="eyebrow mb-2">{label}</p>
      <p className={`font-display ${big ? 'text-4xl' : 'text-3xl'} leading-none tracking-tightest`}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink/60 mt-2">{sub}</p>}
    </article>
  );
}
