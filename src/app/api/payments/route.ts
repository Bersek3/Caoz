import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';

export async function GET(request: Request) {
  await initDb();
  const viewer = await getMatchViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Inicia sesión para ver los pagos.' }, { status: 401 });
  const db = await getDb();
  const result = await db.query(`SELECT p.id,p.amount,p.status,p.provider,p.created_at,p.expires_at,t.title,u.username
    FROM tournament_payments p JOIN tournaments t ON t.id=p.tournament_id JOIN users u ON u.id=p.user_id
    WHERE ($1 = 'admin' OR p.user_id=$2) ORDER BY p.created_at DESC LIMIT 100`, [viewer.role,viewer.id]);
  return NextResponse.json({ payments: result.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
}
