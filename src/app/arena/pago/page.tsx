'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const statusLabels: Record<string, string> = {
  confirmed: 'Pago aprobado: inscripción confirmada',
  pending: 'Pago pendiente de confirmación',
  creating: 'Preparando el pago',
  review: 'Pago en revisión: contacta al organizador antes de volver a pagar',
  failed: 'Pago rechazado, cancelado o expirado. Puedes iniciar una nueva inscripción.',
  refund_required: 'Pago recibido sin inscripción confirmada. Contacta al organizador para gestionar la devolución.'
};

export default function PaymentResultPage() {
  const { user, openAuthModal } = useAuth();
  const [payment, setPayment] = useState<{ id: string; status: string; amount: number; tournamentSlug: string; expiresAt: string; checkoutUrl?: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setPayment(null);
    setError('');
    if (!user) return;
    const id = new URLSearchParams(window.location.search).get('paymentId');
    if (!id) { setError('Falta la referencia del pago.'); return; }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        const res = await fetch(`/api/payments/${encodeURIComponent(id!)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('caoz_auth_token') || ''}` }, cache: 'no-store', signal: controller.signal
        });
        const data = await res.json();
        if (stopped) return;
        if (!res.ok) { setError(data.error || 'No se pudo consultar el pago.'); return; }
        setPayment(data.payment);
        setError(data.verifying ? 'El proveedor no está disponible. Volveremos a verificar; evita pagar nuevamente.' : '');
        if (['pending','creating'].includes(data.payment.status)) timer = setTimeout(refresh, 8000);
      } catch {
        if (!stopped) setError('No se pudo consultar el pago. Recarga esta página para reintentar.');
      }
    }
    refresh();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [user?.id]);
  return <section className="mx-auto max-w-2xl space-y-5 px-6 py-16 text-white">
    <h1 className="text-3xl font-bold">Estado de tu inscripción</h1>
    {!user ? <button onClick={() => openAuthModal('login')} className="rounded-lg bg-cyan-400 p-3 text-black">Inicia sesión para consultar tu pago</button> : <>
      {error && <p role="alert" className="text-amber-300">{error}</p>}
      {payment ? <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">{statusLabels[payment.status] || 'Verificando pago'}</h2>
        <p>{new Intl.NumberFormat('es-CL').format(payment.amount)} CLP</p>
        <p className="break-all text-sm text-slate-400">Referencia: {payment.id}</p>
        {payment.checkoutUrl && <a href={payment.checkoutUrl} className="block rounded-lg bg-cyan-400 p-3 text-center text-black">Continuar pago en VirtualPOS</a>}
        {['pending','creating'].includes(payment.status) && <p className="text-sm text-slate-400">La reserva dura 15 minutos. Si pagas después de que expire, el organizador deberá gestionar una devolución.</p>}
        <Link href={`/tournament/${payment.tournamentSlug}`} className="inline-block text-cyan-300 underline">Volver al torneo</Link>
      </div> : !error && <p>Consultando el pago…</p>}
    </>}
    <Link href="/arena/pagos" className="block text-cyan-300 underline">Ver historial de pagos</Link>
  </section>;
}
