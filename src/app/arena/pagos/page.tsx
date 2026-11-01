'use client';

import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatTournamentDate } from '@/lib/dateUtils';

interface Payment {id:string;title:string;username:string;status:string;amount:number;created_at:string}
const labels:Record<string,string>={confirmed:'Confirmado',pending:'Pendiente',creating:'Preparando',review:'Revisión manual',failed:'Rechazado / cancelado',refund_required:'Devolución pendiente'};
export default function PaymentsPage() {
  const {user,isLoading,openAuthModal}=useAuth();
  return <section className="mx-auto max-w-5xl space-y-5 px-4 py-10 text-white sm:px-6">
    <h1 className="text-3xl font-bold">{user?.role==='admin'?'Pagos de inscripciones':'Mis pagos'}</h1>
    {isLoading?<p role="status">Cargando tu sesión…</p>:!user?<button onClick={()=>openAuthModal('login')} className="arena-primary-button">Iniciar sesión</button>:<PaymentsTable key={user.id} />}
    <Link href="/arena/ayuda" className="inline-block text-sm text-red-300 underline">Ayuda para revisar un pago o solicitar una devolución</Link>
    <Link href="/arena" className="block text-sm text-slate-300 underline">Volver a torneos</Link>
    {user?.role==='admin'&&<p className="text-sm text-slate-400">Las devoluciones y los pagos en revisión se gestionan desde VirtualPOS. No vuelvas a cobrar mientras una operación esté en revisión.</p>}
  </section>;
}
function PaymentsTable() {
  const {token}=useAuth();
  const [payments,setPayments]=useState<Payment[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/payments',{headers:{Authorization:'Bearer '+(token||'')},cache:'no-store',signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudieron consultar los pagos.');if(!controller.signal.aborted){setPayments(data.payments);setError('');}})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[token,retry]);
  return <>
    {error&&<div role="alert" className="space-y-2 text-sm text-rose-300"><p>{error}</p><button onClick={()=>{setLoading(true);setRetry(value=>value+1);}} className="underline">Reintentar</button></div>}
    {loading?<p role="status" className="py-6 text-slate-300">Consultando pagos…</p>:payments.length?<div className="overflow-x-auto rounded-xl border border-slate-700"><table className="w-full text-left text-sm"><caption className="sr-only">Historial de operaciones de inscripción</caption><thead className="bg-slate-900"><tr>{['Torneo','Participante','Monto','Estado','Fecha','Detalle'].map(title=><th key={title} scope="col" className="whitespace-nowrap p-3">{title}</th>)}</tr></thead>
      <tbody>{payments.map(payment=><tr key={payment.id} className="border-t border-slate-800"><td className="p-3">{payment.title}</td><td className="p-3">{payment.username}</td><td className="whitespace-nowrap p-3">{new Intl.NumberFormat('es-CL').format(payment.amount)} CLP</td><td className="p-3">{labels[payment.status]||payment.status}</td><td className="p-3">{formatTournamentDate(payment.created_at)}</td><td className="p-3"><Link href={'/arena/pago?paymentId='+encodeURIComponent(payment.id)} className="text-red-300 underline">Consultar</Link></td></tr>)}</tbody>
    </table></div>:!error&&<p className="py-6 text-slate-400">No hay pagos registrados.</p>}
  </>;
}
