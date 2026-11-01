const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
function load(file, overrides = {}) {
  const filename = path.resolve(__dirname,file), loaded = new Module(filename,module);
  loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  loaded.require = name => overrides[name] || original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,filename);
  return loaded.exports;
}
async function main() {
  const rules = load('../src/lib/tournamentRules.ts');
  const config = { gameId: 'fortnite', format: 'single_elimination', teamType: 'solo', teamSize: 1, maxParticipants: 8, region: 'LATAM', title: 'Copa CAOZ', entryFeeAmount: 0, prizePool: '$100', startDate: '2026-12-12T20:00' };
  const variants = new Set();
  for (const format of Object.keys(rules.FORMAT_LABELS)) for (const teamSize of [1,2,3,4]) for (const maxParticipants of [8,16,32]) {
    const input = { ...config,format,teamSize,teamType: teamSize === 1 ? 'solo' : 'team',maxParticipants };
    const resolved = rules.resolveTournamentRules(input,{});
    assert.equal(resolved.rulesMode,'automatic');
    assert.equal(resolved.rulesTemplateVersion,rules.RULES_TEMPLATE_VERSION);
    assert(resolved.rules.some(rule => rule.includes(`${maxParticipants}`)));
    assert(resolved.rules.some(rule => rule.includes(config.title)));
    assert(resolved.rules.some(rule => rule.includes(config.startDate)));
    assert(resolved.rules.every(rule => !/FUTV|CRTECH|Battlefy|Costa Rica/.test(rule)));
    assert(resolved.rules.length > 15);
    variants.add(JSON.stringify(resolved.rules));
    if (format === 'swiss') assert(resolved.rules.some(rule => rule.includes(`${Math.log2(maxParticipants)} rondas`)));
    if (format === 'round_robin') assert(resolved.rules.some(rule => rule.includes(`${maxParticipants-1} encuentros`)));
    if (format === 'double_elimination') assert(resolved.rules.some(rule => rule.includes('segunda BO5')));
    if (teamSize > 1) assert(resolved.rules.some(rule => rule.includes(`${teamSize} titulares`)));
  }
  assert.equal(variants.size,48,'Every supported format/roster/capacity has its own bases');
  const custom = ['Regla especial CAOZ','Segunda regla'];
  assert.deepEqual(rules.resolveTournamentRules(config,{ rulesMode: 'custom',rules: custom }).rules,custom);
  assert.deepEqual(rules.resolveTournamentRules({ ...config, format: 'swiss' },{ rulesMode: 'custom',rules: custom }).rules,custom);
  assert.deepEqual(rules.resolveTournamentRules({ ...config,gameId: 'valorant' },{ rules: custom }).rules,custom);
  assert.deepEqual(rules.getTournamentRulesPreset({ ...config,gameId: 'valorant' }).rules,rules.DEFAULT_TOURNAMENT_RULES);
  for (const invalid of [{ ...config,teamType: 'team',teamSize: 1 },{ ...config,teamType: 'team',teamSize: 5 },{ ...config,format: 'invalid' },{ ...config,maxParticipants: 100 }]) assert.throws(() => rules.resolveTournamentRules(invalid,{}));
  assert.throws(() => rules.resolveTournamentRules(config,{ rulesMode: 'invalid' }));
  assert.throws(() => rules.resolveTournamentRules(config,{ rulesMode: 'custom',rules: [] }));
  assert(rules.formatRulesDocument('CAOZ',custom).includes('1. Regla especial CAOZ'));

  const mockData = load('../src/data/mockData.ts');
  const competition = load('../src/lib/tournamentCompetition.ts');
  const dates = load('../src/lib/dateUtils.ts');
  const prizes = load('../src/lib/tournamentPrizes.ts');
  const service = load('../src/lib/editTournament.ts',{ '@/data/mockData': mockData,'./tournamentRules': rules,
    './tournamentCompetition': competition,'./dateUtils': dates,'./tournamentPrizes': prizes });
  const db = new PGlite();
  try {
    const source = fs.readFileSync(path.resolve(__dirname,'../src/lib/db.ts'),'utf8');
    for (const table of ['torneos','participantes_torneo','rondas_torneo','partidas_torneo','mensajes_partida']) {
      await db.exec(source.match(new RegExp('CREATE TABLE IF NOT EXISTS '+table+' \\([\\s\\S]*?\\n    \\);'))[0]);
    }
    await db.exec(`ALTER TABLE torneos ADD COLUMN entry_fee_amount INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE torneos ADD COLUMN rules_mode VARCHAR(16) NOT NULL DEFAULT 'custom';
      ALTER TABLE torneos ADD COLUMN rules_template_version VARCHAR(64);
      ALTER TABLE torneos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE torneos ADD COLUMN IF NOT EXISTS prize_delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending';
      CREATE VIEW tournaments AS SELECT * FROM torneos;
      CREATE VIEW tournament_participants AS SELECT * FROM participantes_torneo;
      CREATE VIEW tournament_rounds AS SELECT * FROM rondas_torneo;
      CREATE VIEW tournament_matches AS SELECT * FROM partidas_torneo;
      CREATE VIEW match_messages AS SELECT * FROM mensajes_partida;
      CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT);
      CREATE TABLE tournament_payments(tournament_id TEXT,status TEXT,expires_at TIMESTAMPTZ);`);
    const overrides = {
      '@/lib/db': { initDb: async () => {},getDb: async () => db,withDbTransaction: work => db.transaction(work) },
      '@/lib/auth': { verifyToken: () => ({ role: 'admin' }) },
      '@/lib/games': { getOfficialGames: async () => mockData.POPULAR_GAMES },
      '@/lib/matchAccess': { getMatchViewer: async () => ({ role: 'admin',id:'staff',username:'Staff' }),ownsMatchParticipant: () => false },
      '@/lib/tournamentBanner': { MAX_TOURNAMENT_REQUEST_BYTES: 1500000 },
      '@/lib/tournamentRules': rules,
      '@/lib/tournamentPrizes': prizes,
      '@/lib/tournamentCompetition': competition,
      '@/lib/dateUtils': dates,
      '@/lib/userAvatar': load('../src/lib/userAvatar.ts')
    };
    const api = load('../src/app/api/tournaments/route.ts',overrides);
    const create = body => api.POST(new Request('http://localhost/api/tournaments',{ method: 'POST',headers: { authorization: 'Bearer admin' },body: JSON.stringify(body) }));
    let response = await create({ ...config,title: 'Fortnite automatico',rules: ['stale client text'] });
    assert.equal(response.status,200);
    const created = await response.json();
    let saved = (await db.query('SELECT * FROM tournaments WHERE id=$1',[created.tournamentId])).rows[0];
    assert.equal(saved.rules_mode,'automatic');
    assert.equal(saved.rules_template_version,rules.RULES_TEMPLATE_VERSION);
    assert.deepEqual(saved.prize_distribution,[{ place: '1.er lugar',prize: config.prizePool }], 'A total alone awards the configured prize to first place, without invented amounts');
    assert(saved.rules.some(rule => rule.includes(`1.er lugar: ${config.prizePool}`)));
    assert(!saved.rules.includes('stale client text'),'Server generates the bases instead of trusting stale previews');
    await db.exec(`INSERT INTO users VALUES ('avatar-user','Bersek_1'),('captain-user','Captain');`);
    await db.query(`INSERT INTO tournament_participants(id,tournament_id,user_id,name,tag,seed,avatar,captain_name,captain_avatar)
      VALUES ('avatar-player',$1,'avatar-user','Legacy display name','SOLO',1,'/old-photo.jpg','Old name','/old-photo.jpg')`,[created.tournamentId]);
    await db.query(`INSERT INTO tournament_participants(id,tournament_id,user_id,team_id,name,tag,seed,avatar,captain_name,captain_avatar)
      VALUES ('avatar-team',$1,'captain-user','team-id','Team Name','TEAM',2,'/team-logo.svg','Old captain','/old-photo.jpg')`,[created.tournamentId]);
    await db.query(`UPDATE tournament_matches SET team1_participant_id='avatar-player',team1_name='Legacy display name',team1_avatar='/old-photo.jpg',
      team2_participant_id='avatar-team',team2_name='Team Name',team2_avatar='/old-photo.jpg' WHERE tournament_id=$1`,[created.tournamentId]);
    const list = await (await api.GET(new Request('http://localhost/api/tournaments'))).json();
    const tournament = list.tournaments.find(t => t.id === created.tournamentId);
    assert.equal(tournament.rulesMode,'automatic');
    assert.deepEqual(tournament.rules,saved.rules);
    const { getUserAvatar } = load('../src/lib/userAvatar.ts');
    assert.equal(tournament.participants.find(p => p.id === 'avatar-player').avatar,getUserAvatar('Bersek_1'));
    assert.equal(tournament.participants.find(p => p.id === 'avatar-team').captain.avatar,getUserAvatar('Captain'));
    for (const round of tournament.rounds) for (const match of round.matches) {
      assert.equal(match.team1.avatar,getUserAvatar('Bersek_1'),'All rounds use the account username, not the saved photo or display name');
      assert.equal(match.team2.avatar,'/team-logo.svg','Team logos are preserved');
    }
    assert.equal((await db.query("SELECT avatar FROM tournament_participants WHERE id='avatar-player'")).rows[0].avatar,'/old-photo.jpg','Existing tournaments are corrected when read without rewriting their records');
    const changed = { ...tournament,title: 'Nuevo nombre',prizePool: '$999',region: 'EU' };
    await db.transaction(tx => service.editTournament(tx,created.tournamentId,changed));
    saved = (await db.query('SELECT * FROM tournaments WHERE id=$1',[created.tournamentId])).rows[0];
    assert(saved.rules.some(rule => rule.includes('Nuevo nombre')));
    assert(saved.rules.some(rule => rule.includes('$999')));
    assert(saved.rules.some(rule => rule.includes('EU')));
    await db.transaction(tx => service.editTournament(tx,created.tournamentId,{ ...changed,rulesMode: 'custom',rules: custom }));
    await db.transaction(tx => service.editTournament(tx,created.tournamentId,{ ...changed,title: 'Otro nombre',rulesMode: 'custom',rules: custom }));
    saved = (await db.query('SELECT * FROM tournaments WHERE id=$1',[created.tournamentId])).rows[0];
    assert.deepEqual(saved.rules,custom); assert.equal(saved.rules_template_version,null);
    response = await create({ ...config,title: 'Invalid team',teamType: 'team',teamSize: 5 });
    assert.equal(response.status,400);
    const legacy = await create({ ...config,gameId: 'valorant',title: 'Custom legacy',rulesMode: 'custom',rules: custom });
    assert.equal(legacy.status,200);
    const distribution = [{ place: '1.er lugar',prize: '70.000 CLP' },{ place: '2.º lugar',prize: '30.000 CLP' }];
    const multiple = await create({ ...config,title: 'Premios por puesto',prizePool: '100.000 CLP',prizeDistribution: distribution });
    assert.equal(multiple.status,200);
    const multipleId = (await multiple.json()).tournamentId;
    const awarded = (await db.query('SELECT * FROM tournaments WHERE id=$1',[multipleId])).rows[0];
    assert.deepEqual(awarded.prize_distribution,distribution);
    assert(awarded.rules.some(rule => rule.includes('1.er lugar: 70.000 CLP; 2.º lugar: 30.000 CLP')));
    assert.equal((await create({ ...config,title: 'Missing award',prizeDistribution: [{ place: '1.er lugar',prize: '' }] })).status,400);
    assert.equal((await create({ ...config,title: 'Missing total',prizePool: '' })).status,400);
    assert.equal((await create({ ...config,title: 'Duplicate place',prizeDistribution: [{ place: '1.er lugar',prize: 'A' },{ place: '1.º lugar',prize: 'B' }] })).status,400);
    console.log('PASS: 48 distinct presets, solo/duos/trios/squads, four formats, validation, custom preservation, authoritative creation, saved text/version, automatic edits, legacy game rules and downloadable document text.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error);process.exitCode=1; });
