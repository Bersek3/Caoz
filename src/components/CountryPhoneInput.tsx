'use client';

import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min';
import { useEffect, useId, useRef, useState } from 'react';
import * as flags from 'country-flag-icons/react/3x2';
import { ChevronDown } from '@/components/icons';

const countries = getCountries();
const names = new Intl.DisplayNames(['es'], { type: 'region' });

export function CountryPhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [country, setCountry] = useState<CountryCode>('CL');
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const prefix = `+${getCountryCallingCode(country)}`;
  const SelectedFlag = flags[country as keyof typeof flags];
  useEffect(() => {
    if (!open) return;
    const selected = container.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    selected?.focus({ preventScroll: true });
    selected?.scrollIntoView({ block: 'nearest' });
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const selectCountry = (selected: CountryCode) => {
    const national = value.startsWith(prefix) ? value.slice(prefix.length) : value;
    setCountry(selected);
    onChange(`+${getCountryCallingCode(selected)}${national}`);
    setOpen(false);
    trigger.current?.focus();
  };
  return <div className="mt-1 flex items-stretch gap-2">
    <div ref={container} className="relative w-20 shrink-0" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" aria-label={`País del teléfono: ${names.of(country)}`} title={names.of(country)}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        onClick={() => setOpen(!open)} onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
        }} className="flex h-full w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white hover:border-red-400 focus-visible:outline-2 focus-visible:outline-red-400">
        <SelectedFlag aria-hidden="true" className="w-8 rounded-sm" />
        <ChevronDown aria-hidden="true" className="h-3 w-3 text-slate-400" />
      </button>
      {open && <div id={listId} role="listbox" aria-label="Selecciona el país" className="absolute bottom-full left-0 z-20 mb-2 grid max-h-52 w-56 grid-cols-4 gap-1 overflow-y-auto rounded-xl border border-red-400/30 bg-[#1b1417] p-2 shadow-2xl"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
          const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
          const index = options.indexOf(document.activeElement as HTMLButtonElement);
          const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 };
          let next: number | undefined;
          if (event.key in steps) next = Math.max(0, Math.min(options.length - 1, index + steps[event.key]));
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = options.length - 1;
          if (next !== undefined) { event.preventDefault(); options[next]?.focus(); }
        }}>
        {countries.map(code => {
          const Flag = flags[code as keyof typeof flags];
          const label = `${names.of(code)} +${getCountryCallingCode(code)}`;
          return <button key={code} type="button" role="option" aria-selected={code === country} aria-label={label} title={label}
            tabIndex={code === country ? 0 : -1} onClick={() => selectCountry(code)}
            className={`flex items-center justify-center rounded-lg p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-red-400 ${code === country ? 'bg-red-400/20 ring-1 ring-red-400/60' : ''}`}>
            <Flag aria-hidden="true" className="h-6 w-8 rounded-sm" />
          </button>;
        })}
      </div>}
    </div>
    <div className="flex min-w-0 flex-1 items-center rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-red-400">
      <span className="mr-2 text-sm text-red-300">{prefix}</span>
      <input aria-label="Número de teléfono" autoComplete="tel-national" type="tel" required inputMode="tel" maxLength={15}
        value={value.startsWith(prefix) ? value.slice(prefix.length) : value}
        onChange={event => onChange(prefix + event.target.value.replace(/\D/g, ''))}
        className="min-w-0 w-full bg-transparent py-2 text-white outline-none" />
    </div>
  </div>;
}
