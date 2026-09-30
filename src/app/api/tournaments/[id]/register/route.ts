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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const userId = getAuthUserId(request);

    // 1. Fetch tournament details
    const trnRes = await db.query(
      'SELECT id, title, team_type, team_size, max_participants FROM tournaments WHERE id = $1 OR slug = $1',
      [id]
    );

    if (trnRes.rows.length === 0) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    const tournament = trnRes.rows[0];

    // 2. Check slots
    const countRes = await db.query(
      'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = $1',
      [tournament.id]
    );

    const currentCount = parseInt(countRes.rows[0]?.count || '0', 10);
    if (currentCount >= tournament.max_participants) {
      return NextResponse.json({ error: 'El torneo ya se encuentra con cupos llenos.' }, { status: 400 });
    }

    const requiredTeamSize = Number(tournament.team_size) || (tournament.team_type === 'team' ? 5 : 1);
    const isSolo = tournament.team_type === 'solo' || requiredTeamSize === 1;

    let participantName = '';
    let participantTag = '';
    let captainName = body.captainName || 'Participante';
    let captainInGameId = body.captainInGameId || '';
    let captainDiscord = body.captainDiscord || '';
    let candidates: Array<{ userId: string; username: string; role?: string; inGameId?: string }> = [];
    let teamObj: any = null;

    if (isSolo) {
      // For solo tournaments, participant name is explicitly the user's username!
      if (!body.username && !body.teamName) {
        return NextResponse.json({ error: 'El nombre de usuario es obligatorio para torneos individuales.' }, { status: 400 });
      }
      participantName = body.username || body.teamName;
      participantTag = 'SOLO';
      captainName = participantName;
      candidates = [{
        userId: userId || `user-${participantName}`,
        username: participantName,
        role: 'solo',
        inGameId: captainInGameId
      }];
    } else {
      // For team tournaments (2v2, 3v3, 4v4, 5v5), user MUST have a formed team AND it must be complete!
      if (userId) {
        const teamRes = await db.query(`
          SELECT t.id, t.name, t.tag, t.captain_id
          FROM teams t
          LEFT JOIN team_members tm ON t.id = tm.team_id
          WHERE t.captain_id = $1 OR tm.user_id = $1
          LIMIT 1
        `, [userId]);

        if (teamRes.rows.length === 0) {
          return NextResponse.json({
            error: 'NO_TEAM',
            message: `Este es un torneo por equipos (${requiredTeamSize}v${requiredTeamSize}). No tienes un equipo formado para participar. Ve a tu perfil para crear tu equipo o unirte a uno mediante código de invitación.`
          }, { status: 400 });
        }

        teamObj = teamRes.rows[0];

        // Fetch all members of this team
        const membersRes = await db.query(`
          SELECT tm.user_id, u.username, u.full_name, tm.role, tm.in_game_id
          FROM team_members tm
          JOIN users u ON tm.user_id = u.id
          WHERE tm.team_id = $1
        `, [teamObj.id]);

        const memberCount = membersRes.rows.length;

        if (memberCount < requiredTeamSize) {
          return NextResponse.json({
            error: 'TEAM_INCOMPLETE',
            message: `Tu equipo "${teamObj.name}" tiene ${memberCount}/${requiredTeamSize} integrantes. Este torneo es de modalidad ${requiredTeamSize}v${requiredTeamSize} y requiere un equipo completo para poder inscribirse. Invita a más jugadores a tu equipo desde tu perfil.`
          }, { status: 400 });
        }

        participantName = teamObj.name.trim();
        participantTag = (teamObj.tag || 'TEAM').trim().toUpperCase();

        candidates = membersRes.rows.map((m: any) => ({
          userId: m.user_id,
          username: m.username,
          role: m.role,
          inGameId: m.in_game_id || ''
        }));
      } else {
        if (!body.teamName || body.teamName === 'Sin equipo' || body.teamName === 'SOLO') {
          return NextResponse.json({
            error: 'NO_TEAM',
            message: `Este es un torneo por equipos (${requiredTeamSize}v${requiredTeamSize}). No tienes un equipo formado para participar. Ve a tu perfil para crear tu equipo o unirte a uno.`
          }, { status: 400 });
        }
        participantName = body.teamName.trim();
        participantTag = (body.teamTag || 'TEAM').trim().toUpperCase();
      }
    }

    // Legal Age and Birth Date Validation (Ley N° 19.628 Chile)
    if (userId) {
      if (isSolo) {
        const userRes = await db.query('SELECT username, birth_date, account_status FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0) {
          const u = userRes.rows[0];
          if (!u.birth_date) {
            return NextResponse.json({
              error: 'Debes registrar tu Fecha de Nacimiento en tu Perfil antes de inscribirte para verificar tu aptitud legal.'
            }, { status: 400 });
          }
          const birth = new Date(u.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

          if (age < 14) {
            return NextResponse.json({
              error: 'La edad mínima legal en Chile para participar en torneos es de 14 años.'
            }, { status: 400 });
          }
        }
      } else {
        // Check captain and all roster members in team
        const teamCheck = await db.query(`
          SELECT u.id, u.username, u.birth_date, u.account_status
          FROM users u
          WHERE u.id = $1 OR u.id IN (
            SELECT tm.user_id FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE t.captain_id = $1
          )
        `, [userId]);

        for (const member of teamCheck.rows) {
          if (!member.birth_date) {
            return NextResponse.json({
              error: `El integrante @${member.username} no ha registrado su Fecha de Nacimiento en su perfil.`
            }, { status: 400 });
          }
          const birth = new Date(member.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

          if (age < 14) {
            return NextResponse.json({
              error: `El integrante @${member.username} tiene ${age} años y no cumple con la edad mínima legal (14 años).`
            }, { status: 400 });
          }
        }
      }
    }

    // 1. Check if participant name already registered in this tournament
    const dupCheck = await db.query(
      'SELECT id, name FROM tournament_participants WHERE tournament_id = $1 AND LOWER(name) = LOWER($2)',
      [tournament.id, participantName]
    );

    if (dupCheck.rows.length > 0) {
      return NextResponse.json({
        error: isSolo
          ? 'Ya te encuentras registrado en este torneo.'
          : `El equipo "${participantName}" ya está inscrito en este torneo.`
      }, { status: 400 });
    }

    // 2. CHECK IF ANY CANDIDATE USER IS ALREADY IN THIS TOURNAMENT (IN ANOTHER TEAM OR SOLO)
    // Rule: Exactly 1 username per tournament!
    const existingTournamentUsers = await db.query(`
      SELECT 
        tp.id as participant_id,
        tp.name as participant_name,
        COALESCE(tm.user_id, tp.user_id) as registered_user_id,
        COALESCE(u.username, tp.captain_name, tp.name) as registered_username
      FROM tournament_participants tp
      LEFT JOIN team_members tm ON tp.team_id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tp.tournament_id = $1
    `, [tournament.id]);

    for (const candidate of candidates) {
      const alreadyRegistered = existingTournamentUsers.rows.find(
        (r: any) =>
          (candidate.userId && r.registered_user_id === candidate.userId) ||
          (candidate.username && r.registered_username && r.registered_username.toLowerCase() === candidate.username.toLowerCase())
      );

      if (alreadyRegistered) {
        return NextResponse.json({
          error: 'USER_ALREADY_IN_TOURNAMENT',
          message: isSolo
            ? `Ya te encuentras registrado en este torneo (en el equipo "${alreadyRegistered.participant_name}"). Solo se permite 1 participación por usuario.`
            : `El jugador @${candidate.username} ya forma parte del equipo "${alreadyRegistered.participant_name}" registrado en este torneo. Cada jugador solo puede participar en 1 equipo por torneo.`
        }, { status: 400 });
      }
    }

    const participantId = `part-${Date.now()}`;
    const seed = currentCount + 1;
    const defaultAvatar = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';

    // Insert participant in PostgreSQL
    await db.query(`
      INSERT INTO tournament_participants (
        id, tournament_id, team_id, user_id, name, tag, avatar, seed, checked_in, registered_at,
        captain_name, captain_discord, captain_in_game_id, captain_avatar, roster
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      participantId,
      tournament.id,
      teamObj?.id || null,
      userId || null,
      participantName,
      participantTag,
      body.avatar || defaultAvatar,
      seed,
      false,
      'Recién registrado',
      captainName,
      captainDiscord,
      captainInGameId,
      defaultAvatar,
      JSON.stringify(candidates)
    ]);

    // 3. AUTOMATICALLY SEED INTO FIRST ROUND MATCH IN THE BRACKET!
    const targetMatchIndex = Math.floor(currentCount / 2);
    const isTeam1 = currentCount % 2 === 0;

    const matchCheck = await db.query(`
      SELECT id, team1_participant_id, team2_participant_id
      FROM tournament_matches
      WHERE tournament_id = $1 AND round_index = 0 AND match_index = $2 AND bracket_type = 'winners'
    `, [tournament.id, targetMatchIndex]);

    if (matchCheck.rows.length > 0) {
      const match = matchCheck.rows[0];
      if (isTeam1) {
        await db.query(`
          UPDATE tournament_matches SET
            team1_participant_id = $1,
            team1_name = $2,
            team1_avatar = $3,
            team1_seed = $4
          WHERE id = $5
        `, [participantId, participantName, defaultAvatar, seed, match.id]);
      } else {
        await db.query(`
          UPDATE tournament_matches SET
            team2_participant_id = $1,
            team2_name = $2,
            team2_avatar = $3,
            team2_seed = $4,
            status = 'ready'
          WHERE id = $5
        `, [participantId, participantName, defaultAvatar, seed, match.id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: isSolo
        ? `¡Te has inscrito exitosamente como @${participantName}! Ya apareces en la llave del torneo.`
        : `¡El equipo "${participantName}" ha sido inscrito exitosamente! Ya aparece en la llave del torneo.`,
      participantId,
      participantName
    });
  } catch (error: any) {
    console.error('Register participant API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id } = await params;
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión para realizar esta acción.' }, { status: 401 });
    }

    // 1. Fetch tournament
    const trnRes = await db.query(
      'SELECT id, title, team_type, team_size, status FROM tournaments WHERE id = $1 OR slug = $1',
      [id]
    );

    if (trnRes.rows.length === 0) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    const tournament = trnRes.rows[0];
    const isSolo = tournament.team_type === 'solo' || tournament.team_size === 1;

    // Fetch user details
    const userRes = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    // Find the participant entry in this tournament associated with this user or their team
    const partRes = await db.query(`
      SELECT p.*
      FROM tournament_participants p
      WHERE p.tournament_id = $1 AND (
        p.user_id = $2 OR
        p.name = $3 OR
        p.captain_name = $3 OR
        p.team_id IN (
          SELECT t.id FROM teams t WHERE t.captain_id = $2
        )
      )
      LIMIT 1
    `, [tournament.id, userId, user?.username || '']);

    if (partRes.rows.length === 0) {
      return NextResponse.json({
        error: isSolo
          ? 'No te encuentras registrado en este torneo.'
          : 'Solo el capitán del equipo puede retirar la participación de su equipo.'
      }, { status: 404 });
    }

    const participant = partRes.rows[0];

    // 2. Remove participant from tournament_participants
    await db.query('DELETE FROM tournament_participants WHERE id = $1', [participant.id]);

    // 3. Reset bracket match slots where this participant was placed back to 'Vacío'
    await db.query(`
      UPDATE tournament_matches SET
        team1_participant_id = NULL,
        team1_name = 'Vacío',
        team1_avatar = NULL,
        team1_seed = NULL,
        status = CASE WHEN team2_participant_id IS NOT NULL THEN 'ready' ELSE 'pending' END
      WHERE tournament_id = $1 AND team1_participant_id = $2
    `, [tournament.id, participant.id]);

    await db.query(`
      UPDATE tournament_matches SET
        team2_participant_id = NULL,
        team2_name = 'Vacío',
        team2_avatar = NULL,
        team2_seed = NULL,
        status = 'pending'
      WHERE tournament_id = $1 AND team2_participant_id = $2
    `, [tournament.id, participant.id]);

    return NextResponse.json({
      success: true,
      message: isSolo
        ? 'Has cancelado tu participación en el torneo exitosamente.'
        : `El equipo "${participant.name}" ha sido retirado del torneo exitosamente.`
    });
  } catch (error: any) {
    console.error('Withdraw participant API error:', error);
    return NextResponse.json({ error: error.message || 'Error al retirar la inscripción' }, { status: 500 });
  }
}
