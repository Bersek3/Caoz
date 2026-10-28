import type { DbSession } from './db';

export interface MatchChatActivity {
  matchId: string;
  unreadCount: number;
  active: boolean;
}

export async function getTournamentChatActivity(db: DbSession, tournamentId: string, userId: string): Promise<MatchChatActivity[]> {
  const result = await db.query<MatchChatActivity>(`
    SELECT m.id AS "matchId",
      COUNT(msg.id) FILTER (WHERE r.last_read_at IS NULL OR msg.created_at > r.last_read_at)::integer AS "unreadCount",
      COALESCE(MAX(msg.created_at) > CURRENT_TIMESTAMP - INTERVAL '60 seconds', false) AS active
    FROM tournament_matches m
    LEFT JOIN match_messages msg ON msg.match_id=m.id AND msg.sender_role IN ('team1','team2')
    LEFT JOIN match_chat_reads r ON r.match_id=m.id AND r.user_id=$2
    WHERE m.tournament_id=$1
    GROUP BY m.id, r.last_read_at`, [tournamentId,userId]);
  return result.rows;
}

// Use the exact timestamp of the fetched snapshot, not the current time: messages
// arriving while the response is being prepared must remain unread.
export async function markMatchChatRead(db: DbSession, matchId: string, userId: string, cursor: string) {
  await db.query(`INSERT INTO match_chat_reads(user_id,match_id,last_read_at) VALUES ($1,$2,$3::timestamptz)
    ON CONFLICT(user_id,match_id) DO UPDATE SET last_read_at=GREATEST(match_chat_reads.last_read_at,EXCLUDED.last_read_at)`, [userId,matchId,cursor]);
}
