import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id: matchId } = await params;
    const body = await request.json();
    const { score1, score2, proofUrl } = body;

    const matchRes = await db.query(
      'SELECT * FROM tournament_matches WHERE id = $1',
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    const currentMatch = matchRes.rows[0];
    const isTeam1Winner = score1 > score2;
    const winnerName = isTeam1Winner ? currentMatch.team1_name : currentMatch.team2_name;
    const winnerParticipantId = isTeam1Winner ? currentMatch.team1_participant_id : currentMatch.team2_participant_id;
    const winnerAvatar = isTeam1Winner ? currentMatch.team1_avatar : currentMatch.team2_avatar;
    const winnerSeed = isTeam1Winner ? currentMatch.team1_seed : currentMatch.team2_seed;

    // Update current match
    await db.query(`
      UPDATE tournament_matches SET
        team1_score = $1,
        team1_is_winner = $2,
        team2_score = $3,
        team2_is_winner = $4,
        status = 'completed',
        winner_id = $5,
        proof_image_url = COALESCE($6, proof_image_url)
      WHERE id = $7
    `, [
      score1,
      isTeam1Winner,
      score2,
      !isTeam1Winner,
      winnerParticipantId || winnerName,
      proofUrl || null,
      matchId
    ]);

    // Insert system match message
    await db.query(`
      INSERT INTO match_messages (id, match_id, sender_name, sender_role, message)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      `msg-${Date.now()}`,
      matchId,
      'Sistema de Torneo',
      'system',
      `Marcador oficial registrado: ${currentMatch.team1_name} (${score1}) vs ${currentMatch.team2_name} (${score2}). Ganador: ${winnerName}`
    ]);

    // Advance winner to the next round in PostgreSQL!
    const nextRoundIndex = currentMatch.round_index + 1;
    const nextMatchIndex = Math.floor(currentMatch.match_index / 2);
    const isSlotTeam1 = currentMatch.match_index % 2 === 0;

    const nextMatchRes = await db.query(`
      SELECT * FROM tournament_matches
      WHERE tournament_id = $1 AND round_index = $2 AND match_index = $3 AND bracket_type = $4
    `, [currentMatch.tournament_id, nextRoundIndex, nextMatchIndex, currentMatch.bracket_type]);

    if (nextMatchRes.rows.length > 0) {
      const nextMatch = nextMatchRes.rows[0];

      if (isSlotTeam1) {
        await db.query(`
          UPDATE tournament_matches SET
            team1_participant_id = $1,
            team1_name = $2,
            team1_avatar = $3,
            team1_seed = $4,
            status = CASE WHEN team2_participant_id IS NOT NULL OR team2_name NOT LIKE 'Ganador%' THEN 'ready' ELSE status END
          WHERE id = $5
        `, [winnerParticipantId, winnerName, winnerAvatar, winnerSeed, nextMatch.id]);
      } else {
        await db.query(`
          UPDATE tournament_matches SET
            team2_participant_id = $1,
            team2_name = $2,
            team2_avatar = $3,
            team2_seed = $4,
            status = CASE WHEN team1_participant_id IS NOT NULL OR team1_name NOT LIKE 'Ganador%' THEN 'ready' ELSE status END
          WHERE id = $5
        `, [winnerParticipantId, winnerName, winnerAvatar, winnerSeed, nextMatch.id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Marcador actualizado y llave avanzada en PostgreSQL'
    });
  } catch (error: any) {
    console.error('Update match score API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
