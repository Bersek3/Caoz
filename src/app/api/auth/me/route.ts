import { getUserAvatar } from '@/lib/userAvatar';
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

    const res = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRow = res.rows[0];

    const teamRes = await db.query(`
      SELECT t.id, t.name, t.tag, t.logo_url, t.invite_code, t.captain_id,
        CASE WHEN t.captain_id = $1 THEN true ELSE false END as is_captain
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.captain_id = $1 OR tm.user_id = $1
      LIMIT 1
    `, [userId]);

    let userTeam = teamRes.rows[0] || null;
    if (userTeam) {
      const membersRes = await db.query(`
        SELECT tm.id, tm.user_id, tm.role, tm.in_game_id, u.username, u.full_name, u.avatar_url
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
      `, [userTeam.id]);
      userTeam.members = membersRes.rows;
      userTeam.memberCount = membersRes.rows.length;
    }

    // Get user tournaments
    const trnRes = await db.query(`
      SELECT t.id, t.title, t.slug, t.game_name, t.status, p.checked_in, p.registered_at
      FROM tournament_participants p
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.name = $1 OR p.name = $2 OR p.captain_name = $3
    `, [userTeam?.name || '', userRow.username, userRow.full_name || userRow.username]);

    // Calculate age
    let calculatedAge: number | null = null;
    if (userRow.birth_date) {
      const birth = new Date(userRow.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      calculatedAge = age;
    }

    // Get parental authorization if any
    const parentalRes = await db.query(
      'SELECT id, guardian_name, guardian_rut, relationship, status, rejection_reason FROM parental_authorizations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    return NextResponse.json({
      user: {
        id: userRow.id,
        email: userRow.email,
        username: userRow.username,
        fullName: userRow.full_name,
        avatarUrl: userRow.avatar_url || getUserAvatar(userRow.username),
        role: userRow.role,
        riotId: userRow.riot_id || '',
        steamId: userRow.steam_id || '',
        eaId: userRow.ea_id || '',
        discordTag: userRow.discord_tag || '',
        epicGamesUsername: userRow.epic_games_username || '',
        psnId: userRow.psn_id || '',
        xboxGamertag: userRow.xbox_gamertag || '',
        bio: userRow.bio || '',
        birthDate: userRow.birth_date ? new Date(userRow.birth_date).toISOString().split('T')[0] : null,
        rut: userRow.rut || '',
        age: calculatedAge,
        accountStatus: userRow.account_status || 'activa',
        parentalAuthorization: parentalRes.rows[0] || null,
        team: userTeam,
        tournaments: trnRes.rows || []
      }
    });
  } catch (error: any) {
    console.error('Auth ME error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      fullName, 
      avatarUrl, 
      bio, 
      riotId, 
      steamId, 
      eaId, 
      discordTag, 
      epicGamesUsername, 
      psnId, 
      xboxGamertag,
      birthDate, 
      rut 
    } = body;

    if (avatarUrl != null && avatarUrl !== '' && (typeof avatarUrl !== 'string' || avatarUrl.length > 700_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarUrl))) {
      return NextResponse.json({ error: 'El avatar debe ser una imagen JPG, PNG o WEBP de hasta 500 KB.' }, { status: 400 });
    }

    let accountStatusUpdate: string | null = null;
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) {
        accountStatusUpdate = 'pendiente_apoderado';
      } else {
        accountStatusUpdate = 'activa';
      }
    }

    await db.query(`
      UPDATE users SET
        full_name = COALESCE($1::VARCHAR, full_name),
        avatar_url = COALESCE($2::TEXT, avatar_url),
        bio = COALESCE($3::TEXT, bio),
        riot_id = COALESCE($4::VARCHAR, riot_id),
        steam_id = COALESCE($5::VARCHAR, steam_id),
        ea_id = COALESCE($6::VARCHAR, ea_id),
        discord_tag = COALESCE($7::VARCHAR, discord_tag),
        birth_date = CASE WHEN $8::TEXT IS NOT NULL AND $8::TEXT != '' THEN $8::DATE ELSE birth_date END,
        rut = CASE WHEN $9::TEXT IS NOT NULL THEN $9::VARCHAR ELSE rut END,
        account_status = COALESCE($10::VARCHAR, account_status),
        epic_games_username = COALESCE($11::VARCHAR, epic_games_username),
        psn_id = COALESCE($12::VARCHAR, psn_id),
        xbox_gamertag = COALESCE($13::VARCHAR, xbox_gamertag)
      WHERE id = $14
    `, [
      fullName ?? null,
      avatarUrl ?? null,
      bio ?? null,
      riotId ?? null,
      steamId ?? null,
      eaId ?? null,
      discordTag ?? null,
      birthDate ? String(birthDate).trim() : null,
      rut ? String(rut).trim() : null,
      accountStatusUpdate,
      epicGamesUsername ?? null,
      psnId ?? null,
      xboxGamertag ?? null,
      userId
    ]);

    const updated = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const u = updated.rows[0];

    let calculatedAge: number | null = null;
    if (u.birth_date) {
      const birth = new Date(u.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      calculatedAge = age;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        fullName: u.full_name,
        avatarUrl: u.avatar_url || getUserAvatar(u.username),
        role: u.role,
        riotId: u.riot_id || '',
        steamId: u.steam_id || '',
        eaId: u.ea_id || '',
        discordTag: u.discord_tag || '',
        epicGamesUsername: u.epic_games_username || '',
        psnId: u.psn_id || '',
        xboxGamertag: u.xbox_gamertag || '',
        bio: u.bio || '',
        birthDate: u.birth_date ? new Date(u.birth_date).toISOString().split('T')[0] : null,
        rut: u.rut || '',
        age: calculatedAge,
        accountStatus: u.account_status || 'activa'
      }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar perfil' }, { status: 500 });
  }
}
