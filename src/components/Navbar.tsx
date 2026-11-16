'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Calendar, CheckCheck, CheckCircle2, Clock, Flame, LogIn, LogOut, PlusCircle, Swords, Trophy, User, Users, X } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { getCheckInWindow, parseTournamentDate } from '../lib/dateUtils';
import { findMyRegistration, getTournamentAction } from '../lib/tournamentPresentation';
import { getUserAvatar } from '../lib/userAvatar';

const readEvent = 'caoz-notifications-read';
function subscribeRead(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(readEvent, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(readEvent, listener); };
}
interface NavbarProps { onOpenCreateModal?: () => void }
interface TournamentNotification {
  id: string; title: string; message: string; type: 'check_in' | 'starting_soon' | 'in_progress' | 'completed' | 'announcement';
  href: string; tournamentTitle: string; timeLabel: string; urgent: boolean;
}

export function Navbar({ onOpenCreateModal }: NavbarProps) {
  const pathname = usePathname();
  const { user, token, logout, openAuthModal } = useAuth();
  const { tournaments } = useTournament();
  const [showNotifications, setShowNotifications] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [announcementNotifications, setAnnouncementNotifications] = useState<TournamentNotification[]>([]);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';
  const readKey = `caoz_notifications_read_${user?.id || 'guest'}`;
  const dismissedKey = `caoz_notifications_dismissed_${user?.id || 'guest'}`;
  const readSnapshot = useSyncExternalStore(subscribeRead, () => {
    try { return localStorage.getItem(readKey) || '[]'; } catch { return '[]'; }
  }, () => '[]');
  let readIds: string[] = [];
  try { const saved: unknown = JSON.parse(readSnapshot); if (Array.isArray(saved)) readIds = saved.filter((id): id is string => typeof id === 'string'); } catch { /* Ignore invalid local preferences. */ }
  const dismissedSnapshot = useSyncExternalStore(subscribeRead, () => {
    try { return localStorage.getItem(dismissedKey) || '[]'; } catch { return '[]'; }
  }, () => '[]');
  let dismissedIds: string[] = [];
  try { const saved: unknown = JSON.parse(dismissedSnapshot); if (Array.isArray(saved)) dismissedIds = saved.filter((id): id is string => typeof id === 'string'); } catch { /* Ignore invalid local preferences. */ }

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', tick); };
  }, []);
  useEffect(() => {
    if (!showNotifications) return;
    const frame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowNotifications(false); bellRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); };
  }, [showNotifications]);
  useEffect(() => {
    if (!user?.id || !token) { setAnnouncementNotifications([]); return; }
    let cancelled = false;
    const load = async () => {
      const response = await fetch('/api/notifications/announcements', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!cancelled && response.ok) setAnnouncementNotifications((data.notifications || []).map((item: { id: string; message: string; senderName: string; tournamentTitle: string; slug: string; timeLabel: string }) => ({ id: `announcement-${item.id}`, title: 'Nuevo anuncio del staff', message: item.message, type: 'announcement', href: `/tournament/${item.slug}?tab=announcements`, tournamentTitle: item.tournamentTitle, timeLabel: item.timeLabel, urgent: true })));
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user?.id, token]);

  const userNotifications = useMemo(() => {
    if (!user) return [];
    const items: TournamentNotification[] = [];
    tournaments.forEach(t => {
      if (t.isHidden && !isAdmin) return;
      const registration = findMyRegistration(t, user);
      if (!registration && !isAdmin) return;
      const window = getCheckInWindow(t, now);
      const start = parseTournamentDate(t.startDate)?.getTime();
      const minutes = start ? Math.max(0, Math.ceil((start - now) / 60000)) : null;
      const action = getTournamentAction(t, user);
      const base = { href: action.href, tournamentTitle: t.title };
      if (window.isOpen) {
        const confirmed = registration?.checkedIn;
        const closesIn = window.closesAt ? Math.max(0, Math.ceil((window.closesAt.getTime() - now) / 60000)) : null;
        items.push({ ...base, id: `checkin-${t.id}-${t.checkInOpensAt}-${confirmed ? 'done' : 'pending'}`, title: confirmed ? 'Asistencia confirmada' : isAdmin && !registration ? 'Check-in abierto' : 'Confirma tu asistencia',
          message: confirmed ? 'Tu asistencia está confirmada. Revisa el horario y prepara tu partida.' : isAdmin && !registration ? 'La ventana de confirmación está abierta para los participantes.' : 'El check-in está abierto. Confirma antes del cierre para conservar tu cupo.',
          type: 'check_in', timeLabel: closesIn === null ? 'Abierto' : `Cierra en ${closesIn} min`, urgent: !confirmed });
      } else if (minutes !== null && minutes > 0 && minutes <= 120 && !window.hasClosed && t.status !== 'completed' && t.status !== 'in_progress') {
        items.push({ ...base, id: `soon-${t.id}-${t.startDate}`, title: 'Tu torneo comienza pronto', message: 'Revisa el horario del check-in y prepara tu participación.', type: 'starting_soon', timeLabel: `En ${minutes} min`, urgent: false });
      }
      if (t.status === 'in_progress') items.push({ ...base, id: `live-${t.id}-${t.startDate}-${action.href}`, title: action.kind === 'match' ? 'Tu partida está disponible' : 'Torneo en juego', message: 'Consulta tu participación, las partidas y los resultados actualizados.', type: 'in_progress', timeLabel: 'En juego', urgent: true });
      if (t.status === 'completed' && registration) items.push({ ...base, id: `results-${t.id}-${t.startDate}`, title: 'Resultados disponibles', message: 'El torneo finalizó. Revisa la clasificación y los premios.', type: 'completed', timeLabel: 'Finalizado', urgent: false });
    });
    return [...announcementNotifications, ...items].sort((a, b) => Number(b.urgent) - Number(a.urgent));
  }, [user, tournaments, isAdmin, now, announcementNotifications]);
  const visibleNotifications = userNotifications.filter(notification => !dismissedIds.includes(notification.id));
  const unreadCount = visibleNotifications.filter(notification => !readIds.includes(notification.id)).length;

  function markRead(ids: string[]) {
    try { localStorage.setItem(readKey, JSON.stringify([...new Set([...readIds, ...ids])].slice(-500))); window.dispatchEvent(new Event(readEvent)); }
    catch { /* Notifications remain available when browser storage is disabled. */ }
  }
  function dismissAll() {
    try { localStorage.setItem(dismissedKey, JSON.stringify([...new Set([...dismissedIds, ...userNotifications.map(item => item.id)])].slice(-500))); window.dispatchEvent(new Event(readEvent)); }
    catch { /* Notifications remain visible when browser storage is disabled. */ }
  }
  function closeNotifications() { setShowNotifications(false); bellRef.current?.focus(); }

  const navLinks = <>
    <Link href="/arena" className={`arena-nav-link ${pathname === '/arena' ? 'is-active' : ''}`}><Trophy className="h-4 w-4" />Torneos</Link>
    {user && <><Link href="/arena?view=mine&status=all#torneos" className="arena-nav-link"><Users className="h-4 w-4" />Mis torneos</Link><Link href="/profile" className={`arena-nav-link ${pathname === '/profile' ? 'is-active' : ''}`}><User className="h-4 w-4" />Mi perfil</Link></>}
  </>;

  return <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-5">
        <Link href="/arena" aria-label="CZ Arena, inicio de torneos" className="flex shrink-0 items-center gap-2">
          <span className="hidden h-9 w-9 items-center justify-center rounded-xl border border-red-400/40 bg-red-950/40 sm:flex"><Swords className="h-5 w-5 text-red-300" /></span>
          <span><span className="block text-lg font-black tracking-wide text-white">CZ <span className="text-red-300">ARENA</span></span><span className="hidden text-[10px] uppercase tracking-widest text-slate-400 sm:block">Plataforma de torneos</span></span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden items-center gap-1 lg:flex">{navLinks}</nav>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {isAdmin && onOpenCreateModal && <button onClick={onOpenCreateModal} aria-label="Crear torneo" className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-2.5 text-sm font-semibold text-white hover:bg-red-400"><PlusCircle className="h-4 w-4" /><span className="hidden xl:inline">Crear torneo</span></button>}
        {user && <div className="relative">
          <button ref={bellRef} onClick={() => setShowNotifications(!showNotifications)} aria-label={`Notificaciones: ${unreadCount} sin leer`} aria-expanded={showNotifications} aria-controls="tournament-notifications" className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-slate-800"><Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
          {showNotifications && <><div className="fixed inset-0 z-40" onClick={closeNotifications} /><div ref={panelRef} id="tournament-notifications" role="region" aria-labelledby="notification-title" className="fixed left-4 right-4 top-28 z-50 overflow-hidden rounded-2xl border border-slate-700 bg-[#1c1417] shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 p-4"><h2 id="notification-title" className="text-sm font-bold text-white">Tus notificaciones</h2><button onClick={closeNotifications} aria-label="Cerrar notificaciones" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
            {visibleNotifications.length > 0 && <div className="flex border-b border-slate-800"><button onClick={() => markRead(visibleNotifications.map(item => item.id))} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-xs font-semibold text-red-300 hover:bg-slate-800"><CheckCheck className="h-4 w-4" />Marcar leídas</button><button onClick={dismissAll} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 border-l border-slate-800 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"><X className="h-4 w-4" />Eliminar todas</button></div>}
            <div className="max-h-[min(65vh,420px)] overflow-y-auto divide-y divide-slate-800">
              {visibleNotifications.length === 0 ? <div className="space-y-2 px-5 py-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-slate-500" /><p className="text-sm font-semibold text-white">Estás al día</p><p className="text-xs leading-relaxed text-slate-400">Aquí verás los avisos de asistencia, partidas y resultados de tus torneos.</p></div> : visibleNotifications.map(notification => <Link key={notification.id} href={notification.href} onClick={() => { markRead([notification.id]); setShowNotifications(false); }} className={`flex gap-3 border-l-2 p-4 transition-colors hover:bg-slate-800/60 ${!readIds.includes(notification.id) ? 'border-amber-300 bg-amber-500/15' : 'border-transparent bg-slate-950/35 opacity-65'}`}>
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${notification.urgent ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>{notification.type === 'check_in' ? <Clock className="h-4 w-4" /> : notification.type === 'in_progress' || notification.type === 'announcement' ? <Flame className="h-4 w-4" /> : notification.type === 'completed' ? <Trophy className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-1"><span className="text-sm font-semibold text-white">{notification.title}</span><span className="text-xs text-red-300">{notification.timeLabel}</span></span><span className="mt-1 block text-xs leading-relaxed text-slate-300">{notification.message}</span><span className="mt-1 block text-xs font-semibold text-slate-400">{notification.tournamentTitle}</span></span>
              </Link>)}
            </div>
            <p className="border-t border-slate-800 px-4 py-3 text-xs leading-relaxed text-slate-400">Avisos dentro de la plataforma. Se actualizan mientras navegas.</p>
          </div></>}
        </div>}
        {user ? <><Link href="/profile" aria-label="Mi perfil" className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-1 hover:bg-slate-800"><img src={user.avatarUrl || getUserAvatar(user.username)} alt="" className="h-8 w-8 rounded-full border border-red-400/40 object-cover" /><span className="hidden max-w-28 truncate text-sm text-slate-200 xl:inline">{user.username}</span></Link><button onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión" className="hidden h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-red-300 lg:flex"><LogOut className="h-4 w-4" /></button></> : <button onClick={() => openAuthModal('login')} className="arena-secondary-button"><LogIn className="h-4 w-4" /><span>Ingresar</span></button>}
      </div>
    </div>
    <nav aria-label="Navegación móvil" className="flex items-center gap-1 overflow-x-auto border-t border-white/5 px-3 lg:hidden">{navLinks}{user && <button onClick={logout} className="arena-nav-link ml-auto"><LogOut className="h-4 w-4" />Salir</button>}</nav>
  </header>;
}

