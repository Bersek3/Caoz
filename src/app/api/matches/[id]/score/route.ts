import { NextResponse } from 'next/server';
import { initDb, withDbTransaction } from '@/lib/db';
import { getMatchAccess } from '@/lib/matchAccess';
import { CompetitionError, recordCompetitionScore } from '@/lib/tournamentCompetition';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const access = await getMatchAccess(request,id);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    if (access.viewer.role !== 'admin') return NextResponse.json({ error: 'Solo el staff puede confirmar el marcador. Adjunta tus pruebas en la sala privada.' }, { status: 403 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    const result = await withDbTransaction(db => recordCompetitionScore(db,id,body.score1,body.score2,body.proofUrl,`Staff CAOZ (@${access.viewer.username})`));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CompetitionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Score error:', error);
    return NextResponse.json({ error: 'No se pudo guardar el marcador. Inténtalo de nuevo.' }, { status: 500 });
  }
}
