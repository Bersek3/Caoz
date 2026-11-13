'use client';

import { Plus, Trash2, Trophy } from '@/components/icons';
import { prizePlace, type TournamentPrize } from '../lib/tournamentPrizes';

export function TournamentPrizesEditor({ mode, onModeChange, total, onTotalChange, distribution, onDistributionChange, maxPlaces, teamType }: {
  mode: 'single' | 'multiple'; onModeChange: (mode: 'single' | 'multiple') => void;
  total: string; onTotalChange: (value: string) => void;
  distribution: TournamentPrize[]; onDistributionChange: (rows: TournamentPrize[]) => void;
  maxPlaces: number; teamType: 'solo' | 'team';
}) {
  return <fieldset className="space-y-4 rounded-xl border border-red-400/25 bg-red-950/10 p-4">
    <legend className="flex items-center gap-2 px-2 text-sm font-bold text-red-300"><Trophy size={16} />Premios y distribución</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mode === 'single' ? 'border-red-400/60 bg-red-400/10' : 'border-slate-700'}`}>
        <input type="radio" name="prize-mode" checked={mode === 'single'} onChange={() => onModeChange('single')} className="mt-1 accent-red-400" />
        <span><span className="block text-sm font-semibold text-white">Un solo premio</span><span className="text-xs text-slate-400">Todo el premio para el primer lugar.</span></span>
      </label>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mode === 'multiple' ? 'border-red-400/60 bg-red-400/10' : 'border-slate-700'}`}>
        <input type="radio" name="prize-mode" checked={mode === 'multiple'} onChange={() => onModeChange('multiple')} className="mt-1 accent-red-400" />
        <span><span className="block text-sm font-semibold text-white">Premios por puesto</span><span className="text-xs text-slate-400">Define qué recibe cada lugar premiado.</span></span>
      </label>
    </div>
    <label className="block text-xs font-semibold text-slate-300">{mode === 'single' ? 'Premio para el primer lugar' : 'Premio total (resumen de todos los premios)'} *
      <input required maxLength={100} value={total} onChange={event => onTotalChange(event.target.value)} placeholder={mode === 'single' ? 'Ej.: 100.000 CLP, un teclado o una tarjeta de regalo' : 'Ej.: 150.000 CLP o un teclado + un mouse'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-red-400 focus:outline-none" />
    </label>
    <p className="text-xs text-slate-400">Indica la moneda si es dinero. {teamType === 'team' ? 'El premio corresponde al equipo que obtenga el puesto, no a cada integrante.' : 'El premio corresponde al jugador que obtenga el puesto.'}</p>
    {mode === 'multiple' && <div className="space-y-3">
      {distribution.map((row,index) => <div key={index} className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-300 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 font-semibold text-red-200 sm:w-24">{prizePlace(index)}</span>
          <input required maxLength={200} aria-label={`Premio para ${prizePlace(index)}`} placeholder="Monto con moneda o descripción del premio" value={row.prize} onChange={event => onDistributionChange(distribution.map((prize,i) => i === index ? { ...prize,prize: event.target.value } : prize))} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none" />
        </label>
        <button type="button" aria-label={`Eliminar premio del ${prizePlace(index)}`} disabled={distribution.length <= 2} onClick={() => onDistributionChange(distribution.filter((_,i) => i !== index).map((prize,i) => ({ ...prize,place: prizePlace(i) })))} className="rounded-lg p-2 text-red-300 hover:bg-red-400/10 disabled:opacity-30"><Trash2 size={16} /></button>
      </div>)}
      <button type="button" disabled={distribution.length >= maxPlaces} onClick={() => onDistributionChange([...distribution,{ place: prizePlace(distribution.length),prize: '' }])} className="flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-40"><Plus size={14} />Agregar puesto premiado</button>
      <p className="text-xs text-slate-400">El resumen total y los premios por puesto deben corresponder. Puedes asignar dinero, artículos o premios diferentes.</p>
    </div>}
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
      <p className="mb-2 font-semibold text-white">Así se publicarán los premios</p>
      {(mode === 'single' ? [{ place: prizePlace(0),prize: total }] : distribution).map((row,index) => <div key={index} className="flex justify-between gap-3 py-1"><span className="text-slate-400">{prizePlace(index)}</span><span className="text-right text-slate-200">{row.prize.trim() || 'Por definir'}</span></div>)}
    </div>
  </fieldset>;
}
