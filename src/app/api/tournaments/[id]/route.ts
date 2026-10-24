import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { initDb, withDbTransaction } from '@/lib/db';
import { editTournament, TournamentEditError } from '@/lib/editTournament';
import { MAX_TOURNAMENT_REQUEST_BYTES } from '@/lib/tournamentBanner';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || verifyToken(header.slice(7))?.role !== 'admin') return NextResponse.json({ error: 'Solo los administradores pueden editar torneos.' }, { status: 403 });
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_TOURNAMENT_REQUEST_BYTES) return NextResponse.json({ error: 'Las imágenes o el texto superan el tamaño permitido.' }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }); }
    const { id } = await params;
    await initDb();
    const result = await withDbTransaction(db => editTournament(db, id, body));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TournamentEditError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Edit tournament error:', error);
    return NextResponse.json({ error: 'No se pudieron guardar los cambios.' }, { status: 500 });
  }
}
