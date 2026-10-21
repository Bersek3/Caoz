import { NextResponse } from 'next/server';
import { virtualposConfig } from '@/lib/virtualpos';

async function redirect(request: Request) {
  const query = new URL(request.url).searchParams;
  const paymentId = query.get('paymentId');
  if (!paymentId || !/^pay-[a-f0-9-]{36}$/.test(paymentId)) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
  // Do not confirm payment from browser-supplied state; the signed-in status endpoint verifies it.
  return NextResponse.redirect(new URL(`/arena/pago?paymentId=${paymentId}`, virtualposConfig().site), 303);
}
export const POST = redirect;
export const GET = redirect;
