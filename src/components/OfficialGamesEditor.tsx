'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTournament } from '@/context/TournamentContext';
import { GameInfo } from '@/types/tournament';

const emptyGame = (): GameInfo => ({ id: '', name: '', genre: '', publisher: '', defaultTeamSize: 1, coverImage: '', bannerImage: '', tagFieldLabel: 'ID de jugador', tagPlaceholder: 'Tu usuario' });
const fields = [
  ['id', 'Identificador (ej. mi-juego)'], ['name', 'Nombre'], ['genre', 'Género'],
  ['publisher', 'Editor'], ['coverImage', 'Imagen de portada (HTTPS o /assets/...)'],
  ['bannerImage', 'Banner (HTTPS o /assets/...)'], ['tagFieldLabel', 'Etiqueta del ID de jugador'],
  ['tagPlaceholder', 'Ejemplo de ID de jugador'],
] as const;

export function OfficialGamesEditor() {
  const { user, token } = useAuth();
  const { games, refreshGames } = useTournament();
  const [draft, setDraft] = useState<GameInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (user?.role !== 'admin') return null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/games', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ games: draft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refreshGames();
      setDraft(null);
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }

  return <div className="mb-5">
    {draft === null ? <button type="button" onClick={() => { setDraft(games.map(game => ({ ...game }))); setError(''); }} className="rounded-xl border border-cyan-500/30 px-4 py-2 text-sm text-cyan-300">Administrar videojuegos oficiales</button> :
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-300">Añade, edita o quita videojuegos. Los cambios se publican al guardar. Quitar un juego conserva sus torneos existentes.</p>
        <fieldset disabled={busy} className="space-y-4">
          {draft.map((game, index) => <div key={index} className="rounded-xl border border-slate-700 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(([field, label]) => <label key={field} className="text-xs text-slate-300">{label}
                <input required maxLength={field === 'id' ? 64 : 2000} pattern={field === 'id' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} value={game[field]} onChange={event => setDraft(draft.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>)}
              <label className="text-xs text-slate-300">Jugadores por equipo
                <input type="number" required min={1} max={100} value={game.defaultTeamSize} onChange={event => setDraft(draft.map((item, i) => i === index ? { ...item, defaultTeamSize: Number(event.target.value) } : item))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white" />
              </label>
            </div>
            <button type="button" onClick={() => setDraft(draft.filter((_, i) => i !== index))} className="mt-3 text-sm text-rose-300">Quitar {game.name || 'videojuego'}</button>
          </div>)}
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => setDraft([...draft, emptyGame()])} className="rounded-lg border border-slate-600 px-4 py-2">Añadir videojuego</button>
            <button type="submit" className="rounded-lg bg-cyan-400 px-4 py-2 font-bold text-black">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 text-slate-300">Cancelar</button>
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      </form>}
  </div>;
}
