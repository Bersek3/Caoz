import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getMatchAccess } from '@/lib/matchAccess';
import { randomUUID } from 'crypto';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const db = await getDb();
    const { id: matchId } = await params;
    const access = await getMatchAccess(request, matchId);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

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

    return NextResponse.json({ success: true, messages: res.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
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
    const access = await getMatchAccess(request, matchId);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json();
    const { message, isProofImage, isDispute, disputeReason } = body;
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Escribe un mensaje.' }, { status: 400 });
    }
    if (isProofImage && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(message) || message.length > 2_800_000)) {
      return NextResponse.json({ error: 'Adjunta una imagen JPG, PNG o WEBP de hasta 2 MB.' }, { status: 400 });
    }

    const messageId = `msg-${randomUUID()}`;
    const cleanSenderName = access.viewer.role === 'admin' ? `Staff CAOZ (@${access.viewer.username})` : `@${access.viewer.username}`;
    const cleanSenderRole = access.senderRole;

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
