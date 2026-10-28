import { getDb, initDb } from './db';
import { POPULAR_GAMES } from '@/data/mockData';
import { GameInfo } from '@/types/tournament';

export async function getOfficialGames(): Promise<GameInfo[]> {
  await initDb();
  const db = await getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS official_game_catalog (id INTEGER PRIMARY KEY, games JSONB NOT NULL)`);
  await db.query('INSERT INTO official_game_catalog (id, games) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [JSON.stringify(POPULAR_GAMES)]);
  const result = await db.query<{ games: GameInfo[] }>('SELECT games FROM official_game_catalog WHERE id = 1');
  return result.rows[0].games;
}
