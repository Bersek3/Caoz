import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';
import { reconcilePayment } from '@/lib/tournamentPayments';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const viewer = await getMatchViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Inicia sesión para ver tu inscripción.' }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  let payment = (await db.query('SELECT * FROM tournament_payments WHERE id=$1', [id])).rows[0];
  if (!payment || (payment.user_id !== viewer.id && viewer.role !== 'admin')) return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
  let verifying = false;
  if (payment.provider === 'flow' && !['confirmed', 'refund_required'].includes(payment.status)) {
    try { payment = await reconcilePayment(payment.provider_uuid || null, payment.id); } catch { verifying = true; }
  }

  const tournament = (await db.query('SELECT slug FROM tournaments WHERE id=$1', [payment.tournament_id])).rows[0];
  const checkoutUrl = payment.provider === 'flow' && payment.user_id === viewer.id && payment.status === 'pending' && new Date(payment.expires_at).getTime() > Date.now() ? payment.checkout_url : undefined;
  return NextResponse.json({ payment: { id: payment.id, status: payment.status, provider: payment.provider, flowOrder: payment.provider === 'flow' ? payment.provider_order || null : null, amount: payment.amount, currency: 'CLP', expiresAt: payment.expires_at, tournamentSlug: tournament.slug, checkoutUrl, canCancel: payment.provider === 'flow' && payment.user_id === viewer.id && payment.status === 'pending' && !verifying }, verifying }, { headers: { 'Cache-Control': 'private, no-store' } });
}
