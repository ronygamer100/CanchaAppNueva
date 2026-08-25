import LegalPage from '@/components/LegalPage';
import { LEGAL_LAST_UPDATED, LEGAL_PROVIDER } from '@/lib/legal';

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Estas condiciones explican cómo funcionan las reservas y pagos realizados mediante Fubito."
    >
      <section>
        <h2>1. Identificación del comercio</h2>
        <p>
          Fubito es una plataforma operada en esta etapa piloto por {LEGAL_PROVIDER.tradeName},
          nombre comercial de {LEGAL_PROVIDER.legalName}, con RUC {LEGAL_PROVIDER.ruc}, domicilio en
          {' '}{LEGAL_PROVIDER.address}. Atención: {LEGAL_PROVIDER.phone}, {LEGAL_PROVIDER.email},
          {' '}{LEGAL_PROVIDER.serviceHours.toLowerCase()}
        </p>
      </section>

      <section>
        <h2>2. Servicio ofrecido</h2>
        <p>
          Fubito permite consultar canchas, fotografías, servicios, precios y horarios disponibles,
          seleccionar una fecha y realizar una reserva. En la ficha de cada cancha se identifica el
          local que presta el servicio. Durante el piloto, los cobros de Cancha Uwu corresponden al
          comercio {LEGAL_PROVIDER.tradeName}.
        </p>
      </section>

      <section>
        <h2>3. Proceso de reserva y compra</h2>
        <ol>
          <li>El usuario elige una cancha, fecha y uno o más horarios consecutivos.</li>
          <li>Fubito muestra el resumen, la duración, el precio por hora y el total.</li>
          <li>El usuario completa sus datos, acepta estas condiciones y selecciona pagar.</li>
          <li>El pago con Yape se procesa de forma segura mediante Culqi.</li>
          <li>La reserva queda registrada cuando Culqi aprueba el pago y Fubito muestra la confirmación.</li>
        </ol>
      </section>

      <section>
        <h2>4. Precios y pagos</h2>
        <p>
          Los precios se muestran en soles e incluyen el importe total informado antes de pagar.
          El método habilitado durante esta etapa es Yape mediante Culqi. Fubito no solicita ni
          almacena el código de aprobación de Yape; estos datos se ingresan directamente en Culqi.
        </p>
      </section>

      <section>
        <h2>5. Disponibilidad y confirmación</h2>
        <p>
          Los horarios dependen de la configuración y ocupación de cada local. Una selección no
          garantiza la reserva hasta concluir el pago. Si el horario deja de estar disponible antes
          de finalizar, no se confirmará la operación y se informará al usuario.
        </p>
      </section>

      <section>
        <h2>6. Cancelaciones y devoluciones</h2>
        <p>
          Las reglas aplicables están descritas en la Política de cambios y devoluciones. La
          cancelación de una reserva no genera por sí sola una devolución automática. Cuando
          corresponda, el comercio procesará la devolución mediante Culqi.
        </p>
      </section>

      <section>
        <h2>7. Cuenta y responsabilidad del usuario</h2>
        <p>
          El usuario debe proporcionar información verdadera y mantener bajo su control el acceso
          a su cuenta. Debe revisar cancha, fecha, hora, duración y monto antes de pagar. El uso de
          la plataforma por menores debe realizarse con autorización de su representante.
        </p>
      </section>

      <section>
        <h2>8. Datos personales</h2>
        <p>
          Los datos se usan para gestionar la reserva, procesar el pago, comunicarse con el usuario
          y atender solicitudes. El tratamiento se detalla en la Política de privacidad y se realiza
          conforme a la Ley N.° 29733, Ley de Protección de Datos Personales.
        </p>
      </section>

      <section>
        <h2>9. Reclamos y solución de controversias</h2>
        <p>
          El usuario puede presentar un reclamo o queja mediante el Libro de Reclamaciones de
          Fubito. Las controversias se rigen por la legislación peruana y pueden ser atendidas por
          conciliación, INDECOPI o la autoridad competente.
        </p>
      </section>

      <section>
        <h2>10. Vigencia</h2>
        <p>
          El uso de Fubito implica la aceptación de estas condiciones. Las actualizaciones se
          publicarán en esta misma página. Última actualización: {LEGAL_LAST_UPDATED}.
        </p>
      </section>
    </LegalPage>
  );
}
