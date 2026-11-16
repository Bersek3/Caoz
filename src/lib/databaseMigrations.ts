import type { DbSession } from './db';

/**
 * Non-destructive, idempotent database migrations owned by the application.
 *
 * `neon_auth` is intentionally absent: it is managed by Neon Auth.  The
 * canonical application tables live in `public` and use their Spanish names;
 * the English names are compatibility views only.
 */
const migrations = [
  {
    id: '20261115_public_query_indexes',
    statements: [
      'CREATE INDEX IF NOT EXISTS autorizaciones_parentales_user_idx ON autorizaciones_parentales(user_id)',
      'CREATE INDEX IF NOT EXISTS autorizaciones_parentales_reviewed_by_idx ON autorizaciones_parentales(reviewed_by)',
      'CREATE INDEX IF NOT EXISTS equipos_captain_idx ON equipos(captain_id)',
      'CREATE INDEX IF NOT EXISTS miembros_equipo_user_idx ON miembros_equipo(user_id)',
      'CREATE INDEX IF NOT EXISTS torneos_organizer_idx ON torneos(organizer_id)',
      'CREATE INDEX IF NOT EXISTS torneos_listing_idx ON torneos(status, is_hidden, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS participantes_torneo_tournament_idx ON participantes_torneo(tournament_id)',
      'CREATE INDEX IF NOT EXISTS participantes_torneo_user_idx ON participantes_torneo(user_id)',
      'CREATE INDEX IF NOT EXISTS participantes_torneo_team_idx ON participantes_torneo(team_id)',
      'CREATE INDEX IF NOT EXISTS rondas_torneo_tournament_round_idx ON rondas_torneo(tournament_id, round_index)',
      'CREATE INDEX IF NOT EXISTS partidas_torneo_tournament_round_match_idx ON partidas_torneo(tournament_id, round_index, match_index)',
      'CREATE INDEX IF NOT EXISTS partidas_torneo_round_idx ON partidas_torneo(round_id)',
      'CREATE INDEX IF NOT EXISTS mensajes_partida_match_created_idx ON mensajes_partida(match_id, created_at)',
      'CREATE INDEX IF NOT EXISTS match_chat_reads_match_idx ON match_chat_reads(match_id)',
      'CREATE INDEX IF NOT EXISTS tournament_payments_user_created_idx ON tournament_payments(user_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS tournament_payments_tournament_user_idx ON tournament_payments(tournament_id, user_id)',
      'CREATE INDEX IF NOT EXISTS tournament_waitlist_tournament_status_idx ON tournament_waitlist(tournament_id, status, created_at)',
      'CREATE INDEX IF NOT EXISTS removed_payment_attempts_tournament_idx ON removed_tournament_payment_attempts(tournament_id, removed_at DESC)',
      'CREATE INDEX IF NOT EXISTS removed_payment_attempts_user_idx ON removed_tournament_payment_attempts(user_id, removed_at DESC)'
    ]
  }
] as const;

export async function runDatabaseMigrations(db: DbSession): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS database_schema_migrations (
      id VARCHAR(128) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const migration of migrations) {
    const applied = await db.query<{ id: string }>(
      'SELECT id FROM database_schema_migrations WHERE id = $1',
      [migration.id]
    );
    if (applied.rows.length > 0) continue;

    // Each statement is idempotent.  Recording it only after all statements
    // succeed makes a failed deployment retry safely on its next start.
    for (const statement of migration.statements) await db.query(statement);
    await db.query('INSERT INTO database_schema_migrations (id) VALUES ($1)', [migration.id]);
  }
}
