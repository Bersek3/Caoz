'use client';

import React, { Suspense, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, ChevronLeft, Eye, EyeOff, Layers, LogOut, RefreshCw, Share2, Shield, Trophy } from '@/components/icons';
import { useTournament } from '@/context/TournamentContext';
import { useAuth } from '@/context/AuthContext';
import { BracketVisualizer } from '@/components/BracketVisualizer';
import { MatchRoomModal } from '@/components/MatchRoomModal';
import { EditTournamentModal } from '@/components/EditTournamentModal';
import { RegisterModal } from '@/components/RegisterModal';
import { TournamentCountdown } from '@/components/TournamentCountdown';
import { TournamentSupport } from '@/components/TournamentSupport';
import { TournamentWaitlist } from '@/components/TournamentWaitlist';
import { TournamentResults } from '@/components/TournamentResults';
import { TournamentMatches } from '@/components/TournamentMatches';
import { BattleRoyaleAnnouncements } from '@/components/BattleRoyaleAnnouncements';
import { showConfirm } from '@/components/StyledDialog';
import { downloadTournamentRules } from '@/components/TournamentRulesEditor';
import { Tournament } from '@/types/tournament';
import { formatTournamentDate, getCheckInWindow } from '@/lib/dateUtils';
import { formatChileanPesos, splitChileanPesos } from '@/lib/currency';
import { downloadTournamentCalendar, findMyRegistration, formatTournamentFormat, formatTournamentMode, getMyMatches, shareTournament } from '@/lib/tournamentPresentation';

const panel = 'rounded-2xl border border-slate-800 bg-[#191213] p-4 sm:p-6';
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-400 px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-red-400/50 hover:text-white disabled:opacity-50';
const statusNames = { registration_open: 'Inscripciones abiertas', check_in: 'Check-in', in_progress: 'En juego', completed: 'Finalizado' };
type DetailTab = 'overview' | 'brackets' | 'matches' | 'participants' | 'announcements' | 'rules' | 'results';

export default function TournamentDetailPage() {
  return <Suspense fallback={<p className="px-4 py-16 text-center text-slate-400">Cargando torneo…</p>}><TournamentDetailLoader /></Suspense>;
}

function TournamentDetailLoader() {
  const { id } = useParams<{ id: string }>();
  const { getTournament, isLoading, error, refreshTournaments } = useTournament();
  const { user, isLoading: authLoading } = useAuth();
  const tournament = getTournament(id);
  if (authLoading || (!tournament && isLoading)) return <div className="mx-auto max-w-7xl space-y-6 px-4 py-16" role="status"><div className="h-64 motion-safe:animate-pulse rounded-2xl bg-slate-800/50" /><p className="text-slate-400">Cargando torneo…</p></div>;
  if (!tournament || (tournament.isHidden && user?.role !== 'admin')) return <div className="mx-auto max-w-xl space-y-4 px-4 py-24 text-center">
    <h1 className="text-2xl font-bold text-white">{error ? 'No pudimos cargar el torneo' : 'Torneo no disponible'}</h1>
    <p className="text-sm text-slate-400">{error || 'El torneo no existe o actualmente no está publicado.'}</p>
    {error && <button className={secondary} onClick={() => refreshTournaments()}>Reintentar</button>}
    <Link href="/torneos" className="block text-red-300 underline">Volver a torneos</Link>
  </div>;
  return <TournamentDetail key={tournament.id} tournament={tournament} />;
}

function TournamentDetail({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, openAuthModal } = useAuth();
  const { checkInParticipant, generateBracketFromParticipants, withdrawFromTournament, toggleHideTournament, deleteTournament, setCheckInPhase, refreshTournaments, error, lastUpdated } = useTournament();
  const queryKey = searchParams.toString();
  const requestedTab = (): DetailTab => {
    const requested = searchParams.get('tab');
    if (tournament.format === 'battle_royale' && requested === 'brackets') return 'participants';
    return requested && ['overview', 'brackets', 'matches', 'participants', 'announcements', 'rules', 'results'].includes(requested) ? requested as DetailTab : tournament.status === 'completed' ? 'results' : tournament.status === 'in_progress' ? tournament.format === 'battle_royale' ? 'participants' : 'brackets' : 'overview';
  };
  const [tabChoice, chooseTab] = useState(() => ({ query: queryKey, value: requestedTab() }));
  const activeTab = tabChoice.query === queryKey ? tabChoice.value : requestedTab();
  const setActiveTab = (value: DetailTab) => chooseTab({ query: queryKey, value });
  const [matchChoice, chooseMatch] = useState(() => ({ query: queryKey, value: searchParams.get('match') }));
  const selectedMatchId = matchChoice.query === queryKey ? matchChoice.value : searchParams.get('match');
  const setSelectedMatchId = (value: string | null) => chooseMatch({ query: queryKey, value });
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const isAdmin = user?.role === 'admin';
  const isSolo = tournament.teamType === 'solo' || tournament.teamSize === 1;
  const battleRoyaleRoundPrize = tournament.format === 'battle_royale' ? splitChileanPesos(tournament.prizePool, tournament.prizeDistribution.length) : null;
  const myRegistration = findMyRegistration(tournament, user);
  const myMatches = getMyMatches(tournament, user);
  const nextMatch = myMatches.find(match => match.status !== 'completed' && match.canAccessRoom);
  const selectedMatch = [...tournament.rounds, ...(tournament.losersRounds || [])].flatMap(round => round.matches).find(match => match.id === selectedMatchId) || (tournament.grandFinal?.id === selectedMatchId ? tournament.grandFinal : null);
  const checkIn = getCheckInWindow(tournament);
  const checkedInCount = tournament.participants.filter(participant => participant.checkedIn).length;
  const isFull = tournament.participants.length >= tournament.maxParticipants;
  const isCaptainOrSolo = Boolean(myRegistration && user && (isSolo || user.team?.is_captain || user.team?.captain_id === user.id || myRegistration.userId === user.id || myRegistration.captain.name === user.username));
  const canCheckIn = Boolean(myRegistration && !myRegistration.checkedIn && isCaptainOrSolo && checkIn.isOpen);
  const filteredParticipants = tournament.participants.filter(participant => `${participant.name} ${participant.captain.name} ${participant.tag}`.toLowerCase().includes(participantSearch.toLowerCase().trim()));

  async function perform(action: string, operation: () => Promise<unknown>, success?: string) {
    if (busy) return;
    setBusy(action); setActionError(''); setNotice('');
    try { await operation(); if (success) setNotice(success); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No pudimos completar la acción. Inténtalo nuevamente.'); }
    finally { setBusy(''); }
  }
  async function doCheckIn() {
    if (!myRegistration || !canCheckIn) return;
    await perform('checkin', () => checkInParticipant(tournament.id, myRegistration.id), 'Check-in confirmado. Tu participación está lista para el sorteo.');
  }
  async function withdraw() {
    if (!await showConfirm(isSolo ? '¿Cancelar tu inscripción? Tu cupo quedará disponible.' : `¿Retirar al equipo ${myRegistration?.name}? Se cancelará la inscripción de todos sus integrantes.`)) return;
    await perform('withdraw', async () => { const response = await withdrawFromTournament(tournament.id); if (!response.success) throw new Error(response.message); }, 'La inscripción se canceló correctamente.');
  }
  async function changeCheckIn(phase: 'open' | 'close') {
    if (!await showConfirm(phase === 'open' ? '¿Abrir el check-in? Los participantes podrán confirmar su asistencia.' : `¿Cerrar el check-in? Hay ${checkedInCount} confirmados de ${tournament.participants.length} inscritos. El sorteo incluirá solo a los confirmados.`)) return;
    await perform('phase', () => setCheckInPhase(tournament.id, phase), phase === 'open' ? 'Check-in abierto.' : 'Check-in cerrado. Revisa los confirmados antes de sortear.');
  }
  async function draw() {
    if (!await showConfirm(`Se sortearán las llaves con ${checkedInCount} participantes confirmados. Quienes no hicieron check-in no participarán. ¿Continuar?`)) return;
    await perform('draw', () => generateBracketFromParticipants(tournament.id), 'Llaves sorteadas. Ya puedes revisar los enfrentamientos.');
  }
  function renderAction() {
    if (tournament.status === 'completed') return <button className={primary} onClick={() => setActiveTab('results')}>Ver resultados</button>;
    if (myRegistration) {
      if (canCheckIn) return <button className={primary} disabled={Boolean(busy)} onClick={doCheckIn}>{busy === 'checkin' ? 'Confirmando…' : 'Confirmar check-in'}</button>;
      if (nextMatch && tournament.status === 'in_progress') return <button className={primary} onClick={() => setSelectedMatchId(nextMatch.id)}>Ir a mi partida</button>;
      return <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />{myRegistration.checkedIn ? 'Asistencia confirmada' : 'Inscripción confirmada'}</span>;
    }
    if (tournament.status !== 'registration_open') return <span className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300">Inscripciones cerradas</span>;
    if (isFull) return <a href="#lista-espera" className={secondary}>Unirme a la lista de espera</a>;
    return <button className={primary} onClick={() => user ? setIsRegisterOpen(true) : openAuthModal('login')}>{user ? (isSolo ? 'Inscribirme' : 'Inscribir equipo') : 'Iniciar sesión para inscribirme'}</button>;
  }
  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Información' }, ...(tournament.format === 'battle_royale' ? [] : [{ id: 'brackets' as const, label: 'Llaves' }]),
    ...(myRegistration && tournament.format !== 'battle_royale' ? [{ id: 'matches' as const, label: 'Mis partidos' }] : []),
    { id: 'participants', label: `Participantes (${tournament.participants.length})` },
    ...(tournament.format === 'battle_royale' ? [{ id: 'announcements' as const, label: 'Chat general' }] : []),
    { id: 'rules', label: 'Reglas y ayuda' }, { id: 'results', label: 'Resultados' }
  ];

  return <div className="min-h-screen pb-16">
    <header className="relative isolate overflow-hidden border-b border-slate-800 bg-[#160f12]">
      <img src={tournament.bannerUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07090e] via-[#07090e]/75 to-[#07090e]/20" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/torneos" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-slate-200 hover:text-red-300"><ChevronLeft className="h-4 w-4" /> Torneos</Link>
          <div className="flex gap-2"><button className={secondary} onClick={() => perform('share', async () => { await shareTournament(tournament); })}><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Compartir</span><span className="sr-only sm:hidden">Compartir torneo</span></button><button className={secondary} onClick={() => perform('calendar', async () => { downloadTournamentCalendar(tournament); }, 'Evento descargado. Ábrelo para añadirlo a tu calendario.')}><CalendarPlus className="h-4 w-4" /><span className="hidden sm:inline">Añadir al calendario</span><span className="sr-only sm:hidden">Añadir al calendario</span></button></div>
        </div>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-red-300">{tournament.gameName}</span><span className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200">{statusNames[tournament.status]}</span>{tournament.isHidden && <span className="rounded-lg bg-amber-400/15 px-3 py-1.5 text-amber-300">Oculto</span>}</div>
          <h1 className="break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{tournament.title}</h1>
          <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300"><span>{formatTournamentMode(tournament)}</span><span>{formatTournamentFormat(tournament.format)}</span><span>{tournament.region}</span></p>
          <p className="text-sm text-slate-300">{formatTournamentDate(tournament.startDate)}</p>
          <p className="text-xs text-slate-400">Organizado por <strong className="text-slate-200">{tournament.organizer.name}</strong></p>
        </div><div id="inscripcion" className="shrink-0 scroll-mt-36">{renderAction()}</div></div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Inscripción', `${(tournament.entryFeeAmount || 0) > 0 ? formatChileanPesos(String(tournament.entryFeeAmount)) : tournament.entryFee}${(tournament.entryFeeAmount || 0) > 0 ? isSolo ? ' por jugador' : ' por equipo' : ''}`], ['Premios', formatChileanPesos(tournament.prizePool)], ['Cupos', `${tournament.participants.length} / ${tournament.maxParticipants} ${isSolo ? 'jugadores' : 'equipos'}`], ['Asistencia', `${checkedInCount} confirmados`]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-white">{value}</dd></div>)}</dl>
      </div>
    </header>
    <div className="sticky top-28 lg:top-16 z-20 border-b border-slate-800 bg-[#130f10]/95 backdrop-blur"><nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Secciones del torneo">{tabs.map(tab => <button key={tab.id} type="button" aria-current={activeTab === tab.id ? 'page' : undefined} aria-controls="tournament-section" className={`min-h-14 shrink-0 border-b-2 py-4 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-red-400 text-red-300' : 'border-transparent text-slate-400 hover:text-white'}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav></div>
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
      {(notice || actionError || error) && <div role={actionError || error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${actionError || error ? 'border-amber-500/40 bg-amber-950/30 text-amber-200' : 'border-emerald-400/30 bg-emerald-950/30 text-emerald-200'}`}>{actionError || error || notice}{error && <button className="ml-3 underline" onClick={() => refreshTournaments()}>Reintentar</button>}</div>}
      <TournamentCountdown tournament={tournament} onCheckInClick={doCheckIn} canCheckIn={canCheckIn} isCheckedIn={Boolean(myRegistration?.checkedIn)} isSubmitting={busy === 'checkin'} />
      {myRegistration && <section className={`${panel} space-y-4 border-red-400/25`} id="mi-participacion" aria-labelledby="my-participation">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 id="my-participation" className="text-lg font-bold text-white">Tu participación</h2><p className="mt-1 text-sm text-slate-300">{myRegistration.name} · {isSolo ? 'Individual' : isCaptainOrSolo ? 'Capitán del equipo' : 'Integrante del equipo'}</p></div><span className="inline-flex items-center gap-1.5 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Inscripción confirmada</span></div>
        <div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-400">Check-in</p><p className="mt-1 font-semibold text-white">{myRegistration.checkedIn ? 'Asistencia confirmada' : checkIn.hasClosed ? 'No confirmado · check-in cerrado' : 'Pendiente de confirmar'}</p>{!isSolo && !isCaptainOrSolo && !myRegistration.checkedIn && <p className="mt-1 text-xs text-slate-400">El capitán debe confirmar al equipo.</p>}</div><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-400">Próxima partida</p><p className="mt-1 font-semibold text-white">{nextMatch ? nextMatch.roundTitle : tournament.status === 'completed' ? 'Competencia finalizada' : 'Pendiente de asignación'}</p>{nextMatch && <p className="mt-1 text-xs text-slate-400">{nextMatch.team1.name} vs {nextMatch.team2.name}</p>}</div><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-400">Inscripción</p><p className="mt-1 font-semibold text-white">{tournament.entryFee}</p>{(tournament.entryFeeAmount || 0) > 0 && <Link href="/arena/pagos" className="mt-1 inline-block text-xs text-red-300 underline">Consultar pago y referencia</Link>}</div></div>
        {myRegistration.roster?.length > 0 && <p className="text-xs leading-relaxed text-slate-400">Integrantes inscritos: <span className="text-slate-200">{myRegistration.roster.map(member => member.name).join(' · ')}</span></p>}
        <div className="flex flex-wrap gap-2">{canCheckIn && renderAction()}{nextMatch && <button className={secondary} onClick={() => setSelectedMatchId(nextMatch.id)}>Abrir mi sala</button>}<button className={secondary} onClick={() => setActiveTab('matches')}>Ver mis partidos</button>{['registration_open', 'check_in'].includes(tournament.status) && isCaptainOrSolo && ((tournament.entryFeeAmount || 0) > 0 ? <a href="#tournament-support" className="inline-flex items-center px-3 text-xs text-slate-400 underline">Solicitar retiro o devolución</a> : <button className="inline-flex min-h-10 items-center gap-1 px-3 text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50" disabled={Boolean(busy)} onClick={withdraw}><LogOut className="h-3.5 w-3.5" />{isSolo ? 'Cancelar inscripción' : 'Retirar equipo'}</button>)}</div>
      </section>}
      {!myRegistration && tournament.status === 'registration_open' && <TournamentWaitlist tournament={tournament} />}
      {isAdmin && <section className={`${panel} space-y-4`}><h2 className="flex items-center gap-2 font-bold text-white"><Shield className="h-4 w-4 text-red-300" /> Organización del torneo</h2><p className="text-sm text-slate-400">{tournament.participants.length} inscritos · {checkedInCount} confirmados · {tournament.participants.length - checkedInCount} pendientes</p><div className="flex flex-wrap gap-2">
        <button className={secondary} onClick={() => setIsEditOpen(true)}>Editar torneo</button>
        {['registration_open', 'check_in'].includes(tournament.status) && <><button className={secondary} disabled={Boolean(busy)} onClick={() => changeCheckIn(tournament.checkInActive ? 'close' : 'open')}>{tournament.checkInActive ? 'Cerrar check-in' : 'Abrir check-in'}</button><button className={secondary} disabled={Boolean(busy) || tournament.checkInActive || checkedInCount < (tournament.format === 'battle_royale' ? 100 : 2)} title={tournament.checkInActive ? 'Cierra el check-in antes de comenzar' : checkedInCount < (tournament.format === 'battle_royale' ? 100 : 2) ? tournament.format === 'battle_royale' ? 'Se requieren 100 jugadores confirmados' : 'Se necesitan al menos dos participantes confirmados' : tournament.format === 'battle_royale' ? 'Iniciar Battle Royale con 100 jugadores' : 'Sortear solo participantes confirmados'} onClick={draw}><Layers className="h-4 w-4" /> {tournament.format === 'battle_royale' ? 'Iniciar Battle Royale' : 'Sortear confirmados'}</button></>}
        <button className={secondary} disabled={Boolean(busy)} onClick={async () => { if (!await showConfirm(tournament.isHidden ? '¿Publicar este torneo para todos los jugadores?' : '¿Ocultar este torneo del directorio público?')) return; await perform('hide', async () => { const result = await toggleHideTournament(tournament.id, !tournament.isHidden); if (!result.success) throw new Error(result.message); }); }}>{tournament.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{tournament.isHidden ? 'Publicar' : 'Ocultar'}</button>
        <button className="min-h-11 rounded-xl px-4 text-sm text-rose-300 hover:bg-rose-950/30 disabled:opacity-50" disabled={Boolean(busy)} onClick={async () => { if (!await showConfirm(`¿Eliminar definitivamente ${tournament.title}? Se borrarán participantes, partidas y llaves. Esta acción no se puede deshacer.`)) return; await perform('delete', async () => { const result = await deleteTournament(tournament.id); if (!result.success) throw new Error(result.message); router.push('/torneos'); }); }}>Eliminar torneo</button>
      </div>{checkIn.isOpen && <p className="text-xs text-amber-300">Cierra el check-in para sortear. Los ausentes no se incluirán.</p>}</section>}
      <section id="tournament-section" className="scroll-mt-36">
        {activeTab === 'overview' && <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2">
          <section className={`${panel} space-y-3`}><h2 className="text-lg font-bold text-white">Acerca del torneo</h2><p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{tournament.description || 'El organizador publicará los detalles del torneo próximamente.'}</p></section>
          <section className={`${panel} space-y-4`}><h2 className="flex items-center gap-2 text-lg font-bold text-white"><Trophy className="h-5 w-5 text-amber-400" /> Premios y distribución</h2><p className="text-xl font-black text-amber-300">{formatChileanPesos(tournament.prizePool)}</p>{tournament.prizeDistribution.length ? <div className="grid gap-3 sm:grid-cols-2">{tournament.prizeDistribution.map((prize, index) => <div key={`${prize.place}-${index}`} className="rounded-xl border border-slate-800 bg-black/20 p-4"><p className="text-sm font-bold text-white">{prize.place}</p><p className="mt-1 text-sm text-red-300">{battleRoyaleRoundPrize || formatChileanPesos(prize.prize)}</p></div>)}</div> : <p className="text-sm text-slate-400">Consulta la distribución de premios en las bases del torneo.</p>}<button onClick={() => setActiveTab('rules')} className="text-sm text-red-300 underline">Ver condiciones y reglamento</button></section>
          <section className={`${panel} space-y-4`}><h2 className="text-lg font-bold text-white">Cronograma</h2><p className="text-xs text-slate-400">Inicio: {formatTournamentDate(tournament.startDate)}</p>{tournament.schedule.length ? <ol className="divide-y divide-slate-800">{tournament.schedule.map((stage, index) => <li key={`${stage.stage}-${index}`} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"><div><p className="font-semibold text-white">{stage.stage}</p><p className="mt-1 text-xs text-slate-400">{stage.format}</p></div><span className="text-red-300">{formatTournamentDate(stage.time)}</span></li>)}</ol> : <p className="text-sm text-slate-400">Los horarios de cada ronda se publicarán antes del inicio.</p>}<button className={secondary} onClick={() => perform('calendar', async () => { downloadTournamentCalendar(tournament); }, 'Evento descargado para tu calendario.')}><CalendarPlus className="h-4 w-4" /> Guardar fecha</button></section>
        </div><aside className="space-y-6"><section className={`${panel} space-y-4`}><h2 className="font-bold text-white">Antes de inscribirte</h2><dl className="space-y-3 text-sm">{[['Modalidad', formatTournamentMode(tournament)], ['Formato', formatTournamentFormat(tournament.format)], ['Región', tournament.region], ['Inscripción', tournament.entryFee], ['Cupos restantes', String(Math.max(0, tournament.maxParticipants - tournament.participants.length))]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-slate-800 pb-2"><dt className="text-slate-400">{label}</dt><dd className="text-right text-white">{value}</dd></div>)}</dl><p className="text-xs leading-relaxed text-slate-400">{isSolo ? 'Necesitas una cuenta y tu ID del juego.' : `Necesitas un equipo con al menos ${tournament.teamSize} integrantes y sus IDs de juego.`} Confirma tu asistencia durante el check-in para entrar al sorteo.</p>{renderAction()}{(tournament.entryFeeAmount || 0) > 0 && <Link href="/arena/pagos" className="block text-xs text-red-300 underline">Consultar una inscripción o pago anterior</Link>}</section><section className={`${panel} space-y-3`}><div className="flex items-center gap-3"><img src={tournament.organizer.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" /><div><p className="font-bold text-white">{tournament.organizer.name}</p><p className="text-xs text-slate-400">Organizador del torneo</p></div></div><p className="text-xs leading-relaxed text-slate-400">Las condiciones de participación y entrega de premios se detallan en las bases. Contacta a la organización si necesitas ayuda.</p><a href="#tournament-support" className="inline-block text-sm text-red-300 underline">Contactar soporte</a></section></aside></div>}
        {activeTab === 'brackets' && <BracketVisualizer tournament={tournament} onSelectMatch={match => setSelectedMatchId(match.id)} />}
        {activeTab === 'matches' && <TournamentMatches matches={myMatches} onSelectMatch={match => setSelectedMatchId(match.id)} />}
        {activeTab === 'participants' && <section className="space-y-4"><div className={`${panel} flex flex-col justify-between gap-4 sm:flex-row sm:items-center`}><div><h2 className="text-lg font-bold text-white">Participantes</h2><p className="mt-1 text-sm text-slate-400">{tournament.participants.length} inscritos · {checkedInCount} confirmados · {Math.max(0, tournament.maxParticipants - tournament.participants.length)} cupos disponibles</p></div><label className="text-xs text-slate-400">Buscar participante<input type="search" value={participantSearch} onChange={event => setParticipantSearch(event.target.value)} placeholder={isSolo ? 'Usuario…' : 'Equipo o capitán…'} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white sm:w-64" /></label></div>{filteredParticipants.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredParticipants.map(participant => <article key={participant.id} className={`${panel} space-y-4 ${myRegistration?.id === participant.id ? 'border-red-400/50' : ''}`}><div className="flex items-start gap-3"><img src={participant.avatar} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="break-words font-bold text-white">{participant.name}{myRegistration?.id === participant.id && <span className="ml-2 text-xs text-red-300">Tu participación</span>}</h3><p className="text-xs text-slate-400">{participant.tag}{participant.seed ? ` · Posición ${participant.seed}` : ''}</p></div></div><p className={`text-xs font-semibold ${participant.checkedIn ? 'text-emerald-300' : 'text-amber-300'}`}>{participant.checkedIn ? '✓ Check-in confirmado' : 'Check-in pendiente'}</p><dl className="space-y-2 text-xs"><div className="flex justify-between gap-2"><dt className="text-slate-400">{isSolo ? 'Jugador' : 'Capitán'}</dt><dd className="break-all text-white">{participant.captain.name}</dd></div><div className="flex justify-between gap-2"><dt className="text-slate-400">ID de juego</dt><dd className="break-all text-red-300">{participant.captain.inGameId || 'Por confirmar'}</dd></div></dl>{!isSolo && participant.roster.length > 0 && <p className="text-xs leading-relaxed text-slate-400">{participant.roster.map(member => member.name).join(' · ')}</p>}</article>)}</div> : <div className={`${panel} py-12 text-center text-sm text-slate-400`}>{participantSearch ? 'No hay coincidencias con tu búsqueda.' : 'Aún no hay participantes inscritos.'}</div>}</section>}
        {activeTab === 'announcements' && tournament.format === 'battle_royale' && <BattleRoyaleAnnouncements tournament={tournament} />}
        {activeTab === 'rules' && <section className={`${panel} space-y-5`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">Bases y reglamento</h2><button className={secondary} onClick={() => downloadTournamentRules(tournament.title, tournament.rules)}>Descargar bases</button></div><ol className="space-y-3">{tournament.rules.map((rule, index) => <li key={index} className="flex gap-3 rounded-xl bg-black/20 p-4 text-sm leading-relaxed text-slate-300"><span className="shrink-0 font-mono font-bold text-red-300">{index + 1}.</span><p className="whitespace-pre-line">{rule}</p></li>)}</ol>{!tournament.rules.length && <p className="text-sm text-slate-400">El organizador publicará las bases antes de abrir la competencia.</p>}</section>}
        {activeTab === 'results' && <TournamentResults tournament={tournament} />}
      </section>
      <div id="tournament-support" className="scroll-mt-36"><TournamentSupport tournament={tournament} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{lastUpdated ? `Última actualización: ${new Date(lastUpdated).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` : 'Consulta el estado actualizado del torneo.'}</span><button className="inline-flex min-h-10 items-center gap-1.5 text-slate-400 hover:text-white" onClick={() => perform('refresh', () => refreshTournaments({ silent: true }), 'Información actualizada.')} disabled={Boolean(busy)}><RefreshCw className={`h-3.5 w-3.5 ${busy === 'refresh' ? 'animate-spin' : ''}`} /> Actualizar</button></div>
    </div>
    {isAdmin && isEditOpen && <EditTournamentModal key={tournament.id} tournament={tournament} onClose={() => { setIsEditOpen(false); setSelectedMatchId(null); }} />}
    <MatchRoomModal key={`${user?.id || 'guest'}:${selectedMatchId || 'closed'}`} tournament={tournament} match={selectedMatch} isOpen={Boolean(selectedMatchId)} onClose={() => setSelectedMatchId(null)} />
    <RegisterModal tournament={tournament} isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
  </div>;
}
