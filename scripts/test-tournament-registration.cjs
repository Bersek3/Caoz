const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');

function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, file);
  const loaded = new Module(filename, module);
  loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  loaded.require = name => overrides[name] || original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename);
  return loaded.exports;
}

async function main() {
  const { validateRegistrationDetails } = load('../src/lib/registrationDetails.ts');
  const details = { fullName: 'Ana Perez', birthDate: '2000-04-20', documentNumber: '12345678-9', phone: '+56912345678' };
  assert.deepEqual(validateRegistrationDetails(details), details);
  for (const invalid of [null, {}, { ...details, fullName: 'Ana' }, { ...details, birthDate: '2000-02-30' },
    { ...details, birthDate: '2020-01-01' }, { ...details, birthDate: '2099-01-01' },
    { ...details, documentNumber: '' }, { ...details, phone: '123' }, { ...details, phone: '+561' }]) {
    assert.throws(() => validateRegistrationDetails(invalid));
  }
  const { insertRegistration } = load('../src/lib/tournamentRegistration.ts', {
    './userAvatar': load('../src/lib/userAvatar.ts'),
    crypto: { ...require('node:crypto'), randomInt: max => max - 1 }
  });
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, full_name TEXT, birth_date DATE);
      CREATE TABLE tournament_participants (id TEXT PRIMARY KEY,tournament_id TEXT,team_id TEXT,user_id TEXT,name TEXT,tag TEXT,avatar TEXT,seed INT,checked_in BOOLEAN,registered_at TEXT,captain_name TEXT,captain_discord TEXT,captain_in_game_id TEXT,captain_avatar TEXT,roster JSONB);
      CREATE TABLE tournament_registration_details (participant_id TEXT REFERENCES tournament_participants(id) ON DELETE CASCADE,full_name TEXT,birth_date DATE,document_number TEXT,phone TEXT);
      CREATE TABLE tournament_matches (tournament_id TEXT,round_index INT,match_index INT,bracket_type TEXT,team1_participant_id TEXT,team2_participant_id TEXT,team1_name TEXT,team2_name TEXT,team1_avatar TEXT,team2_avatar TEXT,team1_seed INT,team2_seed INT,status TEXT);
      INSERT INTO users(id) VALUES ('u1'),('u2');
      INSERT INTO tournament_matches(tournament_id,round_index,match_index,bracket_type) VALUES ('t1',0,0,'winners');`);
    const registration = { userId: 'u1', teamId: null, name: 'Ana', tag: 'SOLO', captainName: 'Ana', captainDiscord: '', captainInGameId: 'Ana#1', roster: [{ userId: 'u1', username: 'Ana' }], personalDetails: details };
    await db.transaction(tx => insertRegistration(tx, 't1', 2, registration));
    assert.equal((await db.query('SELECT seed FROM tournament_participants')).rows[0].seed, 2, 'Random selection must be able to select the last slot instead of the first');
    assert.equal((await db.query('SELECT document_number FROM tournament_registration_details')).rows[0].document_number, details.documentNumber);
    assert.equal((await db.query('SELECT full_name FROM users WHERE id=\'u1\'')).rows[0].full_name, details.fullName);
    await assert.rejects(() => db.transaction(tx => insertRegistration(tx, 't1', 2, registration)));
    await db.transaction(tx => insertRegistration(tx, 't1', 2, { ...registration, userId: 'u2', name: 'Luis', roster: [{ userId: 'u2', username: 'Luis' }] }));
    const match = (await db.query('SELECT * FROM tournament_matches')).rows[0];
    const { getUserAvatar } = load('../src/lib/userAvatar.ts');
    assert.equal(match.team1_avatar, getUserAvatar('Luis'));
    assert.equal(match.team2_avatar, getUserAvatar('Ana'));
    const ana = (await db.query("SELECT avatar,captain_avatar FROM tournament_participants WHERE user_id='u1'")).rows[0];
    assert.equal(ana.avatar,getUserAvatar('Ana'));
    assert.equal(ana.captain_avatar,getUserAvatar('Ana'));
    assert.equal(match.team1_name, 'Luis');
    assert.equal(match.team2_name, 'Ana');
    assert.equal(match.status, 'ready');
    assert.equal(new Set((await db.query('SELECT seed FROM tournament_participants')).rows.map(p => p.seed)).size, 2);
    await assert.rejects(() => db.transaction(tx => insertRegistration(tx, 't1', 2, { ...registration, userId: 'u3' })));
    await db.exec(`CREATE TABLE tournaments (id TEXT PRIMARY KEY, max_participants INT);
      INSERT INTO tournaments VALUES ('t1',2);
      ALTER TABLE tournament_matches ADD COLUMN winner_id TEXT;
      ALTER TABLE tournament_matches ADD COLUMN team1_score INT DEFAULT 0;
      ALTER TABLE tournament_matches ADD COLUMN team2_score INT DEFAULT 0;`);
    const { POST } = load('../src/app/api/tournaments/[id]/draw/route.ts', {
      '@/lib/auth': { verifyToken: token => token === 'admin' ? { role: 'admin' } : { role: 'player' } },
      '@/lib/db': { initDb: async () => {}, withDbTransaction: work => db.transaction(work) }
    });
    const draw = token => POST(new Request('http://localhost/api/tournaments/t1/draw', {
      method: 'POST', headers: { authorization: `Bearer ${token}` }
    }), { params: Promise.resolve({ id: 't1' }) });
    assert.equal((await draw('player')).status, 403);
    assert.equal((await draw('admin')).status, 200);
    assert.equal(new Set((await db.query('SELECT seed FROM tournament_participants')).rows.map(p => p.seed)).size, 2);
    assert.equal((await db.query('SELECT status FROM tournament_matches')).rows[0].status, 'ready');
    await db.query("UPDATE tournament_matches SET status='in_progress'");
    assert.equal((await draw('admin')).status, 400, 'An active bracket must not be reshuffled');
    await db.query("UPDATE tournament_matches SET status='completed',team1_score=1");
    assert.equal((await draw('admin')).status, 400, 'Scores must be preserved');
    await db.query('DELETE FROM tournament_participants');
    assert.equal((await db.query('SELECT * FROM tournament_registration_details')).rows.length, 0);
    console.log('PASS: identity fields, dates, age, phone, random slots, bracket persistence, duplicates/capacity, private data, cleanup, admin draw, active matches and results protection.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
