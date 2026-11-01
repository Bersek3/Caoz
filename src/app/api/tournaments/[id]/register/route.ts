import { validateRegistrationDetails } from '@/lib/registrationDetails';
import { NextResponse } from 'next/server';
import { getDb, initDb, withDbTransaction } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { reserveRegistration } from '@/lib/tournamentPayments';

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

    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesi\u00f3n para inscribirte.' }, { status: 401 });
    const account = (await db.query('SELECT id, username FROM users WHERE id=$1', [userId])).rows[0];
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 401 });
    body.username = account.username;
    body.captainName = account.username;

    // 1. Fetch tournament details
    const trnRes = await db.query(
      'SELECT id, title, team_type, team_size, max_participants, entry_fee_amount FROM tournaments WHERE id = $1 OR slug = $1',
      [id]
    );

    if (trnRes.rows.length === 0) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    const tournament = trnRes.rows[0];

    let personalDetails;
    if (!Number(tournament.entry_fee_amount)) {
      try { personalDetails = validateRegistrationDetails(body.personalDetails); }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    }

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
        if (teamObj.captain_id !== userId) return NextResponse.json({ error: 'Solo el capitán puede inscribir al equipo. Pídele que confirme el roster y complete la inscripción.' }, { status: 403 });

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
          if (personalDetails) u.birth_date = personalDetails.birthDate;
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
          if (member.id === userId && personalDetails) member.birth_date = personalDetails.birthDate;
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

    const result = await reserveRegistration(tournament.id, {
      userId, teamId: teamObj?.id || null, name: participantName, tag: participantTag,
      captainName, captainDiscord, captainInGameId, roster: candidates, personalDetails
    }, body.payer || {});
    return NextResponse.json({ success: true, ...result,
      message: result.checkoutUrl ? 'Contin\u00faa al pago para confirmar tu inscripci\u00f3n.' : 'Inscripci\u00f3n confirmada.'
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
    const { id } = await params;
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión para realizar esta acción.' }, { status: 401 });
    }

    return await withDbTransaction(async db => {
    // Serialize a withdrawal with draw/check-in/payment operations.
    const trnRes = await db.query(
      'SELECT id, title, team_type, team_size, status FROM tournaments WHERE id = $1 OR slug = $1 FOR UPDATE',
      [id]
    );

    if (trnRes.rows.length === 0) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    const tournament = trnRes.rows[0];
    const isSolo = tournament.team_type === 'solo' || tournament.team_size === 1;
    if (!['registration_open','check_in'].includes(tournament.status)) return NextResponse.json({ error: 'La competición ya comenzó. Contacta al staff para gestionar una ausencia sin alterar las llaves.' }, { status: 409 });

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
    const activeMatches = await db.query("SELECT id FROM tournament_matches WHERE tournament_id=$1 AND (winner_id IS NOT NULL OR status IN ('in_progress','completed','disputed')) LIMIT 1", [tournament.id]);
    if (activeMatches.rows.length) return NextResponse.json({ error: 'El cuadro ya tiene actividad. Contacta al staff para gestionar tu retiro.' }, { status: 409 });
    const paid = await db.query("SELECT id FROM tournament_payments WHERE participant_id=$1 AND status='confirmed' LIMIT 1", [participant.id]);
    if (paid.rows.length) return NextResponse.json({ error: 'Esta inscripción tiene un pago confirmado. Contacta al organizador para retirar la participación y gestionar la devolución según las reglas del torneo.' }, { status: 409 });

    // 2. Remove participant from tournament_participants
    await db.query('DELETE FROM tournament_participants WHERE id = $1', [participant.id]);

    // 3. Reset bracket match slots where this participant was placed back to 'Vacío'
    await db.query(`
      UPDATE tournament_matches SET
        team1_participant_id = NULL,
        team1_name = 'Vacío',
        team1_avatar = NULL,
        team1_seed = NULL,
        status = 'pending'
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
    });
  } catch (error: any) {
    console.error('Withdraw participant API error:', error);
    return NextResponse.json({ error: error.message || 'Error al retirar la inscripción' }, { status: 500 });
  }
}
