// Run with: node scripts/test-match-chat.cjs
// Exercise the real route handlers against an isolated, in-memory PostgreSQL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  });
  module._compile(source.outputText, filename);
};

async function main() {
  delete process.env.DATABASE_URL;
  const memory = new PGlite();
  global.__pgliteInstance = memory;
  try {
    const { initDb } = require('../src/lib/db.ts');
    const { signToken } = require('../src/lib/auth.ts');
    const chat = require('../src/app/api/matches/[id]/chat/route.ts');
    const tournaments = require('../src/app/api/tournaments/route.ts');
    const score = require('../src/app/api/matches/[id]/score/route.ts');
    await initDb();
    for (const [id, role] of [['admin', 'admin'], ['solo', 'player'], ['captain', 'player'], ['member', 'player'], ['other', 'player'], ['late-member', 'player']]) {
      await memory.query('INSERT INTO usuarios (id, email, username, password_hash, role) VALUES ($1,$2,$1,$3,$4)', [id, `${id}@example.test`, 'unused', role]);
    }
    await memory.query(`INSERT INTO torneos (id,title,slug,game_id,game_name,start_date) VALUES ('test','Test','test','fortnite','Fortnite','2026-12-01T20:00')`);
    await memory.query(`INSERT INTO equipos (id,name,tag,captain_id) VALUES ('team','Team','TM','captain')`);
    await memory.query(`INSERT INTO miembros_equipo (id,team_id,user_id) VALUES ('late','team','late-member')`);
    for (const [id, userId, roster, seed] of [['p1', 'solo', [], 1], ['p2', 'captain', [{userId:'captain'}, {userId:'member'}], 2], ['p3', 'other', [], 3]]) {
      await memory.query('INSERT INTO participantes_torneo (id,tournament_id,user_id,name,tag,seed,roster,team_id) VALUES ($1,$2,$3,$1,$1,$4,$5,$6)', [id, 'test', userId, seed, JSON.stringify(roster), id === 'p2' ? 'team' : null]);
    }
    await memory.query(`INSERT INTO partidas_torneo (id,tournament_id,round_index,round_title,match_index,team1_name,team2_name,team1_participant_id,team2_participant_id,proof_image_url,dispute_reason)
      VALUES ('match','test',0,'Final',0,'Solo','Team','p1','p2','private-proof','private-dispute')`);
    await memory.query(`INSERT INTO rondas_torneo (id,tournament_id,round_index,title) VALUES ('round','test',0,'Final')`);
    await memory.query(`INSERT INTO mensajes_partida (id,match_id,sender_name,message) VALUES ('secret','match','Admin','PRIVATE-CHAT-CONTENT')`);
    const request = (user, method = 'GET', body, role) => new Request('http://localhost/api/test', {
      method,
      headers: user ? { Authorization: `Bearer ${signToken({userId:user, username:user, role:role || (user === 'admin' ? 'admin' : 'player'), email:`${user}@example.test`})}`, 'Content-Type':'application/json' } : {},
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    const params = {params:Promise.resolve({id:'match'})};
    for (const user of ['admin', 'solo', 'captain', 'member', 'other', 'late-member', null]) {
      const allowed = ['admin', 'solo', 'captain', 'member'].includes(user);
      const expected = allowed ? 200 : user ? 403 : 401;
      const read = await chat.GET(request(user), params);
      assert.equal(read.status, expected, `${user}: GET access`);
      if (allowed) assert((await read.json()).messages.some(m => m.message === 'PRIVATE-CHAT-CONTENT'));
      const post = await chat.POST(request(user, 'POST', {message:'hello', senderName:'Fake Admin', senderRole:'admin'}), params);
      assert.equal(post.status, expected, `${user}: POST access`);
      if (allowed) {
        const sent = (await post.json()).message;
        assert.equal(sent.senderRole, user === 'admin' ? 'admin' : user === 'solo' ? 'team1' : 'team2');
        assert.notEqual(sent.senderName, 'Fake Admin');
      }
      const list = await tournaments.GET(request(user));
      assert.equal(list.headers.get('Cache-Control'), 'private, no-store');
      const data = await list.json();
      const match = data.tournaments.find(t => t.id === 'test').rounds[0].matches[0];
      assert.equal(match.canAccessRoom, allowed);
      assert.deepEqual(match.chatMessages, []);
      if (allowed) assert.equal(match.proofImageUrl, 'private-proof');
      assert(!JSON.stringify(data).includes('PRIVATE-CHAT-CONTENT'));
      if (!allowed) {
        assert(!JSON.stringify(data).includes('private-proof'));
        assert(!JSON.stringify(data).includes('private-dispute'));
        const deniedScore = await score.POST(request(user, 'POST', {score1:2,score2:0}), params);
        assert.equal(deniedScore.status, expected);
      }
      console.log(`${user || 'guest'}: read/write ${expected}; public response has no chat`);
    }
    assert.equal((await chat.GET(request('other', 'GET', null, 'admin'), params)).status, 403, 'Role is read from the database');
    const invalid = new Request('http://localhost/api/test', {headers:{Authorization:'Bearer invalid'}});
    assert.equal((await chat.GET(invalid, params)).status, 401);
    assert.equal((await chat.GET(request('admin'), {params:Promise.resolve({id:'missing'})})).status, 404);
    console.log('All match privacy checks passed; no persistent data was changed.');
  } finally {
    await memory.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
