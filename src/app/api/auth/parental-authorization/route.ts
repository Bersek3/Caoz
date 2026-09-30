import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getAuthUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  return payload ? payload.userId : null;
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { guardianName, guardianRut, relationship, guardianPhone, guardianEmail, documentUrl } = body;

    if (!guardianName || !guardianRut || !guardianPhone || !guardianEmail) {
      return NextResponse.json({ error: 'Todos los datos del apoderado legal son obligatorios.' }, { status: 400 });
    }

    const authId = `pauth-${Date.now()}`;
    const defaultDoc = documentUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?q=80&w=800&auto=format&fit=crop';

    // Insert or update parental authorization
    await db.query(`
      INSERT INTO parental_authorizations (
        id, user_id, guardian_name, guardian_rut, relationship, guardian_phone, guardian_email, document_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente')
    `, [
      authId,
      userId,
      guardianName.trim(),
      guardianRut.trim().toUpperCase(),
      relationship || 'Padre / Madre',
      guardianPhone.trim(),
      guardianEmail.trim().toLowerCase(),
      defaultDoc
    ]);

    // Update user account status to 'pendiente_apoderado'
    await db.query(`
      UPDATE users SET account_status = 'pendiente_apoderado' WHERE id = $1
    `, [userId]);

    return NextResponse.json({
      success: true,
      message: 'Autorización parental subida con éxito. Un moderador revisará el documento a la brevedad.',
      authorizationId: authId
    });
  } catch (error: any) {
    console.error('Parental authorization API error:', error);
    return NextResponse.json({ error: error.message || 'Error al enviar autorización' }, { status: 500 });
  }
}
