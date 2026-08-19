import type { Metadata } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '@/components/Toast';
import PlayerBottomNav from '@/components/PlayerBottomNav';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
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
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%230E3B2E'/><circle cx='16' cy='16' r='10' fill='none' stroke='%237CD992' stroke-width='2'/><path d='M16 8L19 13L17 16L13 16L11 13Z' fill='%237CD992'/></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <ToastContainer />
        <PlayerBottomNav />
      </body>
    </html>
  );
}
