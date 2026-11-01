// Real route/service integration against PostgreSQL in memory; provider calls stay local.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname,'..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name,...args) { return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,...args); };
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}
}).outputText,filename);

async function main() {
  delete process.env.DATABASE_URL;
  process.env.VIRTUALPOS_ENV='sandbox'; process.env.VIRTUALPOS_API_KEY='test-key'; process.env.VIRTUALPOS_SECRET_KEY='test-secret';
  process.env.APP_URL='https://arena.example.test';
  const memory=new PGlite(); global.__pgliteInstance=memory;
  const originalFetch=global.fetch;
  let calls=0;
  global.fetch=async (url,options)=>{
    assert(String(url).startsWith('https://api.virtualpos-sandbox.com/v3/payment/'));
    assert.equal(options.method,'POST');
    const body=JSON.parse(options.body),uuid=`waitlist-payment-${++calls}`;
    return Response.json({status:'OK',payment:{order:{uuid,amount:body.amount,merchant_internal_code:body.merchant_internal_code,status:'pendiente'}},url_redirect:`https://pay.virtualpos-sandbox.com/checkout/${uuid}`});
  };
  try {
    const {initDb}=require('../src/lib/db.ts');
    const {signToken}=require('../src/lib/auth.ts');
    const endpoint=require('../src/app/api/tournaments/[id]/waitlist/route.ts');
    const {assertWaitlistTurn,advanceWaitlist}=require('../src/lib/tournamentWaitlist.ts');
    const {reserveRegistration}=require('../src/lib/tournamentPayments.ts');
    await initDb();
    for(const id of ['one','two','three','outsider','holder1','holder2','disabled','captainA','memberA','captainB','memberB']) {
      await memory.query("INSERT INTO users(id,email,username,password_hash,birth_date,account_status) VALUES($1,$2,$1,'unused','2000-01-01',$3)",[id,`${id}@example.test`,id==='disabled'?'pendiente':'activa']);
    }
    const start=new Date(Date.now()+86400000).toISOString();
    for(const [id,max,fee,type,size] of [['fifo',2,0,'solo',1],['paid',1,5000,'solo',1],['teams',1,0,'team',2],['hidden',2,0,'solo',1]]) {
      await memory.query(`INSERT INTO tournaments(id,title,slug,game_id,game_name,start_date,max_participants,entry_fee_amount,entry_fee,team_type,team_size,is_hidden)
        VALUES($1,$1,$1,'fortnite','Fortnite',$2,$3,$4,$5,$6,$7,$8)`,[id,start,max,fee,fee?'5.000 CLP':'Gratis',type,size,id==='hidden']);
    }
    const addParticipant=async (tournament,user,seed=1)=>memory.query(`INSERT INTO tournament_participants(id,tournament_id,user_id,name,tag,seed,roster)
      VALUES($1,$2,$3,$3,'SOLO',$4,$5)`,[`${tournament}-${user}`,tournament,user,seed,JSON.stringify([{userId:user}])]);
    await addParticipant('fifo','holder1',1); await addParticipant('fifo','holder2',2);
    await addParticipant('paid','holder1'); await addParticipant('teams','holder1');
    const request=(who,method)=>new Request('https://arena.example.test/api/test',{method,headers:who?{authorization:`Bearer ${signToken({userId:who,username:who,email:`${who}@example.test`,role:'player'})}`}:{}});
    const call=(who,id,method='GET')=>endpoint[method](request(who,method),{params:Promise.resolve({id})});
    const state=async (who,id,method='GET')=>{const response=await call(who,id,method);assert.equal(response.status,200,JSON.stringify(await response.clone().json()));return response.json();};
    const registration=(user,teamId=null,roster=[user])=>({userId:user,teamId,name:teamId||user,tag:teamId?'TEAM':'SOLO',captainName:user,captainDiscord:'',captainInGameId:user,roster:roster.map(userId=>({userId,username:userId}))});
    const payer={first_name:'Test',last_name:'Player',social_id:'12345678-9',phone:'56912345678'};
    assert.equal((await call(null,'fifo')).status,401);
    assert.equal((await call('one','hidden')).status,404);
    assert.equal((await call('one','missing')).status,404);
    assert.equal((await call('disabled','fifo','POST')).status,403);
    assert.equal((await state('one','fifo','POST')).position,1);
    assert.equal((await state('two','fifo','POST')).position,2);
    assert.equal((await state('three','fifo','POST')).position,3);
    assert.equal((await state('one','fifo','POST')).total,3,'Joining twice is idempotent');
    assert.equal((await state('three','fifo')).offered,false,'A full tournament cannot offer a seat');
    await memory.query("DELETE FROM tournament_participants WHERE id='fifo-holder1'");
    await state('three','fifo');
    let first=await state('one','fifo');
    assert.equal(first.offered,true,'Oldest waiting entrant receives the vacancy');
    const remaining=new Date(first.expiresAt).getTime()-Date.now();
    assert(remaining>14*60000 && remaining<=15*60000,'Offer lasts 15 minutes');
    await assert.rejects(()=>reserveRegistration('fifo',registration('outsider'),payer),/lista de espera/,'An outsider cannot take an offered seat');
    await reserveRegistration('fifo',registration('one'),payer);
    assert.equal((await state('one','fifo')).joined,false,'Registration consumes the queue entry');
    assert.equal((await call('one','fifo','POST')).status,409,'Registered players cannot queue twice');
    await memory.query("DELETE FROM tournament_participants WHERE id='fifo-holder2'");
    assert.equal((await state('two','fifo')).offered,true);
    await memory.query("UPDATE tournament_waitlist SET offer_expires_at=CURRENT_TIMESTAMP-INTERVAL '1 minute' WHERE tournament_id='fifo' AND user_id='two'");
    assert.equal((await state('three','fifo')).offered,true,'Expired offer passes to the next entrant');
    assert.equal((await state('two','fifo')).joined,false);
    assert.equal((await state('two','fifo','POST')).position,2,'Expired entrants rejoin at the back');
    await state('three','fifo','DELETE');
    assert.equal((await state('two','fifo')).offered,true,'Declining advances the next waiting entrant');
    await reserveRegistration('fifo',registration('two'),payer);
    assert.equal(Number((await memory.query("SELECT COUNT(*) AS count FROM tournament_participants WHERE tournament_id='fifo'")).rows[0].count),2);
    assert.equal(calls,0,'Free registration never contacts a provider');
    await state('one','paid','POST'); await state('two','paid','POST');
    await memory.query("DELETE FROM tournament_participants WHERE id='paid-holder1'");
    assert.equal((await state('one','paid')).offered,true);
    const payment=await reserveRegistration('paid',registration('one'),payer);
    assert(payment.checkoutUrl); assert.equal(calls,1);
    assert.equal((await state('one','paid')).joined,false,'A payment reservation replaces its queue offer');
    assert.equal((await state('two','paid')).offered,false,'Pending checkout occupies the vacancy');
    assert.equal((await call('one','paid','POST')).status,409,'Pending payers cannot also reserve a queue offer');
    const retry=await reserveRegistration('paid',registration('one'),payer);
    assert.equal(retry.paymentId,payment.paymentId); assert.equal(calls,1,'Retry resumes the reserved checkout');
    await memory.query("UPDATE tournament_payments SET status='failed',expires_at=CURRENT_TIMESTAMP-INTERVAL '1 minute' WHERE id=$1",[payment.paymentId]);
    assert.equal((await state('two','paid')).offered,true,'Expired/failed checkout frees the next turn');
    await memory.query("UPDATE tournaments SET status='check_in' WHERE id='paid'");
    assert.equal((await call('three','paid','POST')).status,409);
    await memory.query("INSERT INTO teams(id,name,tag,captain_id) VALUES('teamA','Team A','A','captainA'),('teamB','Team B','B','captainB')");
    await memory.query("INSERT INTO team_members(id,team_id,user_id) VALUES('ca','teamA','captainA'),('ma','teamA','memberA'),('cb','teamB','captainB')");
    assert.equal((await call('memberA','teams','POST')).status,403,'Only the captain can add a team');
    assert.equal((await call('captainB','teams','POST')).status,409,'Incomplete teams cannot occupy the queue');
    await memory.query("INSERT INTO team_members(id,team_id,user_id) VALUES('mb','teamB','disabled')");
    assert.equal((await call('captainB','teams','POST')).status,403,'Every roster account must be enabled');
    await memory.query("UPDATE team_members SET user_id='memberB' WHERE id='mb'");
    await state('captainA','teams','POST'); await state('captainB','teams','POST');
    await memory.query("DELETE FROM tournament_participants WHERE id='teams-holder1'");
    assert.equal((await state('captainA','teams')).offered,true);
    await state('memberA','teams','DELETE');
    assert.equal((await state('captainA','teams')).joined,true,'Other team members cannot decline the captain offer');
    const teamEvent=(await memory.query("SELECT * FROM tournaments WHERE id='teams'")).rows[0];
    await assert.rejects(()=>memory.transaction(tx=>assertWaitlistTurn(tx,teamEvent,'captainA','teamB')),/lista de espera/,'An offer cannot transfer to a different team');
    await memory.query("UPDATE teams SET captain_id='memberA' WHERE id='teamA'");
    assert.equal((await state('memberA','teams')).offered,true,'An offer belongs to the team if captaincy changes');
    await state('captainA','teams','DELETE');
    assert.equal((await state('memberA','teams')).joined,true,'Former captain cannot decline the team offer');
    await state('memberA','teams','DELETE');
    assert.equal((await state('captainB','teams')).offered,true);
    // Registered roster overlap is checked even when the captain or team ID differs.
    await memory.query("INSERT INTO tournament_participants(id,tournament_id,user_id,name,tag,seed,roster) VALUES('existing-roster','teams','outsider','Other team','OT',1,$1)",[JSON.stringify([{userId:'memberA'}])]);
    assert.equal((await call('memberA','teams','POST')).status,409);
    // Stale waitlist rows associated with a checkout are removed before allocating seats.
    await memory.query("UPDATE tournaments SET status='registration_open' WHERE id='paid'");
    await memory.query("INSERT INTO tournament_waitlist(id,tournament_id,user_id,status) VALUES('stale','paid','one','waiting')");
    await memory.query("UPDATE tournament_payments SET status='pending',expires_at=CURRENT_TIMESTAMP+INTERVAL '15 minutes' WHERE id=$1",[payment.paymentId]);
    const paidEvent=(await memory.query("SELECT * FROM tournaments WHERE id='paid'")).rows[0];
    await memory.transaction(async tx=>{await tx.query("SELECT id FROM tournaments WHERE id='paid' FOR UPDATE");await advanceWaitlist(tx,paidEvent);});
    assert.equal((await memory.query("SELECT * FROM tournament_waitlist WHERE id='stale'")).rows.length,0);
    assert.equal((await call('outsider','fifo')).headers.get('Cache-Control'),'private, no-store');
    console.log('PASS: FIFO positions, idempotent join, authenticated and enabled accounts, hidden events, 15-minute offers, expiry/rejoin, decline, free claims, protected offers, checkout capacity and retry, payment failure, complete/captain-only teams, roster overlap, captain changes and team-bound turns.');
  } finally { global.fetch=originalFetch; await memory.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
