import React from 'react';
import Link from 'next/link';
import { Swords } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#110e0f] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-500 to-purple-600 p-[2px]">
                <div className="w-full h-full bg-[#130f10] rounded-[6px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-red-400" />
                </div>
              </div>
              <span className="font-black text-lg tracking-wider text-white uppercase">
                CZ <span className="text-red-400">ARENA</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Compite en torneos oficiales, confirma tu asistencia y sigue tus partidas y resultados en un solo lugar.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Comunidad & Soporte
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/arena/ayuda" className="hover:text-red-300">Ayuda y preguntas frecuentes</Link></li>
              <li><a href="mailto:contacto.caoz@gmail.com" className="hover:text-red-300">Contactar soporte</a></li>
              <li><Link href="/arena/pagos" className="hover:text-red-300">Pagos e inscripciones</Link></li>
              <li><Link href="/arena" className="hover:text-red-300">Explorar torneos y reglamentos</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800/80 mt-10 pt-6 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-slate-500">
          <p>© 2026 CZ ARENA Esports. Todos los derechos reservados.</p>
          <Link href="/privacidad" className="hover:text-red-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400">Política de privacidad</Link>
        </div>
      </div>
    </footer>
  );
};
