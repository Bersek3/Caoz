const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, overrides = {}) {
  const filename = path.resolve(__dirname,file), loaded = new Module(filename,module);
  loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  loaded.require = name => overrides[name] || original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
  return loaded.exports;
}
async function main() {
  const dates = load('../src/lib/dateUtils.ts');
  const helpers = load('../src/lib/tournamentPresentation.ts',{'./dateUtils':dates});
  const originalZone = process.env.TZ;
  try {
    for (const zone of ['UTC','America/Santiago','America/Bogota','Europe/Madrid']) {
      process.env.TZ = zone;
      assert.equal(dates.normalizeTournamentDate('2026-12-01T20:00'),'2026-12-01T23:00:00.000Z',zone);
      assert.equal(dates.normalizeTournamentDate('2026-07-01T20:00'),'2026-07-02T00:00:00.000Z',zone);
      assert.equal(dates.normalizeTournamentDate('2026-12-01T20:00-03:00'),'2026-12-01T23:00:00.000Z',zone);
      assert.equal(dates.toTournamentDateTimeInput('2026-12-01T23:00:00Z'),'2026-12-01T20:00');
      assert.match(dates.formatTournamentDate('2026-12-01T23:00:00Z'),/20:00.*Chile/);
    }
  } finally { if(originalZone===undefined)delete process.env.TZ;else process.env.TZ=originalZone; }
  assert.equal(dates.parseTournamentDate('2026-02-30T20:00'),null);
  assert.equal(dates.parseTournamentDate('2026-02-30T20:00:00Z'),null);
  assert.equal(dates.parseTournamentDate('2026-12-01T24:00'),null);
  assert.equal(dates.parseTournamentDate('Próximo sábado'),null);
  assert.equal(dates.parseTournamentDate('2026-09-06T00:30'),null,'Skipped Chile DST wall time is rejected');
  const window={startDate:'2026-12-01T23:00:00Z',checkInOpensAt:'45 min antes',checkInClosesAt:'10 min antes',checkInActive:true,status:'check_in'};
  assert.equal(dates.getCheckInWindow(window,new Date('2026-12-01T22:20:00Z')).isOpen,true);
  assert.equal(dates.getCheckInWindow(window,new Date('2026-12-01T22:50:00Z')).isOpen,false);
  assert.equal(dates.getCheckInWindow({...window,status:'registration_open'},new Date('2026-12-01T22:20:00Z')).isOpen,false);
  assert.equal(dates.getCheckInWindow({...window,checkInActive:false},new Date('2026-12-01T22:20:00Z')).hasClosed,true);
  const player={id:'u1',username:'Ana',role:'player'};
  const participant={id:'p1',userId:'u1',name:'Ana',tag:'ANA',avatar:'',seed:1,checkedIn:false,registeredAt:'',captain:{name:'Ana',discord:'',inGameId:'Ana',avatar:''},roster:[]};
  const rival={...participant,id:'p2',userId:'u2',name:'Luis'};
  const tournament={id:'t1',slug:'torneo',title:'Torneo',gameId:'fortnite',gameName:'Fortnite',status:'registration_open',teamType:'solo',teamSize:1,format:'single_elimination',maxParticipants:8,startDate:'2026-12-01T20:00',participants:[],rounds:[],description:'Reglas',checkInActive:false};
  assert.equal(helpers.getTournamentAction(tournament,player).kind,'register');
  assert.equal(helpers.getTournamentAction({...tournament,participants:[participant]},player).kind,'registered');
  assert.equal(helpers.getTournamentAction({...tournament,maxParticipants:1,participants:[rival]},player).kind,'full');
  assert.equal(helpers.findMyRegistration({...tournament,participants:[rival]},player),undefined,'Names cannot impersonate an identified registration');
  assert.equal(helpers.findMyRegistration({...tournament,participants:[{...rival,name:'Ana'}]},player),undefined);
  const teamEntry={...rival,teamId:'team',roster:[{userId:'u2',username:'Luis'}]};
  assert.equal(helpers.findMyRegistration({...tournament,participants:[teamEntry]},{...player,team:{id:'team'}}),undefined,'Joining a team later does not change its registered roster');
  assert.equal(helpers.formatTournamentMode(tournament),'Individual');
  assert.equal(helpers.formatTournamentMode({...tournament,teamType:'team',teamSize:2}),'Dúos');
  assert.equal(helpers.getFeaturedTournament([{...tournament,status:'completed',isFeatured:true}, {...tournament,id:'next'}]).id,'next');
  const match={id:'m1',roundIndex:0,matchIndex:0,team1:{participantId:'p1'},team2:{participantId:'p2'},status:'ready'};
  const live={...tournament,status:'in_progress',participants:[participant,rival],rounds:[{matches:[match]}]};
  assert.equal(helpers.getMyMatches(live,player)[0].id,'m1');
  assert.match(helpers.getTournamentAction(live,player).href,/tab=matches&match=m1/);
  assert.notEqual(helpers.getTournamentAction({...live,rounds:[{matches:[{...match,canAccessRoom:false}]}]},player).kind,'match','A private room without access is never the next action');
  const complete={...live,status:'completed',championId:'p1',runnerUpId:'p2',rounds:[{matches:[{...match,status:'completed',winnerId:'p1'}]}]};
  assert.deepEqual(helpers.getTournamentResults(complete).map(row=>[row.participant.id,row.place]),[['p1',1],['p2',2]]);
  assert.equal(helpers.getTournamentAction(complete,player).kind,'results');
  console.log('PASS: Chile summer/winter timezone independence, DST gaps, real check-in windows, identity matching, contextual actions, modes, featured selection, next match and podium.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
