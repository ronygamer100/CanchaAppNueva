import Link from 'next/link';
import { BookOpenText, Mail, Phone } from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import { LEGAL_PROVIDER } from '@/lib/legal';

export default function PublicFooter() {
  return (
    <footer className="border-t border-forest/15 bg-forest pb-24 text-white sm:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-9 sm:grid-cols-[1.2fr_1fr_1fr] sm:px-6 sm:py-11">
        <div>
          <FubitoLogo size="sm" href="/" className="[&_span]:!text-white" />
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Plataforma para encontrar y reservar canchas de fútbol en Arequipa.
            El comercio piloto es operado por {LEGAL_PROVIDER.tradeName}.
          </p>
          <p className="mt-3 text-xs text-white/55">
            {LEGAL_PROVIDER.legalName} · RUC {LEGAL_PROVIDER.ruc}
          </p>
        </div>

        <div>
          <p className="font-display text-lg font-black">Información legal</p>
          <nav className="mt-3 flex flex-col items-start gap-2 text-sm text-white/75" aria-label="Información legal">
            <Link href="/terminos" className="hover:text-white">Términos y condiciones</Link>
            <Link href="/politica-cambios-devoluciones" className="hover:text-white">Cambios y devoluciones</Link>
            <Link href="/privacidad" className="hover:text-white">Política de privacidad</Link>
            <Link href="/contacto" className="hover:text-white">Contacto</Link>
          </nav>
        </div>

        <div>
          <p className="font-display text-lg font-black">Atención al cliente</p>
          <div className="mt-3 space-y-2 text-sm text-white/75">
            <a href={`tel:${LEGAL_PROVIDER.phoneHref}`} className="flex items-center gap-2 hover:text-white">
              <Phone size={17} /> {LEGAL_PROVIDER.phone}
            </a>
            <a href={`mailto:${LEGAL_PROVIDER.email}`} className="flex items-center gap-2 break-all hover:text-white">
              <Mail size={17} /> {LEGAL_PROVIDER.email}
            </a>
            <p>{LEGAL_PROVIDER.serviceHours}</p>
          </div>
          <Link href="/libro-de-reclamaciones" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-forest">
            <BookOpenText size={20} />
            Libro de Reclamaciones
          </Link>
        </div>
      </div>
    </footer>
  );
}
