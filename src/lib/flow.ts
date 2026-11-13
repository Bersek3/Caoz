import { createHmac } from 'node:crypto';

type FlowParams = Record<string, string | number>;
export class FlowApiError extends Error {
  constructor(message: string, public httpStatus: number, public code: number | null, public path: string) { super(message); }
}
export interface FlowPaymentStatus {
  flowOrder: number;
  commerceOrder: string;
  status: number;
  currency: string;
  amount: number;
}

export function flowConfig() {
  const apiKey = process.env.FLOW_API_KEY?.trim();
  const secretKey = process.env.FLOW_SECRET_KEY?.trim();
  const environment = process.env.FLOW_ENV?.trim() || 'sandbox';
  if (!apiKey || !secretKey || !process.env.APP_URL || !['sandbox', 'production'].includes(environment)) throw new Error('Los pagos con Flow aún no están configurados. Contacta al organizador.');
  const site = new URL(process.env.APP_URL);
  const live = environment === 'production';
  if (site.protocol !== 'https:' && !( !live && site.protocol === 'http:' && site.hostname === 'localhost')) throw new Error('APP_URL debe utilizar HTTPS.');
  if (site.username || site.password) throw new Error('APP_URL no puede contener credenciales.');
  if (live && !process.env.DATABASE_URL) throw new Error('Configura PostgreSQL persistente antes de activar pagos reales.');
  if (live && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('Configura JWT_SECRET con al menos 32 caracteres antes de activar pagos reales.');
  return { apiKey, secretKey, site: site.origin, environment,
    base: live ? 'https://www.flow.cl/api' : 'https://sandbox.flow.cl/api' };
}

export function signFlowParams(params: FlowParams, secretKey: string) {
  const message = Object.keys(params).filter(key => key !== 's').sort().map(key => key + params[key]).join('');
  return createHmac('sha256', secretKey).update(message, 'utf8').digest('hex');
}

export async function flowRequest<T>(path: 'payment/create' | 'payment/getStatus' | 'payment/getStatusByCommerceId', params: FlowParams, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const config = flowConfig();
  const values = { ...params, apiKey: config.apiKey };
  const body = new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)]));
  body.set('s', signFlowParams(values, config.secretKey));
  const response = await fetch(`${config.base}/${path}${method === 'GET' ? '?' + body.toString() : ''}`, {
    method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    ...(method === 'POST' ? { body: body.toString() } : {}),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { code?: unknown; message?: unknown } | null;
    const code = typeof error?.code === 'number' && Number.isFinite(error.code) ? String(error.code) : 'sin código';
    let detail = typeof error?.message === 'string' ? error.message : 'Respuesta sin detalle JSON';
    // Flow can echo request values in errors. Never log credentials or payer data.
    for (const value of [config.apiKey, config.secretKey, body.get('s'), params.token, params.email, params.commerceOrder, params.commerceId]) {
      if (typeof value === 'string' && value) detail = detail.split(value).join('[oculto]');
    }
    detail = detail.replace(/[\r\n\t]/g, ' ').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo oculto]').slice(0, 250);
    console.error('Flow API rechazó solicitud', { path, environment: config.environment, httpStatus: response.status, code, detail });
    throw new FlowApiError(`Flow rechazó la solicitud (HTTP ${response.status}, código ${code}). Consulta Mis pagos antes de reintentar y comunica esta referencia al organizador.`, response.status, code === 'sin código' ? null : Number(code), path);
  }
  return response.json() as Promise<T>;
}

export function flowCheckoutUrl(value: string, token: string) {
  const config = flowConfig();
  const url = new URL(value);
  const hosts = config.environment === 'production' ? ['www.flow.cl', 'flow.cl', 'api.flow.cl'] : ['sandbox.flow.cl'];
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.port || url.username || url.password) throw new Error('Flow devolvió un enlace de pago inválido.');
  url.searchParams.set('token', token);
  return url.href;
}

export function validFlowToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{10,200}$/.test(value);
}

export async function readFlowToken(request: Request) {
  const form = new URLSearchParams(await request.text());
  const tokens = form.getAll('token');
  return tokens.length === 1 && validFlowToken(tokens[0]) ? tokens[0] : null;
}
