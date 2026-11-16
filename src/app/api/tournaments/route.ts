import { deleteTournaments, TournamentDeleteError } from '@/lib/deleteTournament';
import { NextResponse } from 'next/server';
import { getDb, initDb, withDbTransaction } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getOfficialGames } from '@/lib/games';
import { getMatchViewer, ownsMatchParticipant } from '@/lib/matchAccess';
import { MAX_TOURNAMENT_REQUEST_BYTES } from '@/lib/tournamentBanner';
import { resolveTournamentRules } from '@/lib/tournamentRules';
import { validateTournamentPrizes } from '@/lib/tournamentPrizes';
import { getUserAvatar } from '@/lib/userAvatar';
import { createCompetitionBracket } from '@/lib/tournamentCompetition';
import { normalizeTournamentDate } from '@/lib/dateUtils';
import { randomUUID } from 'crypto';

function safeParse(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return Array.isArray(fallback) ? [val] : fallback;
  }
}

export async function GET(request: Request) {
  try {
    await initDb();
    const db = await getDb();

    // 1. Fetch all tournaments
    const trnRes = await db.query('SELECT * FROM tournaments ORDER BY created_at DESC');

    // 2. Fetch all participants
    const partRes = await db.query(`SELECT p.*, u.username AS account_username
      FROM tournament_participants p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.seed ASC`);

    // 3. Fetch all rounds
    const roundRes = await db.query('SELECT * FROM tournament_rounds ORDER BY round_index ASC');

    // 4. Fetch all matches
    const matchRes = await db.query('SELECT * FROM tournament_matches ORDER BY match_index ASC');

    const viewer = await getMatchViewer(request);
    const canAccessMatch = (match: typeof matchRes.rows[number]) => Boolean(viewer && (
      viewer.role === 'admin' || partRes.rows.some((participant) =>
        participant.tournament_id === match.tournament_id &&
        (participant.id === match.team1_participant_id || participant.id === match.team2_participant_id) &&
        ownsMatchParticipant(viewer, participant)
      )
    ));

    // Assemble tournaments
    const tournaments = trnRes.rows.map((t) => {
      const participants = partRes.rows
        .filter((p) => p.tournament_id === t.id)
        .map((p) => ({
          id: p.id,
          teamId: p.team_id,
          userId: p.user_id,
          name: p.name,
          tag: p.tag,
          avatar: p.team_id ? p.avatar : getUserAvatar(p.account_username || p.name),
          seed: p.seed,
          checkedIn: p.checked_in,
          registeredAt: p.registered_at,
          captain: {
            name: p.captain_name,
            discord: p.captain_discord,
            inGameId: p.captain_in_game_id,
            avatar: getUserAvatar(p.account_username || p.captain_name || p.name)
          },
          roster: (() => {
            const members = safeParse(p.roster,[]);
            return Array.isArray(members) ? members.map((member: { id?:string; userId?:string; username?:string; name?:string; role?:string; inGameId?:string },index:number) => {
              const name = member.name || member.username || 'Participante';
              return { ...member,id:member.id || member.userId || `roster-${p.id}-${index}`,name,
                avatar:getUserAvatar(member.username || name),inGameId:member.inGameId || (member.userId===p.user_id?p.captain_in_game_id:'') || '',
                role:member.role==='sub'?'sub':member.role==='captain' || member.userId===p.user_id?'captain':'starter' };
            }) : [];
          })()
        }));

      const allMatches = matchRes.rows.filter((m) => m.tournament_id === t.id);
      // Resolve old snapshots through the participant's current account avatar
      // in every round, including already completed matches, without resetting results.
      const avatarsById = new Map(participants.map(p => [p.id, p.avatar]));
      const avatarsByName = new Map(participants.map(p => [p.name, p.avatar]));

      const assembleRounds = (bracketType: 'winners' | 'losers') => {
        return roundRes.rows
          .filter((r) => r.tournament_id === t.id && r.bracket_type === bracketType)
          .map((r) => {
            const matches = allMatches
              .filter((m) => m.round_id === r.id || (m.round_index === r.round_index && m.bracket_type === bracketType))
              .map((m) => ({
                id: m.id,
                roundIndex: m.round_index,
                roundTitle: m.round_title,
                matchIndex: m.match_index,
                bracketType: m.bracket_type,
                team1: {
                  participantId: m.team1_participant_id,
                  name: m.team1_name,
                  avatar: avatarsById.get(m.team1_participant_id) || avatarsByName.get(m.team1_name) || m.team1_avatar,
                  seed: m.team1_seed,
                  score: m.team1_score,
                  isWinner: m.team1_is_winner
                },
                team2: {
                  participantId: m.team2_participant_id,
                  name: m.team2_name,
                  avatar: avatarsById.get(m.team2_participant_id) || avatarsByName.get(m.team2_name) || m.team2_avatar,
                  seed: m.team2_seed,
                  score: m.team2_score,
                  isWinner: m.team2_is_winner
                },
                status: m.status,
                winnerId: m.winner_id,
                bestOf: m.best_of,
                scheduledTime: m.scheduled_time,
                canAccessRoom: canAccessMatch(m),
                proofImageUrl: canAccessMatch(m) ? m.proof_image_url : undefined,
                disputeReason: canAccessMatch(m) ? m.dispute_reason : undefined,
                // Private messages are fetched exclusively through the authorized chat endpoint.
                chatMessages: []
              }));

            return {
              roundIndex: r.round_index,
              title: r.title,
              bracketType: r.bracket_type,
              matches
            };
          });
      };

      const winnersRounds = assembleRounds('winners');
      const losersRounds = assembleRounds('losers');
      const final = winnersRounds.at(-1)?.matches[0];
      const championId = final?.status === 'completed' ? final.winnerId : undefined;
      const runnerUpId = championId ? (final!.team1.participantId === championId ? final!.team2.participantId : final!.team1.participantId) : undefined;

      return {
        id: t.id,
        title: t.title,
        slug: t.slug,
        gameId: t.game_id,
        gameName: t.game_name,
        bannerUrl: t.banner_url,
        thumbnailUrl: t.thumbnail_url,
        organizer: {
          name: t.organizer_name || 'CAOZ League',
          avatar: t.organizer_avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop',
          verified: t.organizer_verified,
          followers: t.organizer_followers
        },
        status: t.status,
        format: t.format,
        teamType: t.team_type,
        teamSize: t.team_size,
        region: t.region,
        entryFee: t.entry_fee,
        entryFeeAmount: t.entry_fee_amount,
        prizePool: t.prize_pool,
        prizeDistribution: safeParse(t.prize_distribution, [{ place: '1er Lugar', prize: 'Premio' }]),
        maxParticipants: t.max_participants,
        startDate: t.start_date,
        checkInOpensAt: t.check_in_opens_at,
        checkInClosesAt: t.check_in_closes_at,
        checkInActive: t.check_in_active,
        description: t.description,
        rules: safeParse(t.rules, ['Reglas oficiales del torneo']),
        rulesMode: t.rules_mode || 'custom',
        rulesTemplateVersion: t.rules_template_version,
        schedule: safeParse(t.schedule, [{ stage: 'Fase Principal', time: t.start_date, format: 'BO3' }]),
        participants,
        rounds: winnersRounds,
        championId,
        runnerUpId,
        isFeatured: Boolean(t.is_featured),
        prizeDeliveryStatus: t.prize_delivery_status || 'pending',
        losersRounds: losersRounds.length > 0 ? losersRounds : undefined,
        isHidden: Boolean(t.is_hidden)
      };
    });

    return NextResponse.json({ tournaments }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    console.error('Fetch tournaments API error:', error);
    return NextResponse.json({ error: error.message || 'Error en la base de datos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_TOURNAMENT_REQUEST_BYTES) {
      return NextResponse.json({ error: 'El torneo supera el tamaño permitido. Reduce el banner o el texto.' }, { status: 413 });
    }
    let body;
    try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });

    const creator = await getMatchViewer(request);
    if (creator?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores tienen permiso para crear y publicar torneos.' }, { status: 403 });
    }

    const newId = `trn-${randomUUID()}`;
    const baseSlug = (body.title || 'torneo')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Ensure unique slug
    let slug = baseSlug;
    const existingSlug = await db.query('SELECT id FROM tournaments WHERE slug = $1', [slug]);
    if (existingSlug.rows.length > 0) {
      slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const game = (await getOfficialGames()).find((g) => g.id === body.gameId);
    if (!game || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 255) {
      return NextResponse.json({ error: 'Selecciona un juego válido e ingresa un título de hasta 255 caracteres.' }, { status: 400 });
    }
    const format = body.format || 'single_elimination';
    const isBattleRoyale = format === 'battle_royale';
    const maxP = body.maxParticipants || 8;
    if (!['single_elimination', 'battle_royale'].includes(format)) {
      return NextResponse.json({ error: 'Selecciona un formato de torneo válido.' }, { status: 400 });
    }
    if (isBattleRoyale && game.id !== 'fortnite') {
      return NextResponse.json({ error: 'Battle Royale solo está disponible para torneos de Fortnite.' }, { status: 400 });
    }
    const startDate = normalizeTournamentDate(body.startDate);
    if (!startDate || new Date(startDate).getTime() <= Date.now()) return NextResponse.json({ error: 'Selecciona una fecha y hora de inicio futura válida (hora de Chile).' }, { status: 400 });
    const entryFeeAmount = body.entryFeeAmount ?? 0;
    if (!Number.isInteger(entryFeeAmount) || entryFeeAmount < 0 || entryFeeAmount > 10_000_000) {
      return NextResponse.json({ error: 'Ingresa un precio entero entre 0 y 10.000.000 CLP.' }, { status: 400 });
    }
    if ((!isBattleRoyale && ![8, 16, 32].includes(maxP)) || (isBattleRoyale && maxP !== 100)) {
      return NextResponse.json({ error: isBattleRoyale ? 'Battle Royale debe tener exactamente 100 cupos.' : 'El cupo debe ser de 8, 16 o 32 participantes.' }, { status: 400 });
    }

    const teamType = isBattleRoyale ? 'solo' : (body.teamType ?? (game.defaultTeamSize === 1 ? 'solo' : 'team'));
    const teamSize = isBattleRoyale ? 1 : (body.teamSize ?? (teamType === 'solo' ? 1 : game.id === 'fortnite' ? 2 : game.defaultTeamSize));
    if (!['solo','team'].includes(teamType) || !Number.isInteger(teamSize) || teamSize < 1 || teamSize > 100 || (teamType === 'solo' && teamSize !== 1)) return NextResponse.json({ error: 'Selecciona una modalidad y un tamaño de equipo válidos.' }, { status: 400 });
    let prizeSettings;
    let ruleSettings;
    try {
      prizeSettings = validateTournamentPrizes(body.prizePool, body.prizeDistribution, maxP);
      ruleSettings = resolveTournamentRules({
        gameId: game.id, format, teamType,
        teamSize, maxParticipants: maxP, region: body.region || 'LATAM',
        title: body.title, startDate: body.startDate, entryFeeAmount, ...prizeSettings
      }, body);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    await withDbTransaction(async db => {
    await db.query(`
      INSERT INTO tournaments (
        id, title, slug, game_id, game_name, banner_url, thumbnail_url,
        organizer_id, organizer_name, organizer_avatar, organizer_verified, organizer_followers,
        status, format, team_type, team_size, region, entry_fee, prize_pool, prize_distribution,
        max_participants, start_date, check_in_opens_at, check_in_closes_at, check_in_active,
        description, rules, schedule, entry_fee_amount, rules_mode, rules_template_version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30, $31
      )
    `, [
      newId,
      body.title,
      slug,
      game.id,
      game.name,
      body.bannerUrl || game.bannerImage,
      body.thumbnailUrl || body.bannerUrl || game.coverImage,
      creator.id,
      creator.username,
      getUserAvatar(creator.username),
      false,
      0,
      'registration_open',
      format,
      teamType,
      teamSize,
      body.region || 'LATAM',
      entryFeeAmount > 0 ? `${new Intl.NumberFormat('es-CL').format(entryFeeAmount)} CLP` : 'Gratis',
      prizeSettings.prizePool,
      JSON.stringify(prizeSettings.prizeDistribution),
      maxP,
      startDate,
      new Date(new Date(startDate).getTime() - 45 * 60_000).toISOString(),
      new Date(new Date(startDate).getTime() - 10 * 60_000).toISOString(),
      false,
      body.description || 'Torneo organizado en CZ ARENA.',
      JSON.stringify(ruleSettings.rules),
      JSON.stringify(body.schedule || [{ stage: 'Ronda 1', time: startDate, format: 'BO3' }]),
      entryFeeAmount,
      ruleSettings.rulesMode,
      ruleSettings.rulesTemplateVersion
    ]);

    if (!isBattleRoyale) await createCompetitionBracket(db,newId,maxP,startDate);
    });

    return NextResponse.json({ success: true, slug, tournamentId: newId });
  } catch (error: any) {
    console.error('Create tournament API error:', error);
    return NextResponse.json({ error: error.message || 'Error al crear torneo' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await initDb();
    const db = await getDb();

    // Verify admin
    const authHeader = request.headers.get('authorization');
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      if (payload && payload.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Solo los administradores pueden ocultar o desocultar torneos.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isHidden } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de torneo requerido' }, { status: 400 });
    }

    await db.query(
      'UPDATE tournaments SET is_hidden = $1 WHERE id = $2 OR slug = $2',
      [Boolean(isHidden), id]
    );

    return NextResponse.json({
      success: true,
      message: isHidden ? 'Torneo ocultado y archivado correctamente.' : 'Torneo desocultado y publicado públicamente.',
      isHidden: Boolean(isHidden)
    });
  } catch (error: any) {
    console.error('Patch tournament error:', error);
    return NextResponse.json({ error: error.message || 'Error al modificar torneo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (!viewer || viewer.role !== 'admin') return NextResponse.json({ error: 'Solo los administradores pueden eliminar torneos.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';
    if (!deleteAll && !tournamentId) return NextResponse.json({ error: 'ID de torneo requerido' }, { status: 400 });
    await deleteTournaments(tournamentId || '', deleteAll, viewer.id);
    return NextResponse.json({ success: true, message: deleteAll ? 'Todos los torneos y llaves han sido eliminados correctamente.' : 'Torneo eliminado correctamente.' });
  } catch (error: any) {
    if (error instanceof TournamentDeleteError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Delete tournament error:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar torneo' }, { status: 500 });
  }
}
