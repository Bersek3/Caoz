/* Browser regression checks. Every /api/** request is fulfilled with synthetic fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'caoz-tournament-review');
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#39222a"/><path d="M0 400L800 0" stroke="#ad6e77" stroke-width="150"/></svg>');
const iso = offset => new Date(Date.now() + offset * 60000).toISOString();
const participant = (id, name, checkedIn = false) => ({ id, userId: id === 'p-me' ? 'ui-player' : `user-${id}`, name, tag: 'UI', avatar: image, seed: id === 'p-me' ? 1 : 2, checkedIn, registeredAt: iso(-120), captain: { name, discord: 'ui-fixture', inGameId: `${name}#123`, avatar: image }, roster: [] });
const user = role => ({ id: role === 'admin' ? 'ui-admin' : 'ui-player', email: 'fixture@example.invalid', username: role === 'admin' ? 'AdminUI' : 'PlayerUI', fullName: 'Usuario de prueba', role, avatarUrl: image, accountStatus: 'activa', epicGamesUsername: 'PlayerUI', birthDate: '2000-01-01', team: null });

function match(completed = false) {
  return { id: 'live-match', roundIndex: 0, roundTitle: 'Gran Final', matchIndex: 0, bracketType: 'winners', team1: { participantId: 'p-me', name: 'PlayerUI', avatar: image, score: completed ? 3 : 0 }, team2: { participantId: 'p-other', name: 'RivalUI', avatar: image, score: completed ? 1 : 0 }, status: completed ? 'completed' : 'ready', winnerId: completed ? 'p-me' : undefined, bestOf: 5, scheduledTime: iso(30), canAccessRoom: true, chatMessages: [] };
}

function fixtures(role) {
  const base = { id: 'open', title: 'Fortnite Abierto UI', slug: 'open', gameId: 'fortnite', gameName: 'Fortnite', bannerUrl: image, thumbnailUrl: image, organizer: { name: 'Organización UI', avatar: image, verified: true, followers: 0 }, status: 'registration_open', format: 'single_elimination', teamType: 'solo', teamSize: 1, region: 'LATAM', entryFee: 'Gratis', entryFeeAmount: 0, prizePool: '$50.000 CLP', prizeDistribution: [{ place: '1.er lugar', prize: '$50.000 CLP' }], maxParticipants: 8, startDate: iso(1440), checkInOpensAt: iso(1395), checkInClosesAt: iso(1430), checkInActive: false, description: 'Competencia sintética para verificar la interfaz.', rules: ['Respeta a los participantes.', 'Confirma tu asistencia en el horario publicado.'], schedule: [], participants: [], rounds: [], prizeDeliveryStatus: 'pending' };
  const round = completed => [{ roundIndex: 0, title: 'Gran Final', bracketType: 'winners', matches: [match(completed)] }];
  const ownParticipants = [participant('p-me', 'PlayerUI', role === 'admin'), participant('p-other', 'RivalUI', true)];
  const tournaments = [
    { ...base },
    { ...base, id: 'paid', slug: 'paid', title: 'Valorant Pago UI', gameId: 'valorant', gameName: 'Valorant', region: 'NA', entryFee: '$5.000 CLP', entryFeeAmount: 5000, teamType: 'team', teamSize: 5 },
    { ...base, id: 'full', slug: 'full', title: 'Fortnite Completo UI', maxParticipants: 2, participants: [participant('p-a', 'AlphaUI'), participant('p-b', 'BetaUI')] },
    { ...base, id: 'checkin', slug: 'checkin', title: 'Fortnite Check-in UI', status: 'check_in', startDate: iso(30), checkInOpensAt: iso(-15), checkInClosesAt: iso(20), checkInActive: true, participants: structuredClone(ownParticipants) },
    { ...base, id: 'live', slug: 'live', title: 'Fortnite En Juego UI', status: 'in_progress', startDate: iso(-10), participants: [participant('p-me', 'PlayerUI', true), participant('p-other', 'RivalUI', true)], rounds: round(false), isFeatured: true },
    { ...base, id: 'completed', slug: 'completed', title: 'Fortnite Finalizado UI', status: 'completed', startDate: iso(-1440), participants: [participant('p-me', 'PlayerUI', true), participant('p-other', 'RivalUI', true)], rounds: round(true), championId: 'p-me', runnerUpId: 'p-other' },
    { ...base, id: 'hidden', slug: 'hidden', title: 'Torneo Oculto UI', isHidden: true },
  ];
  return { tournaments, games: [{ id: 'fortnite', name: 'Fortnite', genre: 'Battle Royale', publisher: 'Epic', defaultTeamSize: 1, coverImage: image, bannerImage: image, tagFieldLabel: 'Epic Games ID', tagPlaceholder: 'PlayerUI' }, { id: 'valorant', name: 'Valorant', genre: 'FPS', publisher: 'Riot', defaultTeamSize: 5, coverImage: image, bannerImage: image, tagFieldLabel: 'Riot ID', tagPlaceholder: 'Player#123' }] };
}

async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert(sizes.body <= sizes.viewport + 1, `Horizontal overflow: ${JSON.stringify(sizes)}`);
}

async function run() {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const failures = [];
  let checks = 0;
  let interceptedRequests = 0;
  const contexts = [];

  async function setup({ role = null, viewport = { width: 1440, height: 1000 }, delay = 0, failure = false, extra = 0 } = {}) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    contexts.push(context);
    await context.addInitScript(({ role }) => {
      if (role && !localStorage.getItem('__fixture_auth_bootstrapped')) {
        localStorage.setItem('caoz_auth_token', 'synthetic-ui-token');
        localStorage.setItem('__fixture_auth_bootstrapped', 'true');
      }
    }, { role });
    const paymentBase = { amount: 5000, tournamentSlug: 'paid', title: 'Valorant Pago UI', username: 'PlayerUI', created_at: iso(-15) };
    const state = { ...fixtures(role), failure, delay, waitlist: { joined: false, position: null, total: 2, offered: false, expiresAt: null }, payments: {
      'pay-active': { ...paymentBase, id: 'pay-active', status: 'pending', expiresAt: iso(15), checkoutUrl: 'https://payments.example.invalid/checkout/ui-active' },
      'pay-expired': { ...paymentBase, id: 'pay-expired', status: 'pending', expiresAt: iso(-1), checkoutUrl: 'https://payments.example.invalid/checkout/ui-expired' },
      'pay-review': { ...paymentBase, id: 'pay-review', status: 'review', expiresAt: iso(15), verifying: true },
      'pay-refund': { ...paymentBase, id: 'pay-refund', status: 'refund_required', expiresAt: iso(-15) },
    } };
    for (let i = 0; i < extra; i++) state.tournaments.push({ ...state.tournaments[0], id: `extra-${i}`, slug: `extra-${i}`, title: `Extra torneo UI ${i}` });
    const errors = [];
    const calls = [];
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      interceptedRequests++;
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      calls.push(`${method} ${url.pathname}`);
      let body;
      try { body = request.postDataJSON(); } catch { body = {}; }
      let payload;
      let status = 200;
      if (url.pathname === '/api/auth/me') payload = { user: user(role || 'player') };
      else if (url.pathname === '/api/games') payload = { games: state.games };
      else if (url.pathname === '/api/payments') payload = { payments: Object.values(state.payments) };
      else if (/^\/api\/payments\/[^/]+$/.test(url.pathname)) {
        const payment = state.payments[decodeURIComponent(url.pathname.split('/')[3])];
        if (payment) payload = { payment, verifying: Boolean(payment.verifying) };
        else { status = 404; payload = { error: 'Pago de prueba no encontrado' }; }
      }
      else if (url.pathname === '/api/tournaments') {
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        if (state.failure) { status = 503; payload = { error: 'Error sintético de conexión' }; }
        else payload = { tournaments: state.tournaments };
      } else if (/^\/api\/tournaments\/[^/]+\/waitlist$/.test(url.pathname)) {
        if (method === 'POST') state.waitlist = { joined: true, position: 3, total: 3, offered: false, expiresAt: null };
        if (method === 'DELETE') state.waitlist = { joined: false, position: null, total: 2, offered: false, expiresAt: null };
        payload = state.waitlist;
      } else if (/^\/api\/tournaments\/[^/]+\/chat-activity$/.test(url.pathname)) payload = { matches: [], totalUnread: 0 };
      else if (/^\/api\/matches\/[^/]+\/chat$/.test(url.pathname)) payload = method === 'POST' ? { message: { id: 'ui-message', senderName: 'PlayerUI', senderRole: 'team1', message: body.message, timestamp: new Date().toISOString() } } : { messages: [] };
      else if (/^\/api\/tournaments\/[^/]+\/check-in$/.test(url.pathname)) {
        const tournament = state.tournaments.find(t => t.id === url.pathname.split('/')[3]);
        if (body.action) { tournament.status = 'check_in'; tournament.checkInActive = body.action === 'open'; if (body.action === 'close') tournament.checkInClosesAt = iso(-1); }
        else tournament.participants.find(p => p.id === body.participantId).checkedIn = true;
        payload = { success: true };
      } else if (/^\/api\/tournaments\/[^/]+\/draw$/.test(url.pathname)) {
        const tournament = state.tournaments.find(t => t.id === url.pathname.split('/')[3]);
        tournament.status = 'in_progress'; tournament.checkInActive = false; payload = { success: true };
      } else if (/^\/api\/tournaments\/[^/]+$/.test(url.pathname) && method === 'PATCH') {
        const tournament = state.tournaments.find(t => t.id === url.pathname.split('/')[3]);
        if (body.isFeatured) state.tournaments.forEach(t => { t.isFeatured = false; });
        Object.assign(tournament, body); payload = { success: true };
      } else { errors.push(`Unexpected intercepted API: ${method} ${url.pathname}`); status = 501; payload = { error: 'API no configurada en la prueba' }; }
      try { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) }); } catch (error) { if (!page.isClosed()) throw error; }
    });
    async function goto(route = '/arena') {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /Tu próxima competencia|Fortnite|Valorant|Estado de tu inscripción|Mis pagos|Pagos de inscripciones/ }).first().waitFor();
    }
    return { context, page, state, errors, calls, goto };
  }

  async function check(name, fn) {
    try { await fn(); checks++; process.stdout.write(`PASS ${name}\n`); }
    catch (error) {
      failures.push(`${name}: ${error.message}`);
      const current = contexts.at(-1)?.pages().at(-1);
      if (current) await current.screenshot({ path: path.join(screenshots, `failure-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 80)}.png`), fullPage: true }).catch(() => {});
      process.stderr.write(`FAIL ${name}: ${error.message.split('\n')[0]}\n`);
    }
  }

  try {
    const guest = await setup();
    await check('desktop catalog, state filtering and no overflow', async () => {
      await guest.goto();
      await guest.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).waitFor();
      assert.equal(await guest.page.getByRole('heading', { name: 'Torneo Oculto UI', exact: true }).count(), 0);
      assert.equal(await guest.page.getByRole('heading', { name: 'Fortnite Finalizado UI', exact: true }).count(), 0);
      await noOverflow(guest.page);
      await guest.page.screenshot({ path: path.join(screenshots, 'arena-desktop.png'), fullPage: true });
    });
    await check('search trims whitespace, updates URL and survives reload/back', async () => {
      await guest.page.getByRole('searchbox', { name: 'Buscar torneo, juego u organizador' }).fill('  Valorant  ');
      await guest.page.getByRole('heading', { name: 'Valorant Pago UI', exact: true }).waitFor();
      assert.equal(new URL(guest.page.url()).searchParams.get('q'), '  Valorant  ');
      await guest.page.getByRole('button', { name: /^Historial/ }).click();
      assert.equal(new URL(guest.page.url()).searchParams.get('status'), 'completed');
      await guest.page.goBack();
      await guest.page.getByRole('heading', { name: 'Valorant Pago UI', exact: true }).waitFor();
      await guest.page.reload({ waitUntil: 'domcontentloaded' });
      await guest.page.getByRole('heading', { name: 'Valorant Pago UI', exact: true }).waitFor();
      await guest.page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    });
    await check('free/paid, region and mode filters have coherent counts', async () => {
      await guest.page.getByText('Más filtros', { exact: true }).click();
      await guest.page.getByRole('combobox', { name: /^Entrada/ }).selectOption('paid');
      await guest.page.getByRole('heading', { name: 'Valorant Pago UI', exact: true }).waitFor();
      assert.equal(await guest.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).count(), 0);
      assert.match(await guest.page.getByRole('status').last().innerText(), /1 torneo encontrado/);
      await guest.page.getByRole('combobox', { name: /^Región/ }).selectOption('NA');
      await guest.page.getByRole('combobox', { name: /^Modalidad/ }).selectOption('team');
      assert.equal(new URL(guest.page.url()).searchParams.get('mode'), 'team');
      await guest.page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    });
    await check('favorites persist in browser and can be removed', async () => {
      await guest.page.getByRole('button', { name: 'Guardar en favoritos: Fortnite Abierto UI', exact: true }).click();
      await guest.page.getByRole('button', { name: /^Favoritos/ }).click();
      await guest.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).waitFor();
      await guest.page.reload({ waitUntil: 'domcontentloaded' });
      await guest.page.getByRole('button', { name: 'Quitar de favoritos: Fortnite Abierto UI', exact: true }).waitFor();
      await guest.page.getByRole('button', { name: 'Quitar de favoritos: Fortnite Abierto UI', exact: true }).click();
      await guest.page.getByRole('heading', { name: 'Guarda tus próximos desafíos' }).waitFor();
    });
    for (const width of [390, 320]) await check(`mobile ${width}px catalog and detail have no overflow`, async () => {
      const mobile = await setup({ viewport: { width, height: 844 } });
      await mobile.goto(); await mobile.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).waitFor(); await noOverflow(mobile.page);
      await mobile.page.screenshot({ path: path.join(screenshots, `arena-mobile-${width}.png`), fullPage: true });
      await mobile.goto('/tournament/open'); await noOverflow(mobile.page);
      await mobile.page.screenshot({ path: path.join(screenshots, `detail-mobile-${width}.png`), fullPage: true });
      assert.deepEqual(mobile.errors, []);
      const signedIn = await setup({ role: 'player', viewport: { width, height: 844 } });
      await signedIn.goto('/tournament/live?tab=matches&match=live-match');
      await signedIn.page.getByRole('dialog').waitFor(); await noOverflow(signedIn.page);
      const bounds = await signedIn.page.getByRole('dialog').boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Match room exceeds viewport');
      await signedIn.page.screenshot({ path: path.join(screenshots, `match-room-mobile-${width}.png`), fullPage: true });
      await signedIn.page.keyboard.press('Escape');
      await signedIn.page.getByRole('button', { name: /^Notificaciones:/ }).click();
      const notices = await signedIn.page.getByRole('region', { name: 'Tus notificaciones' }).boundingBox();
      assert(notices.x >= 0 && notices.x + notices.width <= width + 1, 'Notification popup exceeds viewport');
      assert.deepEqual(signedIn.errors, []);
    });
    await check('loading, request error and retry are distinct', async () => {
      const pending = await setup({ delay: 1800 });
      await pending.goto();
      await pending.page.getByRole('status', { name: 'Cargando torneos' }).waitFor();
      await pending.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).waitFor();
      const failed = await setup({ failure: true });
      await failed.goto(); await failed.page.getByRole('alert').filter({ hasText: 'Error sintético' }).waitFor();
      assert.equal(await failed.page.getByRole('heading', { name: 'Pronto habrá nuevas competencias' }).count(), 0);
      failed.state.failure = false;
      await failed.page.getByRole('button', { name: 'Reintentar', exact: true }).click();
      await failed.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).waitFor();
      assert.deepEqual([...pending.errors, ...failed.errors], []);
    });
    await check('pagination changes URL and page content', async () => {
      const many = await setup({ extra: 12 }); await many.goto();
      await many.page.getByRole('button', { name: 'Siguiente', exact: true }).click();
      assert.equal(new URL(many.page.url()).searchParams.get('page'), '2');
      await many.page.getByText('Página 2 de 2', { exact: true }).waitFor(); assert.deepEqual(many.errors, []);
    });
    const player = await setup({ role: 'player' });
    await check('logged-in dashboard, registration state and personal tournaments', async () => {
      await player.goto();
      await player.page.getByRole('heading', { name: /^Mis torneos/ }).waitFor();
      await player.page.getByRole('link', { name: 'Confirmar asistencia', exact: true }).first().waitFor();
      await player.page.getByRole('button', { name: /^Mis torneos \(/ }).click();
      assert.equal(new URL(player.page.url()).searchParams.get('view'), 'mine');
      await player.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await player.page.getByRole('heading', { name: 'Fortnite Abierto UI', exact: true }).count(), 0);
    });
    await check('read notifications persist after reload for the account', async () => {
      await player.page.getByRole('button', { name: /^Notificaciones:/ }).click();
      await player.page.getByRole('button', { name: 'Marcar todas como leídas', exact: true }).click();
      await player.page.getByRole('button', { name: 'Notificaciones: 0 sin leer', exact: true }).waitFor();
      await player.page.reload({ waitUntil: 'domcontentloaded' });
      await player.page.getByRole('button', { name: 'Notificaciones: 0 sin leer', exact: true }).waitFor();
    });
    await check('registration requires accepting rules and remains reversible', async () => {
      await player.goto('/tournament/open');
      await player.page.getByRole('button', { name: 'Inscribirme', exact: true }).first().click();
      const dialog = player.page.getByRole('dialog', { name: 'Inscripción al Torneo', exact: true });
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('checkbox').isChecked(), false);
      assert.equal(await dialog.getByRole('button', { name: /CONFIRMAR INSCRIPCIÓN COMO/ }).isDisabled(), true);
      await dialog.getByRole('checkbox').check();
      assert.equal(await dialog.getByRole('button', { name: /CONFIRMAR INSCRIPCIÓN COMO/ }).isDisabled(), false);
      await player.page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(player.calls.some(call => call.startsWith('POST /api/tournaments/open/register')), false);
    });
    await check('public detail, rules and capacity actions', async () => {
      await guest.goto('/tournament/open');
      await guest.page.getByRole('button', { name: 'Iniciar sesión para inscribirme', exact: true }).first().waitFor();
      await guest.page.getByRole('button', { name: 'Reglas y ayuda', exact: true }).click();
      await guest.page.getByRole('heading', { name: 'Bases y reglamento', exact: true }).waitFor();
      await player.goto('/tournament/full');
      await player.page.getByRole('button', { name: 'Unirme a la lista de espera', exact: true }).click();
      await player.page.getByText('Estás en la posición 3 de 3', { exact: true }).waitFor();
      await player.page.getByRole('button', { name: 'Salir de la lista', exact: true }).click();
    });
    await check('player check-in shows success and disables duplicate action', async () => {
      await player.goto('/tournament/checkin');
      await player.page.getByRole('button', { name: 'Confirmar check-in', exact: true }).first().click();
      await player.page.getByText('Asistencia confirmada', { exact: true }).first().waitFor();
      assert.equal(player.state.tournaments.find(t => t.id === 'checkin').participants[0].checkedIn, true);
      assert.equal(await player.page.getByRole('button', { name: 'Confirmar check-in', exact: true }).count(), 0);
    });
    await check('same-tournament query and notification open the correct match', async () => {
      await player.goto('/tournament/live?tab=rules');
      await player.page.getByRole('heading', { name: 'Bases y reglamento', exact: true }).waitFor();
      await player.page.getByRole('button', { name: /^Notificaciones:/ }).click();
      await player.page.getByRole('link').filter({ hasText: 'Tu partida está disponible' }).click();
      await player.page.getByRole('dialog').waitFor();
      assert.equal(new URL(player.page.url()).searchParams.get('tab'), 'matches');
      await player.page.keyboard.press('Escape');
      await player.page.getByRole('dialog').waitFor({ state: 'hidden' });
      await player.page.screenshot({ path: path.join(screenshots, 'detail-player.png'), fullPage: true });
    });
    await check('admin controls manage games, highlighted tournament and phases', async () => {
      const admin = await setup({ role: 'admin' }); await admin.goto();
      await admin.page.getByRole('button', { name: 'Administrar juegos', exact: true }).click();
      await admin.page.getByRole('button', { name: 'Editar Fortnite', exact: true }).click();
      await admin.page.getByRole('dialog', { name: 'Editar videojuego oficial' }).waitFor();
      await admin.page.keyboard.press('Escape');
      await admin.page.getByRole('button', { name: 'Destacar en portada', exact: true }).first().click();
      assert(admin.calls.some(call => call.startsWith('PATCH /api/tournaments/')));
      await admin.goto('/tournament/checkin');
      await admin.page.getByRole('button', { name: 'Cerrar check-in', exact: true }).click();
      await admin.page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
      await admin.page.getByText('Check-in cerrado. Revisa los confirmados antes de sortear.', { exact: true }).waitFor();
      assert.equal(admin.state.tournaments.find(t => t.id === 'checkin').checkInActive, false);
      await admin.page.getByRole('button', { name: /Sortear confirmados/ }).click();
      await admin.page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
      await admin.page.getByText('Llaves sorteadas. Ya puedes revisar los enfrentamientos.', { exact: true }).waitFor();
      await admin.page.screenshot({ path: path.join(screenshots, 'detail-admin.png'), fullPage: true });
      await admin.goto('/tournament/live?tab=matches&match=live-match');
      const modal = admin.page.getByRole('dialog'); await modal.waitFor();
      await modal.getByRole('spinbutton').first().fill('2');
      const updated = admin.page.waitForResponse(response => new URL(response.url()).pathname === '/api/tournaments');
      await admin.page.evaluate(() => window.dispatchEvent(new Event('focus'))); await updated;
      assert.equal(await modal.getByRole('spinbutton').first().inputValue(), '2', 'Refresh discarded the unsaved score');
      assert.deepEqual(admin.errors, []);
    });
    await check('completed tournament exposes podium and results', async () => {
      await player.goto('/tournament/completed');
      await player.page.getByRole('heading', { name: 'Resultados del torneo', exact: true }).waitFor();
      await player.page.getByText('Campeón · 1°', { exact: true }).waitFor();
      assert.deepEqual([...guest.errors, ...player.errors], []);
    });
    await check('payment query changes without reload and expired checkout disappears', async () => {
      const payments = await setup({ role: 'player' });
      await payments.goto('/arena/pago?paymentId=pay-active');
      await payments.page.getByText('Referencia: pay-active', { exact: true }).waitFor();
      await payments.page.getByRole('link', { name: 'Continuar pago en Flow', exact: true }).waitFor();
      await payments.page.getByText(/^Cupo reservado por /).waitFor();
      await payments.page.evaluate(() => { window.__paymentNavigationSentinel = true; window.history.pushState(null, '', '/arena/pago?paymentId=pay-expired'); });
      await payments.page.getByText('Referencia: pay-expired', { exact: true }).waitFor();
      assert.equal(await payments.page.evaluate(() => window.__paymentNavigationSentinel), true);
      assert.equal(await payments.page.getByText('Referencia: pay-active', { exact: true }).count(), 0);
      assert.equal(await payments.page.getByRole('link', { name: 'Continuar pago en Flow', exact: true }).count(), 0);
      await payments.page.getByText('La reserva del cupo ha expirado', { exact: true }).waitFor();
      await payments.page.screenshot({ path: path.join(screenshots, 'payment-expired.png'), fullPage: true });
      assert.deepEqual(payments.errors, []);
    });
    await check('review retry and refund support retain exact payment reference', async () => {
      const payments = await setup({ role: 'player' });
      await payments.goto('/arena/pago?paymentId=pay-review');
      await payments.page.getByRole('alert').filter({ hasText: 'El proveedor no está disponible.' }).waitFor();
      const support = payments.page.getByRole('link', { name: 'Contactar soporte con esta referencia', exact: true });
      await support.waitFor();
      assert.match(decodeURIComponent(await support.getAttribute('href')), /Referencia: pay-review/);
      payments.state.payments['pay-review'].verifying = false;
      await payments.page.getByRole('button', { name: 'Reintentar ahora', exact: true }).click();
      await payments.page.getByRole('alert').filter({ hasText: 'El proveedor no está disponible.' }).waitFor({ state: 'hidden' });
      await payments.page.evaluate(() => window.history.pushState(null, '', '/arena/pago?paymentId=pay-refund'));
      await payments.page.getByText('Referencia: pay-refund', { exact: true }).waitFor();
      const refund = payments.page.getByRole('link', { name: 'Solicitar devolución por correo', exact: true });
      await refund.waitFor();
      const refundMail = new URL(await refund.getAttribute('href'));
      assert.equal(refundMail.protocol, 'mailto:');
      assert.match(refundMail.searchParams.get('subject'), /pay-refund/);
      assert.match(refundMail.searchParams.get('body'), /Referencia: pay-refund[\s\S]*refund_required/);
      assert.equal(await payments.page.getByRole('link', { name: 'Continuar pago en Flow', exact: true }).count(), 0);
      assert.deepEqual(payments.errors, []);
    });
    await check('payment history fits mobile and logout clears prior account data', async () => {
      const payments = await setup({ role: 'player', viewport: { width: 320, height: 844 } });
      await payments.goto('/arena/pagos');
      await payments.page.getByRole('table').waitFor();
      assert.equal(await payments.page.getByRole('link', { name: 'Consultar', exact: true }).count(), 4);
      await noOverflow(payments.page);
      await payments.page.screenshot({ path: path.join(screenshots, 'payments-mobile-320.png'), fullPage: true });
      await payments.page.getByRole('button', { name: 'Salir', exact: true }).click();
      await payments.page.getByRole('button', { name: 'Ingresar', exact: true }).waitFor();
      await payments.goto('/arena/pagos');
      await payments.page.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor();
      assert.equal(await payments.page.getByRole('table').count(), 0);
      assert.equal(await payments.page.getByText('Valorant Pago UI', { exact: true }).count(), 0);
      assert.deepEqual(payments.errors, []);
    });
  } finally {
    await Promise.all(contexts.map(context => context.close()));
    await browser.close();
  }
  process.stdout.write(`\n${checks} UI checks passed; ${interceptedRequests} synthetic API requests intercepted. Screenshots: ${screenshots}\n`);
  if (failures.length) { process.stderr.write(failures.join('\n\n') + '\n'); process.exitCode = 1; }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
