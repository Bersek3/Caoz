import { getDb } from './db';
import { verifyToken } from './auth';

export interface MatchViewer {
  id: string;
  username: string;
  role: string;
}

export async function getMatchViewer(request: Request): Promise<MatchViewer | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;
  const db = await getDb();
  const result = await db.query<MatchViewer>('SELECT id, username, role FROM users WHERE id = $1', [payload.userId]);
  return result.rows[0] || null;
}

// Use the registered roster, never names or membership in the tournament alone.
export function ownsMatchParticipant(viewer: MatchViewer, participant: {
  user_id?: string;
  roster?: unknown;
}): boolean {
  if (participant.user_id === viewer.id) return true;
  let roster = participant.roster;
  if (typeof roster === 'string') {
    try { roster = JSON.parse(roster); } catch { return false; }
  }
  return Array.isArray(roster) && roster.some((member) => member?.userId === viewer.id);
}

export async function getMatchAccess(request: Request, matchId: string) {
  const viewer = await getMatchViewer(request);
  if (!viewer) return { allowed: false as const, status: 401, error: 'Debes iniciar sesión para acceder a la sala privada.' };
  const db = await getDb();
  const matches = await db.query('SELECT * FROM tournament_matches WHERE id = $1', [matchId]);
  const match = matches.rows[0];
  if (!match) return { allowed: false as const, status: 404, error: 'Partida no encontrada.' };
  if (viewer.role === 'admin') return { allowed: true as const, viewer, senderRole: 'admin' as const };
  const participants = await db.query(`
    SELECT * FROM tournament_participants
    WHERE tournament_id = $1 AND (id = $2 OR id = $3)
  `, [match.tournament_id, match.team1_participant_id, match.team2_participant_id]);
  const participant = participants.rows.find((p) => ownsMatchParticipant(viewer, p));
  if (!participant) return { allowed: false as const, status: 403, error: 'Esta sala es privada. Solo pueden entrar los participantes de esta partida y los administradores.' };
  return { allowed: true as const, viewer, senderRole: participant.id === match.team1_participant_id ? 'team1' as const : 'team2' as const };
}
