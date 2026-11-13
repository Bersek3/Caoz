// Isolated route/service integration tests. No real network calls or persistent DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { createHmac } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root,'src',name.slice(2)) : name,...args); };
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);

async function main() {
  delete process.env.DATABASE_URL;
  process.env.FLOW_ENV = 'sandbox';
  process.env.FLOW_API_KEY = 'test-key';
  process.env.FLOW_SECRET_KEY = 'test-secret';
  process.env.APP_URL = 'https://arena.example.test';
  const memory = new PGlite();
  global.__pgliteInstance = memory;
  const originalFetch = global.fetch;
  const orders = new Map();
  let creates = 0;
  let failNextCreate = false;
  global.fetch = async (url, options) => {
    assert(String(url).startsWith('https://sandbox.flow.cl/api/payment/'));
    const params=options.method==='POST'?new URLSearchParams(options.body):new URL(url).searchParams;
    const toSign=[...params.keys()].filter(key=>key!=='s').sort().map(key=>key+params.get(key)).join('');
    assert.equal(params.get('s'),createHmac('sha256','test-secret').update(toSign).digest('hex'));
    assert.equal(params.get('apiKey'),'test-key');
    if(options.method==='POST') {
      assert.equal(Number(params.get('amount')),5000);
      assert.equal(params.get('urlConfirmation'),'https://arena.example.test/api/payments/flow/confirmation');
      const uuid='flow-token-'+String(++creates).padStart(12,'0');
      const order={uuid,flowOrder:creates,amount:5000,currency:'CLP',status:1,commerceOrder:params.get('commerceOrder')};
      orders.set(uuid,order);
      if(failNextCreate){failNextCreate=false;throw new Error('Simulated network timeout after provider creation');}
      return Response.json({token:uuid,flowOrder:creates,url:'https://sandbox.flow.cl/checkout'});
    }
    return Response.json(orders.get(params.get('token')) || [...orders.values()].find(order=>order.commerceOrder===params.get('commerceId')));
  };
  try {
    const { initDb } = require('../src/lib/db.ts');
    const { signToken } = require('../src/lib/auth.ts');
    const registration = require('../src/app/api/tournaments/[id]/register/route.ts');
    const webhook = require('../src/app/api/payments/flow/confirmation/route.ts');
    const status = require('../src/app/api/payments/[id]/route.ts');
    const { reconcilePayment, reserveRegistration } = require('../src/lib/tournamentPayments.ts');
    await Promise.all([initDb(),initDb()]);
    for (const user of ['one','two','three','four','five','six','seven']) await memory.query(`INSERT INTO usuarios (id,email,username,password_hash,birth_date) VALUES ($1,$2,$1,'unused','2000-01-01')`,[user,`${user}@example.test`]);
    for (const id of ['paid','late','mismatch','rejected','free','missing-config','team-paid','network-failure']) {
      await memory.query(`INSERT INTO torneos (id,title,slug,game_id,game_name,start_date,team_type,team_size,max_participants,entry_fee,entry_fee_amount) VALUES ($1,$1,$1,'fortnite','Fortnite','2026-12-01T20:00','solo',1,2,$2,$3)`,[id,id==='free'?'Gratis':'5.000 CLP',id==='free'?0:5000]);
      await memory.query(`INSERT INTO rondas_torneo (id,tournament_id,round_index,title) VALUES ($1,$2,0,'Final')`,[`round-${id}`,id]);
      await memory.query(`INSERT INTO partidas_torneo (id,tournament_id,round_index,round_title,match_index,team1_name,team2_name) VALUES ($1,$2,0,'Final',0,'Empty','Empty')`,[`match-${id}`,id]);
    }
    const headers = user => user ? {'Content-Type':'application/json',Authorization:`Bearer ${signToken({userId:user,username:user,role:'player',email:`${user}@example.test`})}`} : {'Content-Type':'application/json'};
    const payer = {first_name:'Test',last_name:'Player',social_id:'12345678-9',phone:'56912345678'};
    const request = (user, method='GET', body) => new Request('https://arena.example.test/api/test',{method,headers:headers(user),...(body?{body:JSON.stringify(body)}:{})});
    const personalDetails = {fullName:'Test Player',birthDate:'2000-01-01',documentNumber:'12345678-9',phone:'+56912345678'};
    const register = (user,id) => registration.POST(request(user,'POST',{username:'forged',captainInGameId:'Player',personalDetails,payer,amount:1,paid:true}),{params:Promise.resolve({id})});
    const count = async id => Number((await memory.query('SELECT COUNT(*) AS count FROM participantes_torneo WHERE tournament_id=$1',[id])).rows[0].count);
    assert.equal((await register(null,'paid')).status,401);
    assert.equal((await register('one','free')).status,200);
    assert.equal(await count('free'),1);
    const free = (await memory.query("SELECT name FROM participantes_torneo WHERE tournament_id='free'")).rows[0];
    assert.equal(free.name,'one','Authenticated identity overrides a client-supplied username');
    const first = await (await register('one','paid')).json();
    assert(first.checkoutUrl);
    assert.equal(await count('paid'),0,'No participant before verification');
    const secondTry = await (await register('one','paid')).json();
    assert.equal(secondTry.paymentId,first.paymentId);
    assert.equal(creates,1,'Retry reuses the same pending checkout');
    await register('two','paid');
    const full = await register('three','paid');
    assert.notEqual(full.status,200,'Reservations occupy capacity');
    assert.equal(creates,2);
    const payment = (await memory.query('SELECT * FROM tournament_payments WHERE id=$1',[first.paymentId])).rows[0];
    const params = {params:Promise.resolve({id:first.paymentId})};
    assert.equal((await status.GET(request('three'),params)).status,404,'Other users cannot inspect a payment');
    const pending = await status.GET(request('one'),params);
    assert.equal((await pending.json()).payment.status,'pending');
    const fakeApproval = await webhook.POST(new Request('https://arena.example.test/api/payments/flow/confirmation',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:payment.provider_uuid,status:'2'})}));
    assert.equal(fakeApproval.status,200);
    assert.equal(await count('paid'),0,'Browser/webhook-supplied status cannot approve a payment');
    orders.get(payment.provider_uuid).status = 2;
    const notify = () => webhook.POST(new Request('https://arena.example.test/api/payments/flow/confirmation',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:payment.provider_uuid,status:'fake'})}));
    const notifications = await Promise.all([notify(),notify()]);
    assert(notifications.every(response=>response.status===200));
    assert.equal(await count('paid'),1,'Repeated callbacks produce one registration');
    const beforeDuplicate = creates;
    await assert.rejects(()=>reserveRegistration('paid',payment.registration,payer));
    assert.equal(creates,beforeDuplicate,'A concurrent confirmed registration cannot be charged again');
    const paidMatch = (await memory.query("SELECT team1_participant_id,team2_participant_id FROM partidas_torneo WHERE tournament_id='paid'")).rows[0];
    const paidParticipant = (await memory.query('SELECT participant_id FROM tournament_payments WHERE id=$1',[first.paymentId])).rows[0].participant_id;
    assert([paidMatch.team1_participant_id,paidMatch.team2_participant_id].includes(paidParticipant),'The confirmed participant occupies either valid drawn slot');
    for (const [user,id] of [['four','late'],['five','mismatch'],['six','rejected']]) {
      const created = await (await register(user,id)).json();
      const local = (await memory.query('SELECT * FROM tournament_payments WHERE id=$1',[created.paymentId])).rows[0];
      const provider = orders.get(local.provider_uuid);
      if (id === 'late') {
        await memory.query("UPDATE torneos SET status='completed' WHERE id=$1",[id]);
        await memory.query("UPDATE tournament_payments SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 minute' WHERE id=$1",[local.id]);
        provider.status=2;
        assert.equal((await reconcilePayment(local.provider_uuid)).status,'refund_required');
        assert.equal(await count(id),0);
      } else if (id === 'mismatch') {
        provider.status=2; provider.amount=1;
        await assert.rejects(()=>reconcilePayment(local.provider_uuid));
        assert.equal(await count(id),0);
      } else {
        provider.status=3;
        assert.equal((await reconcilePayment(local.provider_uuid)).status,'failed');
        assert.equal(await count(id),0);
      }
    }
    await memory.query("UPDATE torneos SET team_type='team',team_size=2 WHERE id='team-paid'");
    await memory.query("INSERT INTO equipos (id,name,tag,captain_id) VALUES ('team','Test Team','TEST','two')");
    for (const member of ['two','three']) await memory.query('INSERT INTO miembros_equipo (id,team_id,user_id) VALUES ($1,$2,$1)',[member,'team']);
    const teamResult = await (await register('two','team-paid')).json();
    assert(teamResult.checkoutUrl);
    const teamPayment = (await memory.query('SELECT * FROM tournament_payments WHERE id=$1',[teamResult.paymentId])).rows[0];
    orders.get(teamPayment.provider_uuid).status=2;
    await reconcilePayment(teamPayment.provider_uuid);
    assert.equal(await count('team-paid'),1,'A single payment registers the whole team');
    const registeredTeam = (await memory.query("SELECT team_id,roster FROM participantes_torneo WHERE tournament_id='team-paid'")).rows[0];
    assert.equal(registeredTeam.team_id,'team');
    assert.equal(registeredTeam.roster.length,2);
    failNextCreate = true;
    assert.notEqual((await register('seven','network-failure')).status,200);
    const review = (await memory.query("SELECT * FROM tournament_payments WHERE tournament_id='network-failure'")).rows[0];
    assert.equal(review.status,'review');
    assert.equal(review.provider_uuid,null);
    const attempts = creates;
    assert.notEqual((await register('seven','network-failure')).status,200);
    assert.equal(creates,attempts,'Unknown network result must not create another charge');
    const recovered = [...orders.values()].find(order=>order.commerceOrder===review.id);
    recovered.status=2;
    assert.equal((await reconcilePayment(recovered.uuid,review.id)).status,'confirmed','Provider callback recovers an interrupted creation');
    assert.equal(await count('network-failure'),1);
    delete process.env.FLOW_API_KEY;
    const disabled = await register('seven','missing-config');
    assert.notEqual(disabled.status,200);
    assert.equal(await count('missing-config'),0);
    assert.equal(Number((await memory.query("SELECT COUNT(*) AS count FROM tournament_payments WHERE tournament_id='missing-config'")).rows[0].count),0);
    console.log('PASS: free/paid registration, signed provider API, authoritative amount and identity, reservations, duplicate callbacks, private status, late/refund, mismatch, rejection, missing config.');
  } finally { global.fetch=originalFetch; await memory.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
