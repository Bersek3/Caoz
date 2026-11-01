import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { initDb, withDbTransaction } from '@/lib/db';
import { editTournament, TournamentEditError } from '@/lib/editTournament';
import { MAX_TOURNAMENT_REQUEST_BYTES } from '@/lib/tournamentBanner';
import { getMatchViewer } from '@/lib/matchAccess';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    if ((await getMatchViewer(request))?.role !== 'admin') return NextResponse.json({ error: 'Solo el staff puede gestionar destacados y premios.' }, { status: 403 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['isFeatured','prizeDeliveryStatus'].includes(key)) ||
      (!('isFeatured' in body) && !('prizeDeliveryStatus' in body)) ||
      (body.isFeatured !== undefined && typeof body.isFeatured !== 'boolean') ||
      (body.prizeDeliveryStatus !== undefined && !['pending','processing','delivered'].includes(body.prizeDeliveryStatus))) return NextResponse.json({ error: 'Selecciona un estado de destacado o de entrega de premios válido.' }, { status: 400 });
    const { id } = await params;
    const result = await withDbTransaction(async db => {
      // Serialize featured changes so concurrent requests cannot create two featured events.
      await db.query('SELECT id FROM tournaments ORDER BY id FOR UPDATE');
      const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 OR slug=$1', [id])).rows[0];
      if (!tournament) throw new TournamentEditError('Torneo no encontrado.',404);
      if (body.prizeDeliveryStatus && tournament.status !== 'completed') throw new TournamentEditError('Confirma la final antes de gestionar la entrega de premios.',409);
      if (body.isFeatured) await db.query('UPDATE tournaments SET is_featured=false');
      if (body.isFeatured !== undefined) await db.query('UPDATE tournaments SET is_featured=$1 WHERE id=$2', [body.isFeatured,tournament.id]);
      if (body.prizeDeliveryStatus !== undefined) await db.query('UPDATE tournaments SET prize_delivery_status=$1 WHERE id=$2', [body.prizeDeliveryStatus,tournament.id]);
      return { success: true, message: 'Torneo actualizado.' };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TournamentEditError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Tournament management error:',error);
    return NextResponse.json({ error: 'No se pudo actualizar el torneo.' }, { status: 500 });
  }
}

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
