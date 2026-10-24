'use client';

import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min';
import { useState } from 'react';

const flag = (country: string) => String.fromCodePoint(...[...country].map(letter => letter.charCodeAt(0) + 127397));
const countries = getCountries();

export function CountryPhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [country, setCountry] = useState<CountryCode>('CL');
  const prefix = `+${getCountryCallingCode(country)}`;
  return <div className="mt-1 flex items-stretch gap-2">
    <select aria-label="País del teléfono" title="País del teléfono" value={country} onChange={event => {
      const selected = event.target.value as CountryCode;
      const national = value.startsWith(prefix) ? value.slice(prefix.length) : value;
      setCountry(selected);
      onChange(`+${getCountryCallingCode(selected)}${national}`);
    }} className="w-20 shrink-0 rounded-lg border border-slate-700 bg-slate-950 p-2 text-lg text-white">
      {countries.map(code => <option key={code} value={code} label={flag(code)} aria-label={`${code} +${getCountryCallingCode(code)}`}>{flag(code)}</option>)}
    </select>
    <div className="flex min-w-0 flex-1 items-center rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-red-400">
      <span className="mr-2 text-sm text-red-300">{prefix}</span>
      <input aria-label="Número de teléfono" autoComplete="tel-national" type="tel" required inputMode="tel" maxLength={15}
        value={value.startsWith(prefix) ? value.slice(prefix.length) : value}
        onChange={event => onChange(prefix + event.target.value.replace(/\D/g, ''))}
        className="min-w-0 w-full bg-transparent py-2 text-white outline-none" />
    </div>
  </div>;
}
