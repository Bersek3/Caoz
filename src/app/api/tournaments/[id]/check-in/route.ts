import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();

    const trnRes = await db.query(
      'SELECT id FROM tournaments WHERE id = $1 OR slug = $1',
      [id]
    );

    if (trnRes.rows.length === 0) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    const tournamentId = trnRes.rows[0].id;
    const { participantId, teamName } = body;

    if (participantId) {
      await db.query(
        'UPDATE tournament_participants SET checked_in = true WHERE id = $1 AND tournament_id = $2',
        [participantId, tournamentId]
      );
    } else if (teamName) {
      await db.query(
        'UPDATE tournament_participants SET checked_in = true WHERE name = $1 AND tournament_id = $2',
        [teamName, tournamentId]
      );
    } else {
      // Mark first participant as checked in if none provided
      await db.query(`
        UPDATE tournament_participants
        SET checked_in = true
        WHERE tournament_id = $1 AND checked_in = false
        LIMIT 1
      `, [tournamentId]);
    }

    return NextResponse.json({ success: true, message: 'Check-in registrado en PostgreSQL' });
  } catch (error: any) {
    console.error('Check-in API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
