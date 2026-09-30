import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { POPULAR_GAMES } from '../../../data/mockData';

function safeParse(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return Array.isArray(fallback) ? [val] : fallback;
  }
}

export async function GET() {
  try {
    await initDb();
    const db = await getDb();

    // 1. Fetch all tournaments
    const trnRes = await db.query('SELECT * FROM tournaments ORDER BY created_at DESC');

    // 2. Fetch all participants
    const partRes = await db.query('SELECT * FROM tournament_participants ORDER BY seed ASC');

    // 3. Fetch all rounds
    const roundRes = await db.query('SELECT * FROM tournament_rounds ORDER BY round_index ASC');

    // 4. Fetch all matches
    const matchRes = await db.query('SELECT * FROM tournament_matches ORDER BY match_index ASC');

    // 5. Fetch all match chat messages
    const msgRes = await db.query('SELECT * FROM match_messages ORDER BY created_at ASC');

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
          avatar: p.avatar,
          seed: p.seed,
          checkedIn: p.checked_in,
          registeredAt: p.registered_at,
          captain: {
            name: p.captain_name,
            discord: p.captain_discord,
            inGameId: p.captain_in_game_id,
            avatar: p.captain_avatar
          },
          roster: safeParse(p.roster, [])
        }));

      const allMatches = matchRes.rows.filter((m) => m.tournament_id === t.id);

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
                  avatar: m.team1_avatar,
                  seed: m.team1_seed,
                  score: m.team1_score,
                  isWinner: m.team1_is_winner
                },
                team2: {
                  participantId: m.team2_participant_id,
                  name: m.team2_name,
                  avatar: m.team2_avatar,
                  seed: m.team2_seed,
                  score: m.team2_score,
                  isWinner: m.team2_is_winner
                },
                status: m.status,
                winnerId: m.winner_id,
                bestOf: m.best_of,
                scheduledTime: m.scheduled_time,
                proofImageUrl: m.proof_image_url,
                disputeReason: m.dispute_reason,
                chatMessages: msgRes.rows
                  .filter((msg) => msg.match_id === m.id)
                  .map((msg) => ({
                    id: msg.id,
                    senderName: msg.sender_name,
                    senderRole: msg.sender_role,
                    message: msg.message,
                    timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isProofImage: msg.is_proof_image
                  }))
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
        prizePool: t.prize_pool,
        prizeDistribution: safeParse(t.prize_distribution, [{ place: '1er Lugar', prize: 'Premio' }]),
        maxParticipants: t.max_participants,
        startDate: t.start_date,
        checkInOpensAt: t.check_in_opens_at,
        checkInClosesAt: t.check_in_closes_at,
        checkInActive: t.check_in_active,
        description: t.description,
        rules: safeParse(t.rules, ['Reglas oficiales del torneo']),
        schedule: safeParse(t.schedule, [{ stage: 'Fase Principal', time: '20:00' }]),
        participants,
        rounds: winnersRounds,
        losersRounds: losersRounds.length > 0 ? losersRounds : undefined,
        isHidden: Boolean(t.is_hidden)
      };
    });

    return NextResponse.json({ tournaments });
  } catch (error: any) {
    console.error('Fetch tournaments API error:', error);
    return NextResponse.json({ error: error.message || 'Error en la base de datos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const body = await request.json();

    const authHeader = request.headers.get('authorization');
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      if (payload && payload.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin && body.organizerId !== 'user-bersek') {
      return NextResponse.json({ error: 'Solo los administradores tienen permiso para crear y publicar torneos.' }, { status: 403 });
    }

    const newId = `trn-${Date.now()}`;
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

    const game = POPULAR_GAMES.find((g) => g.id === body.gameId) || POPULAR_GAMES[0];
    const maxP = body.maxParticipants || 8;

    await db.query(`
      INSERT INTO tournaments (
        id, title, slug, game_id, game_name, banner_url, thumbnail_url,
        organizer_id, organizer_name, organizer_avatar, organizer_verified, organizer_followers,
        status, format, team_type, team_size, region, entry_fee, prize_pool, prize_distribution,
        max_participants, start_date, check_in_opens_at, check_in_closes_at, check_in_active,
        description, rules, schedule
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28
      )
    `, [
      newId,
      body.title,
      slug,
      game.id,
      game.name,
      body.bannerUrl || game.bannerImage,
      body.thumbnailUrl || body.bannerUrl || game.coverImage,
      body.organizerId || 'user-bersek',
      body.organizerName || 'Francisco Bersek',
      body.organizerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      true,
      140,
      'registration_open',
      body.format || 'single_elimination',
      body.teamType || 'team',
      body.teamSize || game.defaultTeamSize,
      body.region || 'LATAM',
      body.entryFee || 'Gratis',
      body.prizePool || '$500 USD',
      JSON.stringify(body.prizeDistribution || [{ place: '1er Lugar', prize: '$350 USD' }, { place: '2do Lugar', prize: '$150 USD' }]),
      maxP,
      body.startDate || 'Próximo Sábado 20:00 GMT-3',
      '45 min antes',
      '10 min antes',
      false,
      body.description || 'Torneo organizado en CAOZ ARENA.',
      JSON.stringify(body.rules || ['Deportividad', 'Subir capturas a la sala de match']),
      JSON.stringify(body.schedule || [{ stage: 'Ronda 1', time: '20:00', format: 'BO3' }])
    ]);

    // Generate bracket rounds and matches in PostgreSQL
    const numRounds = Math.log2(maxP);
    const roundNames = ['Cuartos de Final', 'Semifinales', 'Gran Final'];
    if (numRounds === 4) roundNames.unshift('Octavos de Final');
    if (numRounds === 5) roundNames.unshift('Dieciseisavos de Final');

    for (let r = 0; r < numRounds; r++) {
      const matchCount = maxP / Math.pow(2, r + 1);
      const title = roundNames[roundNames.length - numRounds + r] || `Ronda ${r + 1}`;
      const roundId = `round-${newId}-r${r}`;

      await db.query(`
        INSERT INTO tournament_rounds (id, tournament_id, round_index, title, bracket_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [roundId, newId, r, title, 'winners']);

      for (let m = 0; m < matchCount; m++) {
        const matchId = `match-${newId}-r${r}-m${m}`;
        await db.query(`
          INSERT INTO tournament_matches (
            id, round_id, tournament_id, round_index, round_title, match_index, bracket_type,
            team1_name, team2_name, status, best_of, scheduled_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          matchId, roundId, newId, r, title, m, 'winners',
          r === 0 ? 'Vacío' : `Ganador R${r} M${m * 2 + 1}`,
          r === 0 ? 'Vacío' : `Ganador R${r} M${m * 2 + 2}`,
          r === 0 ? 'ready' : 'pending',
          r === numRounds - 1 ? 5 : 3,
          body.startDate || 'Por definir'
        ]);

        await db.query(`
          INSERT INTO match_messages (id, match_id, sender_name, sender_role, message)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          `msg-${Date.now()}-${r}-${m}`,
          matchId,
          'Sistema de Torneo',
          'system',
          'Matchroom creado. Utiliza este chat para coordinar el lobby y reportar el marcador final.'
        ]);
      }
    }

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
      return NextResponse.json({ error: 'Solo los administradores pueden eliminar torneos.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      await db.query('DELETE FROM match_messages');
      await db.query('DELETE FROM tournament_matches');
      await db.query('DELETE FROM tournament_rounds');
      await db.query('DELETE FROM tournament_participants');
      await db.query('DELETE FROM tournaments');
      return NextResponse.json({ success: true, message: 'Todos los torneos y llaves han sido eliminados correctamente.' });
    }

    if (!tournamentId) {
      return NextResponse.json({ error: 'ID de torneo requerido' }, { status: 400 });
    }

    await db.query('DELETE FROM match_messages WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id = $1)', [tournamentId]);
    await db.query('DELETE FROM tournament_matches WHERE tournament_id = $1', [tournamentId]);
    await db.query('DELETE FROM tournament_rounds WHERE tournament_id = $1', [tournamentId]);
    await db.query('DELETE FROM tournament_participants WHERE tournament_id = $1', [tournamentId]);
    await db.query('DELETE FROM tournaments WHERE id = $1', [tournamentId]);

    return NextResponse.json({ success: true, message: 'Torneo eliminado con éxito.' });
  } catch (error: any) {
    console.error('Delete tournament error:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar torneo' }, { status: 500 });
  }
}
