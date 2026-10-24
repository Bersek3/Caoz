'use client';

import React, { useState } from 'react';
import { 
  Trophy, 
  Swords, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Lock
} from 'lucide-react';
import { Tournament, TournamentRound, TournamentMatch } from '../types/tournament';

interface BracketVisualizerProps {
  tournament: Tournament;
  onSelectMatch: (match: TournamentMatch) => void;
}

export const BracketVisualizer: React.FC<BracketVisualizerProps> = ({
  tournament,
  onSelectMatch
}) => {
  const [activeTab, setActiveTab] = useState<'winners' | 'losers'>('winners');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const hasLosers = tournament.format === 'double_elimination' && (tournament.losersRounds?.length || 0) > 0;
  const currentRounds = activeTab === 'winners' ? tournament.rounds : (tournament.losersRounds || []);

  if (!currentRounds || currentRounds.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8 space-y-3">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h4 className="text-base font-bold text-white">Las llaves aún no han sido generadas</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          El organizador del torneo generará los brackets oficiales una vez que cierre la etapa de inscripciones y check-in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1c1518] p-3 rounded-xl border border-slate-800">
        
        {/* Double elimination tab switcher */}
        {hasLosers ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('winners')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'winners'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Winners Bracket (Cuadro Superior)
            </button>
            <button
              onClick={() => setActiveTab('losers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'losers'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Losers Bracket (Cuadro Inferior)
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-red-400" />
            <span>Formato: <strong className="text-white capitalize">{tournament.format.replace('_', ' ')}</strong></span>
          </div>
        )}

        {/* Legend & Zoom */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="hidden md:flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Ganador</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
              <span>En Juego</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
              <span>Pendiente</span>
            </span>
          </div>

          <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
            <button
              onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-9 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(1.2, zoomLevel + 0.1))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Bracket Tree Container */}
      <div className="relative bg-[#110e0f] rounded-2xl border border-slate-800/80 p-4 sm:p-6 overflow-x-auto">
        <div 
          className="flex items-stretch space-x-12 min-w-max transition-transform duration-200 origin-top-left"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {currentRounds.map((round, rIdx) => {
            const isLastRound = rIdx === currentRounds.length - 1;

            return (
              <div key={rIdx} className="bracket-round-column">
                
                {/* Round Header */}
                <div className="mb-6 pb-2 border-b border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {round.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {round.matches.length} {round.matches.length === 1 ? 'partida' : 'partidas'}
                    </span>
                  </div>
                  {isLastRound && (
                    <Trophy className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                {/* Match Cards List */}
                <div className="flex-1 flex flex-col justify-around space-y-8">
                  {round.matches.map((match, mIdx) => {
                    const isCompleted = match.status === 'completed';
                    const isInProgress = match.status === 'in_progress';
                    const isDisputed = match.status === 'disputed';

                    return (
                      <div key={match.id} className="relative group">
                        
                        {/* Interactive Match Card */}
                        <div
                          onClick={() => { if (match.canAccessRoom) onSelectMatch(match); }}
                          role={match.canAccessRoom ? 'button' : undefined}
                          tabIndex={match.canAccessRoom ? 0 : undefined}
                          onKeyDown={(event) => {
                            if (match.canAccessRoom && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              onSelectMatch(match);
                            }
                          }}
                          title={match.canAccessRoom ? 'Abrir sala privada de la partida' : 'Sala privada: solo participantes de esta partida y administradores'}
                          className={`match-card ${match.canAccessRoom ? 'cursor-pointer' : 'cursor-default'} ${
                            isInProgress ? 'is-active ring-1 ring-red-500/50' : ''
                          } ${isDisputed ? 'ring-1 ring-red-500/60' : ''}`}
                        >
                          {/* Match Top Bar */}
                          <div className="px-3 py-1.5 bg-[#21191d] border-b border-white/5 flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-400">
                              BO{match.bestOf}
                            </span>
                            <div className="flex items-center space-x-1.5">
                              {isInProgress && (
                                <span className="flex items-center space-x-1 text-rose-400 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping" />
                                  <span>EN VIVO</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="text-red-400 font-bold flex items-center space-x-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>DISPUTA</span>
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-emerald-400 font-medium">Finalizado</span>
                              )}
                              {match.status === 'ready' && (
                                <span className="text-red-400 font-medium">Listo</span>
                              )}
                              {match.status === 'pending' && (
                                <span className="text-slate-500 font-mono">Esperando</span>
                              )}
                            </div>
                          </div>

                          {/* Team 1 Row */}
                          {(() => {
                            const isT1Empty = !match.team1.name || match.team1.name === 'Vacío' || match.team1.name.startsWith('Semilla');
                            return (
                              <div
                                className={`match-team-row ${
                                  match.team1.isWinner
                                    ? 'winner'
                                    : isCompleted && !match.team1.isWinner
                                    ? 'loser'
                                    : ''
                                }`}
                              >
                                <div className="flex items-center space-x-2 truncate pr-2">
                                  {match.team1.avatar && !isT1Empty ? (
                                    <img
                                      src={match.team1.avatar}
                                      alt={match.team1.name}
                                      className="w-5 h-5 rounded-md object-cover border border-white/10 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-md bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0">
                                      -
                                    </div>
                                  )}
                                  <span className={`text-xs truncate transition-colors ${
                                    isT1Empty 
                                      ? 'text-slate-500 italic font-normal' 
                                      : 'font-medium text-slate-200 group-hover:text-white'
                                  }`}>
                                    {isT1Empty ? 'Vacío' : match.team1.name}
                                  </span>
                                </div>

                                <span
                                  className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                    match.team1.isWinner
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {isT1Empty ? '-' : (match.team1.score ?? '-')}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Team 2 Row */}
                          {(() => {
                            const isT2Empty = !match.team2.name || match.team2.name === 'Vacío' || match.team2.name.startsWith('Semilla');
                            return (
                              <div
                                className={`match-team-row ${
                                  match.team2.isWinner
                                    ? 'winner'
                                    : isCompleted && !match.team2.isWinner
                                    ? 'loser'
                                    : ''
                                }`}
                              >
                                <div className="flex items-center space-x-2 truncate pr-2">
                                  {match.team2.avatar && !isT2Empty ? (
                                    <img
                                      src={match.team2.avatar}
                                      alt={match.team2.name}
                                      className="w-5 h-5 rounded-md object-cover border border-white/10 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-md bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0">
                                      -
                                    </div>
                                  )}
                                  <span className={`text-xs truncate transition-colors ${
                                    isT2Empty 
                                      ? 'text-slate-500 italic font-normal' 
                                      : 'font-medium text-slate-200 group-hover:text-white'
                                  }`}>
                                    {isT2Empty ? 'Vacío' : match.team2.name}
                                  </span>
                                </div>

                                <span
                                  className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                    match.team2.isWinner
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {isT2Empty ? '-' : (match.team2.score ?? '-')}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Hover Action Banner */}
                          <div className="px-3 py-1 bg-red-950/40 text-[10px] text-red-300 flex items-center justify-between border-t border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>{match.canAccessRoom ? 'Abrir sala privada' : 'Chat privado de la partida'}</span>
                            {match.canAccessRoom ? <ChevronRight className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          </div>

                        </div>

                        {/* Connector line leading to next round */}
                        {!isLastRound && (
                          <div className="hidden sm:block">
                            {/* Horizontal line out */}
                            <div className="bracket-connector-h" />
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
