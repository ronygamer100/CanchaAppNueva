import LegalPage from '@/components/LegalPage';
import { LEGAL_LAST_UPDATED, LEGAL_PROVIDER } from '@/lib/legal';

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Cambios, cancelaciones y devoluciones"
      intro="Estas reglas se aplican a las reservas de Cancha Uwu cobradas por TECHDG durante la etapa piloto de Fubito."
    >
      <section>
        <h2>Cancelación solicitada por el jugador</h2>
        <p>
          El jugador puede cancelar desde el enlace de su reserva hasta dos horas antes del inicio.
          La cancelación libera el horario, pero no produce automáticamente una devolución. El
          jugador puede solicitar la evaluación del caso por nuestros canales de atención, indicando
          el número de reserva y el motivo.
        </p>
      </section>

      <section>
        <h2>Cancelación atribuible al local</h2>
        <p>
          Si el local cancela la reserva, no puede prestar el servicio o existe un cobro duplicado o
          incorrecto, corresponde la devolución total del importe afectado. El comercio gestionará
          la operación mediante Culqi al mismo medio de pago utilizado.
        </p>
      </section>

      <section>
        <h2>Reprogramaciones</h2>
        <p>
          Las solicitudes de cambio de fecha u horario se evalúan según disponibilidad. Una
          reprogramación solo queda confirmada cuando el local lo comunica expresamente al jugador.
          Si el nuevo horario tiene un precio diferente, se informará antes de confirmar el cambio.
        </p>
      </section>

      <section>
        <h2>Plazo y forma de devolución</h2>
        <p>
          Las devoluciones aprobadas se solicitan a Culqi dentro de un máximo de diez días hábiles
          desde la aprobación del caso. La visualización final del dinero depende de los tiempos de
          Culqi, Yape y la entidad financiera del usuario.
        </p>
      </section>

      <section>
        <h2>Cómo solicitar atención</h2>
        <p>
          Comunícate al {LEGAL_PROVIDER.phone} o escribe a {LEGAL_PROVIDER.email}. El horario de
          atención es {LEGAL_PROVIDER.serviceHours.toLowerCase()} También puedes utilizar el Libro
          de Reclamaciones integrado en Fubito.
        </p>
      </section>

      <section>
        <h2>Última actualización</h2>
        <p>{LEGAL_LAST_UPDATED}.</p>
      </section>
    </LegalPage>
  );
}
