import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id: matchId } = await params;

    const res = await db.query(`
      SELECT 
        id,
        match_id as "matchId",
        sender_name as "senderName",
        sender_role as "senderRole",
        message,
        is_proof_image as "isProofImage",
        TO_CHAR(created_at, 'HH24:MI') as timestamp,
        created_at
      FROM match_messages
      WHERE match_id = $1
      ORDER BY created_at ASC
    `, [matchId]);

    return NextResponse.json({ success: true, messages: res.rows });
  } catch (error: any) {
    console.error('Fetch match messages error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id: matchId } = await params;
    const body = await request.json();
    const { senderName, senderRole, message, isProofImage, isDispute, disputeReason } = body;

    const messageId = `msg-${Date.now()}`;
    const cleanSenderName = (senderName || 'Participante').trim();
    const cleanSenderRole = senderRole || 'player';

    await db.query(`
      INSERT INTO match_messages (id, match_id, sender_name, sender_role, message, is_proof_image)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      messageId,
      matchId,
      cleanSenderName,
      cleanSenderRole,
      message,
      isProofImage || false
    ]);

    if (isDispute && disputeReason) {
      await db.query(`
        UPDATE tournament_matches SET
          status = 'disputed',
          dispute_reason = $1
        WHERE id = $2
      `, [disputeReason, matchId]);
    }

    const createdMsg = {
      id: messageId,
      matchId,
      senderName: cleanSenderName,
      senderRole: cleanSenderRole,
      message,
      isProofImage: isProofImage || false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    return NextResponse.json({ success: true, message: createdMsg });
  } catch (error: any) {
    console.error('Match chat API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
