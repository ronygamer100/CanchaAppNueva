import type { Metadata } from 'next';
import { Lexend, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '@/components/Toast';
import PlayerBottomNav from '@/components/PlayerBottomNav';

const display = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800', '900'],
  adjustFontFallback: false,
});
const sans = Lexend({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'fubito — Reserva tu cancha en Arequipa',
  description: 'Reserva canchas sintéticas en Arequipa en segundos. Sin llamadas, sin WhatsApps. Paga con Yape.',
  keywords: ['cancha sintética', 'Arequipa', 'reservar cancha', 'fútbol Arequipa', 'Yape'],
  openGraph: {
    title: 'fubito — Reserva tu cancha en Arequipa',
    description: 'Reserva canchas sintéticas en segundos. Sin llamadas, sin WhatsApps.',
    siteName: 'fubito',
    locale: 'es_PE',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&h=630&q=80',
        width: 1200,
        height: 630,
        alt: 'fubito - Reserva tu cancha en Arequipa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'fubito — Reserva tu cancha en Arequipa',
    description: 'Reserva canchas sintéticas en segundos. Sin llamadas, sin WhatsApps.',
  },
  icons: { icon: '/fubito-mark.svg', apple: '/fubito-mark.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        {children}
        <ToastContainer />
        <PlayerBottomNav />
      </body>
    </html>
  );
}
