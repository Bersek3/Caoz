import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb, initDb } from '@/lib/db';
import { getMatchViewer, ownsMatchParticipant } from '@/lib/matchAccess';

async function getAnnouncementAccess(request: Request, tournamentId: string) {
  const viewer = await getMatchViewer(request);
  if (!viewer) return { error: 'Debes iniciar sesión para ver los anuncios.', status: 401 as const };
  const db = await getDb();
  const tournament = (await db.query('SELECT id, format FROM tournaments WHERE id=$1 OR slug=$1', [tournamentId])).rows[0];
  if (!tournament) return { error: 'Torneo no encontrado.', status: 404 as const };
  if (tournament.format !== 'battle_royale') return { error: 'Este torneo no usa anuncios generales.', status: 404 as const };
  if (viewer.role === 'admin') return { db, tournament, viewer };
  const participants = await db.query('SELECT user_id, roster FROM tournament_participants WHERE tournament_id=$1', [tournament.id]);
  if (!participants.rows.some(participant => ownsMatchParticipant(viewer, participant))) return { error: 'Solo los inscritos pueden ver los anuncios del Battle Royale.', status: 403 as const };
  return { db, tournament, viewer };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const access = await getAnnouncementAccess(request, id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const messages = await access.db.query(`SELECT id, sender_name AS "senderName", message, TO_CHAR(created_at, 'HH24:MI') AS timestamp FROM tournament_announcements WHERE tournament_id=$1 ORDER BY created_at DESC`, [access.tournament.id]);
    return NextResponse.json({ messages: messages.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudieron cargar los anuncios.' }, { status: 500 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const access = await getAnnouncementAccess(request, id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
    if (access.viewer.role !== 'admin') return NextResponse.json({ error: 'Solo el administrador puede enviar anuncios generales.' }, { status: 403 });
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 2000) return NextResponse.json({ error: 'Escribe un anuncio de hasta 2.000 caracteres.' }, { status: 400 });
    const item = { id: `ann-${randomUUID()}`, senderName: `Staff CAOZ (@${access.viewer.username})`, message, timestamp: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }) };
    await access.db.query('INSERT INTO tournament_announcements(id,tournament_id,sender_name,message) VALUES($1,$2,$3,$4)', [item.id, access.tournament.id, item.senderName, item.message]);
    return NextResponse.json({ message: item });
  } catch { return NextResponse.json({ error: 'No se pudo publicar el anuncio.' }, { status: 500 }); }
}
