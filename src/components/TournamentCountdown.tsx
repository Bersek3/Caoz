'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Flame } from 'lucide-react';
import { formatTournamentDate, getCheckInWindow, getCountdown } from '@/lib/dateUtils';
import type { Tournament } from '@/types/tournament';

interface TournamentCountdownProps {
  tournament: Tournament;
  onCheckInClick?: () => void;
  canCheckIn?: boolean;
  isCheckedIn?: boolean;
  isSubmitting?: boolean;
}

export function TournamentCountdown({ tournament, onCheckInClick, canCheckIn, isCheckedIn, isSubmitting }: TournamentCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const checkIn = getCheckInWindow(tournament, now);
  const countdown = getCountdown(checkIn.isOpen && checkIn.closesAt ? checkIn.closesAt.toISOString() : tournament.startDate);
  const duration = [countdown.days ? `${countdown.days}d` : '', countdown.hours ? `${countdown.hours}h` : '', `${countdown.minutes}m`, `${countdown.seconds}s`].filter(Boolean).join(' ');
  const completed = tournament.status === 'completed';
  const live = tournament.status === 'in_progress';
  const title = completed ? 'Torneo finalizado' : live ? 'La competencia está en juego' : checkIn.isOpen ? 'Confirma tu asistencia' : checkIn.hasClosed ? 'Check-in cerrado' : countdown.isPast ? 'Pendiente de inicio' : 'Prepárate para competir';
  const body = completed ? 'Revisa el podio, los resultados y el estado de los premios.' : live ? 'Consulta las llaves o entra a tu sala desde Mis partidos.' : checkIn.isOpen ? `El check-in cierra en ${duration}. Solo los participantes confirmados entrarán al sorteo.` : checkIn.hasClosed ? 'La organización preparará las llaves con los participantes confirmados.' : countdown.isPast ? 'La hora programada ya pasó. La organización confirmará el inicio de las partidas.' : `El torneo comienza en ${duration}.`;
  return <section aria-label="Estado y horarios del torneo" className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:p-5 md:flex-row md:items-center ${checkIn.isOpen ? 'border-amber-500/40 bg-amber-950/25' : live ? 'border-red-400/40 bg-red-950/20' : 'border-slate-800 bg-[#191213]'}`}>
    <div className="flex items-start gap-3">
      {completed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> : live ? <Flame className="mt-0.5 h-5 w-5 shrink-0 text-red-300" /> : <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />}
      <div className="space-y-1.5"><h2 className="font-bold text-white">{title}</h2><p className="text-sm text-slate-300" suppressHydrationWarning>{body}</p>
        {!completed && !live && checkIn.opensAt && checkIn.closesAt && <p className="text-xs leading-relaxed text-slate-400">Check-in: {formatTournamentDate(checkIn.opensAt.toISOString())} a {formatTournamentDate(checkIn.closesAt.toISOString())}.</p>}
      </div>
    </div>
    {isCheckedIn && !completed ? <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Asistencia confirmada</span> : checkIn.isOpen && canCheckIn && onCheckInClick ? <button className="min-h-11 shrink-0 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50" disabled={isSubmitting} onClick={onCheckInClick}>{isSubmitting ? 'Confirmando…' : 'Confirmar check-in'}</button> : null}
  </section>;
}
