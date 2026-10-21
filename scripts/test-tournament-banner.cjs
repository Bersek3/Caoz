const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const path = require('node:path');
const filename = path.resolve(__dirname, '../src/lib/tournamentBanner.ts');
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { prepareTournamentBanner, MAX_BANNER_DATA_URL_LENGTH, MAX_TOURNAMENT_REQUEST_BYTES } = loaded.exports;

async function main() {
  let revoked = 0;
  let broken = false;
  let tooLarge = false;
  const qualities = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:test';
  URL.revokeObjectURL = () => revoked++;
  global.Image = class {
    naturalWidth = 4000;
    naturalHeight = 3000;
    set src(value) { queueMicrotask(() => broken ? this.onerror() : this.onload()); }
  };
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toDataURL(type, quality) {
      qualities.push(quality);
      return 'data:image/jpeg;base64,' + 'A'.repeat(tooLarge || quality > 0.7 ? 800_000 : 400_000);
    }
  };
  global.document = { createElement: () => canvas };
  try {
    const result = await prepareTournamentBanner(new File(['test'], 'banner.png', { type: 'image/png' }));
    assert.equal(result.width, 1200);
    assert.equal(result.height, 900);
    assert(result.dataUrl.length <= MAX_BANNER_DATA_URL_LENGTH);
    assert.deepEqual(qualities, [0.85, 0.7], 'Reduce JPEG quality until the encoded image fits');
    assert(new Blob([JSON.stringify({bannerUrl:result.dataUrl})]).size < MAX_TOURNAMENT_REQUEST_BYTES);
    assert.equal(revoked, 1);
    await assert.rejects(() => prepareTournamentBanner(new File(['bad'], 'bad.svg', {type:'image/svg+xml'})));
    await assert.rejects(() => prepareTournamentBanner(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', {type:'image/jpeg'})));
    broken = true;
    await assert.rejects(() => prepareTournamentBanner(new File(['broken'], 'broken.jpg', {type:'image/jpeg'})));
    assert.equal(revoked, 2, 'Release the object URL on decode errors');
    broken = false; tooLarge = true;
    await assert.rejects(() => prepareTournamentBanner(new File(['noise'], 'noise.jpg', {type:'image/jpeg'})));
    assert.equal(revoked, 3);
    console.log('PASS: dimensions, compression retries, request budget, invalid/oversized input, decode errors and cleanup.');
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
}
main().catch(error => {console.error(error); process.exitCode=1;});
