import { NextResponse } from 'next/server';
import { initDb, getDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';

export async function GET(request: Request) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    const db = await getDb();
    const result = await db.query(`
      SELECT DISTINCT a.id, a.message, a.sender_name AS "senderName", t.title AS "tournamentTitle", t.slug,
        a.created_at AS "createdAt", TO_CHAR(a.created_at, 'DD-MM HH24:MI') AS "timeLabel"
      FROM tournament_announcements a
      JOIN tournaments t ON t.id=a.tournament_id
      JOIN tournament_payments p ON p.tournament_id=a.tournament_id AND p.user_id=$1
      WHERE p.status='confirmed' AND p.archived_at IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 100
    `, [viewer.id]);
    return NextResponse.json({ notifications: result.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudieron cargar las notificaciones.' }, { status: 500 }); }
}
