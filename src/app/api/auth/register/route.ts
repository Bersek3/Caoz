import { getUserAvatar } from '@/lib/userAvatar';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb, initDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await initDb();
    const db = await getDb();
    const body = await request.json();
    const { email, password, username, fullName, riotId, discordTag, birthDate, swornDeclaration } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre de usuario son obligatorios.' },
        { status: 400 }
      );
    }

    if (!birthDate) {
      return NextResponse.json(
        { error: 'La Fecha de Nacimiento es obligatoria para validar tu edad y aptitud legal para competir en torneos.' },
        { status: 400 }
      );
    }

    if (!swornDeclaration) {
      return NextResponse.json(
        { error: 'Debes marcar la Declaración Jurada sobre la veracidad de tu edad y datos para continuar.' },
        { status: 400 }
      );
    }

    let accountStatus = 'activa';
    let calculatedAge: number | null = null;

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return NextResponse.json(
        { error: 'Fecha de nacimiento inválida.' },
        { status: 400 }
      );
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    calculatedAge = age;

    if (age < 14) {
      return NextResponse.json({
        error: 'Debes tener al menos 14 años para registrarte y participar en torneos (Normativa legal en Chile).'
      }, { status: 400 });
    }

    if (age < 18) {
      accountStatus = 'pendiente_apoderado';
    }

    // Check existing
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'El correo electrónico o nombre de usuario ya está registrado.' },
        { status: 400 }
      );
    }

    const userId = `usr-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const defaultAvatar = getUserAvatar(username);

    await db.query(`
      INSERT INTO users (
        id, email, password_hash, username, full_name, avatar_url, role, riot_id, discord_tag, birth_date, account_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      userId,
      email.toLowerCase(),
      passwordHash,
      username,
      fullName || username,
      defaultAvatar,
      'player',
      riotId || null,
      discordTag || null,
      birthDate || null,
      accountStatus
    ]);

    const token = signToken({
      userId,
      email: email.toLowerCase(),
      username,
      role: 'player'
    });

    const user = {
      id: userId,
      email: email.toLowerCase(),
      username,
      fullName: fullName || username,
      avatarUrl: defaultAvatar,
      role: 'player',
      riotId: riotId || '',
      discordTag: discordTag || '',
      birthDate: birthDate || null,
      age: calculatedAge,
      accountStatus,
      bio: ''
    };

    return NextResponse.json({ success: true, user, token });
  } catch (error: any) {
    console.error('Register API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
