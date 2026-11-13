import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';
import { archiveFailedPayment, PaymentArchiveError } from '@/lib/paymentArchive';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getMatchViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
  if (viewer.role !== 'admin') return NextResponse.json({ error: 'Solo administradores pueden archivar intentos de pago.' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  try {
    await initDb();
    const { id } = await params;
    await archiveFailedPayment(id, viewer.id, body?.confirmedOriginalFlowAccount === true);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof PaymentArchiveError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'No se pudo verificar el intento con Flow. Se conserva sin cambios; inténtalo más tarde.' }, { status: 503 });
  }
}
