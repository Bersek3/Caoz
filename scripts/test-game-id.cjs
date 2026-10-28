const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, file);
  const loaded = new Module(filename, module);
  loaded.paths = module.paths;
  loaded.require = name => overrides[name] || require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return loaded.exports;
}

async function main() {
  const { createGameId } = load('../src/lib/gameId.ts');
  assert.equal(createGameId('Mortal Kombat 11', new Set()), 'Mortal-Kombat-11');
  assert.equal(createGameId('  Pokémon: Élite!  ', new Set()), 'Pokemon-Elite');
  assert.equal(createGameId('Mortal Kombat 11', new Set(['mortal-kombat-11', 'Mortal-Kombat-11-2'])), 'Mortal-Kombat-11-3');
  assert.equal(createGameId('!!!', new Set()), 'Juego');
  assert(createGameId('A'.repeat(2000), new Set(['A'.repeat(64)])).length <= 64);

  let catalog = [];
  const api = load('../src/app/api/games/route.ts', {
    '@/lib/gameId': { createGameId },
    '@/lib/games': { getOfficialGames: async () => catalog },
    '@/lib/auth': { verifyToken: () => ({ userId: 'admin' }) },
    '@/lib/db': { getDb: async () => ({ query: async (sql, params) => {
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'admin' }] };
      catalog = JSON.parse(params[0]);
      return { rows: [] };
    } }) },
  });
  const save = games => api.PUT(new Request('http://localhost/api/games', {
    method: 'PUT', headers: { authorization: 'Bearer admin' }, body: JSON.stringify({ games }),
  }));
  const game = { name: 'Mortal Kombat 11', genre: 'Fighting', coverImage: '/assets/mk.jpg', defaultTeamSize: 1, tagFieldLabel: 'ID de jugador', tagPlaceholder: 'Tu usuario' };
  assert.equal((await save([game])).status, 200);
  assert.equal(catalog[0].id, 'Mortal-Kombat-11');
  assert.equal(catalog[0].bannerImage, game.coverImage, 'One image is sufficient for new games');
  assert.equal(catalog[0].publisher, '', 'Publisher is not required');
  assert.equal((await save([{ ...catalog[0], name: 'Mortal Kombat XI' }])).status, 200);
  assert.equal(catalog[0].id, 'Mortal-Kombat-11', 'Renaming preserves tournament links');
  assert.equal((await save([...catalog, { ...game, id: 'manually-supplied-id' }])).status, 200);
  assert.equal(catalog[1].id, 'Mortal-Kombat-11-2', 'Server generates a unique ID from the name');
  assert.equal((await save([{ ...catalog[0], coverImage: '/assets/updated.jpg' }])).status, 200);
  assert.equal(catalog[0].bannerImage, '/assets/updated.jpg', 'Editing the image updates the fallback automatically');
  assert.equal((await save([{ ...game, name: '' }])).status, 400);
  assert.equal((await save([catalog[0], catalog[0]])).status, 400);
  console.log('PASS: name-based IDs, accents, punctuation, collisions, length, automatic persistence and stable IDs after rename.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
