import { randomUUID } from 'crypto';
import type { DbSession } from './db';

export class WaitlistError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function ownsWaitlistEntry(entry: {user_id:string;team_id:string|null},userId:string,teamId:string|null) {
  return teamId ? entry.team_id === teamId : !entry.team_id && entry.user_id === userId;
}

/** Caller locks the tournament row, serializing vacancies with registrations/payments. */
export async function advanceWaitlist(db: DbSession, tournament: {id:string;status:string;max_participants:number}) {
  if (tournament.status !== 'registration_open') return;
  await db.query(`DELETE FROM tournament_waitlist w WHERE w.tournament_id=$1 AND EXISTS (
    SELECT 1 FROM tournament_participants p WHERE p.tournament_id=w.tournament_id
    AND (p.user_id=w.user_id OR (w.team_id IS NOT NULL AND p.team_id=w.team_id)))`, [tournament.id]);
  // A checkout already reserves its seat; its owner must not also hold a queue offer.
  await db.query(`DELETE FROM tournament_waitlist w WHERE w.tournament_id=$1 AND EXISTS (
    SELECT 1 FROM tournament_payments p WHERE p.tournament_id=w.tournament_id
    AND p.status IN ('creating','pending','review') AND p.expires_at>CURRENT_TIMESTAMP
    AND (p.user_id=w.user_id OR (w.team_id IS NOT NULL AND p.registration_key=w.team_id)))`, [tournament.id]);
  await db.query("UPDATE tournament_waitlist SET status='expired' WHERE tournament_id=$1 AND status='offered' AND offer_expires_at<=CURRENT_TIMESTAMP", [tournament.id]);
  const counts = (await db.query(`SELECT
    (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id=$1) AS participants,
    (SELECT COUNT(*) FROM tournament_payments WHERE tournament_id=$1 AND status IN ('creating','pending','review') AND expires_at>CURRENT_TIMESTAMP) AS reservations,
    (SELECT COUNT(*) FROM tournament_waitlist WHERE tournament_id=$1 AND status='offered' AND offer_expires_at>CURRENT_TIMESTAMP) AS offers`, [tournament.id])).rows[0];
  const vacancies = Math.max(0,Number(tournament.max_participants)-Number(counts.participants)-Number(counts.reservations)-Number(counts.offers));
  if (vacancies) await db.query(`UPDATE tournament_waitlist SET status='offered',offer_expires_at=CURRENT_TIMESTAMP+INTERVAL '15 minutes'
    WHERE id IN (SELECT id FROM tournament_waitlist WHERE tournament_id=$1 AND status='waiting' ORDER BY created_at,id LIMIT $2)`, [tournament.id,vacancies]);
}

export async function assertWaitlistTurn(db: DbSession, tournament: {id:string;status:string;max_participants:number}, userId: string, teamId: string | null) {
  await advanceWaitlist(db,tournament);
  const offers = (await db.query("SELECT user_id,team_id FROM tournament_waitlist WHERE tournament_id=$1 AND status='offered' AND offer_expires_at>CURRENT_TIMESTAMP",[tournament.id])).rows;
  if (!offers.length || offers.some(row=>ownsWaitlistEntry(row,userId,teamId))) return;
  const counts = (await db.query(`SELECT
    (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id=$1) AS participants,
    (SELECT COUNT(*) FROM tournament_payments WHERE tournament_id=$1 AND status IN ('creating','pending','review') AND expires_at>CURRENT_TIMESTAMP) AS reservations`,[tournament.id])).rows[0];
  if (Number(counts.participants)+Number(counts.reservations)+offers.length >= Number(tournament.max_participants)) {
    throw new Error('Los cupos liberados están reservados para la lista de espera. Consulta tu turno antes de inscribirte.');
  }
}

export async function joinWaitlist(db: DbSession,tournamentId:string,userId:string,teamId:string|null) {
  const rows = (await db.query('SELECT * FROM tournament_waitlist WHERE tournament_id=$1 AND (user_id=$2 OR ($3::text IS NOT NULL AND team_id=$3))',[tournamentId,userId,teamId])).rows;
  // Changing team requires a fresh position; an old offer cannot move to the new team.
  const existing = rows.find(row=>ownsWaitlistEntry(row,userId,teamId));
  for (const stale of rows.filter(row=>row.user_id===userId && !ownsWaitlistEntry(row,userId,teamId))) {
    await db.query('DELETE FROM tournament_waitlist WHERE id=$1',[stale.id]);
  }
  if (existing && ['waiting','offered'].includes(existing.status)) return;
  if (existing) await db.query('DELETE FROM tournament_waitlist WHERE id=$1',[existing.id]);
  await db.query('INSERT INTO tournament_waitlist(id,tournament_id,user_id,team_id) VALUES($1,$2,$3,$4)',[`wait-${randomUUID()}`,tournamentId,userId,teamId]);
}
