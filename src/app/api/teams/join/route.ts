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
      return NextResponse.json({ error: 'Debes iniciar sesión para unirte a un equipo.' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteCode, inGameId, discordTag } = body;

    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ error: 'El código de invitación es requerido.' }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    // 1. Find team
    const teamRes = await db.query(
      'SELECT id, name, tag, captain_id FROM teams WHERE UPPER(invite_code) = $1',
      [cleanCode]
    );

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: 'Código de invitación inválido o equipo no encontrado.' }, { status: 404 });
    }

    const team = teamRes.rows[0];

    // 2. Check if already member
    const memberCheck = await db.query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team.id, userId]
    );

    if (memberCheck.rows.length > 0 || team.captain_id === userId) {
      return NextResponse.json({ error: 'Ya eres integrante de este equipo.' }, { status: 400 });
    }

    // 3. Check team roster size (max 7)
    const countRes = await db.query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
      [team.id]
    );

    const memberCount = parseInt(countRes.rows[0]?.count || '0', 10);
    if (memberCount >= 7) {
      return NextResponse.json({ error: 'Este equipo ya tiene su roster completo (máximo 7 jugadores).' }, { status: 400 });
    }

    // Check user birth date and legal age
    const userRes = await db.query('SELECT birth_date, account_status FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      if (!u.birth_date) {
        return NextResponse.json({
          error: 'Debes registrar tu Fecha de Nacimiento en tu Perfil antes de poder unirte a un equipo.'
        }, { status: 400 });
      }
      const birth = new Date(u.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 14) {
        return NextResponse.json({
          error: 'La edad mínima legal en Chile para formar parte de un equipo de esports es de 14 años.'
        }, { status: 400 });
      }
    }

    // 4. Update user in_game_id / discord if provided
    if (inGameId || discordTag) {
      await db.query(`
        UPDATE users SET
          discord_tag = COALESCE($1, discord_tag),
          riot_id = COALESCE($2, riot_id)
        WHERE id = $3
      `, [discordTag || null, inGameId || null, userId]);
    }

    // 5. Add to team_members
    const memberId = `member-${Date.now()}`;
    await db.query(`
      INSERT INTO team_members (id, team_id, user_id, role, in_game_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      memberId,
      team.id,
      userId,
      'starter',
      inGameId || 'Jugador'
    ]);

    return NextResponse.json({
      success: true,
      message: `¡Te has unido exitosamente al equipo ${team.name} [${team.tag}]!`,
      team: {
        id: team.id,
        name: team.name,
        tag: team.tag
      }
    });
  } catch (error: any) {
    console.error('Join team API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
