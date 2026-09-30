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

export async function GET(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Check if user is captain or member of any team
    const teamRes = await db.query(`
      SELECT t.* 
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.captain_id = $1 OR tm.user_id = $1
      LIMIT 1
    `, [userId]);

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ team: null });
    }

    const team = teamRes.rows[0];

    // 2. Fetch captain details
    const captainRes = await db.query(
      'SELECT id, username, full_name, avatar_url, discord_tag, riot_id, steam_id, ea_id FROM users WHERE id = $1',
      [team.captain_id]
    );

    // 3. Fetch all members with their user details
    const membersRes = await db.query(`
      SELECT 
        tm.id as member_id,
        tm.role,
        tm.in_game_id,
        tm.joined_at,
        u.id as user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.discord_tag,
        u.riot_id,
        u.steam_id,
        u.ea_id
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `, [team.id]);

    const isCaptain = team.captain_id === userId;

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        tag: team.tag,
        logoUrl: team.logo_url,
        captainId: team.captain_id,
        inviteCode: team.invite_code,
        isCaptain,
        captain: captainRes.rows[0] || null,
        members: membersRes.rows.map((m) => ({
          id: m.member_id,
          userId: m.user_id,
          username: m.username,
          fullName: m.full_name,
          avatarUrl: m.avatar_url,
          role: m.role,
          inGameId: m.in_game_id || m.riot_id || m.steam_id || m.username,
          discordTag: m.discord_tag,
          joinedAt: m.joined_at
        }))
      }
    });
  } catch (error: any) {
    console.error('Get team API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión para crear un equipo.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, tag } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del equipo es obligatorio.' }, { status: 400 });
    }

    if (!tag || !tag.trim()) {
      return NextResponse.json({ error: 'El Tag o abreviatura del equipo es obligatorio (ej: KRU, LEV).' }, { status: 400 });
    }

    // Check if user already owns a team
    const existingTeam = await db.query(
      'SELECT id FROM teams WHERE captain_id = $1',
      [userId]
    );

    if (existingTeam.rows.length > 0) {
      return NextResponse.json({ error: 'Ya tienes un equipo oficial creado. Puedes gestionarlo desde tu perfil.' }, { status: 400 });
    }

    // Check user birth date and legal age
    const userRes = await db.query('SELECT birth_date, account_status, riot_id, steam_id, ea_id, username FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      if (!u.birth_date) {
        return NextResponse.json({
          error: 'Debes ingresar tu Fecha de Nacimiento en tu Perfil antes de crear un equipo para verificar tu aptitud legal.'
        }, { status: 400 });
      }
      const birth = new Date(u.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 14) {
        return NextResponse.json({
          error: 'La edad mínima legal en Chile para crear y capitanear un equipo es de 14 años.'
        }, { status: 400 });
      }
    }
    // Generate secure randomized invite code: CZ-XXXX-XXXX
    const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const secureCode = `CZ-${randPart1}-${randPart2}`;

    const teamId = `team-${Date.now()}`;
    const cleanTag = tag.trim().toUpperCase().substring(0, 6);
    const genericLogo = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';

    // Insert team
    await db.query(`
      INSERT INTO teams (id, name, tag, logo_url, captain_id, invite_code)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      teamId,
      name.trim(),
      cleanTag,
      genericLogo,
      userId,
      secureCode
    ]);

    const u = userRes.rows[0];
    const initialInGameId = u?.riot_id || u?.steam_id || u?.ea_id || u?.username;

    // Add captain as first team member
    await db.query(`
      INSERT INTO team_members (id, team_id, user_id, role, in_game_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      `member-${Date.now()}`,
      teamId,
      userId,
      'captain',
      initialInGameId
    ]);

    return NextResponse.json({
      success: true,
      team: {
        id: teamId,
        name: name.trim(),
        tag: cleanTag,
        logoUrl: genericLogo,
        captainId: userId,
        inviteCode: secureCode
      }
    });
  } catch (error: any) {
    console.error('Create team API error:', error);
    return NextResponse.json({ error: error.message || 'Error al crear equipo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Verify user is captain of a team
    const teamRes = await db.query(
      'SELECT id, name FROM teams WHERE captain_id = $1',
      [userId]
    );

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: 'No eres capitán de ningún equipo o el equipo no existe.' }, { status: 404 });
    }

    const team = teamRes.rows[0];

    // 2. Delete all team members
    await db.query('DELETE FROM team_members WHERE team_id = $1', [team.id]);

    // 3. Delete the team itself
    await db.query('DELETE FROM teams WHERE id = $1', [team.id]);

    return NextResponse.json({
      success: true,
      message: `El equipo "${team.name}" ha sido disuelto y eliminado exitosamente.`
    });
  } catch (error: any) {
    console.error('Delete team API error:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar el equipo' }, { status: 500 });
  }
}

