import { randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { initDb, withDbTransaction } from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || verifyToken(token)?.role !== 'admin') return NextResponse.json({ error: 'Solo un administrador puede sortear las llaves.' }, { status: 403 });
  await initDb();
  const { id } = await params;
  try {
    await withDbTransaction(async db => {
      const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!tournament) throw new Error('Torneo no encontrado.');
      const matches = (await db.query('SELECT * FROM tournament_matches WHERE tournament_id=$1', [id])).rows;
      if (matches.some(m => m.winner_id || Number(m.team1_score) || Number(m.team2_score) || ['in_progress', 'completed', 'disputed'].includes(m.status))) throw new Error('No se pueden sortear llaves cuando ya hay partidas en curso o resultados.');
      const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id=$1', [id])).rows;
      if (!participants.length) throw new Error('Todavía no hay participantes inscritos.');
      const slots = Array.from({ length: Number(tournament.max_participants) }, (_, i) => i + 1);
      for (let i = slots.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      await db.query(`UPDATE tournament_matches SET team1_participant_id=NULL,team2_participant_id=NULL,
        team1_name='Vacío',team2_name='Vacío',team1_avatar=NULL,team2_avatar=NULL,
        team1_seed=NULL,team2_seed=NULL,status='pending'
        WHERE tournament_id=$1 AND round_index=0 AND bracket_type='winners'`, [id]);
      for (const [index, participant] of participants.entries()) {
        const seed = slots[index], side = seed % 2 ? 'team1' : 'team2';
        await db.query('UPDATE tournament_participants SET seed=$1 WHERE id=$2', [seed, participant.id]);
        await db.query(`UPDATE tournament_matches SET ${side}_participant_id=$1,${side}_name=$2,${side}_avatar=$3,${side}_seed=$4
          WHERE tournament_id=$5 AND round_index=0 AND match_index=$6 AND bracket_type='winners'`, [participant.id,participant.name,participant.avatar,seed,id,Math.floor((seed-1)/2)]);
      }
      await db.query(`UPDATE tournament_matches SET status='ready' WHERE tournament_id=$1 AND round_index=0 AND bracket_type='winners' AND team1_participant_id IS NOT NULL AND team2_participant_id IS NOT NULL`, [id]);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
