'use client';

import type { TournamentMatch } from '@/types/tournament';
import { formatTournamentDate } from '@/lib/dateUtils';

export function TournamentMatches({ matches, onSelectMatch, title = 'Mis partidos' }: { matches: TournamentMatch[]; onSelectMatch: (match: TournamentMatch) => void; title?: string }) {
  return <section className="space-y-5 rounded-2xl border border-slate-800 bg-[#191213] p-4 sm:p-6">
    <h2 className="text-lg font-bold text-white">{title}</h2>
    {matches.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{matches.map(match => <article key={match.id} className={`space-y-3 rounded-xl border bg-black/20 p-4 ${match.status === 'disputed' ? 'border-amber-500/50' : 'border-slate-700'}`}>
      <p className="text-xs text-slate-400">{match.roundTitle} · Al mejor de {match.bestOf}</p>
      <p className="break-words font-bold text-white">{match.team1.name} <span className="text-slate-500">vs</span> {match.team2.name}</p>
      <p className="text-sm text-slate-300">{match.status === 'completed' ? !match.team1.participantId || !match.team2.participantId ? 'Avance por pase libre' : `Finalizado · ${match.team1.score ?? 0}–${match.team2.score ?? 0}` : match.status === 'disputed' ? 'En revisión por un árbitro' : match.status === 'in_progress' ? 'En juego' : match.status === 'ready' ? 'Listo para jugar' : 'Esperando rival'}</p>
      {match.scheduledTime && <p className="text-xs text-slate-400">{formatTournamentDate(match.scheduledTime)}</p>}
      {match.canAccessRoom ? <button className="min-h-11 rounded-lg border border-red-400/30 bg-red-400/10 px-4 text-sm font-semibold text-red-300 hover:bg-red-400/20" onClick={() => onSelectMatch(match)}>Abrir sala privada</button> : <p className="text-xs text-slate-500">Sala privada para participantes y organización.</p>}
    </article>)}</div> : <p className="text-sm leading-relaxed text-slate-400">Los enfrentamientos aparecerán cuando se sorteen las llaves. Confirma tu asistencia durante el check-in para participar.</p>}
  </section>;
}
