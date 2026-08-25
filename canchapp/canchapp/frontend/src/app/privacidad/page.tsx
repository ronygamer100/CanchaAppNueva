import LegalPage from '@/components/LegalPage';
import { LEGAL_LAST_UPDATED, LEGAL_PROVIDER } from '@/lib/legal';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Explicamos qué datos utiliza Fubito y para qué los necesita durante una reserva."
    >
      <section>
        <h2>Responsable</h2>
        <p>
          {LEGAL_PROVIDER.legalName}, RUC {LEGAL_PROVIDER.ruc}, nombre comercial
          {' '}{LEGAL_PROVIDER.tradeName}, con domicilio en {LEGAL_PROVIDER.address}.
        </p>
      </section>
      <section>
        <h2>Datos que recopilamos</h2>
        <p>
          Podemos tratar nombre, correo, teléfono, información de la reserva, cuenta de acceso y
          comunicaciones de soporte o reclamos. Los datos de autorización de Yape se ingresan en
          Culqi y no son almacenados por Fubito.
        </p>
      </section>
      <section>
        <h2>Finalidades</h2>
        <p>
          Usamos los datos para crear y administrar reservas, procesar pagos, confirmar horarios,
          prevenir fraude, atender consultas, cancelaciones y reclamos, y cumplir obligaciones legales.
        </p>
      </section>
      <section>
        <h2>Proveedores necesarios</h2>
        <p>
          La información indispensable puede ser tratada por el local reservado, Culqi como
          procesador de pagos y proveedores tecnológicos de alojamiento y base de datos. No vendemos
          información personal.
        </p>
      </section>
      <section>
        <h2>Derechos del titular</h2>
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición escribiendo a
          {' '}{LEGAL_PROVIDER.email}. Incluye tu nombre, documento y una descripción de la solicitud.
        </p>
      </section>
      <section>
        <h2>Conservación y seguridad</h2>
        <p>
          Conservamos la información durante el tiempo necesario para gestionar el servicio y atender
          obligaciones legales. Aplicamos controles razonables de acceso, cifrado de credenciales y HTTPS.
        </p>
      </section>
      <section>
        <h2>Última actualización</h2>
        <p>{LEGAL_LAST_UPDATED}.</p>
      </section>
    </LegalPage>
  );
}
