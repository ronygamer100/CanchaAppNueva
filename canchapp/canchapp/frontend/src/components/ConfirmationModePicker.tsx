'use client';

type Mode = 'manual' | 'auto';

interface ConfirmationModePickerProps {
  modo: Mode;
  minutos: number;
  onChangeModo: (m: Mode) => void;
  onChangeMinutos: (n: number) => void;
}

const TIEMPO_OPCIONES = [
  { v: 30, label: '30 min' },
  { v: 60, label: '1 hora' },
  { v: 120, label: '2 horas' },
  { v: 240, label: '4 horas' },
];

export default function ConfirmationModePicker({
  modo, minutos, onChangeModo, onChangeMinutos,
}: ConfirmationModePickerProps) {
  return (
    <div className="border-2 border-ink/20 p-5">
      <p className="eyebrow mb-3">Política de confirmación</p>
      <p className="text-sm text-ink/70 mb-4">
        Cuando llega una reserva nueva, ¿quieres revisar la captura del Yape antes de confirmar,
        o que se confirme automáticamente si no te conectas a tiempo?
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <label className={`border-2 p-4 cursor-pointer transition-all ${
          modo === 'manual'
            ? 'border-ink bg-pitch-100 shadow-brut'
            : 'border-ink/20 hover:border-ink'
        }`}>
          <input
            type="radio"
            name="modo_confirmacion"
            value="manual"
            checked={modo === 'manual'}
            onChange={() => onChangeModo('manual')}
            className="sr-only"
          />
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs">●</span>
            <span className="font-semibold">Yo reviso todas</span>
          </div>
          <p className="text-xs text-ink/60">
            Cada reserva queda pendiente hasta que tú la confirmes manualmente.
            Más control, más trabajo.
          </p>
        </label>

        <label className={`border-2 p-4 cursor-pointer transition-all ${
          modo === 'auto'
            ? 'border-ink bg-pitch-400 shadow-brut'
            : 'border-ink/20 hover:border-ink'
        }`}>
          <input
            type="radio"
            name="modo_confirmacion"
            value="auto"
            checked={modo === 'auto'}
            onChange={() => onChangeModo('auto')}
            className="sr-only"
          />
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs">●</span>
            <span className="font-semibold">Confirmar sola</span>
          </div>
          <p className="text-xs text-ink/60">
            Si no la toco en X tiempo, la reserva se confirma sola. Menos trabajo,
            ideal si confías en las capturas.
          </p>
        </label>
      </div>

      {modo === 'auto' && (
        <div>
          <label className="label-field">Tiempo de espera antes de auto-confirmar</label>
          <div className="grid grid-cols-4 gap-2">
            {TIEMPO_OPCIONES.map((op) => (
              <button
                key={op.v}
                type="button"
                onClick={() => onChangeMinutos(op.v)}
                className={`border-2 py-2 font-mono text-sm transition-all ${
                  minutos === op.v
                    ? 'bg-ink text-cream border-ink'
                    : 'border-ink/20 hover:border-ink'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/60 mt-2">
            Si en {TIEMPO_OPCIONES.find((o) => o.v === minutos)?.label || `${minutos} min`} no
            confirmas ni rechazas una reserva, se confirma automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}
