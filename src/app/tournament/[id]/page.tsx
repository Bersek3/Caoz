'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  Shield,
  ShieldCheck,
  Gamepad2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronLeft,
  Share2,
  Sparkles,
  ExternalLink,
  Crown,
  UserCheck,
  Check,
  LogOut,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { useTournament } from '../../../context/TournamentContext';
import { useAuth } from '../../../context/AuthContext';
import { BracketVisualizer } from '../../../components/BracketVisualizer';
import { MatchRoomModal } from '../../../components/MatchRoomModal';
import { RegisterModal } from '../../../components/RegisterModal';
import { TournamentCountdown } from '../../../components/TournamentCountdown';
import { TournamentMatch } from '../../../types/tournament';
import { formatTournamentDate } from '../../../lib/dateUtils';

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    getTournament,
    currentUser,
    checkInParticipant,
    generateBracketFromParticipants,
    withdrawFromTournament,
    toggleHideTournament,
    deleteTournament
  } = useTournament();

  const tournament = getTournament(id);

  const [activeTab, setActiveTab] = useState<'overview' | 'brackets' | 'participants' | 'rules'>('brackets');
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Torneo no encontrado</h2>
        <p className="text-slate-400 text-sm">El torneo que buscas no existe o ha sido movido.</p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Directorio</span>
        </Link>
      </div>
    );
  }

  // If tournament is hidden and user is not admin, hide completely
  if (tournament.isHidden && !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <EyeOff className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white">Torneo Oculto o Archivado</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Esta competencia se encuentra actualmente archivada o en mantenimiento y no está visible para el público.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Directorio de Torneos</span>
        </Link>
      </div>
    );
  }

  const isSolo = tournament.teamType === 'solo' || tournament.teamSize === 1;

  // Check if current user or team is registered
  const myRegistration = tournament.participants.find(
    (p) =>
      (user && (p.name === user.username || p.userId === user.id)) ||
      (user?.teamName && p.name === user.teamName) ||
      (user?.team?.id && p.teamId === user.team.id) ||
      (user && p.captain?.name === user.username) ||
      (user && p.roster?.some((r: any) => r.userId === user.id || (r.username && r.username.toLowerCase() === user.username.toLowerCase()))) ||
      p.name === currentUser.teamName ||
      p.captain?.name === currentUser.name
  );

  const isCaptainOrSolo = Boolean(
    myRegistration && user && (
      isSolo
        ? (myRegistration.userId === user.id || myRegistration.name === user.username)
        : (user.team?.is_captain || user.team?.captain_id === user.id || myRegistration.captain?.name === user.username || myRegistration.userId === user.id)
    )
  );

  const handleWithdrawTournament = async () => {
    if (!myRegistration) return;
    const confirmMsg = isSolo
      ? '¿Estás seguro de que deseas salirte de este torneo individual? Tu puesto en las llaves volverá a quedar "Vacío".'
      : `¿Estás seguro de que deseas retirar a tu equipo "${myRegistration.name}" de este torneo? Como capitán, esta acción dará de baja la participación del equipo completo y liberará el cupo en las llaves.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsWithdrawing(true);
      const res = await withdrawFromTournament(tournament.id);
      if (res.success) {
        alert(res.message || 'Has bajado la participación del torneo exitosamente.');
      } else {
        alert(res.message || 'Error al intentar retirarse del torneo.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al procesar la solicitud.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleToggleHide = async () => {
    if (!isAdmin) return;
    const action = tournament.isHidden ? 'desocultar y publicar' : 'ocultar y archivar';
    if (!window.confirm(`¿Estás seguro de que deseas ${action} el torneo "${tournament.title}"? ${tournament.isHidden ? 'Volverá a ser visible para todos los usuarios.' : 'Quedará invisible para los usuarios regulares y se archivará en tu perfil de administrador.'}`)) {
      return;
    }

    const res = await toggleHideTournament(tournament.id, !tournament.isHidden);
    alert(res.message);
  };

  const handleDeleteTournament = async () => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Estás SEGURO de eliminar definitivamente el torneo "${tournament.title}"? Esta acción borrará permanentemente las llaves, partidas y participantes.`)) {
      return;
    }

    const res = await deleteTournament(tournament.id);
    if (res.success) {
      alert(res.message);
      router.push('/profile');
    } else {
      alert(res.message || 'Error al eliminar el torneo');
    }
  };

  const checkedInCount = tournament.participants.filter((p) => p.checkedIn).length;

  const handleDoCheckIn = () => {
    if (myRegistration) {
      checkInParticipant(tournament.id, myRegistration.id);
      alert('¡Check-in confirmado con éxito!');
    }
  };

  const filteredParticipants = tournament.participants.filter((p) =>
    p.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
    p.captain.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
    p.tag.toLowerCase().includes(participantSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-24">

      {/* Top Banner Hero */}
      <div className="relative w-full h-72 sm:h-96 overflow-hidden">
        <img
          src={tournament.bannerUrl}
          alt={tournament.title}
          className="w-full h-full object-cover object-center filter brightness-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link
            href="/"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 text-white text-xs font-semibold backdrop-blur-md transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver a Torneos</span>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-6 left-4 right-4 max-w-7xl mx-auto sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold uppercase">
                {tournament.gameName}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold uppercase">
                {tournament.format.replace('_', ' ')}
              </span>
              {tournament.status === 'in_progress' && (
                <span className="badge-live px-2.5 py-1 rounded-md text-xs font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 beacon-dot" />
                  <span>EN JUEGO</span>
                </span>
              )}
              {tournament.status === 'check_in' && (
                <span className="badge-checkin px-2.5 py-1 rounded-md text-xs font-bold flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>FASE DE CHECK-IN</span>
                </span>
              )}
              {tournament.status === 'registration_open' && (
                <span className="badge-open px-2.5 py-1 rounded-md text-xs font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>REGISTRO ABIERTO</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
              {tournament.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <img
                  src={tournament.organizer.avatar}
                  alt={tournament.organizer.name}
                  className="w-5 h-5 rounded-full object-cover border border-cyan-400"
                />
                <span>Organizado por <strong className="text-white">{tournament.organizer.name}</strong></span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{formatTournamentDate(tournament.startDate)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1 text-slate-300">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tournament.teamType === 'solo' ? 'Individual 1v1' : `Equipos ${tournament.teamSize}v${tournament.teamSize}`}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Check-in CTA */}
            {tournament.status === 'check_in' && (
              <button
                onClick={handleDoCheckIn}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-black bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/25 transition-all flex items-center space-x-2 font-mono"
              >
                <UserCheck className="w-4 h-4 text-black" />
                <span>Hacer Check-In</span>
              </button>
            )}

            {/* Register or Withdraw CTA */}
            {tournament.status !== 'completed' && (
              myRegistration ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-4 py-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Inscrito: <strong className="text-white ml-1">{myRegistration.name}</strong></span>
                  </div>

                  {isCaptainOrSolo ? (
                    <button
                      onClick={handleWithdrawTournament}
                      disabled={isWithdrawing}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-rose-300 bg-rose-950/50 border border-rose-500/40 hover:bg-rose-900/70 hover:border-rose-500/80 transition-all flex items-center space-x-1.5 disabled:opacity-50 font-mono shadow-lg shadow-rose-950/30"
                      title={isSolo ? 'Salir del torneo' : 'Retirar al equipo completo del torneo (solo capitán)'}
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isWithdrawing ? 'Retirando...' : isSolo ? 'Salir del Torneo' : 'Retirar Equipo'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic px-2">
                      (Solo el capitán puede retirar al equipo)
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-400/30 transition-all flex items-center space-x-2 font-mono"
                >
                  <Trophy className="w-4 h-4 text-black" />
                  <span>{isSolo ? 'Inscribirme (Individual)' : 'Inscribir Equipo'}</span>
                </button>
              )
            )}

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-700/80 pt-2 sm:pt-0 sm:pl-3">
                {/* Admin Generate Bracket CTA */}
                {tournament.rounds.length > 0 && (tournament.rounds[0].matches[0].team1.name.startsWith('Semilla') || tournament.rounds[0].matches[0].team1.name === 'Vacío') && (
                  <button
                    onClick={() => {
                      generateBracketFromParticipants(tournament.id);
                      alert('¡Llaves sorteadas y generadas con los participantes registrados!');
                    }}
                    className="px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-1.5 font-mono"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Sortear Llaves</span>
                  </button>
                )}

                {/* Hide / Unhide CTA */}
                <button
                  onClick={handleToggleHide}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 font-mono ${tournament.isHidden
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                    }`}
                  title={tournament.isHidden ? 'Hacer visible al público' : 'Ocultar a los usuarios y archivar en perfil'}
                >
                  {tournament.isHidden ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{tournament.isHidden ? 'Desocultar' : 'Ocultar'}</span>
                </button>

                {/* Delete CTA */}
                <button
                  onClick={handleDeleteTournament}
                  className="px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 hover:border-rose-500/60 transition-all flex items-center space-x-1.5 font-mono"
                  title="Eliminar torneo permanentemente (Admin)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-800 bg-[#0a0e17] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('brackets')}
            className={`py-4 border-b-2 flex items-center space-x-2 transition-all ${activeTab === 'brackets'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>Llaves (Brackets)</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 border-b-2 flex items-center space-x-2 transition-all ${activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
              }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Información General</span>
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`py-4 border-b-2 flex items-center space-x-2 transition-all ${activeTab === 'participants'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Participantes ({tournament.participants.length}/{tournament.maxParticipants})</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`py-4 border-b-2 flex items-center space-x-2 transition-all ${activeTab === 'rules'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
              }`}
          >
            <Shield className="w-4 h-4" />
            <span>Reglas y Soporte</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        {/* Admin Hidden Tournament Notice Banner */}
        {isAdmin && tournament.isHidden && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 animate-fade-in shadow-xl shadow-amber-950/20">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-300 uppercase tracking-wider">Torneo Oculto / Archivado</h4>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Este torneo está invisible para los usuarios normales y se encuentra archivado en tu perfil de administrador.
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleHide}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider font-mono shrink-0 transition-colors cursor-pointer"
            >
              Publicar / Desocultar
            </button>
          </div>
        )}

        {/* Live Countdown & Check-In Widget */}
        <div className="mb-6">
          <TournamentCountdown
            startDate={tournament.startDate}
            status={tournament.status}
            onCheckInClick={handleDoCheckIn}
            canCheckIn={Boolean(myRegistration && !myRegistration.checkedIn)}
            isCheckedIn={Boolean(myRegistration?.checkedIn)}
          />
        </div>

        {/* TAB 1: BRACKETS */}
        {activeTab === 'brackets' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-cyan-200">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Haz clic en cualquier partida de la llave para abrir la <strong>Sala de Match</strong>, reportar el marcador, adjuntar captura de victoria o chatear con tu rival.
                </span>
              </div>
              <span className="font-mono text-cyan-400 text-[11px] shrink-0">
                Motor de Brackets Reactivo
              </span>
            </div>

            <BracketVisualizer
              tournament={tournament}
              onSelectMatch={(match) => setSelectedMatch(match)}
            />
          </div>
        )}

        {/* TAB 2: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">

            {/* Left 2 Cols: Details & Prizes */}
            <div className="lg:col-span-2 space-y-8">

              {/* Description */}
              <div className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Acerca de este Torneo
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {tournament.description}
                </p>
              </div>

              {/* Prize Pool Breakdown */}
              <div className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>Premios y Distribución</span>
                  </h3>
                  <span className="text-sm font-mono font-bold text-amber-400">
                    {tournament.prizePool}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tournament.prizeDistribution.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-3.5"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : idx === 1
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                            : 'bg-amber-900/30 text-amber-600 border border-amber-800/40'
                        }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{p.place}</h4>
                        <p className="text-xs font-mono font-semibold text-cyan-400">{p.prize}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span>Cronograma Oficial</span>
                </h3>
                <div className="divide-y divide-slate-800">
                  {tournament.schedule.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block">{item.stage}</span>
                        <span className="text-slate-400 text-[11px]">{item.format}</span>
                      </div>
                      <span className="font-mono text-cyan-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right 1 Col: Quick Info Sidebar */}
            <div className="space-y-6">

              <div className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ficha del Torneo
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Juego:</span>
                    <span className="font-semibold text-white">{tournament.gameName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Formato:</span>
                    <span className="font-semibold text-cyan-300 capitalize">{tournament.format.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Región:</span>
                    <span className="font-semibold text-white">{tournament.region}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Inscripción:</span>
                    <span className="font-semibold text-emerald-400">{tournament.entryFee}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Cupos Ocupados:</span>
                    <span className="font-mono font-bold text-white">{tournament.participants.length} / {tournament.maxParticipants}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Check-in Confirmados:</span>
                    <span className="font-mono font-bold text-amber-400">{checkedInCount} equipos</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 shadow-md transition-all font-mono"
                >
                  REGISTRARSE AL EVENTO
                </button>
              </div>

              {/* Organizer Info Card */}
              <div className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={tournament.organizer.avatar}
                    alt={tournament.organizer.name}
                    className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40"
                  />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-sm font-bold text-white">{tournament.organizer.name}</h4>
                      {tournament.organizer.verified && (
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {tournament.organizer.followers.toLocaleString()} Seguidores
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Organización verificada en CAOZ ARENA. Garantía de pago de premios y moderación oficial.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div className="space-y-6 animate-fade-in">

            {/* Search and stats bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c121d] p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>Inscritos: <strong className="text-white font-mono">{tournament.participants.length}</strong></span>
                <span>•</span>
                <span>Check-in: <strong className="text-amber-400 font-mono">{checkedInCount}</strong></span>
                <span>•</span>
                <span>Cupos restantes: <strong className="text-cyan-400 font-mono">{tournament.maxParticipants - tournament.participants.length}</strong></span>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Buscar equipo o capitán..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />

                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-400 text-black text-xs font-bold font-mono hover:bg-cyan-300"
                >
                  + Inscribir
                </button>
              </div>
            </div>

            {/* Participants Grid */}
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-16 bg-[#0c121d] rounded-2xl border border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No se encontraron participantes registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-[#0c121d] border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-white line-clamp-1">{p.name}</h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                              {p.tag}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Semilla #{p.seed} • {p.registeredAt}
                          </span>
                        </div>
                      </div>

                      {p.checkedIn ? (
                        <span className="badge-open px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>CHECK-IN</span>
                        </span>
                      ) : (
                        <span className="badge-checkin px-2 py-0.5 rounded text-[10px] font-bold">
                          PENDIENTE
                        </span>
                      )}
                    </div>

                    {/* Captain & In-Game Tag */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Capitán:</span>
                        <span className="font-semibold text-white">{p.captain.name}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Tag de Juego:</span>
                        <span className="font-mono text-cyan-300">{p.captain.inGameId}</span>
                      </div>
                      {p.captain.discord && (
                        <div className="flex justify-between text-slate-400">
                          <span>Discord:</span>
                          <span className="font-mono text-slate-300">{p.captain.discord}</span>
                        </div>
                      )}
                    </div>

                    {/* Roster chips if available */}
                    {p.roster && p.roster.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                          Roster ({p.roster.length} miembros)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {p.roster.map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Captain or Solo Quick Withdraw Action in list */}
                    {myRegistration?.id === p.id && isCaptainOrSolo && tournament.status !== 'completed' && (
                      <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                        <button
                          onClick={handleWithdrawTournament}
                          disabled={isWithdrawing}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 transition-colors flex items-center space-x-1.5"
                        >
                          <LogOut className="w-3 h-3 text-rose-400" />
                          <span>{isSolo ? 'Salir del Torneo' : 'Retirar Equipo'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 4: RULES & SUPPORT */}
        {activeTab === 'rules' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 text-base font-bold text-white uppercase tracking-wider">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Reglamento Competitivo Oficial</span>
              </div>

              <div className="space-y-3">
                {tournament.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 text-xs sm:text-sm text-slate-300"
                  >
                    <span className="font-mono font-bold text-cyan-400 shrink-0">
                      #{idx + 1}
                    </span>
                    <p>{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/30 to-blue-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">¿Tienes dudas o necesitas un árbitro?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Los árbitros de CAOZ ARENA están disponibles durante todo el transcurso del torneo.
                </p>
              </div>

              <button
                onClick={() => alert('Para soporte o dudas durante una partida, abre la Sala del Match y haz clic en "Llamar a un árbitro".')}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold whitespace-nowrap shadow-md"
              >
                Centro de Ayuda & Discord
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Match Room Modal */}
      <MatchRoomModal
        tournament={tournament}
        match={selectedMatch}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />

      {/* Register Modal */}
      <RegisterModal
        tournament={tournament}
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />

    </div>
  );
}
