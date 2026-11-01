import { NextResponse } from 'next/server';
import { getMatchViewer } from '@/lib/matchAccess';
import { initDb, withDbTransaction } from '@/lib/db';
import { CompetitionError, createCompetitionBracket } from '@/lib/tournamentCompetition';
import { getCheckInWindow } from '@/lib/dateUtils';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (viewer?.role !== 'admin') return NextResponse.json({ error: 'Solo un administrador puede sortear las llaves.' }, { status: 403 });
    const { id } = await params;
    const result = await withDbTransaction(async db => {
      const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 OR slug=$1 FOR UPDATE', [id])).rows[0];
      if (!tournament) throw new CompetitionError('Torneo no encontrado.', 404);
      if (tournament.format !== 'single_elimination') throw new CompetitionError('El sorteo está disponible para eliminación simple. Edita el formato para reconstruir un cuadro compatible.', 409);
      const window = getCheckInWindow({ startDate: tournament.start_date,checkInOpensAt: tournament.check_in_opens_at,
        checkInClosesAt: tournament.check_in_closes_at,status: tournament.status,checkInActive: tournament.check_in_active });
      if (tournament.status !== 'check_in' || (!window.hasClosed && tournament.check_in_active)) throw new CompetitionError('Abre y cierra el check-in antes del sorteo.', 409);
      const matches = (await db.query('SELECT * FROM tournament_matches WHERE tournament_id=$1', [tournament.id])).rows;
      if (matches.some(m => m.winner_id || Number(m.team1_score) || Number(m.team2_score) || ['in_progress','completed','disputed'].includes(m.status))) throw new CompetitionError('No se pueden sortear llaves cuando ya hay partidas en curso o resultados.', 409);
      const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id=$1 AND checked_in=true ORDER BY seed', [tournament.id])).rows;
      if (participants.length < 2) throw new CompetitionError('Se necesitan al menos dos participantes con asistencia confirmada.', 409);
      await db.query('DELETE FROM match_messages WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id=$1)', [tournament.id]);
      await db.query('DELETE FROM tournament_matches WHERE tournament_id=$1', [tournament.id]);
      await db.query('DELETE FROM tournament_rounds WHERE tournament_id=$1', [tournament.id]);
      await createCompetitionBracket(db,tournament.id,Number(tournament.max_participants),tournament.start_date,participants,true);
      await db.query("UPDATE tournaments SET status='in_progress',check_in_active=false WHERE id=$1", [tournament.id]);
      return { success: true, message: 'Llaves sorteadas con los participantes confirmados. Torneo en curso.', confirmedParticipants: participants.length };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CompetitionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Draw error:', error);
    return NextResponse.json({ error: 'No se pudieron sortear las llaves.' }, { status: 500 });
  }
}
