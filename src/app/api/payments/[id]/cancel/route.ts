import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';
import { cancelPendingPayment, PaymentCancellationError } from '@/lib/tournamentPayments';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const viewer = await getMatchViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Inicia sesión para cancelar tu inscripción.' }, { status: 401 });
  const { id } = await params;
  try {
    await cancelPendingPayment(id, viewer.id);
    return NextResponse.json({ success: true, message: 'Inscripción cancelada y cupo liberado. No pagues el enlace anterior de Flow; vencerá en su plazo original.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof PaymentCancellationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'No pudimos verificar el pago con Flow. No se ha cancelado la inscripción. Intenta consultar el estado más tarde.' }, { status: 503 });
  }
}
