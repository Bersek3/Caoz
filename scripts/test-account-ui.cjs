/* Account-flow regression checks: synthetic API responses only, no real accounts. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'caoz-account-review');
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#321c22"/></svg>');
const startDate = new Date(Date.now() + 86400000).toISOString();
const user = { id: 'account-fixture', email: 'player@example.invalid', username: 'PlayerUI', fullName: 'Jugador de prueba', avatarUrl: image, role: 'player', birthDate: '2000-01-01', age: 26, accountStatus: 'activa', team: null };
const tournament = { id: 'open', slug: 'open', title: 'Torneo de prueba UI', gameId: 'fortnite', gameName: 'Fortnite', bannerUrl: image, thumbnailUrl: image, organizer: { name: 'Organización UI', avatar: image, verified: false, followers: 0 }, status: 'registration_open', format: 'single_elimination', teamType: 'solo', teamSize: 1, region: 'LATAM', entryFee: 'Gratis', entryFeeAmount: 0, prizePool: 'Premio UI', prizeDistribution: [], maxParticipants: 8, startDate, checkInActive: false, checkInOpensAt: '', checkInClosesAt: '', description: 'Torneo sintético.', rules: ['Respeta a los participantes.'], schedule: [], participants: [], rounds: [] };

async function main() {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const contexts = [], failures = [], unexpected = [];
  let passed = 0;
  async function setup({ width = 1440, signedIn = false } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    contexts.push(context);
    if (signedIn) await context.addInitScript(() => localStorage.setItem('caoz_auth_token', 'synthetic-account-token'));
    const state = { currentUser: signedIn ? { ...user } : null, registrationFails: false, calls: [], errors: [] };
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      state.calls.push({ path: url.pathname, method, body: request.postData() ? request.postDataJSON() : null });
      let payload, status = 200;
      if (url.pathname === '/api/auth/login' && method === 'POST') {
        const body = request.postDataJSON();
        if (body.password === 'WrongPassword') { status = 401; payload = { error: 'Credenciales inválidas de prueba.' }; }
        else { state.currentUser = { ...user }; payload = { success: true, user: state.currentUser, token: 'synthetic-account-token' }; }
      } else if (url.pathname === '/api/auth/register' && method === 'POST') {
        const body = request.postDataJSON();
        if (state.registrationFails) { status = 400; payload = { error: 'El correo de prueba ya está registrado.' }; }
        else { const age = Number(new Date().getFullYear()) - Number(body.birthDate.slice(0,4)); state.currentUser = { ...user, username: body.username, birthDate: body.birthDate, age, accountStatus: age < 18 ? 'pendiente_apoderado' : 'activa' }; payload = { success: true, user: state.currentUser, token: 'synthetic-account-token' }; }
      } else if (url.pathname === '/api/auth/me') payload = state.currentUser ? { user: state.currentUser } : { error: 'Sin sesión de prueba.' };
      else if (url.pathname === '/api/tournaments') payload = { tournaments: [tournament] };
      else if (url.pathname === '/api/games') payload = { games: [{ id: 'fortnite', name: 'Fortnite', genre: 'Battle Royale', publisher: 'Epic', defaultTeamSize: 1, coverImage: image, bannerImage: image, tagFieldLabel: 'Epic ID', tagPlaceholder: 'Player' }] };
      else if (url.pathname === '/api/teams') payload = { team: null };
      else if (url.pathname.endsWith('/waitlist')) payload = { joined: false, total: 0, offered: false, position: null, expiresAt: null };
      else { status = 501; payload = { error: 'API inesperada en prueba.' }; unexpected.push(method + ' ' + url.pathname); }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => state.errors.push(error.message));
    return { page, state, context };
  }
  async function check(name, work) {
    try { await work(); passed++; console.log('PASS: ' + name); }
    catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL: ' + name); }
  }
  const goto = (page, destination) => page.goto(BASE_URL + destination);
  const signupFields = async (page, birthDate = '2000-01-01') => {
    await page.getByLabel('Nombre de jugador', { exact: true }).fill('NewPlayerUI');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('newplayer@example.invalid');
    await page.getByLabel('Contraseña', { exact: true }).fill('TestPassword123');
    await page.getByLabel('Fecha de nacimiento', { exact: true }).fill(birthDate);
  };
  const noOverflow = async page => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');

  try {
    await check('account pages preserve arena branding and do not download tournament data', async () => {
      const { page, state } = await setup();
      await goto(page, '/account/login');
      await page.getByRole('form', { name: 'Iniciar sesión', exact: true }).waitFor();
      assert.match(await page.title(), /Iniciar sesión.*CZ ARENA/);
      assert.equal(state.calls.some(call => ['/api/tournaments','/api/games'].includes(call.path)), false);
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.screenshot({ path: path.join(screenshots, 'login-desktop.png'), fullPage: true });
      await page.getByRole('link', { name: 'Crea tu cuenta', exact: true }).click();
      await page.getByRole('form', { name: 'Crear cuenta', exact: true }).waitFor();
      await page.screenshot({ path: path.join(screenshots, 'signup-desktop.png'), fullPage: true });
      await noOverflow(page); assert.deepEqual(state.errors, []);
    });
    await check('login from a tournament keeps its exact return path across signup and back', async () => {
      const { page, state } = await setup();
      const target = '/tournament/open?tab=rules#tournament-support';
      await goto(page, target);
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await page.waitForURL(/\/account\/login/);
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), target);
      await page.getByRole('link', { name: 'Crea tu cuenta', exact: true }).click();
      await page.waitForURL(/\/account\/signup/);
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), target);
      await page.getByRole('link', { name: 'Inicia sesión', exact: true }).click();
      await page.waitForURL(/\/account\/login/);
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), target);
      assert.deepEqual(state.errors, []);
    });
    await check('login errors remain visible and retry returns to the tournament with a session', async () => {
      const { page, state } = await setup();
      const target = '/tournament/open?tab=overview';
      await goto(page, '/account/login?' + new URLSearchParams({ returnTo: target }));
      await page.getByLabel('Correo electrónico', { exact: true }).fill('player@example.invalid');
      await page.getByLabel('Contraseña', { exact: true }).fill('WrongPassword');
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Credenciales inválidas de prueba.' }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/account/login');
      await page.getByLabel('Contraseña', { exact: true }).fill('TestPassword123');
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      await page.waitForURL(BASE_URL + target);
      assert.equal(await page.evaluate(() => localStorage.getItem('caoz_auth_token')), 'synthetic-account-token');
      await page.getByRole('link', { name: 'Mi perfil', exact: true }).first().waitFor();
      assert.deepEqual(state.errors, []);
    });
    await check('password toggle works without submitting and uses correct autofill', async () => {
      const { page, state } = await setup();
      await goto(page, '/account/login');
      const password = page.getByLabel('Contraseña', { exact: true });
      await password.fill('TestPassword123');
      assert.equal(await password.getAttribute('autocomplete'), 'current-password');
      await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
      assert.equal(await password.getAttribute('type'), 'text');
      await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
      assert.equal(await password.getAttribute('type'), 'password');
      assert.equal(state.calls.some(call => call.method === 'POST'), false);
      await page.getByRole('link', { name: 'Crea tu cuenta', exact: true }).click();
      await page.getByRole('form', { name: 'Crear cuenta', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Contraseña', { exact: true }).inputValue(), '');
      assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('autocomplete'), 'new-password');
    });
    await check('signup keeps age and declaration checks before sending any request', async () => {
      const { page, state } = await setup();
      await goto(page, '/account/signup');
      await signupFields(page, new Date().getFullYear() - 10 + '-01-01');
      assert.equal(await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).isDisabled(), true);
      await page.getByText('Debes tener al menos 14 años para crear tu cuenta.', { exact: true }).waitFor();
      await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('2000-01-01');
      await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
      assert.equal(state.calls.some(call => call.path === '/api/auth/register'), false);
      assert.equal(await page.getByRole('checkbox').isChecked(), false);
    });
    await check('signup failure can be corrected and registration preserves the original destination', async () => {
      const { page, state } = await setup();
      const target = '/tournament/open?tab=overview#inscripcion';
      await goto(page, '/account/signup?' + new URLSearchParams({ returnTo: target }));
      await signupFields(page); await page.getByRole('checkbox').check(); state.registrationFails = true;
      await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'El correo de prueba ya está registrado.' }).waitFor();
      state.registrationFails = false;
      await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
      await page.waitForURL(BASE_URL + target);
      const calls = state.calls.filter(call => call.path === '/api/auth/register');
      assert.equal(calls.length, 2);
      assert.equal(calls[1].body.swornDeclaration, true); assert.equal(calls[1].body.username, 'NewPlayerUI');
      assert.deepEqual(state.errors, []);
    });
    await check('minor accounts continue to parental authorization without losing the return path', async () => {
      const { page, state } = await setup();
      const target = '/tournament/open';
      await goto(page, '/account/signup?' + new URLSearchParams({ returnTo: target }));
      await signupFields(page, new Date().getFullYear() - 16 + '-01-01');
      await page.getByText(/Para competir necesitarás la autorización/).waitFor();
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
      await page.waitForURL(/\/profile\?/);
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), target);
      assert.equal(state.currentUser.accountStatus, 'pendiente_apoderado');
    });
    await check('existing sessions show a useful continuation and no second login form', async () => {
      const { page, state } = await setup({ signedIn: true });
      await goto(page, '/account/login?returnTo=%2Ftournament%2Fopen');
      await page.getByRole('heading', { name: 'Ya estás en la arena.', exact: true }).waitFor();
      assert.equal(await page.getByRole('form').count(), 0);
      assert.equal(await page.getByRole('link', { name: 'Continuar', exact: true }).getAttribute('href'), '/tournament/open');
      assert.deepEqual(state.errors, []);
    });
    await check('external and looping return destinations are replaced by the local arena', async () => {
      const { page } = await setup();
      for (const target of ['https://example.invalid/steal','//example.invalid','/\\example.invalid','/account/signup','/account/login?returnTo=/account/signup']) {
        await goto(page, '/account/login?' + new URLSearchParams({ returnTo: target }));
        await page.getByRole('form', { name: 'Iniciar sesión', exact: true }).waitFor();
        assert.equal(await page.getByRole('link', { name: 'Volver a torneos', exact: true }).getAttribute('href'), '/arena');
      }
    });
    for (const width of [390,320]) await check('login and signup fit mobile ' + width + 'px', async () => {
      const { page, state } = await setup({ width });
      for (const mode of ['login','signup']) {
        await goto(page, '/account/' + mode);
        await page.getByRole('form').waitFor(); await noOverflow(page);
        const box = await page.getByRole('button', { name: mode === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta', exact: true }).boundingBox();
        assert(box.width > 0 && box.height >= 44);
        await page.screenshot({ path: path.join(screenshots, mode + '-mobile-' + width + '.png'), fullPage: true });
      }
      assert.deepEqual(state.errors, []);
    });
    assert.deepEqual(unexpected, []);
  } finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
  console.log(`\n${passed} account UI checks passed. Screenshots: ${screenshots}`);
  if (failures.length) { console.error(failures.join('\n\n')); process.exitCode = 1; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
