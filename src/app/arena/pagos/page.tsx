'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatTournamentDate } from '@/lib/dateUtils';
import { FlowOrder } from '@/components/FlowOrder';

interface Payment { id:string;tournament_id:string;tournament_status:string;title:string;slug:string;username:string;status:string;provider:string;amount:number;created_at:string;expires_at:string;archived_at:string|null;flow_order?:string|null }
interface Tournament { id:string;title:string;slug:string }
const labels:Record<string,string> = { confirmed:'Confirmado',pending:'Pendiente',creating:'Preparando',review:'Revisión manual',failed:'Rechazado / cancelado',cancelled:'Inscripción cancelada',refund_required:'Devolución pendiente' };
const money = (amount:number) => new Intl.NumberFormat('es-CL').format(amount)+' CLP';

export default function PaymentsPage() {
  const {user,isLoading,openAuthModal}=useAuth();
  return <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 text-white sm:px-6">
    <div><h1 className="text-3xl font-bold">{user?.role==='admin'?'Pagos por torneo':'Mis pagos'}</h1>
      {user?.role==='admin' && <p className="mt-2 text-sm text-slate-400">Revisa cada competencia, archiva intentos vencidos y conserva los pagos de torneos finalizados.</p>}
    </div>
    {isLoading?<p role="status">Cargando tu sesión…</p>:!user?<button onClick={()=>openAuthModal('login')} className="arena-primary-button">Iniciar sesión</button>:<PaymentsTable key={user.id} />}
    <Link href="/arena/ayuda" className="inline-block text-sm text-red-300 underline">Ayuda para revisar un pago o solicitar una devolución</Link>
    <Link href="/arena" className="block text-sm text-slate-300 underline">Volver a torneos</Link>
    {user?.role==='admin'&&<p className="text-sm text-slate-400">Archivar oculta la operación de tu lista habitual y conserva el historial. Los pagos aprobados se pueden archivar cuando el torneo está finalizado; el cliente mantiene su comprobante. Las devoluciones pendientes siguen visibles y se gestionan desde Flow. Un torneo con pagos reales se puede ocultar, pero no eliminar.</p>}
  </section>;
}

function PaymentsTable() {
  const {token,user}=useAuth();
  const [tournamentId,setTournamentId]=useState(''),[includeArchived,setIncludeArchived]=useState(false),[page,setPage]=useState(0);
  return <PaymentResults key={[tournamentId,includeArchived,page].join(':')} token={token||''} admin={user?.role==='admin'} tournamentId={tournamentId} includeArchived={includeArchived} page={page}
    selectTournament={id=>{setTournamentId(id);setPage(0);}} selectArchived={value=>{setIncludeArchived(value);setPage(0);}} changePage={setPage} />;
}

function PaymentResults({token,admin,tournamentId,includeArchived,page,selectTournament,selectArchived,changePage}:{token:string;admin:boolean;tournamentId:string;includeArchived:boolean;page:number;selectTournament:(id:string)=>void;selectArchived:(value:boolean)=>void;changePage:(page:number)=>void}) {
  const [payments,setPayments]=useState<Payment[]>([]),[tournaments,setTournaments]=useState<Tournament[]>([]);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[hasMore,setHasMore]=useState(false),[archiving,setArchiving]=useState('');
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(timer);},[]);
  function canArchive(payment:Payment) {
    if (!admin || payment.archived_at || payment.provider!=='flow' || payment.status==='refund_required') return false;
    if (payment.status==='confirmed') return payment.tournament_status==='completed';
    return ['review','creating','failed'].includes(payment.status) || (['pending','cancelled'].includes(payment.status) && new Date(payment.expires_at).getTime()<=now);
  }
  useEffect(()=>{
    const controller=new AbortController();
    const query=new URLSearchParams({tournamentId,page:String(page),includeArchived:includeArchived?'1':'0'});
    fetch('/api/payments?'+query,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudieron consultar los pagos.');if(!controller.signal.aborted){setPayments(data.payments);setTournaments(data.tournaments);setHasMore(data.hasMore);setError('');}})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[token,tournamentId,includeArchived,page,retry]);

  async function archive(payment:Payment) {
    const confirmation=payment.status==='confirmed'
      ? '¿Archivar el pago aprobado de '+money(payment.amount)+' de '+payment.username+'? Se conservarán su estado aprobado, orden Flow y comprobante. El torneo seguirá protegido contra eliminación.'
      : '¿Revisar y archivar el intento de '+money(payment.amount)+' de '+payment.username+'? Confirma que revisaste que no hay un cobro en la misma cuenta y ambiente de Flow usados al crear este intento. Si llega un pago después del archivo, quedará para devolución. Se conservará su historial.';
    if (!window.confirm(confirmation)) return;
    setArchiving(payment.id);setNotice('');
    try {
      const response=await fetch('/api/payments/'+encodeURIComponent(payment.id)+'/archive',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({confirmedOriginalFlowAccount:true})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'No se pudo archivar.');
      setNotice('Operación archivada. Puedes consultarla en «Mostrar archivados». Se conserva su historial.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo archivar.');}
    finally{setArchiving('');setRetry(value=>value+1);}
  }
  const groups=new Map<string,{title:string;slug:string;payments:Payment[]}>();
  for(const payment of payments){const key=admin?payment.tournament_id:'all';const group=groups.get(key)||{title:payment.title,slug:payment.slug,payments:[]};group.payments.push(payment);groups.set(key,group);}
  return <>
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <label className="flex min-w-60 flex-1 flex-col gap-2 text-sm text-slate-300">Torneo<select aria-label="Filtrar pagos por torneo" value={tournamentId} onChange={event=>selectTournament(event.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-white"><option value="">Todos los torneos</option>{tournaments.map(t=><option key={t.id} value={t.id}>{t.title} · {t.slug}</option>)}</select></label>
      {admin&&<label className="flex items-center gap-2 py-2 text-sm text-slate-300"><input type="checkbox" checked={includeArchived} onChange={event=>selectArchived(event.target.checked)} className="accent-red-400" />Mostrar archivados</label>}
    </div>
    {error&&<div role="alert" className="space-y-2 text-sm text-rose-300"><p>{error}</p><button onClick={()=>{setLoading(true);setRetry(value=>value+1);}} className="underline">Reintentar</button></div>}
    {notice&&<p role="status" className="rounded-xl border border-amber-400/30 p-4 text-sm text-amber-200">{notice}</p>}
    {loading?<p role="status" className="py-6 text-slate-300">Consultando pagos…</p>:[...groups].map(([id,group])=><section key={id} className="overflow-hidden rounded-2xl border border-slate-700">
      {admin&&<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900/80 p-4 sm:p-5"><div><h2 className="text-xl font-bold"><Link href={'/tournament/'+group.slug} className="hover:text-red-300">{group.title}</Link></h2><p className="mt-1 text-xs text-slate-400">{group.slug} · {group.payments.length} operaciones en esta página</p></div><p className="text-sm text-emerald-300">Confirmado en esta página: <strong>{money(group.payments.filter(p=>p.status==='confirmed').reduce((total,p)=>total+p.amount,0))}</strong></p></div>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{admin?'Pagos de '+group.title:'Historial de pagos'}</caption><thead className="bg-slate-900"><tr>{[...(!admin?['Torneo']:[]),'Participante','Orden Flow','Monto','Estado','Fecha','Acciones'].map(title=><th key={title} scope="col" className="whitespace-nowrap p-3">{title}</th>)}</tr></thead>
        <tbody>{group.payments.map(payment=><tr key={payment.id} className="border-t border-slate-800">
          {!admin&&<td className="p-3">{payment.title}</td>}<td className="p-3">{payment.username}</td><td className="min-w-36 p-3"><FlowOrder order={payment.flow_order} showLabel={false} /></td><td className="whitespace-nowrap p-3">{money(payment.amount)}</td><td className="p-3">{labels[payment.status]||payment.status}{payment.archived_at&&<span className="mt-1 block text-xs text-slate-400">Archivado</span>}</td><td className="p-3">{formatTournamentDate(payment.created_at)}</td>
          <td className="p-3"><div className="flex flex-col items-start gap-2"><Link href={'/arena/pago?paymentId='+encodeURIComponent(payment.id)} className="text-red-300 underline">Consultar</Link>{canArchive(payment)&&<button disabled={!!archiving} onClick={()=>archive(payment)} className="text-left text-xs text-slate-300 underline disabled:opacity-50">{archiving===payment.id?'Verificando con Flow…':payment.status==='confirmed'?'Archivar pago':(['pending','cancelled'].includes(payment.status)?'Archivar vencido':'Revisar y archivar')}</button>}</div></td>
        </tr>)}</tbody>
      </table></div>
    </section>)}
    {!loading&&!error&&!payments.length&&<p className="py-6 text-slate-400">No hay pagos para este filtro.</p>}
    {!loading&&(page>0||hasMore)&&<div className="flex items-center justify-between gap-4 text-sm"><button disabled={page===0} onClick={()=>changePage(page-1)} className="arena-secondary-button disabled:opacity-40">Anterior</button><span>Página {page+1} · hasta 100 operaciones por página</span><button disabled={!hasMore} onClick={()=>changePage(page+1)} className="arena-secondary-button disabled:opacity-40">Siguiente</button></div>}
  </>;
}
