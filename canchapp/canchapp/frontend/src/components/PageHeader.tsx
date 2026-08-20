import Link from 'next/link';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

/**
 * Header estándar para todas las páginas internas.
 * Usar al inicio del contenido principal, no como navbar superior.
 *
 *   <PageHeader
 *     eyebrow="Editar negocio"
 *     title="Mis canchas Los Olivos"
 *     description="Configura los datos de tu local"
 *     backHref="/dashboard"
 *     actions={<Button>Guardar</Button>}
 *   />
 */
export default function PageHeader({
  eyebrow, title, description, backHref, backLabel = '← Volver', actions,
}: PageHeaderProps) {
  return (
    <header className="mb-8 sm:mb-10">
      {backHref && (
        <Link href={backHref} className="text-sm font-medium text-ink/60 hover:text-ink inline-block mb-4">
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="text-2xl sm:text-4xl font-display font-bold leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-ink/60 mt-2 text-sm sm:text-base max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
}
