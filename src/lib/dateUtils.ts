/**
 * Utility functions for tournament dates, countdowns, and check-in windows.
 */

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isCheckInWindow: boolean;
  totalMilliseconds: number;
}

/**
 * Tries to parse a startDate into a valid Date object.
 * Supports ISO strings ("2026-10-15T20:00"), timestamps, and fallbacks.
 */
export function parseTournamentDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;

  // Try direct Date parse
  const directDate = new Date(dateStr);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // Try parsing common patterns like "YYYY-MM-DD HH:mm"
  const cleanStr = dateStr.replace(' ', 'T');
  const fallbackDate = new Date(cleanStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return null;
}

/**
 * Returns formatted friendly date string in Spanish (e.g. "Sábado 15 de Octubre, 20:00 hrs")
 */
export function formatTournamentDate(dateStr?: string | null): string {
  if (!dateStr) return 'Por definir';

  const parsed = parseTournamentDate(dateStr);
  if (!parsed) return dateStr; // Return raw text if not standard date

  try {
    const formatter = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const formatted = formatter.format(parsed);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1) + ' hrs';
  } catch {
    return dateStr;
  }
}

/**
 * Calculates countdown from now to target date.
 * checkInMinutesBefore: window in minutes before start when check-in is active (default 45m).
 */
export function getCountdown(
  dateStr?: string | null,
  checkInMinutesBefore: number = 45
): CountdownState {
  const target = parseTournamentDate(dateStr);

  if (!target) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: false,
      isCheckInWindow: false,
      totalMilliseconds: 0
    };
  }

  const now = Date.now();
  const diff = target.getTime() - now;
  const checkInWindowMs = checkInMinutesBefore * 60 * 1000;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      isCheckInWindow: false,
      totalMilliseconds: diff
    };
  }

  const isCheckInWindow = diff <= checkInWindowMs;

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    isPast: false,
    isCheckInWindow,
    totalMilliseconds: diff
  };
}
