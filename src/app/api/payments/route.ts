import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';

export async function GET(request: Request) {
  await initDb();
  const viewer = await getMatchViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Inicia sesión para ver los pagos.' }, { status: 401 });
  const db = await getDb();
  const query = new URL(request.url).searchParams;
  const tournamentId = query.get('tournamentId') || '';
  const archived = viewer.role === 'admin' && query.get('includeArchived') === '1';
  const page = Math.min(10000, Math.max(0, Number.parseInt(query.get('page') || '0', 10) || 0));
  const result = await db.query(`SELECT p.id,p.tournament_id,p.amount,p.status,p.provider,p.created_at,p.expires_at,p.archived_at,t.title,t.slug,u.username
    FROM tournament_payments p JOIN tournaments t ON t.id=p.tournament_id JOIN users u ON u.id=p.user_id
    WHERE ($1 = 'admin' OR p.user_id=$2) AND ($3='' OR p.tournament_id=$3)
      AND ($4::boolean OR p.archived_at IS NULL OR p.status IN ('confirmed','refund_required'))
    ORDER BY p.created_at DESC,p.id DESC LIMIT 101 OFFSET $5`, [viewer.role,viewer.id,tournamentId,archived,page*100]);
  const tournaments = await db.query(`SELECT DISTINCT t.id,t.title,t.slug
    FROM tournament_payments p JOIN tournaments t ON t.id=p.tournament_id
    WHERE ($1='admin' OR p.user_id=$2) AND ($3::boolean OR p.archived_at IS NULL OR p.status IN ('confirmed','refund_required'))
    ORDER BY t.title,t.id`, [viewer.role,viewer.id,archived]);
  return NextResponse.json({ payments: result.rows.slice(0,100), tournaments: tournaments.rows, hasMore: result.rows.length>100, page }, { headers: { 'Cache-Control': 'private, no-store' } });
}
