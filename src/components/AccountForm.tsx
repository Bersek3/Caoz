'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CalendarDays, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { accountAge, accountHref, accountToday, type AccountMode } from '@/lib/accountNavigation';

export function AccountForm({ mode, returnTo, onAuthenticated }: {
  mode: AccountMode; returnTo: string; onAuthenticated: (needsGuardian: boolean) => void;
}) {
  const { login, register } = useAuth();
  const id = useId();
  const isSignup = mode === 'register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [today] = useState(accountToday);
  const submitting = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const age = accountAge(birthDate, today);
  const needsGuardian = age !== null && age >= 14 && age < 18;
  const invalidBirthDate = Boolean(birthDate && (age === null || age < 14));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (isSignup && (!username.trim() || age === null || age < 14 || !declaration)) {
      setError(!username.trim() ? 'Escribe tu nombre de jugador.' : age === null ? 'Ingresa una fecha de nacimiento válida.' : age < 14 ? 'La edad mínima para crear una cuenta en CZ ARENA es de 14 años.' : 'Confirma que tus datos son reales y acepta la política de privacidad.');
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const result = isSignup
        ? await register({ email: email.trim(), password, username: username.trim(), birthDate, swornDeclaration: declaration })
        : await login(email.trim(), password);
      if (!result.success) {
        setError(result.error || 'No pudimos completar la solicitud. Inténtalo de nuevo.');
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      onAuthenticated(isSignup && needsGuardian);
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { submitting.current = false; setLoading(false); }
  }

  return <div className="account-form-content">
    <div className="mb-7">
      <p className="account-eyebrow">{isSignup ? 'TU PRÓXIMA PARTIDA EMPIEZA AQUÍ' : 'BIENVENIDO DE VUELTA'}</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{isSignup ? 'Crea tu cuenta.' : 'Entra a la arena.'}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{isSignup ? 'Únete a la comunidad y encuentra tu próximo torneo.' : 'Inicia sesión para seguir tus torneos, tu equipo y tus partidas.'}</p>
    </div>

    <form onSubmit={submit} className="space-y-5" aria-label={isSignup ? 'Crear cuenta' : 'Iniciar sesión'}>
      {error && <div ref={errorRef} tabIndex={-1} role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-400/35 bg-red-950/35 p-3.5 text-sm leading-relaxed text-red-200"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <fieldset disabled={loading} className="min-w-0 space-y-5 disabled:opacity-70">
        {isSignup && <div>
          <label htmlFor={`${id}-username`} className="account-label">Nombre de jugador</label>
          <div className="account-input-wrap"><UserRound aria-hidden="true" /><input id={`${id}-username`} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={100} placeholder="Tu gamertag" value={username} onChange={event => setUsername(event.target.value)} className="account-input" /></div>
        </div>}
        <div>
          <label htmlFor={`${id}-email`} className="account-label">Correo electrónico</label>
          <div className="account-input-wrap"><Mail aria-hidden="true" /><input id={`${id}-email`} name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={255} placeholder="tu@correo.com" value={email} onChange={event => setEmail(event.target.value)} className="account-input" /></div>
        </div>
        <div>
          <label htmlFor={`${id}-password`} className="account-label">Contraseña</label>
          <div className="account-input-wrap"><LockKeyhole aria-hidden="true" /><input id={`${id}-password`} name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} required placeholder={isSignup ? 'Crea tu contraseña' : 'Tu contraseña'} value={password} onChange={event => setPassword(event.target.value)} className="account-input account-password-input" /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="account-password-toggle">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div>
        </div>
        {isSignup && <div>
          <label htmlFor={`${id}-birthdate`} className="account-label">Fecha de nacimiento</label>
          <div className="account-input-wrap"><CalendarDays aria-hidden="true" /><input id={`${id}-birthdate`} name="birthDate" type="date" autoComplete="bday" required max={today} value={birthDate} onChange={event => setBirthDate(event.target.value)} aria-describedby={`${id}-age-help`} aria-invalid={invalidBirthDate || undefined} className="account-input" /></div>
          <p id={`${id}-age-help`} aria-live="polite" className={`mt-2 text-xs leading-relaxed ${invalidBirthDate ? 'text-red-300' : needsGuardian ? 'text-amber-200' : 'text-slate-400'}`}>{invalidBirthDate ? age === null ? 'Revisa tu fecha de nacimiento.' : 'Debes tener al menos 14 años para crear tu cuenta.' : needsGuardian ? 'Puedes crear tu cuenta. Para competir necesitarás la autorización de tu apoderado desde el perfil.' : 'La edad mínima de la plataforma es de 14 años.'}</p>
        </div>}
        {isSignup && <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-slate-300"><input name="declaration" type="checkbox" required checked={declaration} onChange={event => setDeclaration(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-red-400" /><span>Declaro que mis datos y mi fecha de nacimiento son reales. He leído y acepto la <Link href="/privacidad" target="_blank" rel="noreferrer" className="font-semibold text-red-300 underline underline-offset-2">política de privacidad</Link>.</span></label>}
        {!isSignup && <div className="flex justify-end"><a href="mailto:contacto.caoz@gmail.com?subject=Ayuda%20para%20acceder%20a%20mi%20cuenta%20CZ%20ARENA" className="account-text-link text-xs">¿Problemas para entrar?</a></div>}
        <button type="submit" disabled={loading || (isSignup && invalidBirthDate)} className="account-submit">{loading ? <><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />{isSignup ? 'Creando tu cuenta…' : 'Iniciando sesión…'}</> : <>{isSignup ? 'Crear mi cuenta' : 'Iniciar sesión'}<ArrowRight aria-hidden="true" className="h-4 w-4" /></>}</button>
      </fieldset>
      {isSignup && <p className="text-center text-xs leading-relaxed text-slate-500">Podrás completar tu perfil y tus IDs de juego después.</p>}
    </form>

    <div className="mt-7 border-t border-slate-800 pt-6 text-center text-sm text-slate-400">{isSignup ? '¿Ya tienes una cuenta?' : '¿Primera vez por aquí?'}{' '}<Link href={accountHref(isSignup ? 'login' : 'register', returnTo)} className="account-text-link ml-1 font-bold">{isSignup ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></div>
  </div>;
}
