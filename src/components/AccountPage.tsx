'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Gamepad2, ShieldCheck, Swords, Trophy, Users } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { AccountForm } from './AccountForm';
import { accountHref, accountReturnTo, type AccountMode } from '@/lib/accountNavigation';

function ArenaIllustration() {
  return <div className="account-arena-illustration" aria-hidden="true">
    <div className="account-arena-orbit" />
    <svg className="account-bracket-lines" viewBox="0 0 520 240" fill="none"><path d="M65 50H165V95H230M65 140H165V95M455 50H355V95H290M455 140H355V95M260 120V185H330" stroke="currentColor" strokeWidth="1.5" /><path d="M65 50H110M410 50H455M260 155V185H300" stroke="#d78086" strokeWidth="2" /><circle cx="65" cy="50" r="5" /><circle cx="65" cy="140" r="5" /><circle cx="455" cy="50" r="5" /><circle cx="455" cy="140" r="5" /><circle cx="330" cy="185" r="5" /></svg>
    <div className="account-arena-trophy"><Trophy strokeWidth={1.3} /></div>
    <span className="account-arena-chip account-arena-chip-left"><Swords size={15} />TU EQUIPO</span>
    <span className="account-arena-chip account-arena-chip-right"><Check size={15} />TU SIGUIENTE RONDA</span>
  </div>;
}

export function AccountPage({ mode }: { mode: AccountMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading, logout } = useAuth();
  const returnTo = accountReturnTo(params.get('returnTo'));
  const isSignup = mode === 'register';
  return <div className="account-page">
    <header className="account-header">
      <Link href="/arena" aria-label="CZ ARENA, volver a torneos" className="account-brand"><span className="account-brand-mark"><Swords size={21} /></span><span>CZ <span className="text-red-300">ARENA</span><span className="account-brand-caption">EL JUEGO NOS UNE</span></span></Link>
      <Link href={returnTo} className="account-back-link"><ArrowLeft size={16} /><span>{returnTo === '/arena' || returnTo.startsWith('/tournament/') ? 'Volver a torneos' : 'Volver'}</span></Link>
    </header>

    <div className="account-layout">
      <aside className="account-story">
        <p className="account-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-red-300" />TU COMUNIDAD. TU COMPETENCIA.</p>
        <h2>Tu próxima<br /><span>victoria empieza</span><br />aquí.</h2>
        <p className="account-story-description">Elige tu torneo, reúne a tu equipo y vive cada ronda. Tu lugar en la arena te está esperando.</p>
        <ArenaIllustration />
        <div className="account-story-features"><span><Gamepad2 />Encuentra tu torneo</span><span><Users />Compite con tu equipo</span><span><Trophy />Sigue tus resultados</span></div>
      </aside>

      <section className="account-form-panel" aria-label={isSignup ? 'Registro en CZ ARENA' : 'Acceso a CZ ARENA'}>
        <div className="account-panel-topline" />
        {isLoading ? <div role="status" className="account-form-content space-y-5"><p className="text-sm text-slate-400">Preparando tu acceso…</p><div className="h-10 w-3/4 animate-pulse rounded-lg bg-slate-800" /><div className="h-12 animate-pulse rounded-xl bg-slate-800" /><div className="h-12 animate-pulse rounded-xl bg-slate-800" /></div> : user ? <div className="account-form-content space-y-5"><span className="inline-flex rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-red-300"><ShieldCheck size={26} /></span><h1 className="text-3xl font-black text-white">Ya estás en la arena.</h1><p className="text-sm leading-relaxed text-slate-400">Tienes una sesión iniciada como <strong className="text-slate-100">{user.username}</strong>.</p><Link href={returnTo} className="account-submit">Continuar<ArrowRight size={16} /></Link><button onClick={logout} className="account-text-link min-h-11 text-sm">Cerrar sesión</button></div> : <AccountForm key={mode} mode={mode} returnTo={returnTo} onAuthenticated={needsGuardian => router.replace(needsGuardian ? '/profile?' + new URLSearchParams({ returnTo }) : returnTo)} />}
      </section>
    </div>

    <footer className="account-footer"><span>© {new Date().getFullYear()} CZ ARENA</span><nav aria-label="Ayuda de acceso"><Link href="/privacidad">Privacidad</Link><a href="mailto:contacto.caoz@gmail.com?subject=Ayuda%20con%20mi%20cuenta%20CZ%20ARENA">Ayuda con mi cuenta</a></nav><Link href={accountHref(isSignup ? 'login' : 'register', returnTo)}>{isSignup ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</Link></footer>
  </div>;
}
