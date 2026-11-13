'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, X, Plus, Trash2 } from '@/components/icons';
import type { Tournament } from '../types/tournament';
import { useAuth } from '../context/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { prepareTournamentBanner, MAX_TOURNAMENT_REQUEST_BYTES } from '../lib/tournamentBanner';
import { TournamentRulesEditor } from './TournamentRulesEditor';
import { showAlert, showConfirm } from './StyledDialog';
import { normalizeTournamentDate, toTournamentDateTimeInput } from '../lib/dateUtils';

export function EditTournamentModal({ tournament, onClose }: { tournament: Tournament; onClose: () => void }) {
  const { user, token } = useAuth();
  const { games, refreshTournaments } = useTournament();
  const [data, setData] = useState(() => ({
    ...tournament,
    startDate: toTournamentDateTimeInput(tournament.startDate),
    bannerUrl: tournament.bannerUrl || '', thumbnailUrl: tournament.thumbnailUrl || '',
    description: tournament.description || '', prizePool: tournament.prizePool || '',
    checkInOpensAt: tournament.checkInOpensAt || '', checkInClosesAt: tournament.checkInClosesAt || '',
    checkInActive: Boolean(tournament.checkInActive),
    entryFeeAmount: tournament.entryFeeAmount || 0, isHidden: Boolean(tournament.isHidden),
    rulesMode: tournament.rulesMode || 'custom', rules: tournament.rules || [], prizeDistribution: tournament.prizeDistribution || [],
    schedule: (tournament.schedule || []).map(row => ({ ...row, format: row.format || '' })),
    organizer: { ...tournament.organizer, avatar: tournament.organizer.avatar || '', verified: Boolean(tournament.organizer.verified), followers: tournament.organizer.followers || 0 }
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saving = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  if (user?.role !== 'admin') return null;
  const structural = data.gameId !== tournament.gameId || data.format !== tournament.format || data.teamType !== tournament.teamType || data.teamSize !== tournament.teamSize || data.maxParticipants !== tournament.maxParticipants;
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-red-400';
  const change = <K extends keyof typeof data>(key: K, value: typeof data[K]) => setData(previous => ({ ...previous, [key]: value }));
  const upload = async (file: File | undefined, field: 'bannerUrl' | 'thumbnailUrl') => {
    if (!file) return;
    setUploading(true); setError('');
    try { const image = await prepareTournamentBanner(file); change(field, image.dataUrl); }
    catch (error) { setError((error as Error).message); }
    finally { setUploading(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving.current || uploading || !form.current?.reportValidity()) return;
    saving.current = true;
    setBusy(true); setError('');
    try {
      if (structural && !await showConfirm('Cambiaste el juego, formato, modalidad o cupos. Se reconstruirán y sortearán las llaves. Se conservarán las inscripciones, pero se borrarán los resultados y chats de las partidas actuales. Revisa que los inscritos cumplan la nueva modalidad. ¿Guardar estos cambios?')) return;
      const startDate = normalizeTournamentDate(data.startDate);
      if (!startDate) throw new Error('Indica una fecha y hora válida en horario de Chile.');
      const body = JSON.stringify({ ...data, startDate, rules: data.rules.map(rule => rule.trim()).filter(Boolean), participants: undefined, rounds: undefined, losersRounds: undefined, grandFinal: undefined, rebuildBracket: structural });
      if (new Blob([body]).size > MAX_TOURNAMENT_REQUEST_BYTES) throw new Error('Las imágenes o el texto superan el tamaño permitido. Reduce las imágenes.');
      const response = await fetch(`/api/tournaments/${tournament.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudieron guardar los cambios.');
      await refreshTournaments();
      onClose();
      showAlert('Los cambios del torneo se guardaron correctamente.');
    } catch (error) { setError((error as Error).message); }
    finally { saving.current = false; setBusy(false); }
  };
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
    <section role="dialog" aria-modal="true" aria-labelledby="edit-tournament-title" onKeyDown={event => {
      if (event.key === 'Escape' && !busy && !uploading) { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
        const first = controls[0], last = controls[controls.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-red-400/30 bg-[#191213] shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div><h2 id="edit-tournament-title" className="font-bold text-white">Editar torneo</h2><p className="text-xs text-slate-400">{tournament.title}</p></div>
        <button type="button" aria-label="Cerrar edición" disabled={busy || uploading} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={20} /></button>
      </header>
      <form ref={form} onSubmit={save} className="overflow-y-auto p-6">
        <fieldset disabled={busy || uploading} className="space-y-6 disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-slate-300 sm:col-span-2">Nombre del torneo<input autoFocus required maxLength={255} value={data.title} onChange={e => change('title', e.target.value)} className={inputClass} /></label>
            <label className="text-xs text-slate-300">Juego<select value={data.gameId} onChange={e => change('gameId', e.target.value as Tournament['gameId'])} className={inputClass}>{games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
            <label className="text-xs text-slate-300">Estado actual<select disabled value={data.status} className={inputClass}>
              <option value="registration_open">Inscripciones abiertas</option><option value="check_in">Check-in</option><option value="in_progress">En curso</option><option value="completed">Finalizado</option>
            </select></label>
            <label className="text-xs text-slate-300">Fecha y hora de inicio<input type="datetime-local" required value={data.startDate} onChange={e => change('startDate', e.target.value)} className={inputClass} /><span className="mt-1 block text-slate-400">Hora de Chile. Usa los controles de check-in del torneo para cambiar de fase.</span></label>
            <label className="text-xs text-slate-300">Región<select value={data.region} onChange={e => change('region', e.target.value as Tournament['region'])} className={inputClass}>{['LATAM','NA','EU','GLOBAL'].map(region => <option key={region}>{region}</option>)}</select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['bannerUrl','thumbnailUrl'] as const).map(field => <div key={field} className="space-y-2">
              <label className="text-xs text-slate-300">{field === 'bannerUrl' ? 'Banner principal' : 'Miniatura'}
                <input aria-label={field === 'bannerUrl' ? 'URL del banner' : 'URL de miniatura'} value={data[field]} onChange={e => change(field, e.target.value)} className={inputClass} placeholder="https://…" />
              </label>
              {data[field] && <img src={data[field]} alt={field === 'bannerUrl' ? 'Banner actual' : 'Miniatura actual'} className="h-24 w-full rounded-xl object-cover" />}
              <label className="block text-xs text-slate-400">Subir imagen (JPG, PNG o WEBP, hasta 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-xs" onChange={e => { void upload(e.target.files?.[0], field); e.target.value = ''; }} /></label>
            </div>)}
          </div>
          <label className="block text-xs text-slate-300">Descripción<textarea rows={4} maxLength={50000} value={data.description} onChange={e => change('description', e.target.value)} className={inputClass} /></label>
          <div className="space-y-4 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-red-300">Configuración competitiva</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-slate-300">Formato<select value={data.format} onChange={e => change('format', e.target.value as Tournament['format'])} className={inputClass}>
                <option value="single_elimination">Eliminación simple</option>{tournament.format !== 'single_elimination' && <option disabled value={tournament.format}>Formato anterior: cambia a eliminación simple</option>}
              </select></label>
              <label className="text-xs text-slate-300">Cupos<select value={data.maxParticipants} onChange={e => change('maxParticipants', Number(e.target.value))} className={inputClass}>{[8,16,32].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
              <label className="text-xs text-slate-300">Modalidad<select value={data.teamType} onChange={e => setData(previous => ({ ...previous, teamType: e.target.value as 'solo' | 'team', teamSize: e.target.value === 'solo' ? 1 : (data.gameId === 'fortnite' ? 2 : games.find(g => g.id === data.gameId)?.defaultTeamSize || 5) }))} className={inputClass}><option value="solo">Individual</option><option value="team">Por equipos</option></select></label>
              <label className="text-xs text-slate-300">Jugadores por equipo<input type="number" required min={1} max={data.gameId === 'fortnite' ? 4 : 100} step={1} disabled={data.teamType === 'solo'} value={data.teamSize} onChange={e => change('teamSize', Number(e.target.value))} className={inputClass} /></label>
            </div>
            {structural && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Este cambio requiere reconstruir las llaves. Al guardar se pedirá confirmar la eliminación de los resultados y chats actuales. Las inscripciones se conservan.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Costo de inscripción (CLP; 0 = gratis)<input type="number" required min={0} max={10000000} step={1} value={data.entryFeeAmount} onChange={e => change('entryFeeAmount', Number(e.target.value))} className={inputClass} /></label>
            <label className="text-xs text-slate-300">Premio total<input maxLength={100} value={data.prizePool} onChange={e => change('prizePool', e.target.value)} className={inputClass} /></label>
          </div>
          <div className="space-y-2"><h3 className="text-sm font-bold text-white">Distribución de premios</h3>
            {data.prizeDistribution.map((row,index) => <div key={index} className="flex items-center gap-2">
              <input required aria-label={`Puesto ${index+1}`} maxLength={100} placeholder="Puesto" value={row.place} onChange={e => change('prizeDistribution', data.prizeDistribution.map((p,i) => i === index ? { ...p, place: e.target.value } : p))} className={inputClass} />
              <input required aria-label={`Premio ${index+1}`} maxLength={200} placeholder="Premio" value={row.prize} onChange={e => change('prizeDistribution', data.prizeDistribution.map((p,i) => i === index ? { ...p, prize: e.target.value } : p))} className={inputClass} />
              <button type="button" aria-label={`Eliminar premio ${index+1}`} onClick={() => change('prizeDistribution', data.prizeDistribution.filter((_,i) => i !== index))} className="p-2 text-red-300"><Trash2 size={16} /></button>
            </div>)}
            <button type="button" disabled={data.prizeDistribution.length >= 100} onClick={() => change('prizeDistribution', [...data.prizeDistribution,{ place: '', prize: '' }])} className="flex items-center gap-2 text-xs text-red-300"><Plus size={14} />Agregar premio</button>
          </div>
          <TournamentRulesEditor config={data} mode={data.rulesMode} customRules={data.rules} onChange={(mode,rules) => setData(previous => ({ ...previous, rulesMode: mode, rules }))} />
          <div className="space-y-2"><h3 className="text-sm font-bold text-white">Cronograma</h3>
            {data.schedule.map((row,index) => <div key={index} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              {(['stage','time','format'] as const).map((field) => <input key={field} required={field !== 'format'} maxLength={field === 'stage' ? 150 : 100} aria-label={`${field === 'stage' ? 'Etapa' : field === 'time' ? 'Horario' : 'Formato'} ${index+1}`} placeholder={field === 'stage' ? 'Etapa' : field === 'time' ? 'Horario' : 'BO3'} value={row[field] || ''} onChange={e => change('schedule', data.schedule.map((p,i) => i === index ? { ...p,[field]: e.target.value } : p))} className={`${inputClass} flex-1 basis-24`} />)}
              <button type="button" aria-label={`Eliminar etapa ${index+1}`} onClick={() => change('schedule', data.schedule.filter((_,i) => i !== index))} className="p-2 text-red-300"><Trash2 size={16} /></button>
            </div>)}
            <button type="button" disabled={data.schedule.length >= 100} onClick={() => change('schedule', [...data.schedule,{ stage: '', time: '', format: '' }])} className="flex items-center gap-2 text-xs text-red-300"><Plus size={14} />Agregar etapa</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Apertura del check-in<input maxLength={100} value={data.checkInOpensAt || ''} onChange={e => change('checkInOpensAt', e.target.value)} className={inputClass} /></label>
            <label className="text-xs text-slate-300">Cierre del check-in<input maxLength={100} value={data.checkInClosesAt || ''} onChange={e => change('checkInClosesAt', e.target.value)} className={inputClass} /></label>
            <label className="text-xs text-slate-300">Nombre del organizador<input required maxLength={150} value={data.organizer.name} onChange={e => change('organizer',{ ...data.organizer,name: e.target.value })} className={inputClass} /></label>
            <label className="text-xs text-slate-300">Avatar del organizador (URL)<input value={data.organizer.avatar} onChange={e => change('organizer',{ ...data.organizer,avatar: e.target.value })} className={inputClass} /></label>
            <label className="text-xs text-slate-300">Seguidores del organizador<input type="number" required min={0} max={2147483647} step={1} value={data.organizer.followers} onChange={e => change('organizer',{ ...data.organizer,followers: Number(e.target.value) })} className={inputClass} /></label>
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-slate-300">
            <span className="text-slate-400">El check-in se abre y cierra desde la ficha del torneo.</span>
            <label className="flex items-center gap-2"><input type="checkbox" checked={data.isHidden} onChange={e => change('isHidden',e.target.checked)} />Torneo oculto</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={data.organizer.verified} onChange={e => change('organizer',{ ...data.organizer,verified: e.target.checked })} />Organizador verificado</label>
          </div>
        </fieldset>
        {uploading && <p role="status" className="mt-4 text-sm text-red-300">Preparando imagen…</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
        <footer className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" disabled={busy || uploading} onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancelar</button>
          <button type="submit" disabled={busy || uploading} className="flex items-center gap-2 rounded-xl bg-red-400 px-5 py-2 text-sm font-bold text-black hover:bg-red-300 disabled:opacity-50"><Save size={16} />{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </footer>
      </form>
    </section>
  </div>;
}
