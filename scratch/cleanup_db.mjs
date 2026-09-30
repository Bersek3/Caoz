import { getDb, initDb } from '../src/lib/db.ts';

async function cleanup() {
  await initDb();
  const db = await getDb();

  console.log('--- Cleaning up database ---');

  // Find admin user
  const adminRes = await db.query(
    "SELECT id, email, username FROM users WHERE role = 'admin' OR email = 'francisco.jm.aguilar1@gmail.com'"
  );
  console.log('Admin user found:', adminRes.rows);
  const adminId = adminRes.rows[0]?.id;

  if (adminId) {
    // Delete non-admin team members
    await db.query("DELETE FROM team_members WHERE user_id != $1", [adminId]);
    // Delete non-admin teams
    await db.query("DELETE FROM teams WHERE captain_id != $1", [adminId]);
    // Delete parental authorizations of non-admin
    await db.query("DELETE FROM parental_authorizations WHERE user_id != $1", [adminId]);
    // Delete non-admin users
    const delUsers = await db.query("DELETE FROM users WHERE id != $1", [adminId]);
    console.log('Non-admin users deleted:', delUsers.rowCount);

    // Update admin user to ensure birth_date and activa status
    await db.query(`
      UPDATE users SET 
        birth_date = '1998-05-15',
        account_status = 'activa',
        role = 'admin'
      WHERE id = $1
    `, [adminId]);
  } else {
    console.log('No admin found, creating default admin...');
  }

  const remainingUsers = await db.query("SELECT id, email, username, role, birth_date, account_status FROM users");
  console.log('Remaining users:', remainingUsers.rows);

  const remainingTeams = await db.query("SELECT id, name, tag, captain_id FROM teams");
  console.log('Remaining teams:', remainingTeams.rows);

  console.log('--- Cleanup completed successfully ---');
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
