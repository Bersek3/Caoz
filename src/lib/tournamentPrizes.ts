import { formatChileanPesos } from './currency';

export interface TournamentPrize { place: string; prize: string }

export function prizePlace(index: number) {
  return index === 0 ? '1.er lugar' : index === 2 ? '3.er lugar' : `${index + 1}.º lugar`;
}
export function validateTournamentPrizes(prizePool: unknown, distribution: unknown, maxParticipants: number) {
  if (typeof prizePool !== 'string' || !prizePool.trim() || prizePool.trim().length > 100) throw new Error('Indica el premio total, con su moneda o descripción (hasta 100 caracteres).');
  const total = formatChileanPesos(prizePool);
  // Older clients providing only a total now award that exact prize to first place.
  const rows = distribution === undefined ? [{ place: prizePlace(0), prize: total }] : distribution;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > maxParticipants) throw new Error(`Configura entre 1 y ${maxParticipants} puestos premiados.`);
  const places = new Set<string>();
  const prizes: TournamentPrize[] = rows.map(row => {
    if (!row || typeof row.place !== 'string' || !row.place.trim() || row.place.trim().length > 100 || typeof row.prize !== 'string' || !row.prize.trim() || row.prize.trim().length > 200) throw new Error('Completa el puesto y el premio de cada ganador.');
    const place = row.place.trim(), prize = formatChileanPesos(row.prize);
    const key = place.match(/^(\d+)/)?.[1] || place.toLocaleLowerCase('es');
    if (places.has(key)) throw new Error('Cada puesto debe aparecer una sola vez en la distribución.');
    places.add(key);
    return { place, prize };
  });
  return { prizePool: total, prizeDistribution: prizes };
}
