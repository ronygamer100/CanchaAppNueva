import { Mail, MapPin, Phone } from 'lucide-react';
import LegalPage from '@/components/LegalPage';
import { LEGAL_PROVIDER } from '@/lib/legal';

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="Atención al cliente"
      title="Contacto"
      intro="Estamos disponibles para consultas sobre reservas, pagos, cambios y reclamos."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <a href={`tel:${LEGAL_PROVIDER.phoneHref}`} className="card flex items-start gap-3 !p-5">
          <Phone className="mt-0.5 shrink-0 text-pitch-700" size={24} />
          <span><strong className="block">Teléfono</strong>{LEGAL_PROVIDER.phone}</span>
        </a>
        <a href={`mailto:${LEGAL_PROVIDER.email}`} className="card flex items-start gap-3 !p-5">
          <Mail className="mt-0.5 shrink-0 text-pitch-700" size={24} />
          <span className="min-w-0"><strong className="block">Correo</strong><span className="break-all">{LEGAL_PROVIDER.email}</span></span>
        </a>
        <div className="card flex items-start gap-3 !p-5 sm:col-span-2">
          <MapPin className="mt-0.5 shrink-0 text-pitch-700" size={24} />
          <span><strong className="block">Dirección</strong>{LEGAL_PROVIDER.address}</span>
        </div>
      </section>
      <section>
        <h2>Horario de atención</h2>
        <p>{LEGAL_PROVIDER.serviceHours}</p>
      </section>
    </LegalPage>
  );
}
