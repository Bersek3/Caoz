const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, file), loaded = new Module(filename, module);
  loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  loaded.require = name => overrides[name] || original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return loaded.exports;
}
async function main() {
  const mockData = load('../src/data/mockData.ts');
  const service = load('../src/lib/editTournament.ts', { '@/data/mockData': mockData, './tournamentRules': load('../src/lib/tournamentRules.ts') });
  const db = new PGlite();
  try {
    // Exercise the production table definitions and compatibility views in memory.
    const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/db.ts'), 'utf8');
    for (const table of ['torneos','participantes_torneo','rondas_torneo','partidas_torneo','mensajes_partida']) {
      const ddl = source.match(new RegExp('CREATE TABLE IF NOT EXISTS '+table+' \\([\\s\\S]*?\\n    \\);'));
      assert(ddl, table); await db.exec(ddl[0]);
    }
    await db.exec(`ALTER TABLE torneos ADD COLUMN entry_fee_amount INT DEFAULT 0;
      ALTER TABLE torneos ADD COLUMN rules_mode VARCHAR(16) DEFAULT 'custom';
      ALTER TABLE torneos ADD COLUMN rules_template_version VARCHAR(64);
      CREATE VIEW tournaments AS SELECT * FROM torneos;
      CREATE VIEW tournament_participants AS SELECT * FROM participantes_torneo;
      CREATE VIEW tournament_rounds AS SELECT * FROM rondas_torneo;
      CREATE VIEW tournament_matches AS SELECT * FROM partidas_torneo;
      CREATE VIEW match_messages AS SELECT * FROM mensajes_partida;
      CREATE TABLE tournament_payments(id TEXT,tournament_id TEXT,status TEXT,expires_at TIMESTAMPTZ);
      INSERT INTO tournaments(id,title,slug,game_id,game_name,start_date) VALUES ('t1','Original','original','valorant','Valorant','2026-11-01T20:00');
      INSERT INTO tournament_participants(id,tournament_id,user_id,name,tag,seed,checked_in) VALUES ('p1','t1','u1','Ana','SOLO',7,true);
      INSERT INTO tournament_rounds(id,tournament_id,round_index,title) VALUES ('r1','t1',0,'Ronda 1');
      INSERT INTO tournament_matches(id,round_id,tournament_id,round_index,round_title,match_index,team1_name,team2_name,team1_score,status,scheduled_time)
        VALUES ('m1','r1','t1',0,'Ronda 1',0,'Ana','Luis',2,'completed','2026-11-01T20:00');
      INSERT INTO match_messages(id,match_id,sender_name,sender_role,message) VALUES ('msg1','m1','Ana','team1','Prueba');`);
    const data = {
      title: 'Nuevo nombre', gameId: 'valorant', bannerUrl: '/assets/banner.svg', thumbnailUrl: '/assets/mini.svg',
      organizer: { name: 'CAOZ', avatar: '', verified: true, followers: 25 }, status: 'registration_open',
      format: 'single_elimination', teamType: 'team', teamSize: 5, region: 'GLOBAL', entryFeeAmount: 2500,
      prizePool: '$100', prizeDistribution: [{ place: '1', prize: '$100' }], maxParticipants: 8,
      startDate: '2026-12-01T21:00', checkInOpensAt: '30 minutos antes', checkInClosesAt: '10 minutos antes',
      checkInActive: true, description: 'Actualizado', rules: ['Uno','Dos','Tres','Cuatro'], schedule: [{ stage: 'Final', time: '21:00', format: 'BO5' }], isHidden: true
    };
    const update = body => db.transaction(tx => service.editTournament(tx, 'original', body));
    const result = await update(data);
    assert.equal(result.slug, 'original', 'Renaming preserves links');
    let saved = (await db.query('SELECT * FROM tournaments')).rows[0];
    assert.equal(saved.title, data.title); assert.equal(saved.region, 'GLOBAL');
    assert.equal(saved.entry_fee_amount, 2500); assert.equal(saved.is_hidden, true);
    assert.deepEqual(saved.rules, data.rules); assert.deepEqual(saved.schedule, data.schedule);
    assert.deepEqual(saved.prize_distribution, data.prizeDistribution);
    assert.equal((await db.query('SELECT * FROM tournament_matches')).rows[0].team1_score, 2);
    assert.equal((await db.query('SELECT * FROM tournament_matches')).rows[0].scheduled_time, data.startDate);
    assert.equal((await db.query('SELECT * FROM match_messages')).rows.length, 1);
    await assert.rejects(() => update({ ...data, maxParticipants: 16 }), /Confirma/);
    assert.equal((await db.query('SELECT max_participants FROM tournaments')).rows[0].max_participants, 8);
    for (const invalid of [{ ...data, entryFeeAmount: -1 }, { ...data, teamSize: 0 }, { ...data, status: 'invalid' }, { ...data, title: '' }, { ...data, bannerUrl: 'javascript:alert(1)' }, { ...data, rules: [42] }]) await assert.rejects(() => update(invalid));
    await db.query("INSERT INTO tournament_payments VALUES ('pay','t1','pending',$1)", [new Date(Date.now()+3600000)]);
    await assert.rejects(() => update({ ...data, maxParticipants: 16, rebuildBracket: true }), /pagos/);
    await db.query('DELETE FROM tournament_payments');
    await update({ ...data, maxParticipants: 16, rebuildBracket: true });
    assert.equal((await db.query('SELECT * FROM tournament_rounds')).rows.length, 4);
    assert.equal((await db.query('SELECT * FROM tournament_matches')).rows.length, 15);
    assert.equal((await db.query('SELECT * FROM match_messages')).rows.length, 0);
    const participant = (await db.query('SELECT * FROM tournament_participants')).rows[0];
    assert.equal(participant.id, 'p1'); assert.equal(participant.checked_in, true);
    assert(participant.seed >= 1 && participant.seed <= 16);
    assert.equal((await db.query("SELECT * FROM tournament_matches WHERE team1_participant_id='p1' OR team2_participant_id='p1'")).rows.length, 1);
    for (let i = 2; i <= 9; i++) await db.query("INSERT INTO tournament_participants(id,tournament_id,name,tag,seed) VALUES ($1,'t1',$1,'SOLO',$2)", [`p${i}`,i]);
    await assert.rejects(() => update({ ...data, rebuildBracket: true }), /cupo/);
    const { PUT } = load('../src/app/api/tournaments/[id]/route.ts', {
      '@/lib/auth': { verifyToken: token => ({ role: token === 'admin' ? 'admin' : 'player' }) },
      '@/lib/db': { initDb: async () => {}, withDbTransaction: work => db.transaction(work) },
      '@/lib/editTournament': service,
      '@/lib/tournamentBanner': { MAX_TOURNAMENT_REQUEST_BYTES: 1500000 }
    });
    const request = (token,body) => new Request('http://localhost/api/tournaments/t1', { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body });
    const params = { params: Promise.resolve({ id: 't1' }) };
    assert.equal((await PUT(request('player',JSON.stringify(data)),params)).status,403);
    assert.equal((await PUT(request('admin','{bad'),params)).status,400);
    assert.equal((await PUT(request('admin','x'.repeat(1500001)),params)).status,413);
    assert.equal((await PUT(request('admin',JSON.stringify({ ...data, maxParticipants: 16 })),params)).status,200);
    console.log('PASS: admin-only edits, all settings, stable links, preserved results/chats, date propagation, explicit bracket reset, preserved entrants/check-in, capacity/payment guards, invalid input and request size.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
