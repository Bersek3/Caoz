import { NextResponse } from 'next/server';
import { flowConfig, readFlowToken } from '@/lib/flow';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const token = await readFlowToken(request);
  if (!token) return NextResponse.json({ error: 'Token de Flow inválido.' }, { status: 400 });
  const id = new URL(request.url).searchParams.get('paymentId');
  if (!id || !/^pay-[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
  // Browser return only redirects. The authenticated status endpoint verifies the saved payment.
  return NextResponse.redirect(new URL(`/arena/pago?paymentId=${encodeURIComponent(id)}`, flowConfig().site), 303);
}
