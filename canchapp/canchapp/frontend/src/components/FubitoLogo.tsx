import Link from 'next/link';

interface FubitoLogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showWord?: boolean;
}

const sizes = {
  sm: { mark: 'w-9 h-9', word: 'text-xl' },
  md: { mark: 'w-11 h-11', word: 'text-2xl' },
  lg: { mark: 'w-14 h-14', word: 'text-3xl' },
};

export function FubitoMark({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 72"
      role="img"
      aria-label="Pelota de fútbol y volcán Misti"
      className={className}
    >
      <path
        d="M32 2C15.4 2 5 13.8 5 28.2c0 19 20.7 36.6 27 41.8 6.3-5.2 27-22.8 27-41.8C59 13.8 48.6 2 32 2Z"
        fill="#123C32"
      />
      <circle cx="32" cy="27" r="19" fill="#FFFFFF" />
      <circle cx="32" cy="27" r="17.2" fill="none" stroke="#123C32" strokeWidth="2" />
      <path d="m32 14 6 4.5-2.3 7h-7.4l-2.3-7L32 14Z" fill="#123C32" />
      <path d="m15.5 23.5 7.2-2.2 4.1 5.8-4.3 5.8-7-2.4" fill="#123C32" />
      <path d="m48.5 23.5-7.2-2.2-4.1 5.8 4.3 5.8 7-2.4" fill="#123C32" />
      <path d="M19 40.5 29.4 29l3.4 4.2 4.7-6.2L50 41.5c-4.1 3.1-10.6 5-18 5-5.1 0-9.6-1.2-13-3.2v-2.8Z" fill="#DCEFFD" />
      <path d="m19 40.5 10.4-11.4 3.4 4.1 4.7-6.2L50 41.5" fill="none" stroke="#123C32" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m34.8 30.6 2.7-3.6 3.1 3.6h-5.8Z" fill="#FF6B4A" />
      <ellipse cx="32" cy="65" rx="9" ry="2.6" fill="#60D174" />
    </svg>
  );
}

export default function FubitoLogo({
  href = '/', size = 'md', className = '', showWord = true,
}: FubitoLogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <FubitoMark className={`${sizes[size].mark} shrink-0`} />
      {showWord && (
        <span className={`font-display font-black leading-none text-forest ${sizes[size].word}`}>
          fubito
        </span>
      )}
    </span>
  );

  return href ? <Link href={href} aria-label="Ir al inicio de fubito">{content}</Link> : content;
}
