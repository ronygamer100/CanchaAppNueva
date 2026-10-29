'use client';

type Mode = 'manual' | 'auto';
interface ConfirmationModePickerProps {
  modo: Mode;
  minutos: number;
  onChangeModo: (mode: Mode) => void;
  onChangeMinutos: (minutes: number) => void;
}

export default function ConfirmationModePicker(_props: ConfirmationModePickerProps) {
  return (
    <div className="rounded-lg border border-pitch-700/20 bg-pitch-100 p-5">
      <p className="eyebrow mb-3">Confirmación del pago</p>
      <p className="font-semibold">La reserva se confirma cuando Culqi verifica el pago completo.</p>
      <p className="mt-3 text-sm text-ink/70">
        El jugador dispone de hasta 10 minutos para completar el pago del horario separado.
        Si no inicia el pago, la separación vence y el horario vuelve a estar disponible.
      </p>
      <p className="mt-3 text-sm text-ink/70">
        Si Culqi no devuelve un resultado definitivo, el horario queda protegido y puedes
        verificar el cargo desde tu panel. Una captura o el tiempo transcurrido no confirman un pago.
      </p>
    </div>
  );
}
