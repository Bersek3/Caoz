import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CAOZ ARENA | Plataforma de Torneos Esports (Estilo Battlefy)',
  description: 'Organiza y compite en torneos de Valorant, League of Legends, CS2, EA FC 25 y más. Brackets interactivos, check-in y salas de partida.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07090e] text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
