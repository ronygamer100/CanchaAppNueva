import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import FubitoLogo from '@/components/FubitoLogo';
import PublicFooter from '@/components/PublicFooter';

export default function LegalPage({
  eyebrow = 'Información legal', title, intro, children,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-forest/10 bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between px-5 sm:px-6">
          <FubitoLogo size="sm" />
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest">
            <ArrowLeft size={19} /> Volver
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-ink/65">{intro}</p>
        <div className="legal-copy mt-10">{children}</div>
      </article>
      <PublicFooter />
    </main>
  );
}
