// Production route handlers and competition service against isolated PostgreSQL in memory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name,...args) { return resolve.call(this,name.startsWith('@/') ? path.join(root,'src',name.slice(2)) : name,...args); };
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS,target: ts.ScriptTarget.ES2020,esModuleInterop: true }
}).outputText,filename);

async function main() {
  delete process.env.DATABASE_URL;
  const memory = new PGlite(); global.__pgliteInstance = memory;
  try {
    const { initDb } = require('../src/lib/db.ts');
    const { signToken } = require('../src/lib/auth.ts');
    const { validateSeriesScore,bracketSeedOrder,recordCompetitionScore } = require('../src/lib/tournamentCompetition.ts');
    const checkIn = require('../src/app/api/tournaments/[id]/check-in/route.ts');
    const draw = require('../src/app/api/tournaments/[id]/draw/route.ts');
    const scores = require('../src/app/api/matches/[id]/score/route.ts');
    const detail = require('../src/app/api/tournaments/[id]/route.ts');
    const catalog = require('../src/app/api/tournaments/route.ts');
    const registration = require('../src/app/api/tournaments/[id]/register/route.ts');
    await initDb();
    for (const bestOf of [1,3,5]) {
      const wins = Math.floor(bestOf/2)+1;
      assert.equal(validateSeriesScore(bestOf,wins,0),true);
      assert.equal(validateSeriesScore(bestOf,wins-1,wins),false);
      for (const pair of [[wins,wins],[-1,wins],[1.5,wins],['2',0],[wins+1,0],[0,0]]) assert.throws(() => validateSeriesScore(bestOf,...pair));
    }
    assert.throws(() => validateSeriesScore(2,2,0));
    assert.deepEqual(bracketSeedOrder(8),[1,8,4,5,2,7,3,6]);
    for (const [id,role] of [['staff','admin'],['owner','player'],['outsider','player'],['member','player']]) {
      await memory.query('INSERT INTO users(id,email,username,password_hash,role) VALUES ($1,$2,$1,$3,$4)',[id,`${id}@example.test`,'unused',role]);
    }
    const start = new Date(Date.now()+86400000).toISOString();
    await memory.query(`INSERT INTO tournaments(id,title,slug,game_id,game_name,start_date,max_participants,team_type,team_size)
      VALUES ('competition','Competition','competition','fortnite','Fortnite',$1,8,'solo',1),('featured','Featured','featured','fortnite','Fortnite',$1,8,'solo',1)`,[start]);
    for (let i=1;i<=7;i++) await memory.query(`INSERT INTO tournament_participants(id,tournament_id,user_id,name,tag,seed,checked_in,roster)
      VALUES ($1,'competition',$2,$1,'SOLO',$3,$4,$5)`,[`p${i}`,i===5?'owner':`user${i}`,i,i<5,JSON.stringify(i===5?[{userId:'owner',username:'Owner',role:'solo',inGameId:'owner#123'},{userId:'member',username:'Member',role:'sub',inGameId:'member#123'}]:[])]);
    const request = (who,body) => new Request('http://localhost/api/test',{method:'POST',headers:{'Content-Type':'application/json',...(who?{authorization:`Bearer ${signToken({userId:who,username:who,email:`${who}@example.test`,role:who==='staff'?'admin':'player'})}`}:{})},body:JSON.stringify(body)});
    const params = {params:Promise.resolve({id:'competition'})};
    await memory.query("INSERT INTO teams(id,name,tag,captain_id) VALUES ('team','Team','TM','owner')");
    await memory.query("INSERT INTO team_members(id,team_id,user_id) VALUES ('owner-member','team','owner'),('member-member','team','member')");
    await memory.query("INSERT INTO tournaments(id,title,slug,game_id,game_name,start_date,team_type,team_size) VALUES ('teams','Teams','teams','fortnite','Fortnite',$1,'team',2)",[start]);
    assert.equal((await registration.POST(request('member',{personalDetails:{fullName:'Ana Perez',birthDate:'2000-04-20',documentNumber:'12345678-9',phone:'+56912345678'}}),{params:Promise.resolve({id:'teams'})})).status,403,'Only the captain can submit a team registration');
    assert.equal((await checkIn.POST(request(null,{participantId:'p5'}),params)).status,401);
    assert.equal((await checkIn.POST(request('owner',{action:'open'}),params)).status,403);
    assert.equal((await checkIn.POST(request('staff',{action:'open'}),params)).status,200);
    assert.equal((await checkIn.POST(request('outsider',{participantId:'p5'}),params)).status,403);
    assert.equal((await checkIn.POST(request('member',{participantId:'p5'}),params)).status,200,'Registered roster can check in');
    assert.equal((await checkIn.POST(request('owner',{participantId:'p5'}),params)).status,200,'Check-in is idempotent');
    assert.equal((await draw.POST(request('staff',{}),params)).status,409,'An open check-in cannot be drawn');
    assert.equal((await checkIn.POST(request('staff',{action:'close'}),params)).status,200);
    assert.equal((await checkIn.POST(request('owner',{participantId:'p5'}),params)).status,409,'Closed window enforced');
    const drawn = await draw.POST(request('staff',{}),params);
    assert.equal(drawn.status,200); assert.equal((await drawn.json()).confirmedParticipants,5);
    let matches = (await memory.query("SELECT * FROM tournament_matches WHERE tournament_id='competition' ORDER BY round_index,match_index")).rows;
    assert.equal(matches.length,7);
    assert.equal(matches.filter(m=>m.status==='completed').length,3,'Three byes for five entrants');
    assert(!matches.some(m=>['p6','p7'].includes(m.team1_participant_id)||['p6','p7'].includes(m.team2_participant_id)),'Only confirmed entrants enter bracket');
    assert.equal((await draw.POST(request('staff',{}),params)).status,409,'Cannot redraw an active competition');
    assert.equal((await registration.DELETE(request('owner',{}),params)).status,409,'A withdrawal cannot damage an active bracket');
    const first = matches.find(m=>m.round_index===0 && m.status==='ready');
    const matchParams = {params:Promise.resolve({id:first.id})};
    assert.equal((await scores.POST(request('staff',{score1:3,score2:2}),matchParams)).status,400,'Invalid BO3 cannot finish a match');
    assert.equal((await scores.POST(request('staff',{score1:2,score2:0}),matchParams)).status,200);
    await memory.transaction(tx=>recordCompetitionScore(tx,first.id,0,2));
    let next = (await memory.query('SELECT * FROM tournament_matches WHERE tournament_id=$1 AND round_index=1 AND match_index=$2',['competition',Math.floor(first.match_index/2)])).rows[0];
    assert.equal(next.status,'ready');
    await memory.transaction(tx=>recordCompetitionScore(tx,next.id,2,0));
    await assert.rejects(()=>memory.transaction(tx=>recordCompetitionScore(tx,first.id,2,0)),/ronda posterior/,'Cannot change the winner after the next round has results');
    await memory.transaction(tx=>recordCompetitionScore(tx,first.id,1,2));
    assert.equal((await memory.query('SELECT status FROM tournament_matches WHERE id=$1',[next.id])).rows[0].status,'completed','Same-winner score correction preserves downstream results');
    let ready;
    while ((ready=(await memory.query("SELECT * FROM tournament_matches WHERE tournament_id='competition' AND status='ready' ORDER BY round_index LIMIT 1")).rows[0])) {
      await memory.transaction(tx=>recordCompetitionScore(tx,ready.id,Math.floor(ready.best_of/2)+1,0));
    }
    assert.equal((await memory.query("SELECT status FROM tournaments WHERE id='competition'")).rows[0].status,'completed');
    const list = await (await catalog.GET(new Request('http://localhost/api/tournaments'))).json();
    const finished = list.tournaments.find(t=>t.id==='competition');
    assert(finished.championId && finished.runnerUpId && finished.championId!==finished.runnerUpId,'Champion and runner-up exposed');
    const shownRoster=finished.participants.find(p=>p.id==='p5').roster;
    assert.equal(shownRoster[0].id,'owner'); assert.equal(shownRoster[0].userId,'owner');
    assert.equal(shownRoster[0].name,'Owner'); assert.equal(shownRoster[0].role,'captain');
    assert.equal(shownRoster[0].inGameId,'owner#123'); assert(shownRoster[0].avatar);
    assert.equal(shownRoster[1].name,'Member'); assert.equal(shownRoster[1].role,'sub');
    const patch = async (id,body,who='staff') => detail.PATCH(request(who,body),{params:Promise.resolve({id})});
    assert.equal((await patch('competition',{isFeatured:true},'owner')).status,403);
    assert.equal((await patch('competition',{prizeDeliveryStatus:'unknown'})).status,400);
    assert.equal((await patch('featured',{prizeDeliveryStatus:'delivered'})).status,409);
    assert.equal((await patch('competition',{isFeatured:true,prizeDeliveryStatus:'processing'})).status,200);
    assert.equal((await patch('featured',{isFeatured:true})).status,200);
    assert.equal(Number((await memory.query('SELECT COUNT(*) AS count FROM tournaments WHERE is_featured=true')).rows[0].count),1);
    assert.equal((await patch('competition',{prizeDeliveryStatus:'delivered'})).status,200);
    const final=finished.rounds.at(-1).matches[0];
    const flipTeam1=finished.championId!==final.team1.participantId;
    assert.equal((await scores.POST(request('staff',{score1:flipTeam1?3:0,score2:flipTeam1?0:3}),{params:Promise.resolve({id:final.id})})).status,409,'Delivered prizes protect the champion from later changes');
    const {editTournament}=require('../src/lib/editTournament.ts');
    await assert.rejects(()=>memory.transaction(tx=>editTournament(tx,'competition',{...finished,bannerUrl:'',thumbnailUrl:'',description:finished.description||'',maxParticipants:16,rebuildBracket:true})),error=>{assert.match(error.message,/premios ya fueron entregados/);return true;},'A delivered tournament cannot lose its final through bracket rebuilding');
    const created = await catalog.POST(request('staff',{title:'Real identity',gameId:'fortnite',format:'single_elimination',startDate:start,prizePool:'100 CLP'}));
    assert.equal(created.status,200);
    const createdId=(await created.json()).tournamentId;
    const actual=(await memory.query('SELECT organizer_id,organizer_followers,organizer_verified FROM tournaments WHERE id=$1',[createdId])).rows[0];
    assert.deepEqual(actual,{organizer_id:'staff',organizer_followers:0,organizer_verified:false});
    assert.equal((await memory.query('SELECT schedule FROM tournaments WHERE id=$1',[createdId])).rows[0].schedule[0].time,start,'Fallback schedule uses the actual start instant');
    assert.equal((await catalog.POST(request('staff',{title:'Unsupported',gameId:'fortnite',format:'double_elimination',startDate:start}))).status,400);
    console.log('PASS: authenticated check-in, roster ownership, open/close windows, confirmed-only draw, balanced byes, active draw protection, valid BO1/3/5, safe corrections, preserved downstream results, champion/finalization, featured uniqueness, prize delivery and real organizer identity.');
  } finally { await memory.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
