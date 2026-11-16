/** Tournament instants use ISO UTC; legacy wall-clock values mean Chile time. */
export const TOURNAMENT_TIME_ZONE = 'America/Santiago';
export interface CountdownState {
  days: number; hours: number; minutes: number; seconds: number;
  isPast: boolean; isCheckInWindow: boolean; totalMilliseconds: number;
}
function chileParts(date: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TOURNAMENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
export function parseTournamentDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const text = value.trim();
  const wall = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/.exec(text);
  if (wall) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = wall;
    const target = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
    const valid = new Date(target);
    if (valid.getUTCFullYear() !== +year || valid.getUTCMonth() !== +month - 1 || valid.getUTCDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) return null;
    let guess = target;
    for (let i = 0; i < 4; i++) {
      const parts = chileParts(new Date(guess));
      const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
      const adjustment = target - represented;
      guess += adjustment;
      if (!adjustment) return new Date(guess);
    }
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return null;
  const calendar = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(text)!;
  const [,year,month,day,hour,minute,second='00'] = calendar;
  const valid = new Date(Date.UTC(+year,+month-1,+day,+hour,+minute,+second));
  if (valid.getUTCFullYear() !== +year || valid.getUTCMonth() !== +month-1 || valid.getUTCDate() !== +day || +hour>23 || +minute>59 || +second>59) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
export function normalizeTournamentDate(value?: string | null): string | null {
  return parseTournamentDate(value)?.toISOString() || null;
}
export function toTournamentDateTimeInput(value?: string | null): string {
  const date = parseTournamentDate(value);
  if (!date) return '';
  const p = chileParts(date);
  return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;
}
export function formatTournamentDate(value?: string | null): string {
  if (/^horario por confirmar$/i.test(value?.trim() || '')) return 'Por confirmar';
  const date = parseTournamentDate(value) as Date;
  if (!date) return value || 'Por definir';
  const parts = chileParts(date!);
  return `${parts.day}-${parts.month}-${parts.year.slice(-2)} ${parts.hour}:${parts.minute} hrs`;
  return new Intl.DateTimeFormat('es-CL', { timeZone: TOURNAMENT_TIME_ZONE,
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date) + ' · Chile';
}
export function formatLocalTournamentDate(value?: string | null): string | null {
  const date = parseTournamentDate(value);
  if (!date) return null;
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === TOURNAMENT_TIME_ZONE) return null;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(date);
}
type CheckInTournament = { startDate: string; status?: string; checkInActive?: boolean; checkInOpensAt?: string; checkInClosesAt?: string };
function checkInInstant(value: string | undefined, start: Date | null, fallbackMinutes: number) {
  const absolute = parseTournamentDate(value);
  if (absolute) return absolute;
  const relative = value?.match(/(\d+)\s*(?:min|minutos?)\s*antes/i);
  return start ? new Date(start.getTime() - Number(relative?.[1] ?? fallbackMinutes) * 60000) : null;
}
export function getCheckInWindow(tournament: CheckInTournament, now: number | Date = Date.now()) {
  const start = parseTournamentDate(tournament.startDate);
  const opensAt = checkInInstant(tournament.checkInOpensAt, start, 45);
  const closesAt = checkInInstant(tournament.checkInClosesAt, start, 10);
  const timestamp = now instanceof Date ? now.getTime() : now;
  const hasClosed = Boolean(closesAt && timestamp >= closesAt.getTime()) ||
    tournament.status === 'in_progress' || tournament.status === 'completed' ||
    (tournament.status === 'check_in' && !tournament.checkInActive);
  const isOpen = tournament.status === 'check_in' && tournament.checkInActive === true &&
    !hasClosed && Boolean(opensAt && closesAt && timestamp >= opensAt.getTime());
  return { opensAt, closesAt, isOpen, hasClosed };
}
export function getCountdown(value?: string | null, checkInMinutesBefore = 45): CountdownState {
  const target = parseTournamentDate(value);
  const diff = target ? target.getTime() - Date.now() : 0;
  const remaining = Math.max(0, diff);
  return { days: Math.floor(remaining / 86400000), hours: Math.floor(remaining / 3600000) % 24,
    minutes: Math.floor(remaining / 60000) % 60, seconds: Math.floor(remaining / 1000) % 60,
    isPast: Boolean(target && diff <= 0), isCheckInWindow: Boolean(target && diff > 0 && diff <= checkInMinutesBefore * 60000), totalMilliseconds: diff };
}
