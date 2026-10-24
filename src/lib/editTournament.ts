import { randomInt, randomUUID } from 'crypto';
import type { DbSession } from './db';
import type { Tournament } from '@/types/tournament';
import { POPULAR_GAMES } from '@/data/mockData';
import { resolveTournamentRules } from './tournamentRules';

export class TournamentEditError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function editTournament(db: DbSession, id: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TournamentEditError('Datos del torneo inválidos.');
  const data = input as Tournament & { rebuildBracket?: boolean };
  const current = (await db.query('SELECT * FROM tournaments WHERE id=$1 OR slug=$1 FOR UPDATE', [id])).rows[0];
  if (!current) throw new TournamentEditError('Torneo no encontrado.', 404);
  const text = (value: unknown, name: string, max: number, required = false) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new TournamentEditError(`${name}: ingresa un texto válido de hasta ${max} caracteres.`);
    return value.trim();
  };
  const image = (value: unknown, name: string) => {
    const url = text(value, name, 700_000);
    if (url && !/^https?:\/\//i.test(url) && !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(url) && !/^\/(?!\/)/.test(url)) throw new TournamentEditError(`${name}: utiliza una imagen o una URL válida.`);
    return url;
  };
  const game = POPULAR_GAMES.find(g => g.id === data.gameId);
  if (!game) throw new TournamentEditError('Selecciona un juego válido.');
  if (!['single_elimination','double_elimination','round_robin','swiss'].includes(data.format)) throw new TournamentEditError('Formato inválido.');
  if (!['registration_open','check_in','in_progress','completed'].includes(data.status)) throw new TournamentEditError('Estado inválido.');
  if (!['LATAM','NA','EU','GLOBAL'].includes(data.region)) throw new TournamentEditError('Región inválida.');
  if (!['solo','team'].includes(data.teamType) || !Number.isInteger(data.teamSize) || data.teamSize < 1 || data.teamSize > 100 || (data.teamType === 'solo' && data.teamSize !== 1)) throw new TournamentEditError('Modalidad o tamaño de equipo inválido.');
  if (![8,16,32].includes(data.maxParticipants)) throw new TournamentEditError('El cupo debe ser 8, 16 o 32.');
  if (!Number.isInteger(data.entryFeeAmount) || data.entryFeeAmount! < 0 || data.entryFeeAmount! > 10_000_000) throw new TournamentEditError('El costo debe estar entre 0 y 10.000.000 CLP.');
  if (typeof data.checkInActive !== 'boolean' || typeof data.isHidden !== 'boolean') throw new TournamentEditError('Visibilidad o check-in inválidos.');
  let ruleSettings;
  try {
    ruleSettings = resolveTournamentRules(data, { rulesMode: data.rulesMode ?? current.rules_mode ?? 'custom', rules: data.rules });
  } catch (error) { throw new TournamentEditError((error as Error).message); }
  if (!Array.isArray(data.prizeDistribution) || data.prizeDistribution.length > 100) throw new TournamentEditError('Distribución de premios inválida.');
  const prizes = data.prizeDistribution.map(row => ({ place: text(row?.place, 'Puesto', 100, true), prize: text(row?.prize, 'Premio', 200, true) }));
  if (!Array.isArray(data.schedule) || data.schedule.length > 100) throw new TournamentEditError('Cronograma inválido.');
  const schedule = data.schedule.map(row => ({ stage: text(row?.stage, 'Etapa', 150, true), time: text(row?.time, 'Horario', 100, true), format: text(row?.format, 'Formato de serie', 100) }));
  if (!data.organizer || typeof data.organizer.verified !== 'boolean' || !Number.isInteger(data.organizer.followers) || data.organizer.followers < 0 || data.organizer.followers > 2147483647) throw new TournamentEditError('Organizador inválido.');
  const columns: Record<string, unknown> = {
    title: text(data.title, 'Título', 255, true), game_id: game.id, game_name: game.name,
    banner_url: image(data.bannerUrl, 'Banner'), thumbnail_url: image(data.thumbnailUrl, 'Miniatura'),
    organizer_name: text(data.organizer.name, 'Organizador', 150, true), organizer_avatar: image(data.organizer.avatar, 'Avatar'),
    organizer_verified: data.organizer.verified, organizer_followers: data.organizer.followers,
    status: data.status, format: data.format, team_type: data.teamType, team_size: data.teamSize, region: data.region,
    entry_fee_amount: data.entryFeeAmount, entry_fee: data.entryFeeAmount ? `${new Intl.NumberFormat('es-CL').format(data.entryFeeAmount)} CLP` : 'Gratis',
    prize_pool: text(data.prizePool, 'Premio total', 100), prize_distribution: JSON.stringify(prizes), max_participants: data.maxParticipants,
    start_date: text(data.startDate, 'Fecha de inicio', 100, true), check_in_opens_at: text(data.checkInOpensAt, 'Apertura de check-in', 100),
    check_in_closes_at: text(data.checkInClosesAt, 'Cierre de check-in', 100), check_in_active: data.checkInActive,
    description: text(data.description, 'Descripción', 50000), rules: JSON.stringify(ruleSettings.rules),
    rules_mode: ruleSettings.rulesMode, rules_template_version: ruleSettings.rulesTemplateVersion,
    schedule: JSON.stringify(schedule), is_hidden: data.isHidden
  };
  const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id=$1 ORDER BY seed', [current.id])).rows;
  const payments = (await db.query("SELECT * FROM tournament_payments WHERE tournament_id=$1 AND status IN ('creating','pending','review')", [current.id])).rows;
  const reserved = payments.filter(p => p.status === 'review' || new Date(p.expires_at).getTime() > Date.now());
  if (participants.length + reserved.length > data.maxParticipants) throw new TournamentEditError('El cupo no puede ser menor al total de inscritos y reservas de pago.', 409);
  const structural = ['game_id','format','team_type','team_size','max_participants'].some(key => columns[key] !== current[key]);
  if (structural && data.rebuildBracket !== true) throw new TournamentEditError('Confirma la reconstrucción de las llaves para cambiar la estructura.', 409);
  if (structural && payments.length) throw new TournamentEditError('Resuelve los pagos pendientes o en revisión antes de cambiar la estructura del torneo.', 409);
  const keys = Object.keys(columns);
  await db.query(`UPDATE tournaments SET ${keys.map((key,i) => `${key}=$${i+1}`).join(',')} WHERE id=$${keys.length+1}`, [...Object.values(columns), current.id]);
  if (!structural && data.startDate !== current.start_date) {
    await db.query('UPDATE tournament_matches SET scheduled_time=$1 WHERE tournament_id=$2 AND scheduled_time=$3', [data.startDate, current.id, current.start_date]);
  }
  if (structural) {
    await db.query('DELETE FROM match_messages WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id=$1)', [current.id]);
    await db.query('DELETE FROM tournament_matches WHERE tournament_id=$1', [current.id]);
    await db.query('DELETE FROM tournament_rounds WHERE tournament_id=$1', [current.id]);
    const slots = Array.from({ length: data.maxParticipants }, (_, i) => i + 1);
    for (let i = slots.length - 1; i > 0; i--) { const j = randomInt(i+1); [slots[i],slots[j]] = [slots[j],slots[i]]; }
    for (const [index, participant] of participants.entries()) {
      participant.seed = slots[index];
      await db.query('UPDATE tournament_participants SET seed=$1 WHERE id=$2', [participant.seed, participant.id]);
    }
    const numRounds = Math.log2(data.maxParticipants);
    const names = ['Dieciseisavos de Final','Octavos de Final','Cuartos de Final','Semifinales','Gran Final'].slice(-numRounds);
    for (let r = 0; r < numRounds; r++) {
      const roundId = `round-${randomUUID()}`;
      await db.query("INSERT INTO tournament_rounds(id,tournament_id,round_index,title,bracket_type) VALUES ($1,$2,$3,$4,'winners')", [roundId,current.id,r,names[r]]);
      for (let m = 0; m < data.maxParticipants / 2 ** (r+1); m++) {
        const p1 = r === 0 ? participants.find(p => p.seed === m*2+1) : undefined;
        const p2 = r === 0 ? participants.find(p => p.seed === m*2+2) : undefined;
        await db.query(`INSERT INTO tournament_matches(id,round_id,tournament_id,round_index,round_title,match_index,bracket_type,
          team1_name,team2_name,team1_participant_id,team2_participant_id,team1_avatar,team2_avatar,team1_seed,team2_seed,status,best_of,scheduled_time)
          VALUES ($1,$2,$3,$4,$5,$6,'winners',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [`match-${randomUUID()}`,roundId,current.id,r,names[r],m,p1?.name || (r ? `Ganador R${r} M${m*2+1}` : 'Vacío'),p2?.name || (r ? `Ganador R${r} M${m*2+2}` : 'Vacío'),
          p1?.id || null,p2?.id || null,p1?.avatar || null,p2?.avatar || null,p1?.seed || null,p2?.seed || null,p1 && p2 ? 'ready' : 'pending',r === numRounds-1 ? 5 : 3,data.startDate]);
      }
    }
  }
  return { success: true, slug: current.slug, tournamentId: current.id };
}
