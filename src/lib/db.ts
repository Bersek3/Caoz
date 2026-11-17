import { getUserAvatar } from './userAvatar';
import path from 'path';
import fs from 'fs';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { runDatabaseMigrations } from './databaseMigrations';

// Global database instance holder for Next.js hot reload
declare global {
  var __pgliteInstance: PGlite | undefined;
  var __pgPoolInstance: Pool | undefined;
}

export interface DbResult<T = any> {
  rows: T[];
  rowCount?: number;
}

let isInitialized = false;
let initialization: Promise<void> | undefined;

export type DbSession = Pick<Awaited<ReturnType<typeof getDb>>, 'query'>;

export async function withDbTransaction<T>(work: (db: DbSession) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (db.type === 'pglite') {
    return global.__pgliteInstance!.transaction(async (tx) => work({
      query: async <R = any>(sql: string, params: any[] = []) => {
        const result = await tx.query<R>(sql, params);
        return { rows: result.rows, rowCount: result.rows.length };
      }
    }));
  }
  const client = await global.__pgPoolInstance!.connect();
  try {
    await client.query('BEGIN');
    const result = await work({ query: async (sql, params = []) => {
      const result = await client.query(sql, params);
      return { rows: result.rows, rowCount: result.rowCount || 0 };
    }});
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function getDb() {
  if (process.env.DATABASE_URL) {
    if (!global.__pgPoolInstance) {
      const databaseUrl = process.env.DATABASE_URL;
      let databaseHost = '';
      try { databaseHost = new URL(databaseUrl).hostname; } catch { /* Pool reports malformed URLs itself. */ }
      // PostgreSQL in the private Docker network deliberately has no TLS.
      // Public/managed hosts (for example Neon) continue to use TLS.
      const isPrivateDatabase = ['localhost', '127.0.0.1', '::1', 'db', 'arena-db'].includes(databaseHost);
      global.__pgPoolInstance = new Pool({
        connectionString: databaseUrl,
        ssl: isPrivateDatabase ? false : { rejectUnauthorized: false }
      });
    }
    return {
      type: 'pg' as const,
      query: async <T = any>(sqlText: string, params: any[] = []): Promise<DbResult<T>> => {
        const res = await global.__pgPoolInstance!.query(sqlText, params);
        return { rows: res.rows, rowCount: res.rowCount || 0 };
      }
    };
  }

  // PGlite (Real PostgreSQL embedded inside Node.js for local development)
  if (!global.__pgliteInstance) {
    const dataDir = path.join(process.cwd(), 'data', 'pgdata');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    global.__pgliteInstance = new PGlite(dataDir);
  }

  const pglite = global.__pgliteInstance;

  return {
    type: 'pglite' as const,
    query: async <T = any>(sqlText: string, params: any[] = []): Promise<DbResult<T>> => {
      const res = await pglite.query<T>(sqlText, params);
      return { rows: res.rows, rowCount: res.rows.length };
    }
  };
}

export async function initDb() {
  if (isInitialized) return;
  if (!initialization) initialization = initializeDatabase().catch(error => { initialization = undefined; throw error; });
  return initialization;
}

async function initializeDatabase() {

  const db = await getDb();

  // 1. Tabla: usuarios
  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      full_name VARCHAR(150),
      avatar_url TEXT,
      role VARCHAR(32) DEFAULT 'player',
      riot_id VARCHAR(100),
      steam_id VARCHAR(100),
      ea_id VARCHAR(100),
      discord_tag VARCHAR(100),
      bio TEXT,
      birth_date DATE,
      rut VARCHAR(20),
      document_number VARCHAR(80),
      phone VARCHAR(30),
      account_status VARCHAR(32) DEFAULT 'activa',
      epic_games_username VARCHAR(100),
      psn_id VARCHAR(100),
      xbox_gamertag VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS document_number VARCHAR(80)');
  await db.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS phone VARCHAR(30)');

  // 2. Tabla: autorizaciones_parentales
  await db.query(`
    CREATE TABLE IF NOT EXISTS autorizaciones_parentales (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) REFERENCES usuarios(id) ON DELETE CASCADE,
      guardian_name VARCHAR(150) NOT NULL,
      guardian_rut VARCHAR(20) NOT NULL,
      relationship VARCHAR(50) NOT NULL,
      guardian_phone VARCHAR(50) NOT NULL,
      guardian_email VARCHAR(255) NOT NULL,
      document_url TEXT NOT NULL,
      status VARCHAR(32) DEFAULT 'pendiente',
      rejection_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      reviewed_by VARCHAR(64) REFERENCES usuarios(id)
    );
  `);

  // 3. Tabla: equipos
  await db.query(`
    CREATE TABLE IF NOT EXISTS equipos (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      tag VARCHAR(16) NOT NULL,
      logo_url TEXT,
      captain_id VARCHAR(64) REFERENCES usuarios(id) ON DELETE SET NULL,
      invite_code VARCHAR(64) UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Tabla: miembros_equipo
  await db.query(`
    CREATE TABLE IF NOT EXISTS miembros_equipo (
      id VARCHAR(64) PRIMARY KEY,
      team_id VARCHAR(64) REFERENCES equipos(id) ON DELETE CASCADE,
      user_id VARCHAR(64) REFERENCES usuarios(id) ON DELETE CASCADE,
      role VARCHAR(32) DEFAULT 'starter',
      in_game_id VARCHAR(100),
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    );
  `);

  // 5. Tabla: torneos
  await db.query(`
    CREATE TABLE IF NOT EXISTS torneos (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      game_id VARCHAR(64) NOT NULL,
      game_name VARCHAR(100) NOT NULL,
      banner_url TEXT,
      thumbnail_url TEXT,
      organizer_id VARCHAR(64),
      organizer_name VARCHAR(150),
      organizer_avatar TEXT,
      organizer_verified BOOLEAN DEFAULT true,
      organizer_followers INTEGER DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'registration_open',
      format VARCHAR(32) NOT NULL DEFAULT 'single_elimination',
      team_type VARCHAR(16) NOT NULL DEFAULT 'team',
      team_size INTEGER NOT NULL DEFAULT 5,
      region VARCHAR(32) NOT NULL DEFAULT 'LATAM',
      entry_fee VARCHAR(64) NOT NULL DEFAULT 'Gratis',
      prize_pool VARCHAR(100) NOT NULL DEFAULT '$500 USD',
      prize_distribution JSONB,
      max_participants INTEGER NOT NULL DEFAULT 8,
      start_date VARCHAR(100) NOT NULL,
      check_in_opens_at VARCHAR(100),
      check_in_closes_at VARCHAR(100),
      check_in_active BOOLEAN DEFAULT false,
      description TEXT,
      rules JSONB,
      schedule JSONB,
      is_hidden BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query('ALTER TABLE torneos ADD COLUMN IF NOT EXISTS entry_fee_amount INTEGER NOT NULL DEFAULT 0');
  // Existing published rules remain custom until an administrator opts into a preset.
  await db.query("ALTER TABLE torneos ADD COLUMN IF NOT EXISTS rules_mode VARCHAR(16) NOT NULL DEFAULT 'custom'");
  await db.query('ALTER TABLE torneos ADD COLUMN IF NOT EXISTS rules_template_version VARCHAR(64)');
  await db.query('ALTER TABLE torneos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false');
  await db.query("ALTER TABLE torneos ADD COLUMN IF NOT EXISTS prize_delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending'");
  await db.query(`CREATE TABLE IF NOT EXISTS tournament_waitlist (
    id VARCHAR(64) PRIMARY KEY,
    tournament_id VARCHAR(64) NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    team_id VARCHAR(64),
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',
    offer_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, user_id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS tournament_payments (
    id VARCHAR(64) PRIMARY KEY,
    tournament_id VARCHAR(64) NOT NULL REFERENCES torneos(id),
    user_id VARCHAR(64) NOT NULL REFERENCES usuarios(id),
    registration_key TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
    status VARCHAR(32) NOT NULL DEFAULT 'creating',
    provider_uuid TEXT UNIQUE,
    checkout_url TEXT,
    registration JSONB NOT NULL,
    participant_id VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  // Preserve historical provider references when migrating payment providers.
  await db.query("ALTER TABLE tournament_payments ADD COLUMN IF NOT EXISTS provider VARCHAR(32) NOT NULL DEFAULT 'virtualpos'");
  await db.query('ALTER TABLE tournament_payments ADD COLUMN IF NOT EXISTS provider_order TEXT');
  await db.query('ALTER TABLE tournament_payments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ');
  await db.query('ALTER TABLE tournament_payments ADD COLUMN IF NOT EXISTS archived_by VARCHAR(64)');
  await db.query('ALTER TABLE tournament_payments ADD COLUMN IF NOT EXISTS archive_reason TEXT');
  // No tournament FK: retain the audit of verified, uncreated orders after deleting a test tournament.
  await db.query(`CREATE TABLE IF NOT EXISTS removed_tournament_payment_attempts (
    payment_id VARCHAR(64) PRIMARY KEY,
    tournament_id VARCHAR(64) NOT NULL,
    tournament_title TEXT NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    archive_reason TEXT NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL,
    archived_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL,
    removed_by VARCHAR(64) NOT NULL,
    removed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query('ALTER TABLE removed_tournament_payment_attempts ADD COLUMN IF NOT EXISTS provider_order TEXT');
  await db.query('ALTER TABLE removed_tournament_payment_attempts ADD COLUMN IF NOT EXISTS provider_status INTEGER');
  await db.query(`CREATE INDEX IF NOT EXISTS tournament_payments_reservations ON tournament_payments(tournament_id, status, expires_at)`);

  // 6. Tabla: participantes_torneo
  await db.query(`
    CREATE TABLE IF NOT EXISTS participantes_torneo (
      id VARCHAR(64) PRIMARY KEY,
      tournament_id VARCHAR(64) REFERENCES torneos(id) ON DELETE CASCADE,
      team_id VARCHAR(64),
      user_id VARCHAR(64),
      name VARCHAR(150) NOT NULL,
      tag VARCHAR(16) NOT NULL,
      avatar TEXT,
      seed INTEGER NOT NULL,
      checked_in BOOLEAN DEFAULT false,
      registered_at VARCHAR(100),
      captain_name VARCHAR(150),
      captain_discord VARCHAR(100),
      captain_in_game_id VARCHAR(100),
      captain_avatar TEXT,
      roster JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Identity details stay outside the publicly exposed participants view.
  await db.query(`CREATE TABLE IF NOT EXISTS tournament_registration_details (
    participant_id VARCHAR(64) PRIMARY KEY REFERENCES participantes_torneo(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL, birth_date DATE NOT NULL,
    document_number VARCHAR(80) NOT NULL, phone VARCHAR(30) NOT NULL
  )`);

  // 7. Tabla: rondas_torneo
  await db.query(`
    CREATE TABLE IF NOT EXISTS rondas_torneo (
      id VARCHAR(64) PRIMARY KEY,
      tournament_id VARCHAR(64) REFERENCES torneos(id) ON DELETE CASCADE,
      round_index INTEGER NOT NULL,
      title VARCHAR(100) NOT NULL,
      bracket_type VARCHAR(32) NOT NULL DEFAULT 'winners'
    );
  `);

  // 8. Tabla: partidas_torneo
  await db.query(`
    CREATE TABLE IF NOT EXISTS partidas_torneo (
      id VARCHAR(64) PRIMARY KEY,
      round_id VARCHAR(64) REFERENCES rondas_torneo(id) ON DELETE CASCADE,
      tournament_id VARCHAR(64) REFERENCES torneos(id) ON DELETE CASCADE,
      round_index INTEGER NOT NULL,
      round_title VARCHAR(100) NOT NULL,
      match_index INTEGER NOT NULL,
      bracket_type VARCHAR(32) NOT NULL DEFAULT 'winners',
      team1_participant_id VARCHAR(64),
      team1_name VARCHAR(150) NOT NULL,
      team1_avatar TEXT,
      team1_seed INTEGER,
      team1_score INTEGER DEFAULT 0,
      team1_is_winner BOOLEAN DEFAULT false,
      team2_participant_id VARCHAR(64),
      team2_name VARCHAR(150) NOT NULL,
      team2_avatar TEXT,
      team2_seed INTEGER,
      team2_score INTEGER DEFAULT 0,
      team2_is_winner BOOLEAN DEFAULT false,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      winner_id VARCHAR(64),
      best_of INTEGER NOT NULL DEFAULT 3,
      scheduled_time VARCHAR(100),
      proof_image_url TEXT,
      dispute_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. Tabla: mensajes_partida
  await db.query(`
    CREATE TABLE IF NOT EXISTS mensajes_partida (
      id VARCHAR(64) PRIMARY KEY,
      match_id VARCHAR(64) REFERENCES partidas_torneo(id) ON DELETE CASCADE,
      sender_name VARCHAR(150) NOT NULL,
      sender_role VARCHAR(32) NOT NULL DEFAULT 'team1',
      message TEXT NOT NULL,
      is_proof_image BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`CREATE TABLE IF NOT EXISTS match_chat_reads (
    user_id VARCHAR(64) REFERENCES usuarios(id) ON DELETE CASCADE,
    match_id VARCHAR(64) REFERENCES partidas_torneo(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, match_id)
  )`);
  await db.query(`CREATE INDEX IF NOT EXISTS match_chat_activity_idx ON mensajes_partida(match_id, created_at)
    WHERE sender_role IN ('team1', 'team2')`);

  await db.query(`CREATE TABLE IF NOT EXISTS tournament_announcements (
    id VARCHAR(64) PRIMARY KEY,
    tournament_id VARCHAR(64) NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
    sender_name VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS tournament_announcements_idx ON tournament_announcements(tournament_id, created_at)');

  // Versioned, non-destructive indexes and future schema changes.  This runs
  // only against the application's public tables, never `neon_auth`.
  await runDatabaseMigrations(db);

  // Vistas de compatibilidad en PostgreSQL
  const compatibilityViews = `
    CREATE OR REPLACE VIEW users AS SELECT * FROM usuarios;
    CREATE OR REPLACE VIEW parental_authorizations AS SELECT * FROM autorizaciones_parentales;
    CREATE OR REPLACE VIEW teams AS SELECT * FROM equipos;
    CREATE OR REPLACE VIEW team_members AS SELECT * FROM miembros_equipo;
    CREATE OR REPLACE VIEW tournaments AS SELECT * FROM torneos;
    CREATE OR REPLACE VIEW tournament_participants AS SELECT * FROM participantes_torneo;
    CREATE OR REPLACE VIEW tournament_rounds AS SELECT * FROM rondas_torneo;
    CREATE OR REPLACE VIEW tournament_matches AS SELECT * FROM partidas_torneo;
    CREATE OR REPLACE VIEW match_messages AS SELECT * FROM mensajes_partida;
  `;
  // Prepared queries accept one SQL statement at a time (including in PGlite).
  for (const statement of compatibilityViews.split(';').map((sql) => sql.trim()).filter(Boolean)) {
    await db.query(statement);
  }

  // Optional local-only bootstrap.  Never keep a reusable administrator
  // password in source control or create an account implicitly in production.
  const seedAdminEmail = process.env.SEED_DEFAULT_ADMIN_EMAIL;
  const seedAdminPassword = process.env.SEED_DEFAULT_ADMIN_PASSWORD;
  if (process.env.SEED_DEFAULT_ADMIN === 'true') {
    if (!seedAdminEmail || !seedAdminPassword) {
      throw new Error('SEED_DEFAULT_ADMIN requires SEED_DEFAULT_ADMIN_EMAIL and SEED_DEFAULT_ADMIN_PASSWORD.');
    }
    const seedAdminUsername = process.env.SEED_DEFAULT_ADMIN_USERNAME || 'admin';
    const defaultGenericAvatar = getUserAvatar(seedAdminUsername);
    const userCheck = await db.query('SELECT id FROM usuarios WHERE email = $1', [seedAdminEmail]);
    if (userCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash(seedAdminPassword, 12);
      const seedAdminId = `seed-admin-${crypto.randomUUID()}`;
      await db.query(`
        INSERT INTO usuarios (
          id, email, password_hash, username, full_name, avatar_url, role, bio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        seedAdminId,
        seedAdminEmail,
        passwordHash,
        seedAdminUsername,
        'Administrador',
        defaultGenericAvatar,
        'admin',
        'Administrador inicial local.'
      ]);

      const inviteCode = `seed-${crypto.randomUUID()}`;
      await db.query(`
        INSERT INTO equipos (id, name, tag, logo_url, captain_id, invite_code)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        `seed-team-${crypto.randomUUID()}`,
        'Equipo local',
        'LOCAL',
        defaultGenericAvatar,
        seedAdminId,
        inviteCode
      ]);
    }
  }

  isInitialized = true;
}
