'use client';

import { Download, FileText, RefreshCw } from '@/components/icons';
import { formatRulesDocument, getTournamentRulesPreset, type RulesConfiguration, type RulesMode } from '../lib/tournamentRules';

export function downloadTournamentRules(title: string, rules: string[]) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', formatRulesDocument(title,rules)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'bases-caoz-arena.txt';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TournamentRulesEditor({ config, mode, customRules, onChange }: {
  config: RulesConfiguration; mode: RulesMode; customRules: string[];
  onChange: (mode: RulesMode, rules: string[]) => void;
}) {
  let preset;
  try { preset = getTournamentRulesPreset(config); }
  catch (error) { return <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{(error as Error).message}</p>; }
  const rules = mode === 'automatic' ? preset.rules : customRules;
  return <section className="space-y-3 rounded-xl border border-red-400/25 bg-red-950/10 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-red-300"><FileText size={16} />Bases y reglamento</h3>
      <span className="text-xs text-slate-400">{mode === 'automatic' ? 'Carga automática' : 'Personalizadas'}</span>
    </div>
    <p className="text-xs leading-relaxed text-slate-400">{config.gameId === 'fortnite' ? 'Las bases de Fortnite se adaptan al formato, modalidad, cupos, región, horario y premios del torneo.' : 'Reglas generales para esta competición.'} Se guardan con el torneo y se muestran a los participantes en Reglamento.</p>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={mode === 'automatic'} onClick={() => onChange('automatic',customRules)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${mode === 'automatic' ? 'border-red-400/50 bg-red-400/15 text-red-200' : 'border-slate-700 text-slate-300'}`}><RefreshCw size={13} />Usar bases automáticas</button>
      <button type="button" aria-pressed={mode === 'custom'} onClick={() => onChange('custom',mode === 'automatic' ? [...preset.rules] : customRules)} className={`rounded-lg border px-3 py-2 text-xs ${mode === 'custom' ? 'border-red-400/50 bg-red-400/15 text-red-200' : 'border-slate-700 text-slate-300'}`}>Personalizar</button>
      <button type="button" onClick={() => downloadTournamentRules(config.title || preset.title,rules)} className="flex items-center gap-1.5 px-2 py-2 text-xs text-slate-300 hover:text-white"><Download size={13} />Descargar bases</button>
    </div>
    {mode === 'automatic' ? <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3" aria-label="Vista previa de las bases automáticas">
      <p className="text-xs font-bold text-white">{preset.title}</p>
      <ol className="list-decimal space-y-3 pl-5 text-xs leading-relaxed text-slate-300">{rules.map((rule,index) => <li key={index}>{rule}</li>)}</ol>
    </div> : <div>
      <label className="text-xs text-slate-300">Reglas personalizadas (una por línea)
        <textarea rows={10} value={customRules.join('\n')} onChange={event => onChange('custom',event.target.value.split('\n'))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-white focus:border-red-400 focus:outline-none" />
      </label>
      <p className="mt-2 text-xs text-amber-200">Las reglas personalizadas se conservan al cambiar la configuración. Usa bases automáticas si quieres que se vuelvan a adaptar.</p>
    </div>}
    {config.gameId === 'fortnite' && <a href="/reglamentos/fortnite-caozarena.md" download className="inline-block text-xs text-red-300 underline hover:text-red-200">Descargar documento general de Fortnite</a>}
  </section>;
}
