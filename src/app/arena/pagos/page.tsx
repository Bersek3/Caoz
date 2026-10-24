'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function PaymentsPage() {
  const { user, openAuthModal } = useAuth();
  const [payments, setPayments] = useState<{id:string;title:string;username:string;status:string;amount:number}[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setPayments([]);
    if (!user) return;
    const controller = new AbortController();
    fetch('/api/payments', { headers: { Authorization: `Bearer ${localStorage.getItem('caoz_auth_token') || ''}` }, cache:'no-store',signal:controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setPayments(data.payments); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [user?.id]);
  const labels: Record<string,string> = {confirmed:'Confirmado',pending:'Pendiente',creating:'Preparando',review:'Revisión manual',failed:'Rechazado / cancelado',refund_required:'Devolución pendiente'};
  return <section className="mx-auto max-w-5xl space-y-5 px-6 py-12 text-white">
    <h1 className="text-3xl font-bold">{user?.role === 'admin' ? 'Pagos de inscripciones' : 'Mis pagos'}</h1>
    {!user && <button onClick={() => openAuthModal('login')}>Iniciar sesión</button>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {user && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-700"><th className="p-3">Torneo</th><th>Participante</th><th>Monto</th><th>Estado</th><th>Detalle</th></tr></thead>
      <tbody>{payments.map(payment => <tr key={payment.id} className="border-b border-slate-800"><td className="p-3">{payment.title}</td><td>{payment.username}</td><td>{new Intl.NumberFormat('es-CL').format(payment.amount)} CLP</td><td>{labels[payment.status] || payment.status}</td><td><Link href={`/arena/pago?paymentId=${payment.id}`} className="text-red-300 underline">Consultar</Link></td></tr>)}</tbody>
    </table>{!payments.length && <p className="py-6 text-slate-400">No hay pagos registrados.</p>}</div>}
    {user?.role === 'admin' && <p className="text-sm text-slate-400">Las devoluciones y los pagos en revisión se gestionan desde VirtualPOS. No vuelvas a cobrar mientras una operación esté en revisión.</p>}
  </section>;
}
