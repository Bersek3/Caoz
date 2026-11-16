import type { DbSession } from './db';
import type { Tournament } from '@/types/tournament';
import { POPULAR_GAMES } from '@/data/mockData';
import { resolveTournamentRules } from './tournamentRules';
import { validateTournamentPrizes } from './tournamentPrizes';
import { formatChileanPesos, splitChileanPesos } from './currency';
import { createCompetitionBracket } from './tournamentCompetition';
import { getCheckInWindow, normalizeTournamentDate, parseTournamentDate } from './dateUtils';

export class TournamentEditError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function editTournament(db: DbSession, id: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TournamentEditError('Datos del torneo inválidos.');
  const data = input as Tournament & { rebuildBracket?: boolean; isFeatured?: boolean; prizeDeliveryStatus?: string; battleRoyaleRounds?: number };
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
  const catalogExists = (await db.query("SELECT to_regclass('official_game_catalog') AS catalog")).rows[0]?.catalog;
  const officialGames = catalogExists ? (await db.query('SELECT games FROM official_game_catalog WHERE id=1')).rows[0]?.games || POPULAR_GAMES : POPULAR_GAMES;
  const game = officialGames.find((g: { id: string }) => g.id === data.gameId);
  if (!game) throw new TournamentEditError('Selecciona un juego válido.');
  if (!['single_elimination','battle_royale'].includes(data.format)) throw new TournamentEditError('Selecciona un formato válido.');
  const isBattleRoyale = data.format === 'battle_royale';
  const battleRoyaleRounds = isBattleRoyale ? Number(data.battleRoyaleRounds ?? data.schedule?.length ?? data.prizeDistribution?.length ?? 1) : 1;
  if (isBattleRoyale && game.id !== 'fortnite') throw new TournamentEditError('Battle Royale solo está disponible para Fortnite.');
  if (isBattleRoyale && (!Number.isInteger(battleRoyaleRounds) || battleRoyaleRounds < 1 || battleRoyaleRounds > 10)) throw new TournamentEditError('Battle Royale admite entre 1 y 10 rondas.');
  if (!['registration_open','check_in','in_progress','completed'].includes(data.status)) throw new TournamentEditError('Estado inválido.');
  if (!['LATAM','NA','EU','GLOBAL'].includes(data.region)) throw new TournamentEditError('Región inválida.');
  if (!['solo','team'].includes(data.teamType) || !Number.isInteger(data.teamSize) || data.teamSize < 1 || data.teamSize > 100 || (data.teamType === 'solo' && data.teamSize !== 1)) throw new TournamentEditError('Modalidad o tamaño de equipo inválido.');
  if ((isBattleRoyale && (data.teamType !== 'solo' || data.teamSize !== 1 || data.maxParticipants !== 100)) || (!isBattleRoyale && ![8,16,32].includes(data.maxParticipants))) throw new TournamentEditError(isBattleRoyale ? 'Battle Royale requiere 100 jugadores individuales.' : 'El cupo debe ser 8, 16 o 32.');
  if (!Number.isInteger(data.entryFeeAmount) || data.entryFeeAmount! < 0 || data.entryFeeAmount! > 10_000_000) throw new TournamentEditError('El costo debe estar entre 0 y 10.000.000 CLP.');
  if (typeof data.checkInActive !== 'boolean' || typeof data.isHidden !== 'boolean') throw new TournamentEditError('Visibilidad o check-in inválidos.');
  if (data.isFeatured !== undefined && typeof data.isFeatured !== 'boolean') throw new TournamentEditError('Estado de destacado inválido.');
  if (data.prizeDeliveryStatus !== undefined && !['pending','processing','delivered'].includes(data.prizeDeliveryStatus)) throw new TournamentEditError('Estado de entrega de premios inválido.');
  if (data.prizeDeliveryStatus && data.prizeDeliveryStatus !== (current.prize_delivery_status || 'pending') && current.status !== 'completed') throw new TournamentEditError('Confirma la final antes de gestionar la entrega de premios.',409);
  const startDate = normalizeTournamentDate(data.startDate);
  if (!startDate) throw new TournamentEditError('Ingresa una fecha y hora de inicio válida (hora de Chile).');
  const oldStart = parseTournamentDate(current.start_date);
  const delta = oldStart ? new Date(startDate).getTime() - oldStart.getTime() : 0;
  const shiftUnchangedInstant = (submitted: string, saved: string) => {
    const instant = parseTournamentDate(submitted);
    return delta && submitted === saved && instant ? new Date(instant.getTime()+delta).toISOString() : submitted;
  };
  const checkInWindow = getCheckInWindow({ ...data,startDate,
    checkInOpensAt: shiftUnchangedInstant(data.checkInOpensAt,current.check_in_opens_at),
    checkInClosesAt: shiftUnchangedInstant(data.checkInClosesAt,current.check_in_closes_at) });
  if (!checkInWindow.opensAt || !checkInWindow.closesAt || checkInWindow.opensAt >= checkInWindow.closesAt || checkInWindow.closesAt > new Date(startDate)) throw new TournamentEditError('El check-in debe abrir antes de cerrar y finalizar a más tardar al inicio del torneo.');
  let ruleSettings;
  try {
    ruleSettings = resolveTournamentRules({ ...data, battleRoyaleRounds }, { rulesMode: data.rulesMode ?? current.rules_mode ?? 'custom', rules: data.rules });
  } catch (error) { throw new TournamentEditError((error as Error).message); }
  if (!Array.isArray(data.prizeDistribution) || data.prizeDistribution.length > 100) throw new TournamentEditError('Distribución de premios inválida.');
  let prizeSettings;
  const battleRoyalePrizeDistribution = isBattleRoyale ? Array.from({ length: battleRoyaleRounds }, (_, index) => ({ place: `Ronda ${index + 1}`, prize: splitChileanPesos(formatChileanPesos(data.prizePool), battleRoyaleRounds) || `1/${battleRoyaleRounds} del premio total (${formatChileanPesos(data.prizePool)})` })) : data.prizeDistribution;
  try { prizeSettings = validateTournamentPrizes(data.prizePool,battleRoyalePrizeDistribution,data.maxParticipants); }
  catch (error) { throw new TournamentEditError((error as Error).message); }
  const prizes = prizeSettings.prizeDistribution;
  if (!Array.isArray(data.schedule) || data.schedule.length > 100) throw new TournamentEditError('Cronograma inválido.');
  const schedule = isBattleRoyale ? Array.from({ length: battleRoyaleRounds }, (_, index) => ({ stage: `Ronda Battle Royale ${index + 1}`, time: index === 0 ? startDate : data.schedule?.[index]?.time || 'Por confirmar', format: '100 jugadores · 1 ganador' })) : data.schedule.map(row => ({ stage: text(row?.stage, 'Etapa', 150, true), time: typeof row?.time === 'string' && row.time.trim() ? text(row.time, 'Horario', 100, true) : 'Por confirmar', format: text(row?.format ?? '', 'Formato de serie', 100) }));
  if (!data.organizer || typeof data.organizer.verified !== 'boolean' || !Number.isInteger(data.organizer.followers) || data.organizer.followers < 0 || data.organizer.followers > 2147483647) throw new TournamentEditError('Organizador inválido.');
  const columns: Record<string, unknown> = {
    title: text(data.title, 'Título', 255, true), game_id: game.id, game_name: game.name,
    banner_url: image(data.bannerUrl, 'Banner'), thumbnail_url: image(data.thumbnailUrl, 'Miniatura'),
    organizer_name: text(data.organizer.name, 'Organizador', 150, true), organizer_avatar: image(data.organizer.avatar, 'Avatar'),
    organizer_verified: data.organizer.verified, organizer_followers: data.organizer.followers,
    status: data.status, format: data.format, team_type: data.teamType, team_size: data.teamSize, region: data.region,
    entry_fee_amount: data.entryFeeAmount, entry_fee: data.entryFeeAmount ? formatChileanPesos(String(data.entryFeeAmount)) : 'Gratis',
    prize_pool: prizeSettings.prizePool, prize_distribution: JSON.stringify(prizes), max_participants: data.maxParticipants,
    start_date: startDate, check_in_opens_at: checkInWindow.opensAt.toISOString(),
    check_in_closes_at: checkInWindow.closesAt.toISOString(), check_in_active: data.checkInActive,
    description: text(data.description, 'Descripción', 50000), rules: JSON.stringify(ruleSettings.rules),
    rules_mode: ruleSettings.rulesMode, rules_template_version: ruleSettings.rulesTemplateVersion,
    schedule: JSON.stringify(schedule), is_hidden: data.isHidden
  };
  if (data.isFeatured !== undefined) columns.is_featured = data.isFeatured;
  if (data.prizeDeliveryStatus !== undefined) columns.prize_delivery_status = data.prizeDeliveryStatus;
  const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id=$1 ORDER BY seed', [current.id])).rows;
  const payments = (await db.query("SELECT * FROM tournament_payments WHERE tournament_id=$1 AND status IN ('creating','pending','review')", [current.id])).rows;
  const reserved = payments.filter(p => p.status === 'review' || new Date(p.expires_at).getTime() > Date.now());
  if (participants.length + reserved.length > data.maxParticipants) throw new TournamentEditError('El cupo no puede ser menor al total de inscritos y reservas de pago.', 409);
  const structural = ['game_id','format','team_type','team_size','max_participants'].some(key => columns[key] !== current[key]);
  if (structural && current.prize_delivery_status === 'delivered') throw new TournamentEditError('Los premios ya fueron entregados. No se pueden reconstruir ni borrar los resultados de esta competición.',409);
  if (structural && data.rebuildBracket !== true) throw new TournamentEditError('Confirma la reconstrucción de las llaves para cambiar la estructura.', 409);
  if (structural && payments.length) throw new TournamentEditError('Resuelve los pagos pendientes o en revisión antes de cambiar la estructura del torneo.', 409);
  if (!structural && (data.status !== current.status || data.checkInActive !== current.check_in_active)) throw new TournamentEditError('Utiliza los controles de check-in y sorteo para avanzar el torneo. La final confirmada cierra la competición.', 409);
  if (structural) { columns.status = 'registration_open'; columns.check_in_active = false; columns.prize_delivery_status = 'pending'; }
  if (data.isFeatured) await db.query('UPDATE tournaments SET is_featured=false WHERE id<>$1', [current.id]);
  const keys = Object.keys(columns);
  await db.query(`UPDATE tournaments SET ${keys.map((key,i) => `${key}=$${i+1}`).join(',')} WHERE id=$${keys.length+1}`, [...Object.values(columns), current.id]);
  if (!structural && startDate !== current.start_date) {
    await db.query('UPDATE tournament_matches SET scheduled_time=$1 WHERE tournament_id=$2 AND scheduled_time=$3', [startDate, current.id, current.start_date]);
  }
  if (structural) {
    await db.query('DELETE FROM match_messages WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id=$1)', [current.id]);
    await db.query('DELETE FROM tournament_matches WHERE tournament_id=$1', [current.id]);
    await db.query('DELETE FROM tournament_rounds WHERE tournament_id=$1', [current.id]);
    await db.query('UPDATE tournament_participants SET checked_in=false WHERE tournament_id=$1', [current.id]);
    for (const [index, participant] of participants.entries()) {
      participant.seed = index + 1;
      await db.query('UPDATE tournament_participants SET seed=$1 WHERE id=$2', [participant.seed, participant.id]);
    }
    if (!isBattleRoyale) await createCompetitionBracket(db,current.id,data.maxParticipants,startDate,participants);
  }
  return { success: true, slug: current.slug, tournamentId: current.id };
}
