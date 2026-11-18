import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';

export async function GET(request: Request) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    if (viewer.role !== 'admin') return NextResponse.json({ error: 'No tienes permiso para ver los datos de participantes.' }, { status: 403 });

    const db = await getDb();
    const tournaments = await db.query(`
      SELECT t.id, t.title, t.slug, t.game_name, t.status, t.start_date, t.team_type, t.team_size,
        COUNT(p.id)::int AS participant_count
      FROM tournaments t
      LEFT JOIN tournament_participants p ON p.tournament_id = t.id
      GROUP BY t.id
      ORDER BY t.start_date DESC NULLS LAST, t.created_at DESC
    `);
    const participants = await db.query(`
      SELECT p.id, p.tournament_id, p.name, p.tag, p.team_id, p.checked_in, p.registered_at,
        p.captain_name, p.captain_discord, p.captain_in_game_id,
        u.username, u.full_name, u.email, u.phone
      FROM tournament_participants p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.registered_at DESC
    `);

    return NextResponse.json({ tournaments: tournaments.rows, participants: participants.rows });
  } catch (error) {
    console.error('Admin tournament directory error:', error);
    return NextResponse.json({ error: 'No se pudo cargar el panel de administración.' }, { status: 500 });
  }
}
