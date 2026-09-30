import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getAuthUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  return payload ? payload.userId : null;
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Check if user is in a team
    const memberRes = await db.query(`
      SELECT tm.id as member_id, tm.team_id, t.captain_id, t.name as team_name
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = $1
      LIMIT 1
    `, [userId]);

    if (memberRes.rows.length === 0) {
      return NextResponse.json({ error: 'No perteneces a ningún equipo actualmente.' }, { status: 400 });
    }

    const { member_id, team_id, captain_id, team_name } = memberRes.rows[0];

    // If user is the captain, they cannot simply leave; they must disband or transfer captaincy
    if (captain_id === userId) {
      return NextResponse.json({
        error: 'Como Capitán no puedes abandonar el equipo. Puedes disolver el equipo completo desde las opciones de gestión.'
      }, { status: 400 });
    }

    // 2. Remove user from team_members
    await db.query('DELETE FROM team_members WHERE id = $1', [member_id]);

    return NextResponse.json({
      success: true,
      message: `Has salido exitosamente del equipo "${team_name}".`
    });
  } catch (error: any) {
    console.error('Leave team API error:', error);
    return NextResponse.json({ error: error.message || 'Error al salir del equipo' }, { status: 500 });
  }
}
