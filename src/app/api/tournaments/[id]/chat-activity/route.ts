import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';
import { getTournamentChatActivity } from '@/lib/matchChatActivity';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    if (viewer.role !== 'admin') return NextResponse.json({ error: 'Solo los administradores pueden consultar la actividad de las salas.' }, { status: 403 });
    const { id } = await params;
    const db = await getDb();
    const activity = await getTournamentChatActivity(db, id, viewer.id);
    return NextResponse.json({ activity }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Match chat activity error:', error);
    return NextResponse.json({ error: 'No se pudo consultar la actividad del chat.' }, { status: 500 });
  }
}
