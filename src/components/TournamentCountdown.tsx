'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle2, UserCheck, Flame } from 'lucide-react';
import { getCountdown, formatTournamentDate, CountdownState } from '../lib/dateUtils';

interface TournamentCountdownProps {
  startDate: string;
  status?: string;
  onCheckInClick?: () => void;
  canCheckIn?: boolean;
  isCheckedIn?: boolean;
  className?: string;
}

export const TournamentCountdown: React.FC<TournamentCountdownProps> = ({
  startDate,
  status = 'registration_open',
  onCheckInClick,
  canCheckIn = false,
  isCheckedIn = false,
  className = ''
}) => {
  const [countdown, setCountdown] = useState<CountdownState>(() => getCountdown(startDate));

  useEffect(() => {
    // Initial compute
    setCountdown(getCountdown(startDate));

    // Update every second
    const timer = setInterval(() => {
      setCountdown(getCountdown(startDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [startDate]);

  const formattedDate = formatTournamentDate(startDate);
  const isLive = status === 'in_progress' || (countdown.isPast && status !== 'completed');
  const isCompleted = status === 'completed';
  const isCheckInPhase = status === 'check_in' || (countdown.isCheckInWindow && !countdown.isPast && !isCompleted);

  // If completed
  if (isCompleted) {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-400 flex items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Torneo Finalizado</h4>
            <p className="text-xs text-slate-400">Esta competencia ha concluido oficialmente.</p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">{formattedDate}</span>
      </div>
    );
  }

  // If Live / In Progress
  if (isLive) {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-900 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in ${className}`}>
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 relative shrink-0">
            <Flame className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full beacon-dot" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-rose-400 font-mono tracking-wider uppercase">¡Torneo En Vivo!</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase">
                Partidas en curso
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Las llaves están activas. Revisa tus enfrentamientos y sube los resultados en la sala de match.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If Check-In Active
  if (isCheckInPhase) {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-yellow-950/20 to-slate-900 border border-amber-500/40 shadow-xl shadow-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in ${className}`}>
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 font-mono tracking-wider uppercase">Fase de Check-In Abierta</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                ¡Confirma tu cupo!
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              El torneo comienza en <strong className="text-white font-mono">{countdown.minutes}m {countdown.seconds}s</strong>. Quienes no confirmen serán descalificados.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end md:self-auto">
          {isCheckedIn ? (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Check-in Confirmado</span>
            </div>
          ) : canCheckIn && onCheckInClick ? (
            <button
              onClick={onCheckInClick}
              className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/30 transition-all flex items-center space-x-2 font-mono transform hover:scale-[1.02] cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-black" />
              <span>Confirmar Check-In Ahora</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // Standard Upcoming Countdown
  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-[#0c121e]/90 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Info */}
      <div className="space-y-1 relative z-10">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
            Cuenta Regresiva Oficial
          </span>
        </div>
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>{formattedDate}</span>
        </h3>
        <p className="text-[11px] text-slate-400">
          El Check-In de capitanes y jugadores se activará 45 minutos antes del inicio.
        </p>
      </div>

      {/* Right: Digital Blocks */}
      <div className="flex items-center space-x-2 sm:space-x-3 self-center md:self-auto relative z-10 font-mono">
        {/* Days */}
        <div className="flex flex-col items-center">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
              {String(countdown.days).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-sans font-semibold">Días</span>
        </div>

        <span className="text-slate-600 font-bold text-lg -mt-4">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
              {String(countdown.hours).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-sans font-semibold">Horas</span>
        </div>

        <span className="text-slate-600 font-bold text-lg -mt-4">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-inner flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-cyan-300 tracking-wider">
              {String(countdown.minutes).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-cyan-400 mt-1 font-sans font-semibold">Min</span>
        </div>

        <span className="text-slate-600 font-bold text-lg -mt-4">:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-slate-900/90 border border-purple-500/40 shadow-inner flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-purple-300 tracking-wider">
              {String(countdown.seconds).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-purple-400 mt-1 font-sans font-semibold">Seg</span>
        </div>
      </div>
    </div>
  );
};
