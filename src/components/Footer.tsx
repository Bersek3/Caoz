import React from 'react';
import { Swords, Shield, Trophy, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#090d14] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px]">
                <div className="w-full h-full bg-[#0a0e17] rounded-[6px] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-black text-lg tracking-wider text-white uppercase">
                CZ <span className="text-cyan-400">ARENA</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Plataforma de gestión y competencia de esports de nueva generación. Organiza torneos, automatiza brackets de eliminación directa y doble eliminación.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Formatos de Torneo
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Eliminación Simple (Single Elim)</li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Doble Eliminación (Upper & Lower)</li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Fase de Grupos Round Robin</li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Sistema Suizo (Swiss Brackets)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Comunidad & Soporte
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Discord Oficial</li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Reglamento Competitivo</li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Llamar a un Árbitro / Soporte</li>
              <li className="hover:text-cyan-400 transition-colors cursor-pointer">Guía para Organizadores</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CZ ARENA Esports. Todos los derechos reservados.</p>

        </div>
      </div>
    </footer>
  );
};
