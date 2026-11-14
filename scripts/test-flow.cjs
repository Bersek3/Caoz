const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createHmac } = require('node:crypto');

function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name in dependencies ? dependencies[name] : require(name), process, Buffer, URL, Date, URLSearchParams, AbortSignal, fetch, ...globals });
  return exports;
}

function payments({ paid = true, full = false, mismatch = false, closed = false, duplicate = false, network = false, expired = false, failedRegistration = false, amount } = {}) {
  const row = { id: 'pay-1', provider: 'flow', tournament_id: 't-1', amount: 1000, status: 'pending', provider_uuid: 'flow_token_12345', provider_order: '123', registration: {}, expires_at: new Date(0) };
  let inserts = 0;
  const query = async (sql, params) => {
    if (sql.includes('SELECT * FROM tournament_payments')) return { rows: [row] };
    if (sql.includes('SELECT * FROM tournaments')) return { rows: [{ id: 't-1', status: closed ? 'completed' : 'registration_open', max_participants: 2 }] };
    if (sql.includes('COUNT(*)')) return { rows: [{ count: full ? 2 : 0 }] };
    if (sql.includes("status='confirmed'")) row.status = 'confirmed';
    if (sql.includes("status='refund_required'")) row.status = 'refund_required';
    if (sql.includes('SET status=$1')) row.status = params[0];
    return { rows: [] };
  };
  const order = { flowOrder: 123, commerceOrder: 'pay-1', amount: amount === undefined ? (mismatch ? 2000 : 1000) : amount, currency: 'CLP', status: paid ? 2 : expired ? 4 : 1 };
  if (duplicate) row.status = 'confirmed';
  const api = load('src/lib/tournamentPayments.ts', {
    './db': { getDb: async () => ({ query }), withDbTransaction: async fn => fn({ query }) },
    './flow': { validFlowToken: token => /^[a-zA-Z0-9_-]{10,200}$/.test(token), flowRequest: async () => { if (network) throw new Error('network'); return order; } },
    './tournamentWaitlist': { assertWaitlistTurn: async () => {} },
    './tournamentRegistration': { insertRegistration: async () => { if (failedRegistration) throw new Error('duplicate roster'); inserts++; return 'participant-1'; } },
  });
  return { api, row, inserts: () => inserts };
}

test('checkout uses server CLP price and Flow timeout; free registration needs no Flow', async () => {
  for (const free of [false, true]) {
    let configured = 0, inserted = 0, checkout, saved;
    const query = async (sql, params) => {
      if (sql.includes('SELECT * FROM tournaments')) return { rows: [{ id: 't-1', status: 'registration_open', max_participants: 4, entry_fee_amount: free ? 0 : 5000, entry_fee: free ? 'Gratis' : '5000 CLP', title: 'Prueba' }] };
      if (sql.includes('SELECT email')) return { rows: [{ email: 'test@example.com' }] };
      if (sql.includes('INSERT INTO tournament_payments')) saved = params;
      return { rows: [] };
    };
    const api = load('src/lib/tournamentPayments.ts', {
      './db': { getDb: async () => ({ query }), withDbTransaction: async fn => fn({ query }) },
      './flow': { flowConfig: () => { configured++; return { site: 'https://example.com' }; },
        validFlowToken: () => true, flowCheckoutUrl: () => 'https://sandbox.flow.cl/test?token=flow_token_12345',
        flowRequest: async (path, params, method) => { assert.equal(path, 'payment/create'); assert.equal(method, 'POST'); checkout = params; return { flowOrder: 123, token: 'flow_token_12345', url: 'https://sandbox.flow.cl/test' }; } },
      './tournamentWaitlist': { assertWaitlistTurn: async () => {} },
    './tournamentRegistration': { insertRegistration: async () => { inserted++; return 'participant-1'; } },
    });
    const result = await api.reserveRegistration('t-1', { userId: 'u-1', roster: [] });
    if (free) { assert.equal(result.participantId, 'participant-1'); assert.equal(configured, 0); assert.equal(inserted, 1); }
    else {
      assert.equal(checkout.amount, 5000); assert.equal(checkout.currency, 'CLP');
      assert.equal(checkout.commerceOrder, saved[0]); assert.equal(checkout.timeout, 1800);
      assert.equal(checkout.paymentMethod, 9);
      assert.equal(checkout.urlConfirmation, 'https://example.com/api/payments/flow/confirmation');
      assert.ok(result.checkoutUrl.startsWith('https://sandbox.flow.cl/')); assert.equal(inserted, 0);
    }
  }
});

test('paid session confirms even when webhook arrives after local expiration; repeated events do not duplicate', async () => {
  const p = payments();
  assert.equal((await p.api.reconcilePayment('flow_token_12345')).status, 'confirmed');
  await p.api.reconcilePayment('flow_token_12345');
  assert.equal(p.inserts(), 1);
});
for (const scenario of [{ full: true }, { closed: true }, { failedRegistration: true }]) {
  test('paid session requires manual refund: ' + JSON.stringify(scenario), async () => {
    const p = payments(scenario);
    assert.equal((await p.api.reconcilePayment('flow_token_12345')).status, 'refund_required');
    assert.equal(p.inserts(), 0);
  });
}
test('amount mismatch and provider outages never confirm', async () => {
  for (const options of [{ mismatch: true }, { network: true }]) {
    const p = payments(options);
    await assert.rejects(p.api.reconcilePayment('flow_token_12345'));
    assert.equal(p.row.status, 'pending');
    assert.equal(p.inserts(), 0);
  }
});
test('unpaid expiration releases the reservation', async () => {
  const p = payments({ paid: false, expired: true });
  assert.equal((await p.api.reconcilePayment('flow_token_12345')).status, 'failed');
  assert.equal(p.inserts(), 0);
});

test('Flow numeric string amounts verify both approved and cancelled orders', async () => {
  for (const amount of ['1000', '1000.00']) {
    const paid = payments({ amount });
    assert.equal((await paid.api.reconcilePayment('flow_token_12345')).status, 'confirmed');
    const expired = payments({ paid:false, expired:true, amount });
    assert.equal((await expired.api.reconcilePayment('flow_token_12345')).status, 'failed');
  }
});

test('Flow amount validation rejects malformed, fractional and mismatched values', async () => {
  for (const amount of ['', ' ', '1e3', '0x3e8', true, null, '1000.50', '2000', 'Infinity', 1000.5]) {
    const p = payments({ amount });
    await assert.rejects(p.api.reconcilePayment('flow_token_12345'));
    assert.equal(p.inserts(),0);
  }
});

test('recovery by commerce order verifies payment ownership', async () => {
  const p = payments();
  assert.equal((await p.api.reconcilePayment(null, 'pay-1')).status, 'confirmed');
  const other = payments();
  await assert.rejects(other.api.reconcilePayment(null, 'pay-other'));
  assert.equal(other.inserts(), 0);
});

test('uncertain pending orders stay in review without a checkout URL', async () => {
  const p = payments({ paid: false });
  p.row.provider_uuid = null;
  p.row.status = 'review';
  assert.equal((await p.api.reconcilePayment(null, 'pay-1')).status, 'review');
  assert.equal(p.inserts(), 0);
});

test('confirmation validates token, consults Flow and retries API errors', async () => {
  let reconciled = 0, fail = false;
  const api = load('src/app/api/payments/flow/confirmation/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/flow': { readFlowToken: async request => { const token = new URLSearchParams(await request.text()).get('token'); return token && /^[a-zA-Z0-9_-]{10,200}$/.test(token) ? token : null; } },
    '@/lib/db': { initDb: async () => {} },
    '@/lib/tournamentPayments': { reconcilePayment: async token => { assert.equal(token, 'flow_token_12345'); if (fail) throw new Error('Flow unavailable'); reconciled++; } },
  });
  const request = token => new Request('http://localhost/api/payments/flow/confirmation', { method: 'POST', body: new URLSearchParams({ token }) });
  assert.equal((await api.POST(request('invalid'))).status, 400); assert.equal(reconciled, 0);
  assert.equal((await api.POST(request('flow_token_12345'))).status, 200); assert.equal(reconciled, 1);
  fail = true; assert.equal((await api.POST(request('flow_token_12345'))).status, 503);
});

test('HMAC signs sorted unencoded values and ignores signature field', () => {
  const api = load('src/lib/flow.ts', {});
  const expected = createHmac('sha256', 'secret').update('amount5000apiKeyabcsubjectTorneo & equipo').digest('hex');
  assert.equal(api.signFlowParams({ subject: 'Torneo & equipo', apiKey: 'abc', amount: 5000, s: 'ignored' }, 'secret'), expected);
});

test('Flow token rejects missing, duplicated and malformed values', async () => {
  const api = load('src/lib/flow.ts', {});
  for (const body of ['', 'token=short', 'token=flow_token_12345&token=flow_token_54321', 'token=https://evil.example']) {
    assert.equal(await api.readFlowToken(new Request('http://localhost', { method: 'POST', body })), null);
  }
  assert.equal(await api.readFlowToken(new Request('http://localhost', { method: 'POST', body: 'token=flow_token_12345' })), 'flow_token_12345');
});

test('transport signs GET and form POST; checkout URLs reject foreign hosts', async () => {
  const env = { FLOW_API_KEY: 'api-test', FLOW_SECRET_KEY: 'secret-test', FLOW_ENV: 'sandbox', APP_URL: 'http://localhost:3000' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const calls = [];
  const api = load('src/lib/flow.ts', {}, { fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ status: 1 }) }; } });
  try {
    await api.flowRequest('payment/create', { amount: 5000, subject: 'Torneo & equipo' }, 'POST');
    await api.flowRequest('payment/getStatus', { token: 'flow_token_12345' });
    assert.equal(calls[0].url, 'https://sandbox.flow.cl/api/payment/create');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
    const form = new URLSearchParams(calls[0].options.body);
    assert.equal(form.get('subject'), 'Torneo & equipo');
    assert.equal(form.get('s'), api.signFlowParams({ amount: 5000, apiKey: 'api-test', subject: 'Torneo & equipo' }, 'secret-test'));
    const getUrl = new URL(calls[1].url);
    assert.equal(getUrl.searchParams.get('s'), api.signFlowParams({ token: 'flow_token_12345', apiKey: 'api-test' }, 'secret-test'));
    assert.equal(api.flowCheckoutUrl('https://sandbox.flow.cl/app/web/pay.php', 'flow_token_12345'), 'https://sandbox.flow.cl/app/web/pay.php?token=flow_token_12345');
    for (const url of ['https://evil.example', 'https://sandbox.flow.cl.evil.example', 'http://sandbox.flow.cl', 'https://user:pass@sandbox.flow.cl', 'https://sandbox.flow.cl:444']) assert.throws(() => api.flowCheckoutUrl(url, 'flow_token_12345'));
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('Flow rejection records code and redacts credentials and email from diagnostics', async () => {
  const env = { FLOW_API_KEY: 'private-api-key', FLOW_SECRET_KEY: 'private-secret-key', FLOW_ENV: 'sandbox', APP_URL: 'http://localhost:3000' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const logs = [];
  const api = load('src/lib/flow.ts', {}, {
    console: { error: (...args) => logs.push(args) },
    fetch: async () => ({ ok: false, status: 401, json: async () => ({ code: 162, message: 'Invalid private-api-key private-secret-key payer@example.test' }) }),
  });
  try {
    await assert.rejects(api.flowRequest('payment/create', { email: 'payer@example.test' }, 'POST'), /HTTP 401, código 162/);
    const output = JSON.stringify(logs);
    for (const value of ['private-api-key', 'private-secret-key', 'payer@example.test']) assert.equal(output.includes(value), false);
    assert.equal(logs[0][1].code, '162');
    assert.equal(logs[0][1].environment, 'sandbox');
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
