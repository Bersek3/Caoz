'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { formatTournamentDate } from '@/lib/dateUtils';
import { SUPPORT_EMAIL } from '@/components/TournamentSupport';
import { FlowOrder } from '@/components/FlowOrder';

const statusLabels: Record<string, string> = {
  confirmed: 'Pago aprobado: inscripción confirmada',
  pending: 'Pago pendiente de confirmación',
  creating: 'Preparando el pago',
  review: 'Pago en revisión: contacta a soporte antes de volver a pagar',
  failed: 'Pago rechazado, cancelado o expirado',
  cancelled: 'Inscripción cancelada por el usuario',
  refund_required: 'Pago recibido sin inscripción confirmada: devolución pendiente'
};
interface Payment { provider:string;id:string;status:string;amount:number;tournamentSlug:string;expiresAt:string;checkoutUrl?:string;canCancel?:boolean;flowOrder?:string|null }
export default function PaymentResultPage() {
  return <Suspense fallback={<p className="p-8 text-slate-300">Consultando inscripción…</p>}><PaymentRoute /></Suspense>;
}
function PaymentRoute() {
  const {user,isLoading,openAuthModal}=useAuth();
  const paymentId=useSearchParams().get('paymentId');
  return <section className="mx-auto max-w-2xl space-y-5 px-4 py-10 text-white sm:px-6">
    <h1 className="text-3xl font-bold">Estado de tu inscripción</h1>
    {isLoading ? <p role="status">Cargando tu sesión…</p> : !user ? <button onClick={()=>openAuthModal('login')} className="arena-primary-button">Inicia sesión para consultar tu pago</button> : !paymentId ? <p role="alert" className="text-amber-300">Falta la referencia del pago.</p> : <PaymentState key={user.id+':'+paymentId} paymentId={paymentId} />}
    <Link href="/arena/pagos" className="block text-red-300 underline">Ver historial de pagos</Link>
    <Link href="/arena/ayuda" className="block text-sm text-slate-300 underline">Ayuda con inscripciones y devoluciones</Link>
  </section>;
}
function PaymentState({paymentId}:{paymentId:string}) {
  const {token}=useAuth();
  const [payment,setPayment]=useState<Payment|null>(null),[error,setError]=useState('');
  const [retry,setRetry]=useState(0),[now,setNow]=useState(()=>Date.now());
  const [cancelling,setCancelling]=useState(false),[cancelMessage,setCancelMessage]=useState('');
  async function cancelRegistration() {
    if (!window.confirm('¿Cancelar esta inscripción y liberar el cupo? No pagues el enlace anterior de Flow. Si ya pagaste, espera la confirmación.')) return;
    setCancelling(true);
    setCancelMessage('');
    try {
      const response = await fetch('/api/payments/'+encodeURIComponent(paymentId)+'/cancel', { method:'POST', headers:{Authorization:'Bearer '+(token||'')} });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cancelar.');
      setPayment(current=>current?{...current,status:'cancelled',checkoutUrl:undefined}:current);
      setCancelMessage(data.message);
    } catch (error) {
      setCancelMessage(error instanceof Error ? error.message : 'No se pudo cancelar.');
    } finally {
      setCancelling(false);
      setRetry(value=>value+1);
    }
  }
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response=await fetch('/api/payments/'+encodeURIComponent(paymentId),{headers:{Authorization:'Bearer '+(token||'')},cache:'no-store',signal:controller.signal});
        const data=await response.json();
        if(controller.signal.aborted)return;
        if(!response.ok){setError(data.error||'No se pudo consultar el pago.');return;}
        setPayment(data.payment);
        setError(data.verifying?'El proveedor no está disponible. Volveremos a verificar; evita pagar nuevamente.':'');
        if(data.verifying || ['pending','creating','review'].includes(data.payment.status) || (data.payment.status==='cancelled' && new Date(data.payment.expiresAt).getTime()>Date.now()))timer=setTimeout(refresh,8000);
      }catch{
        if(!controller.signal.aborted){setError('No pudimos conectar. Volveremos a consultar automáticamente.');timer=setTimeout(refresh,8000);}
      }
    }
    void refresh();
    return()=>{controller.abort();clearTimeout(timer);};
  },[paymentId,token,retry]);
  const remaining=payment?Math.max(0,Math.ceil((new Date(payment.expiresAt).getTime()-now)/1000)):0;
  return <>
    {error&&<div role="alert" className="space-y-2 rounded-xl border border-amber-400/30 p-4 text-sm text-amber-200"><p>{error}</p><button onClick={()=>setRetry(value=>value+1)} className="underline">Reintentar ahora</button></div>}
    {payment?<div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{statusLabels[payment.status]||'Verificando pago'}</h2>
      {payment.provider !== 'flow' && <p className="text-sm text-amber-300">Pago histórico de otro proveedor. Contacta a soporte para verificarlo.</p>}
      <p>{new Intl.NumberFormat('es-CL').format(payment.amount)} CLP</p>
      <p className="break-all text-sm text-slate-400">Referencia CAOZ: {payment.id}</p>
      {payment.provider==='flow' && <><FlowOrder order={payment.flowOrder} /><p className="text-xs text-slate-400">Usa el número de orden Flow para identificar esta operación al consultar un pago o solicitar su devolución.</p></>}
      {payment.checkoutUrl&&remaining>0&&<a href={payment.checkoutUrl} className="arena-primary-button w-full">Continuar pago en Flow</a>}
      {payment.canCancel && payment.status==='pending' && <button type="button" onClick={cancelRegistration} disabled={cancelling} className="arena-secondary-button w-full disabled:opacity-50">{cancelling?'Verificando pago…':'Cancelar inscripción pendiente'}</button>}
      {cancelMessage && <p role="status" className="text-sm text-amber-200">{cancelMessage}</p>}
      {payment.status==='cancelled' && <p className="text-sm text-slate-300">Tu inscripción está cancelada y el cupo fue liberado. No pagues el enlace anterior de Flow: vence el {formatTournamentDate(payment.expiresAt)}. Hasta entonces no podrás iniciar otro pago para esta inscripción. Si un pago se confirma después de cancelar, se marcará para devolución.</p>}
      {['pending','creating'].includes(payment.status)&&<div className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-950/20 p-4">
        <p className="font-semibold text-amber-200">{remaining>0?'Cupo reservado por '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0')+' min':'La reserva del cupo ha expirado'}</p>
        <p className="text-sm text-slate-300">Vencimiento: {formatTournamentDate(payment.expiresAt)}. Si ya pagaste, espera la verificación antes de iniciar otra operación.</p>
      </div>}
      {['review','refund_required'].includes(payment.status)&&<a href={'mailto:'+SUPPORT_EMAIL+'?subject='+encodeURIComponent('Revisión de pago CZ ARENA · '+payment.id)+'&body='+encodeURIComponent('Hola, solicito revisar esta operación.\nReferencia: '+payment.id+'\nOrden Flow: '+(payment.flowOrder||'No disponible')+'\nMonto: '+payment.amount+' CLP\nEstado: '+payment.status+'\nMotivo: ')} className="arena-secondary-button">{payment.status==='refund_required'?'Solicitar devolución por correo':'Contactar soporte con esta referencia'}</a>}
      <Link href={'/tournament/'+payment.tournamentSlug} className="inline-block text-red-300 underline">Volver al torneo</Link>
    </div>:!error&&<p role="status">Consultando el pago…</p>}
  </>;
}
