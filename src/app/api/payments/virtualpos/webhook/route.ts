import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { reconcilePayment } from '@/lib/tournamentPayments';

export async function POST(request: Request) {
  try {
    await initDb();
    const type = request.headers.get('content-type') || '';
    const body = type.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
    if (typeof body.uuid !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(body.uuid)) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
    // Notifications carry only a UUID. Always query the authenticated provider API for the actual result.
    await reconcilePayment(body.uuid, new URL(request.url).searchParams.get('paymentId') || undefined);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar el pago. Reintentar notificación.' }, { status: 503 });
  }
}
