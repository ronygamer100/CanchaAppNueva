interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loader. Usar para placeholders mientras carga contenido.
 *
 *   <Skeleton className="h-6 w-32" />
 *   <Skeleton className="h-40 w-full" />
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/**
 * Spinner para loading inline.
 */
export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Mensaje de "Cargando…" estándar para usar mientras carga toda una página.
 */
export function LoadingScreen({ message = 'Cargando…' }: { message?: string }) {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink/60">
        <Spinner className="w-8 h-8 text-pitch-700" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </main>
  );
}

/**
 * Skeleton de tarjeta para listas (canchas, reservas, etc.)
 */
export function CardSkeleton() {
  return (
    <div className="border-2 border-ink/10 p-4">
      <Skeleton className="h-32 w-full mb-3" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
