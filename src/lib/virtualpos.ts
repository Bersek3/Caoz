import jwt from 'jsonwebtoken';

export function virtualposConfig() {
  const apiKey = process.env.VIRTUALPOS_API_KEY;
  const secretKey = process.env.VIRTUALPOS_SECRET_KEY;
  const environment = process.env.VIRTUALPOS_ENV || 'sandbox';
  const site = process.env.APP_URL;
  if (!apiKey || !secretKey || !site || !['sandbox', 'production'].includes(environment)) {
    throw new Error('Los pagos aún no están habilitados. Contacta al organizador.');
  }
  const origin = new URL(site);
  if (environment === 'production' && !process.env.DATABASE_URL) throw new Error('Configura una base PostgreSQL persistente antes de activar pagos reales.');
  if (origin.protocol !== 'https:' && !(environment === 'sandbox' && origin.hostname === 'localhost')) {
    throw new Error('APP_URL debe utilizar HTTPS.');
  }
  return { apiKey, secretKey, site: origin.origin, environment,
    base: environment === 'production' ? 'https://api.virtualpos.cl' : 'https://api.virtualpos-sandbox.com' };
}

export async function virtualposRequest(path: string, body?: Record<string, unknown>) {
  const config = virtualposConfig();
  const signature = jwt.sign({ ...body, api_key: config.apiKey }, config.secretKey, { algorithm: 'HS256', noTimestamp: true });
  const response = await fetch(`${config.base}/v3/payment/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: config.apiKey, Signature: signature },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(20_000)
  });
  const result = await response.json();
  if (!response.ok || result.status !== 'OK') throw new Error('VirtualPOS no pudo procesar la solicitud. Revisa el estado del pago antes de reintentar.');
  return result;
}

export function validateCheckoutUrl(value: string) {
  const config = virtualposConfig();
  const url = new URL(value);
  const host = config.environment === 'production' ? 'pay.virtualpos.cl' : 'pay.virtualpos-sandbox.com';
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) throw new Error('Respuesta de pago inválida.');
  return url.href;
}
