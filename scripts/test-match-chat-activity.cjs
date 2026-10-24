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
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename);
  return loaded.exports;
}

async function main() {
  const service = load('../src/lib/matchChatActivity.ts');
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE usuarios(id VARCHAR(64) PRIMARY KEY);
      INSERT INTO usuarios VALUES ('admin1'),('admin2');
      CREATE TABLE partidas_torneo(id VARCHAR(64) PRIMARY KEY,tournament_id TEXT);
      INSERT INTO partidas_torneo VALUES ('m1','t1'),('m2','t1'),('m3','t2');
      CREATE VIEW tournament_matches AS SELECT * FROM partidas_torneo;`);
    const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/db.ts'), 'utf8');
    await db.exec(source.match(/CREATE TABLE IF NOT EXISTS mensajes_partida \([\s\S]*?\n    \);/)[0]);
    await db.exec(source.match(/CREATE TABLE IF NOT EXISTS match_chat_reads \([\s\S]*?\n  \)/)[0]);
    await db.exec('CREATE VIEW match_messages AS SELECT * FROM mensajes_partida');
    const activity = async (user = 'admin1') => Object.fromEntries((await service.getTournamentChatActivity(db,'t1',user)).map(item => [item.matchId,item]));
    assert.equal((await activity()).m1.unreadCount, 0);
    assert.equal((await activity()).m1.active, false);
    await db.exec(`INSERT INTO match_messages(id,match_id,sender_name,sender_role,message,created_at) VALUES
      ('sys','m1','Sistema','system','Sala creada',CURRENT_TIMESTAMP),
      ('staff','m1','Staff','admin','Hola',CURRENT_TIMESTAMP),
      ('other','m3','Otro','team1','Privado',CURRENT_TIMESTAMP),
      ('old','m2','Jugador','team1','Antiguo',CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
      ('one','m1','Jugador','team1','Nuevo',CURRENT_TIMESTAMP - INTERVAL '1 second');`);
    let state = await activity();
    assert.deepEqual(Object.keys(state).sort(), ['m1','m2']);
    assert.equal(state.m1.unreadCount, 1, 'Only player messages count');
    assert.equal(state.m1.active, true);
    assert.equal(state.m2.unreadCount, 1);
    assert.equal(state.m2.active, false, 'Old unread messages persist without showing recent activity');
    const snapshot = (await db.query("SELECT MAX(created_at)::text AS cursor FROM match_messages WHERE match_id='m1'")).rows[0].cursor;
    await db.exec("INSERT INTO match_messages(id,match_id,sender_name,sender_role,message,created_at) VALUES ('two','m1','Jugador','team2','Mientras leías',CURRENT_TIMESTAMP + INTERVAL '1 second')");
    await service.markMatchChatRead(db,'m1','admin1',snapshot);
    assert.equal((await activity()).m1.unreadCount, 1, 'Messages arriving after the snapshot remain unread');
    assert.equal((await activity('admin2')).m1.unreadCount, 2, 'Read state belongs to each administrator');
    const latest = (await db.query("SELECT MAX(created_at)::text AS cursor FROM match_messages WHERE match_id='m1'")).rows[0].cursor;
    await service.markMatchChatRead(db,'m1','admin1',latest);
    await service.markMatchChatRead(db,'m1','admin1',snapshot);
    assert.equal((await activity()).m1.unreadCount, 0, 'Late responses cannot move read state backwards');
    assert.equal((await activity()).m2.unreadCount, 1, 'Reading one match does not clear another');

    let viewer = null;
    const dbOverride = { initDb: async () => {}, getDb: async () => db };
    const { GET } = load('../src/app/api/tournaments/[id]/chat-activity/route.ts', {
      '@/lib/db': dbOverride, '@/lib/matchChatActivity': service,
      '@/lib/matchAccess': { getMatchViewer: async () => viewer }
    });
    const request = new Request('http://localhost/api/tournaments/t1/chat-activity');
    const params = { params: Promise.resolve({ id: 't1' }) };
    assert.equal((await GET(request,params)).status,401);
    viewer = { id: 'player', role: 'player' };
    assert.equal((await GET(request,params)).status,403);
    viewer = { id: 'admin1', role: 'admin' };
    const response = await GET(request,params);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    const payload = await response.json();
    assert(payload.activity.every(row => Object.keys(row).sort().join(',') === 'active,matchId,unreadCount'), 'No private message contents are exposed');

    const chat = load('../src/app/api/matches/[id]/chat/route.ts', {
      '@/lib/db': dbOverride, '@/lib/matchChatActivity': service,
      '@/lib/matchAccess': { getMatchAccess: async () => ({ allowed: true, viewer: { id: 'admin2', role: 'admin' } }) }
    });
    const chatResponse = await chat.GET(new Request('http://localhost/api/matches/m1/chat'), { params: Promise.resolve({ id: 'm1' }) });
    assert.equal(chatResponse.status,200);
    assert.equal((await activity('admin2')).m1.unreadCount,0, 'Opening the room marks fetched messages as read');
    await db.query("DELETE FROM partidas_torneo WHERE id='m1'");
    assert.equal((await db.query("SELECT * FROM match_chat_reads WHERE match_id='m1'")).rows.length,0);
    console.log('PASS: admin authorization, player-only counts, recent activity, persistent unread state, per-account/match isolation, snapshot race handling, room read receipts and cascading cleanup.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
