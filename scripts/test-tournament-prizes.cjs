const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const filename = path.resolve(__dirname,'../src/lib/tournamentPrizes.ts');
const loaded = new Module(filename,module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{ compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,filename);
const { validateTournamentPrizes,prizePlace } = loaded.exports;
assert.deepEqual(validateTournamentPrizes(' Un teclado ',undefined,8),{ prizePool: 'Un teclado',prizeDistribution: [{ place: prizePlace(0),prize: 'Un teclado' }] });
const awards = [{ place: '1.er lugar',prize: '100.000 CLP' },{ place: '2.º lugar',prize: 'Un mouse' },{ place: '3.er lugar',prize: 'Una tarjeta de regalo' }];
assert.deepEqual(validateTournamentPrizes('100.000 CLP + mouse + tarjeta',awards,8).prizeDistribution,awards);
assert.deepEqual([0,1,2,3].map(prizePlace),['1.er lugar','2.º lugar','3.er lugar','4.º lugar']);
for (const [total,rows] of [
  ['',awards],['A',[]],['A',null],['A',[{ place: '',prize: 'A' }]],['A',[{ place: '1',prize: '' }]],
  ['A',[{ place: '1.er lugar',prize: 'A' },{ place: '1.º lugar',prize: 'B' }]],
  ['A',[{ place: '1',prize: 'A'.repeat(201) }]],
  ['A',Array.from({ length: 9 },(_,i) => ({ place: prizePlace(i),prize: 'A' }))]
]) assert.throws(() => validateTournamentPrizes(total,rows,8));
console.log('PASS: one configured prize, multiple different awards, ordinal labels, required descriptions, duplicate places, length and capacity checks.');
