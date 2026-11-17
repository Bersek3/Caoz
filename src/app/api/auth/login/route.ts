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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    const res = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [email.toLowerCase().trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
        { status: 401 }
      );
    }

    const userRow = res.rows[0];
    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
        { status: 401 }
      );
    }

    // Check user team
    const teamRes = await db.query(
      'SELECT t.name, t.tag FROM teams t WHERE t.captain_id = $1 LIMIT 1',
      [userRow.id]
    );

    const token = signToken({
      userId: userRow.id,
      email: userRow.email,
      username: userRow.username,
      role: userRow.role
    });

    let calculatedAge: number | null = null;
    if (userRow.birth_date) {
      const birth = new Date(userRow.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      calculatedAge = age;
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      username: userRow.username,
      fullName: userRow.full_name,
      avatarUrl: userRow.avatar_url || getUserAvatar(userRow.username),
      role: userRow.role,
      riotId: userRow.riot_id || '',
      steamId: userRow.steam_id || '',
      eaId: userRow.ea_id || '',
      discordTag: userRow.discord_tag || '',
      epicGamesUsername: userRow.epic_games_username || '',
      psnId: userRow.psn_id || '',
      xboxGamertag: userRow.xbox_gamertag || '',
      bio: userRow.bio || '',
      birthDate: userRow.birth_date ? new Date(userRow.birth_date).toISOString().split('T')[0] : null,
      rut: userRow.rut || '',
      age: calculatedAge,
      accountStatus: userRow.account_status || 'activa',
      teamName: teamRes.rows[0]?.name || 'Sin equipo',
      teamTag: teamRes.rows[0]?.tag || 'SOLO'
    };

    return NextResponse.json({ success: true, user, token });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
