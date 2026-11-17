import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

const activeStatuses = ['in_progress', 'check_in', 'registration_open'];

export async function GET() {
  try {
    await initDb();
    const db = await getDb();
    const result = await db.query(`SELECT t.slug, t.title, t.game_name, t.banner_url, t.thumbnail_url, t.status, t.start_date, t.entry_fee, t.prize_pool, t.max_participants, COUNT(p.id)::int AS participant_count FROM tournaments t LEFT JOIN tournament_participants p ON p.tournament_id = t.id WHERE t.is_hidden = FALSE AND t.status = ANY($1::text[]) GROUP BY t.slug, t.title, t.game_name, t.banner_url, t.thumbnail_url, t.status, t.start_date, t.entry_fee, t.prize_pool, t.max_participants ORDER BY CASE t.status WHEN 'in_progress' THEN 0 WHEN 'check_in' THEN 1 ELSE 2 END, t.start_date ASC LIMIT 4`, [activeStatuses]);
    return NextResponse.json({ tournaments: result.rows.map((t: any) => ({ slug: t.slug, title: t.title, gameName: t.game_name, bannerUrl: t.banner_url || t.thumbnail_url || null, status: t.status, startDate: t.start_date, entryFee: t.entry_fee || 'Gratis', prizePool: t.prize_pool || 'Por confirmar', maxParticipants: Number(t.max_participants), participantCount: Number(t.participant_count) })) }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('Public tournaments API error:', error);
    return NextResponse.json({ error: 'No fue posible cargar los torneos.' }, { status: 500 });
  }
}
