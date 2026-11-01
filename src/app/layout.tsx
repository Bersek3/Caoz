import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'CZ ARENA',
  description: 'Portal oficial de Caoz. Streamer oficial en Kick y Twitch, creador de contenido gaming, colaboraciones y comunidad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#07090e] text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
