import { toTournamentDateTimeInput } from './dateUtils';

export type AccountMode = 'login' | 'register';

/** Only return to a local screen, never to another account page or external origin. */
export function accountReturnTo(value?: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/arena';
  try {
    const target = new URL(value, 'https://cz-arena.invalid');
    if (target.origin !== 'https://cz-arena.invalid' || /^\/account(?:\/|$)/.test(target.pathname)) return '/arena';
    return target.pathname + target.search + target.hash;
  } catch { return '/arena'; }
}

export function accountHref(mode: AccountMode, returnTo?: string | null) {
  const target = accountReturnTo(returnTo);
  return `/account/${mode === 'register' ? 'signup' : 'login'}${target === '/arena' ? '' : '?' + new URLSearchParams({ returnTo: target })}`;
}

export function accountToday() {
  return toTournamentDateTimeInput(new Date().toISOString()).slice(0, 10);
}

export function accountAge(birthDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > today) return null;
  const parsed = new Date(birthDate + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate) return null;
  let age = Number(today.slice(0,4)) - Number(birthDate.slice(0,4));
  if (today.slice(5) < birthDate.slice(5)) age--;
  return age >= 0 && age <= 120 ? age : null;
}
