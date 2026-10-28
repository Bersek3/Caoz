import { NextResponse } from 'next/server';
import { getOfficialGames } from '@/lib/games';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { GameInfo } from '@/types/tournament';

export async function GET() {
  try {
    return NextResponse.json({ games: await getOfficialGames() });
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar los videojuegos.' }, { status: 500 });
  }
}

function validImage(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export async function PUT(request: Request) {
  const header = request.headers.get('authorization');
  const payload = header?.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
  if (!payload) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  try {
    await getOfficialGames();
    const db = await getDb();
    const user = await db.query('SELECT role FROM usuarios WHERE id = $1', [payload.userId]);
    if (user.rows[0]?.role !== 'admin') return NextResponse.json({ error: 'Solo administradores.' }, { status: 403 });
    const text = await request.text();
    if (text.length > 200000) return NextResponse.json({ error: 'Catálogo demasiado grande.' }, { status: 413 });
    let body;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }); }
    const games: GameInfo[] = body?.games;
    const fields = ['id', 'name', 'genre', 'publisher', 'coverImage', 'bannerImage', 'tagFieldLabel', 'tagPlaceholder'] as const;
    if (!Array.isArray(games) || games.length > 100 || games.some(game =>
      !game || fields.some(field => typeof game[field] !== 'string' || !game[field].trim() || game[field].length > 2000) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id) || game.id.length > 64 ||
      !Number.isInteger(game.defaultTeamSize) || game.defaultTeamSize < 1 || game.defaultTeamSize > 100 ||
      !validImage(game.coverImage) || !validImage(game.bannerImage)
    ) || new Set(games.map(game => game.id)).size !== games.length) {
      return NextResponse.json({ error: 'Revisa los campos, identificadores únicos e imágenes (HTTPS o ruta local).' }, { status: 400 });
    }
    await db.query('UPDATE official_game_catalog SET games = $1 WHERE id = 1', [JSON.stringify(games)]);
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ error: 'No se pudieron guardar los videojuegos.' }, { status: 500 });
  }
}
