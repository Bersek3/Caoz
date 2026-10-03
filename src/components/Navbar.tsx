'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Swords,
  PlusCircle,
  Shield,
  LogIn,
  User,
  LogOut,
  Bell,
  Clock,
  Flame,
  Calendar,
  CheckCircle2,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { getCountdown } from '../lib/dateUtils';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  onOpenCreateModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateModal }) => {
  const pathname = usePathname();
  const { user, logout, openAuthModal } = useAuth();
  const { tournaments } = useTournament();

  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  const isAdmin = user?.role === 'admin';

  // Real-time notifications for registered tournaments (Check-In & Start)
  const userNotifications = useMemo(() => {
    if (!user) return [];

    const items: Array<{
      id: string;
      title: string;
      message: string;
      type: 'check_in' | 'starting_soon' | 'in_progress';
      tournamentSlug: string;
      tournamentTitle: string;
      timeLabel: string;
      urgent: boolean;
    }> = [];

    tournaments.forEach((t) => {
      // Check if user is registered in this tournament
      const myReg = t.participants.find(
        (p) =>
          p.name === user.username ||
          p.userId === user.id ||
          (user.team?.name && p.name === user.team.name) ||
          p.captain?.name === user.username ||
          (user.team?.id && p.teamId === user.team.id) ||
          p.roster?.some((r: any) => r.userId === user.id || (r.username && r.username.toLowerCase() === user.username.toLowerCase()))
      );

      // Only notify registered participants (or admins)
      if (!myReg && !isAdmin) return;

      const countdown = getCountdown(t.startDate);

      // 1. Check-In Alert
      if (t.status === 'check_in' || (countdown.isCheckInWindow && !countdown.isPast && t.status !== 'completed')) {
        const checked = myReg?.checkedIn;
        items.push({
          id: `checkin-${t.id}-${checked ? 'done' : 'pending'}`,
          title: checked ? 'Check-In Confirmado ✓' : '¡Check-In Abierto!',
          message: checked
            ? `Tu cupo en "${t.title}" está asegurado. Las llaves comenzarán pronto.`
            : `El Check-In para "${t.title}" está activo. Confirma tu asistencia para no perder tu cupo en el bracket.`,
          type: 'check_in',
          tournamentSlug: t.slug,
          tournamentTitle: t.title,
          timeLabel: countdown.minutes > 0 ? `Inicia en ${countdown.minutes}m ${countdown.seconds}s` : 'En fase Check-in',
          urgent: !checked
        });
      }

      // 2. Starting Soon Alert (Within next 2 hours, before check-in)
      if (!countdown.isPast && countdown.totalMilliseconds > 0 && countdown.totalMilliseconds < 2 * 60 * 60 * 1000 && !countdown.isCheckInWindow && t.status !== 'completed') {
        const minsLeft = Math.floor(countdown.totalMilliseconds / (60 * 1000));
        items.push({
          id: `start-soon-${t.id}`,
          title: 'Torneo Próximo a Comenzar',
          message: `"${t.title}" comenzará aproximadamente en ${minsLeft} minutos. ¡Prepara a tu equipo!`,
          type: 'starting_soon',
          tournamentSlug: t.slug,
          tournamentTitle: t.title,
          timeLabel: `En ${minsLeft} min`,
          urgent: false
        });
      }

      // 3. Tournament In Progress / Live
      if (t.status === 'in_progress') {
        items.push({
          id: `live-${t.id}`,
          title: '¡Torneo En Juego!',
          message: `Las partidas de "${t.title}" están en desarrollo. Revisa tus llaves y accede a tu Sala de Partida.`,
          type: 'in_progress',
          tournamentSlug: t.slug,
          tournamentTitle: t.title,
          timeLabel: 'En Vivo',
          urgent: true
        });
      }
    });

    return items;
  }, [user, tournaments, isAdmin]);

  const unreadCount = userNotifications.filter((n) => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    setReadIds(userNotifications.map((n) => n.id));
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand Logo */}
        <div className="flex items-center space-x-8">
          <Link href="/arena" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-all duration-300">
              <div className="w-full h-full bg-[#0a0e17] rounded-[10px] flex items-center justify-center">
                <Swords className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-wider text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  CAOZ<span className="text-cyan-400 font-extrabold">ARENA</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  ESPORTS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-widest font-mono uppercase -mt-0.5">
                Plataforma de Torneos
              </span>
            </div>
          </Link>

          {/* Navigation items */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/arena"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${pathname.startsWith('/arena') || pathname.startsWith('/torneo')
                  ? 'bg-white/10 text-cyan-300 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
            >
              🏆 Torneos
            </Link>

            {user && (
              <Link
                href="/profile"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${pathname === '/profile'
                    ? 'bg-white/10 text-cyan-300 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                Mi Perfil
              </Link>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">

          {/* Create Tournament CTA - ONLY visible for Administrators! */}
          {isAdmin && onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="relative inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Crear Torneo (Admin)</span>
              <span className="sm:hidden">Crear</span>
            </button>
          )}

          {/* Notification Bell (Only when logged in) */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notificaciones de torneos y Check-In"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/50">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0c121e] border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-fade-in divide-y divide-slate-800">
                    {/* Header */}
                    <div className="px-4 py-3 bg-[#0f1726] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Notificaciones de Torneo
                        </h4>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
                            {unreadCount} nuevas
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Marcar leídas</span>
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
                      {userNotifications.length === 0 ? (
                        <div className="py-8 px-4 text-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-xs text-white font-medium">Estás al día</p>
                          <p className="text-[11px] text-slate-400">
                            Aquí recibirás avisos automáticos cuando se abra el Check-In o comiencen tus torneos inscritos.
                          </p>
                        </div>
                      ) : (
                        userNotifications.map((notif) => {
                          const isUnread = !readIds.includes(notif.id);
                          return (
                            <Link
                              key={notif.id}
                              href={`/tournament/${notif.tournamentSlug}`}
                              onClick={() => {
                                setReadIds((prev) => [...prev, notif.id]);
                                setShowNotifications(false);
                              }}
                              className={`p-3.5 flex items-start space-x-3 hover:bg-slate-800/60 transition-colors block ${isUnread ? 'bg-cyan-950/25' : ''
                                }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notif.type === 'check_in'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : notif.type === 'in_progress'
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                  }`}
                              >
                                {notif.type === 'check_in' && <Clock className="w-4 h-4" />}
                                {notif.type === 'in_progress' && <Flame className="w-4 h-4" />}
                                {notif.type === 'starting_soon' && <Calendar className="w-4 h-4" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="text-xs font-bold text-white line-clamp-1">
                                    {notif.title}
                                  </h5>
                                  <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                                    {notif.timeLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono mt-1 block truncate">
                                  {notif.tournamentTitle} â†’
                                </span>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Auth Pill or Login Buttons */}
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3 pl-2 border-l border-slate-800">
              <Link
                href="/profile"
                className="flex items-center space-x-2.5 hover:opacity-85 transition-opacity"
              >
                <div className="relative">
                  <img
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#07090e] rounded-full" />
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-white leading-tight">
                      {user.fullName || user.username}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {user.teamTag || 'CAOZ'} â€¢ {user.riotId || user.username}
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <button
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ingresar</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};



