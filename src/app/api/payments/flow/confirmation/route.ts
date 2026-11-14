import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { readFlowToken } from '@/lib/flow';
import { reconcilePayment } from '@/lib/tournamentPayments';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const token = await readFlowToken(request);
  if (!token) return NextResponse.json({ error: 'Token de Flow inválido.' }, { status: 400 });
  try {
    await initDb();
    // Callback contents are not proof of payment. Consult Flow using signed API parameters.
    await reconcilePayment(token);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar el pago con Flow.' }, { status: 503 });
  }
}
