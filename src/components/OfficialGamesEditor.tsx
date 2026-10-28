'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTournament } from '@/context/TournamentContext';
import { GameInfo } from '@/types/tournament';
import { showConfirm } from './StyledDialog';

const emptyGame = (): GameInfo => ({ id: '', name: '', genre: '', publisher: '', defaultTeamSize: 1, coverImage: '', bannerImage: '', tagFieldLabel: 'ID de jugador', tagPlaceholder: 'Tu usuario' });
const fields = [
  ['name', 'Nombre'], ['genre', 'G\u00e9nero'],
  ['publisher', 'Editor'], ['coverImage', 'Imagen de portada (HTTPS o /assets/...)'],
  ['bannerImage', 'Banner (HTTPS o /assets/...)'],
] as const;

type Selection = { x: number; y: number; game?: GameInfo };

export function OfficialGamesEditor({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const { games, refreshGames } = useTournament();
  const [menu, setMenu] = useState<Selection | null>(null);
  const [draft, setDraft] = useState<GameInfo | null>(null);
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';
  const modalOpen = draft !== null && isAdmin;

  useEffect(() => {
    if (!menu) return;
    menuPanel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const dismiss = () => setMenu(null);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => { window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true); };
  }, [menu]);

  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [modalOpen]);

  function openEditor(game?: GameInfo) {
    setOriginalId(game?.id ?? null);
    setDraft(game ? { ...game } : emptyGame());
    setError(''); setMenu(null);
  }

  async function persist(nextGames: GameInfo[]) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/games', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ games: nextGames }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refreshGames();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar.');
      return false;
    } finally { setBusy(false); }
  }

  async function remove(game: GameInfo) {
    setMenu(null);
    if (await showConfirm(`\u00bfEliminar ${game.name} de los videojuegos oficiales? Sus torneos existentes se conservar\u00e1n.`)) {
      await persist(games.filter(item => item.id !== game.id));
    }
  }

  return <div className="min-h-24" onContextMenu={event => {
    event.preventDefault();
    if (!isAdmin || busy || draft) return;
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-official-game-id]');
    const bounds = card?.getBoundingClientRect();
    const x = event.clientX || bounds?.left || 16;
    const y = event.clientY || bounds?.bottom || 16;
    setMenu({ x: Math.max(8, Math.min(x, window.innerWidth - 248)), y: Math.max(8, Math.min(y, window.innerHeight - 200)), game: games.find(game => game.id === card?.dataset.officialGameId) });
  }}>
    {children}
    {isAdmin && games.length === 0 && <button onClick={() => openEditor()} className="rounded-xl border border-red-400/30 px-4 py-3 text-sm text-red-300">Crear videojuego oficial</button>}
    {isAdmin && error && !draft && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {isAdmin && menu && <>
      <div className="fixed inset-0 z-[100]" onPointerDown={() => setMenu(null)} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); setMenu(null); }} />
      <div ref={menuPanel} role="menu" aria-label="Administrar videojuego oficial" style={{ left: menu.x, top: menu.y }} className="fixed z-[101] w-60 rounded-xl border border-red-400/30 bg-[#1b1417] p-1.5 text-sm text-white shadow-2xl" onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); setMenu(null); }
        if (event.key === 'Tab') setMenu(null);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = Array.from(menuPanel.current?.querySelectorAll<HTMLButtonElement>('button') || []);
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      }}>
        {menu.game && <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-slate-400">{menu.game.name}</p>}
        <button role="menuitem" onClick={() => openEditor()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10 focus:bg-white/10"><Plus size={16} />Crear videojuego</button>
        {menu.game && <>
          <button role="menuitem" onClick={() => openEditor(menu.game)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10 focus:bg-white/10"><Pencil size={16} />Editar videojuego</button>
          <button role="menuitem" onClick={() => remove(menu.game!)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-300 hover:bg-red-500/10 focus:bg-red-500/10"><Trash2 size={16} />Eliminar videojuego</button>
        </>}
      </div>
    </>}
    {isAdmin && draft && <dialog ref={dialog} aria-labelledby="game-editor-title" onCancel={event => { if (busy) event.preventDefault(); else setDraft(null); }} onClick={event => { if (event.target === event.currentTarget && !busy) setDraft(null); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-red-400/30 bg-[#1b1417] p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm">
      <form onSubmit={async event => {
        event.preventDefault();
        const next = originalId === null ? [...games, draft] : games.map(game => game.id === originalId ? draft : game);
        if (await persist(next)) setDraft(null);
      }} className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-4"><h2 id="game-editor-title" className="text-lg font-bold">{originalId === null ? 'Crear videojuego oficial' : 'Editar videojuego oficial'}</h2><button type="button" disabled={busy} aria-label="Cerrar" onClick={() => setDraft(null)} className="rounded-lg p-2 hover:bg-white/10"><X size={20} /></button></div>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          {fields.map(([field, label]) => <label key={field} className="text-xs text-slate-300">{label}
            <input required maxLength={2000} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white" />
          </label>)}
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setDraft(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Cancelar</button><button disabled={busy} type="submit" className="rounded-xl bg-red-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-50">{busy ? 'Guardando...' : 'Guardar cambios'}</button></div>
      </form>
    </dialog>}
  </div>;
}
