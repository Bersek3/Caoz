'use client';

import { useState } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTournament } from '@/context/TournamentContext';
import { getTournamentResults } from '@/lib/tournamentPresentation';
import type { Tournament } from '@/types/tournament';

export function TournamentResults({ tournament }: { tournament: Tournament }) {
  const { user } = useAuth();
  const { refreshTournaments } = useTournament();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const results = getTournamentResults(tournament);
  async function saveStatus(prizeDeliveryStatus: string) {
    setSaving(true); setMessage(''); setFailed(false);
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('caoz_auth_token') || ''}` }, body: JSON.stringify({ prizeDeliveryStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la entrega de premios.');
      await refreshTournaments({ silent: true });
      setMessage('Estado de los premios actualizado.');
    } catch (cause) { setFailed(true); setMessage(cause instanceof Error ? cause.message : 'No pudimos actualizar los premios.'); }
    finally { setSaving(false); }
  }
  return <section className="space-y-6 rounded-2xl border border-slate-800 bg-[#191213] p-4 sm:p-6">
    <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Trophy className="h-5 w-5 text-amber-300" /> Resultados del torneo</h2>
    {results.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.map(({ participant, place }) => <article key={`${participant.id}-${place}`} className={`space-y-3 rounded-xl border p-5 ${place === 1 ? 'border-amber-400/40 bg-amber-400/10' : 'border-slate-700 bg-black/20'}`}>
      <p className={`flex items-center gap-2 text-sm font-bold ${place === 1 ? 'text-amber-300' : 'text-slate-300'}`}>{place === 1 && <Crown className="h-4 w-4" />}{place === 1 ? 'Campeón' : place === 2 ? 'Subcampeón' : 'Semifinalista'} · {place}°</p>
      <div className="flex items-center gap-3"><img src={participant.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" /><h3 className="break-words font-bold text-white">{participant.name}</h3></div>
    </article>)}</div> : <p className="text-sm text-slate-400">El podio aparecerá al finalizar la competencia y confirmarse la final.</p>}
    <div className="flex flex-col justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center"><div><h3 className="font-semibold text-white">Entrega de premios</h3><p className="mt-1 text-sm text-slate-400">{tournament.prizeDeliveryStatus === 'delivered' ? 'La organización marcó los premios como entregados.' : tournament.prizeDeliveryStatus === 'processing' ? 'La organización está coordinando la entrega.' : 'Pendiente de confirmación por la organización.'}</p></div>
      {user?.role === 'admin' && <label className="text-xs text-slate-400">Actualizar estado<select className="mt-1 block min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white" value={tournament.prizeDeliveryStatus || 'pending'} disabled={saving} onChange={event => saveStatus(event.target.value)}><option value="pending">Pendiente</option><option value="processing">En coordinación</option><option value="delivered">Entregados</option></select></label>}
    </div>
    {message && <p role={failed ? 'alert' : 'status'} className={`text-sm ${failed ? 'text-amber-300' : 'text-emerald-300'}`}>{message}</p>}
  </section>;
}
