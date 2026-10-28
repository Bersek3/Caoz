export function createGameId(name: string, usedIds: ReadonlySet<string>): string {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '') || 'Juego';
  const reserved = new Set(Array.from(usedIds, id => id.toLowerCase()));
  let id = base;
  let suffix = 2;
  while (reserved.has(id.toLowerCase())) {
    const ending = `-${suffix++}`;
    id = base.slice(0, 64 - ending.length).replace(/-+$/g, '') + ending;
  }
  return id;
}
