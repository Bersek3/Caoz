'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Swords,
  Search,
  Filter,
  Calendar,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Gamepad2,
  Sparkles,
  Award
} from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { useAuth } from '@/context/AuthContext';
import { GameId, TournamentFormat, TournamentStatus } from '@/types/tournament';
import { CreateTournamentModal } from '@/components/CreateTournamentModal';
import { AuthModal } from '@/components/AuthModal';
import { formatTournamentDate } from '@/lib/dateUtils';

export default function HomePage() {
  const { tournaments, games } = useTournament();
  const { user, openAuthModal } = useAuth();

  const [selectedGame, setSelectedGame] = useState<GameId | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TournamentStatus | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    // Hidden tournaments are invisible for regular users
    if (t.isHidden && !isAdmin) return false;
    if (selectedGame !== 'all' && t.gameId !== selectedGame) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (selectedFormat !== 'all' && t.format !== selectedFormat) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchGame = t.gameName.toLowerCase().includes(q);
      const matchOrg = t.organizer.name.toLowerCase().includes(q);
      if (!matchTitle && !matchGame && !matchOrg) return false;
    }
    return true;
  });

  const featuredTournament = tournaments.find((t) => !t.isHidden) || (isAdmin ? tournaments[0] : undefined);

  return (
    <div className="min-h-screen">

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800/80">

        {/* Glow ambient background lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-red-500/10 via-purple-500/10 to-red-500/10 blur-[130px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left Column: Heading & CTAs (7 cols) */}
            <div className="lg:col-span-7 space-y-6">


              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-none">
                CREA. COMPITE. <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-red-400 to-purple-400">
                  CONQUISTA.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
                Inscribe tu equipo o compite en solitario en torneos oficiales. Brackets interactivos, confirmación de asistencia por check-in y salas de partida en directo.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {/* Admin-only creation button */}
                {isAdmin ? (
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-xl shadow-red-400/30 transition-all font-mono flex items-center space-x-2 transform hover:-translate-y-0.5"
                  >
                    <Trophy className="w-4 h-4 text-black" />
                    <span>CREAR UN TORNEO (ADMIN)</span>
                  </button>
                ) : !user ? (
                  <button
                    onClick={() => openAuthModal('register')}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-xl shadow-red-400/30 transition-all font-mono flex items-center space-x-2 transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-black" />
                    <span>REGISTRARSE PARA COMPETIR</span>
                  </button>
                ) : null}

                <a
                  href="#torneos"
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center space-x-2"
                >
                  <Swords className="w-4 h-4 text-red-400" />
                  <span>Explorar Torneos</span>
                </a>
              </div>

            </div>

            {/* Right Column: Featured Tournament Card or Ready State (5 cols) */}
            <div className="lg:col-span-5">
              {featuredTournament ? (
                <div className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-red-500/40 via-purple-500/20 to-transparent shadow-2xl">
                  <div className="relative rounded-[23px] bg-[#1c1518] overflow-hidden p-6 space-y-5">

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 beacon-dot" />
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                          TORNEO DESTACADO
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs">
                        {featuredTournament.region}
                      </span>
                    </div>

                    <div className="relative h-44 rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={featuredTournament.bannerUrl}
                        alt={featuredTournament.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                        <span className="font-bold uppercase tracking-wider">{featuredTournament.gameName}</span>
                        <span className="font-mono text-red-300 font-bold">{featuredTournament.prizePool}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white uppercase leading-snug line-clamp-2">
                        {featuredTournament.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {featuredTournament.description}
                      </p>
                    </div>

                    <Link
                      href={`/tournament/${featuredTournament.slug}`}
                      className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 flex items-center justify-center space-x-2 transition-all font-mono"
                    >
                      <span>VER LLAVES & PARTIDAS</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                  </div>
                </div>
              ) : (
                <div className="relative rounded-3xl p-8 bg-[#1c1518] border border-slate-800 text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Próximos Torneos Oficiales</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Los administradores publicarán las próximas competencias de la temporada en breve. Inicia sesión o registra tu equipo para estar listo al abrirse las inscripciones.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-400 hover:bg-red-300 text-black text-xs font-bold font-mono uppercase tracking-wider"
                    >
                      <span>Publicar Primer Torneo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* GAMES STRIP */}
      <section id="juegos" className="py-8 bg-[#130f11] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Gamepad2 className="w-4 h-4 text-red-400" />
              <span>Videojuegos Oficiales</span>
            </h3>
            <span className="text-xs text-slate-500">Filtrar títulos</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {games.map((game) => {
              const count = tournaments.filter((t) => t.gameId === game.id).length;
              const isSelected = selectedGame === game.id;

              return (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(isSelected ? 'all' : game.id)}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${isSelected
                    ? 'bg-red-500/15 border-red-400 shadow-lg shadow-red-500/20'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <img
                    src={game.coverImage}
                    alt={game.name}
                    className="w-full h-20 rounded-xl object-cover mb-2 border border-white/5 group-hover:scale-105 transition-transform"
                  />
                  <h4 className="text-xs font-bold text-white truncate">{game.name}</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{game.genre}</span>
                    <span className="font-mono text-red-300 font-semibold">{count} torneos</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* TOURNAMENTS DIRECTORY */}
      <section id="torneos" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="space-y-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center space-x-3">
                <Trophy className="w-7 h-7 text-red-400" />
                <span>Directorio de Torneos</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Explora las llaves y participa en los torneos habilitados por la administración.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar torneo o juego..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-400 transition-colors"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedStatus === 'all'
                  ? 'bg-white/10 text-red-300 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                Todos ({tournaments.length})
              </button>
              <button
                onClick={() => setSelectedStatus('in_progress')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${selectedStatus === 'in_progress'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 beacon-dot" />
                <span>En Juego</span>
              </button>
              <button
                onClick={() => setSelectedStatus('check_in')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${selectedStatus === 'check_in'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Fase Check-In</span>
              </button>
              <button
                onClick={() => setSelectedStatus('registration_open')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${selectedStatus === 'registration_open'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Inscripción Abierta</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Formato:</span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-red-400"
              >
                <option value="all">Todos los formatos</option>
                <option value="single_elimination">Eliminación Simple</option>
                <option value="double_elimination">Doble Eliminación</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-20 bg-[#191213] rounded-2xl border border-slate-800 space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No hay torneos disponibles en este momento</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Pronto se anunciarán nuevas competencias oficiales. Los administradores publicarán los calendarios y premios.
            </p>
            {isAdmin && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-red-400 text-black text-xs font-bold font-mono uppercase"
              >
                + Crear Nuevo Torneo (Admin)
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((t) => {
              const isLive = t.status === 'in_progress';
              const isCheckIn = t.status === 'check_in';
              const isRegistration = t.status === 'registration_open';
              const isCompleted = t.status === 'completed';

              return (
                <div
                  key={t.id}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col group"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={t.bannerUrl}
                      alt={t.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1b1518] via-black/30 to-transparent" />

                    <div className="absolute top-3 left-3">
                      {isLive && (
                        <span className="badge-live px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1.5 shadow-lg">
                          <span className="w-2 h-2 rounded-full bg-rose-500 beacon-dot" />
                          <span>EN JUEGO</span>
                        </span>
                      )}
                      {isCheckIn && (
                        <span className="badge-checkin px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1.5 shadow-lg">
                          <Clock className="w-3.5 h-3.5" />
                          <span>CHECK-IN</span>
                        </span>
                      )}
                      {isRegistration && (
                        <span className="badge-open px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1.5 shadow-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>INSCRIPCIONES</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800/90 text-slate-300 border border-slate-700">
                          FINALIZADO
                        </span>
                      )}
                      {t.isHidden && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          OCULTO (ADMIN)
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-amber-400">
                      {t.prizePool}
                    </div>

                    <div className="absolute bottom-3 left-3 text-xs font-bold text-white uppercase tracking-wider">
                      {t.gameName}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-[#1b1518]">
                    <div className="space-y-2">
                      <Link href={`/tournament/${t.slug}`}>
                        <h3 className="text-base font-bold text-white uppercase leading-snug hover:text-red-400 transition-colors line-clamp-2">
                          {t.title}
                        </h3>
                      </Link>

                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <img
                          src={t.organizer.avatar}
                          alt={t.organizer.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="truncate">{t.organizer.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Formato</span>
                        <span className="font-semibold text-slate-200 capitalize">
                          {t.format.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Modalidad</span>
                        <span className="font-semibold text-slate-200">
                          {t.teamType === 'solo' ? 'Solo 1v1' : `${t.teamSize}v${t.teamSize}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Región</span>
                        <span className="font-semibold text-red-300 font-mono">
                          {t.region}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Entrada</span>
                        <span className="font-semibold text-emerald-400">
                          {t.entryFee}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono py-1 px-1 border-t border-slate-800/60">
                      <div className="flex items-center space-x-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">{formatTournamentDate(t.startDate)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Inscritos:</span>
                        <span className="font-bold text-white">
                          {t.participants.length} / {t.maxParticipants} slots
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{
                            width: `${Math.min(100, (t.participants.length / t.maxParticipants) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/tournament/${t.slug}`}
                      className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-slate-800 hover:bg-red-500 hover:text-black border border-slate-700/80 hover:border-red-400 flex items-center justify-center space-x-1.5 transition-all font-mono"
                    >
                      <span>VER TORNEO & LLAVES</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* Create Modal */}
      <CreateTournamentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

    </div>
  );
}

