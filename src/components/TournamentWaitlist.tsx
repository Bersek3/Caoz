'use client';
import { useCallback,useEffect,useState } from 'react';
import { Users,Clock } from 'lucide-react';
import type { Tournament } from '@/types/tournament';
import { useAuth } from '@/context/AuthContext';
import { formatTournamentDate } from '@/lib/dateUtils';
type Waitlist={joined:boolean;position:number|null;total:number;offered:boolean;expiresAt:string|null};
export function TournamentWaitlist({tournament}:{tournament:Tournament}) {
  const {user}=useAuth();
  return <WaitlistState key={`${tournament.id}:${user?.id || 'guest'}`} tournament={tournament} />;
}
function WaitlistState({tournament}:{tournament:Tournament}) {
  const {user,token,openAuthModal}=useAuth();
  const [entry,setEntry]=useState<Waitlist|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=useCallback(async(method='GET',signal?:AbortSignal)=>{
    const response=await fetch(`/api/tournaments/${tournament.id}/waitlist`,{method,headers:{Authorization:`Bearer ${token||''}`},cache:'no-store',signal});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar la lista.');
    setEntry(data);setError('');
  },[tournament.id,token]);
  useEffect(()=>{
    if(!user)return;
    const controller=new AbortController();
    const refresh=()=>{if(document.visibilityState==='visible')void load('GET',controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message);});};
    refresh();const timer=window.setInterval(refresh,15000);
    return()=>{controller.abort();window.clearInterval(timer);};
  },[user?.id,load]);
  const act=async(method:string)=>{if(!user){openAuthModal('login');return;}setBusy(true);try{await load(method);}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.');}finally{setBusy(false);}};
  if(tournament.status!=='registration_open'&&!entry?.joined)return null;
  if(tournament.participants.length<tournament.maxParticipants&&!entry?.joined&&!error)return null;
  return <section id="lista-espera" className="scroll-mt-48 space-y-3 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-5">
    <h3 className="flex items-center gap-2 font-bold text-white"><Users size={18} className="text-amber-300"/>Lista de espera</h3>
    <p className="text-sm leading-relaxed text-slate-300">Si se libera un cupo, se ofrece por orden de llegada durante 15 minutos. Consulta tu turno aquí; la inscripción y el pago se completan después.</p>
    {entry?.joined&&<p role="status" className="flex items-center gap-2 text-sm font-semibold text-amber-200"><Clock size={16}/>{entry.offered?'Tienes un cupo disponible para inscribirte':`Estás en la posición ${entry.position} de ${entry.total}`}</p>}
    {entry?.offered&&<p className="text-sm text-slate-200">Completa tu inscripción antes de {formatTournamentDate(entry.expiresAt)}. Usa el botón de inscripción del torneo.</p>}
    {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
    <button disabled={busy} onClick={()=>void act(entry?.joined?'DELETE':'POST')} className="min-h-11 rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/10 disabled:opacity-50">{busy?'Actualizando…':entry?.joined?'Salir de la lista':'Unirme a la lista de espera'}</button>
  </section>;
}
