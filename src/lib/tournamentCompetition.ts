import { randomInt, randomUUID } from 'crypto';
import type { DbSession } from './db';

export class CompetitionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function validateSeriesScore(bestOf: number, score1: unknown, score2: unknown) {
  if (![1, 3, 5].includes(bestOf)) throw new CompetitionError('La serie debe ser BO1, BO3 o BO5.');
  const wins = Math.floor(bestOf / 2) + 1;
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || Number(score1) < 0 || Number(score2) < 0 ||
      Math.max(Number(score1), Number(score2)) !== wins || Math.min(Number(score1), Number(score2)) >= wins) {
    throw new CompetitionError(`En BO${bestOf} el ganador necesita ${wins} victorias y el rival debe tener entre 0 y ${wins - 1}.`);
  }
  return Number(score1) > Number(score2);
}

interface BracketParticipant { id: string; name: string; avatar?: string; seed: number; }

// Standard seed order distributes missing entrants across the first round.
export function bracketSeedOrder(size: number): number[] {
  if (!Number.isInteger(size) || size < 2 || size > 32 || (size & (size - 1))) throw new CompetitionError('El cuadro requiere entre 2 y 32 plazas y una potencia de dos.');
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap(seed => [seed, sum - seed]);
  }
  return order;
}

export async function createCompetitionBracket(db: DbSession, tournamentId: string, capacity: number, startDate: string,
  participants: BracketParticipant[] = [], activate = false) {
  const size = activate ? 2 ** Math.ceil(Math.log2(Math.max(2, participants.length))) : capacity;
  if (size > capacity) throw new CompetitionError('Los participantes superan el cupo del torneo.');
  const order = bracketSeedOrder(size);
  const entrants = [...participants];
  if (activate) {
    for (let i = entrants.length - 1; i > 0; i--) {
      const j = randomInt(i + 1); [entrants[i], entrants[j]] = [entrants[j], entrants[i]];
    }
    for (const [rank, entrant] of entrants.entries()) {
      entrant.seed = order.indexOf(rank + 1) + 1;
      await db.query('UPDATE tournament_participants SET seed=$1 WHERE id=$2', [entrant.seed, entrant.id]);
    }
  }
  const numRounds = Math.log2(size);
  const names = ['Dieciseisavos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Gran Final'].slice(-numRounds);
  let previous: Array<{ winner?: BracketParticipant; settled: boolean }> = [];
  for (let r = 0; r < numRounds; r++) {
    const roundId = `round-${randomUUID()}`;
    await db.query("INSERT INTO tournament_rounds(id,tournament_id,round_index,title,bracket_type) VALUES ($1,$2,$3,$4,'winners')", [roundId,tournamentId,r,names[r]]);
    const current: typeof previous = [];
    for (let m = 0; m < size / 2 ** (r + 1); m++) {
      const p1 = r === 0 ? entrants.find(p => p.seed === m * 2 + 1) : previous[m * 2]?.winner;
      const p2 = r === 0 ? entrants.find(p => p.seed === m * 2 + 2) : previous[m * 2 + 1]?.winner;
      const settled = r === 0 || (previous[m * 2]?.settled && previous[m * 2 + 1]?.settled);
      const bye = activate && settled && Boolean(p1) !== Boolean(p2);
      const winner = bye ? p1 || p2 : undefined;
      const matchId = `match-${randomUUID()}`;
      await db.query(`INSERT INTO tournament_matches(id,round_id,tournament_id,round_index,round_title,match_index,bracket_type,
        team1_name,team2_name,team1_participant_id,team2_participant_id,team1_avatar,team2_avatar,team1_seed,team2_seed,status,best_of,scheduled_time,
        winner_id,team1_is_winner,team2_is_winner)
        VALUES ($1,$2,$3,$4,$5,$6,'winners',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [matchId,roundId,tournamentId,r,names[r],m,
        p1?.name || (r ? `Ganador R${r} M${m*2+1}` : activate ? 'Pase libre' : 'Vacío'),
        p2?.name || (r ? `Ganador R${r} M${m*2+2}` : activate ? 'Pase libre' : 'Vacío'),
        p1?.id || null,p2?.id || null,p1?.avatar || null,p2?.avatar || null,p1?.seed || null,p2?.seed || null,
        bye ? 'completed' : p1 && p2 ? 'ready' : 'pending',r === numRounds - 1 ? 5 : 3,startDate,winner?.id || null,Boolean(bye && p1),Boolean(bye && p2)]);
      if (bye) await db.query(`INSERT INTO match_messages(id,match_id,sender_name,sender_role,message)
        VALUES ($1,$2,'Sistema de Torneo','system',$3)`, [`msg-${randomUUID()}`,matchId,`${winner!.name} avanza por pase libre.`]);
      current.push({ winner, settled: Boolean(bye || (settled && !p1 && !p2)) });
    }
    previous = current;
  }
}

export async function recordCompetitionScore(db: DbSession, matchId: string, score1: unknown, score2: unknown,
  proofUrl?: unknown, actor = 'Staff CAOZ') {
  const tournament = (await db.query(`SELECT * FROM tournaments WHERE id=(SELECT tournament_id FROM tournament_matches WHERE id=$1) FOR UPDATE`, [matchId])).rows[0];
  if (!tournament) throw new CompetitionError('Partida no encontrada.', 404);
  if (tournament.format !== 'single_elimination') throw new CompetitionError('Este formato requiere migrar el cuadro a eliminación simple antes de registrar resultados.', 409);
  if (!['in_progress', 'completed'].includes(tournament.status)) throw new CompetitionError('Primero cierra el check-in y realiza el sorteo para iniciar la competición.', 409);
  const match = (await db.query('SELECT * FROM tournament_matches WHERE id=$1 FOR UPDATE', [matchId])).rows[0];
  if (!match.team1_participant_id || !match.team2_participant_id) throw new CompetitionError('Esta partida aún no tiene dos participantes. Los pases libres se resuelven en el sorteo.', 409);
  const team1Wins = validateSeriesScore(Number(match.best_of), score1, score2);
  if (proofUrl != null && (typeof proofUrl !== 'string' || proofUrl.length > 2_800_000 || !/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(proofUrl))) throw new CompetitionError('La prueba debe ser una imagen válida o un enlace HTTPS.');
  const side = team1Wins ? 'team1' : 'team2';
  const winnerId = match[`${side}_participant_id`];
  const next = (await db.query(`SELECT * FROM tournament_matches WHERE tournament_id=$1 AND round_index=$2 AND match_index=$3 AND bracket_type='winners'`,
    [match.tournament_id,Number(match.round_index)+1,Math.floor(Number(match.match_index)/2)])).rows[0];
  if (!next && match.winner_id && match.winner_id !== winnerId && tournament.prize_delivery_status === 'delivered') {
    throw new CompetitionError('Los premios ya fueron entregados. Resuelve la entrega con el staff antes de cambiar al campeón.',409);
  }
  if (match.winner_id && match.winner_id !== winnerId && next) {
    // A correction cannot invalidate a match that already has activity or a result.
    let descendant = next;
    while (descendant) {
      if (['in_progress','completed','disputed'].includes(descendant.status) || descendant.winner_id || Number(descendant.team1_score) || Number(descendant.team2_score)) {
        throw new CompetitionError('No se puede cambiar el ganador: una ronda posterior ya comenzó o tiene resultados. Resuelve esa ronda antes de corregir.', 409);
      }
      descendant = (await db.query(`SELECT * FROM tournament_matches WHERE tournament_id=$1 AND round_index=$2 AND match_index=$3 AND bracket_type='winners'`,
        [match.tournament_id,Number(descendant.round_index)+1,Math.floor(Number(descendant.match_index)/2)])).rows[0];
    }
  }
  await db.query(`UPDATE tournament_matches SET team1_score=$1,team2_score=$2,team1_is_winner=$3,team2_is_winner=$4,
    winner_id=$5,status='completed',proof_image_url=COALESCE($6,proof_image_url),dispute_reason=NULL WHERE id=$7`,
    [score1,score2,team1Wins,!team1Wins,winnerId,proofUrl || null,matchId]);
  await db.query(`INSERT INTO match_messages(id,match_id,sender_name,sender_role,message) VALUES ($1,$2,$3,'system',$4)`,
    [`msg-${randomUUID()}`,matchId,actor,`${match.winner_id ? 'Marcador corregido' : 'Marcador oficial'}: ${match.team1_name} (${score1}) vs ${match.team2_name} (${score2}). Ganador: ${match[`${side}_name`]}.`]);
  if (next && (!match.winner_id || match.winner_id !== winnerId)) {
    const slot = Number(match.match_index) % 2 === 0 ? 'team1' : 'team2';
    const other = slot === 'team1' ? 'team2' : 'team1';
    await db.query(`UPDATE tournament_matches SET ${slot}_participant_id=$1,${slot}_name=$2,${slot}_avatar=$3,${slot}_seed=$4,
      status=CASE WHEN ${other}_participant_id IS NOT NULL THEN 'ready' ELSE 'pending' END WHERE id=$5`,
      [winnerId,match[`${side}_name`],match[`${side}_avatar`],match[`${side}_seed`],next.id]);
  } else if (!next) {
    await db.query("UPDATE tournaments SET status='completed',check_in_active=false WHERE id=$1", [match.tournament_id]);
  }
  return { success: true, message: next ? 'Marcador guardado y ganador clasificado.' : 'Final confirmada. ¡Torneo finalizado!', championId: next ? undefined : winnerId };
}
