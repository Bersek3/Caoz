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

export async function DELETE(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'ID de miembro es requerido.' }, { status: 400 });
    }

    // 1. Verify user is captain of the team
    const teamRes = await db.query(
      'SELECT id, name FROM teams WHERE captain_id = $1',
      [userId]
    );

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: 'Solo el Capitán del equipo puede expulsar integrantes.' }, { status: 403 });
    }

    const team = teamRes.rows[0];

    // 2. Find target member
    const memberRes = await db.query(
      'SELECT id, user_id FROM team_members WHERE id = $1 AND team_id = $2',
      [memberId, team.id]
    );

    if (memberRes.rows.length === 0) {
      return NextResponse.json({ error: 'Integrante no encontrado en este equipo.' }, { status: 404 });
    }

    const member = memberRes.rows[0];
    if (member.user_id === userId) {
      return NextResponse.json({ error: 'El capitán no puede auto-expulsarse. Para eliminar el equipo usa la opción Disolver Equipo.' }, { status: 400 });
    }

    // 3. Remove member
    await db.query('DELETE FROM team_members WHERE id = $1', [memberId]);

    return NextResponse.json({
      success: true,
      message: 'El jugador ha sido expulsado del roster del equipo.'
    });
  } catch (error: any) {
    console.error('Kick member API error:', error);
    return NextResponse.json({ error: error.message || 'Error al expulsar integrante' }, { status: 500 });
  }
}
