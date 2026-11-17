'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  X, 
  Users, 
  ShieldCheck, 
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  UserCheck
} from '@/components/icons';
import { CountryPhoneInput } from './CountryPhoneInput';
import { validateRegistrationDetails } from '../lib/registrationDetails';
import confetti from 'canvas-confetti';
import { useTournament } from '../context/TournamentContext';
import { useAuth } from '../context/AuthContext';
import { Tournament } from '../types/tournament';
import { useModalAccessibility } from '@/hooks/useModalAccessibility';
import { findMyRegistration, formatTournamentMode } from '@/lib/tournamentPresentation';

interface RegisterModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onRegisteredSuccess?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = (props) => {
  const { user } = useAuth();
  return props.isOpen ? <RegistrationForm key={`${props.tournament.id}:${user?.id || 'guest'}`} {...props} /> : null;
};

const RegistrationForm: React.FC<RegisterModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onRegisteredSuccess
}) => {
  const router = useRouter();
  const { user, token, openAuthModal } = useAuth();
  const { registerParticipant, games, refreshTournaments } = useTournament();
  const modalRef = useModalAccessibility(isOpen, onClose);
  const titleId = React.useId();

  const requiredTeamSize = tournament.teamSize || (tournament.teamType === 'team' ? 5 : 1);
  const isSolo = tournament.teamType === 'solo' || requiredTeamSize === 1;
  const game = games.find((g) => g.id === tournament.gameId);
  const roster = user?.team?.members || [];
  const captain = roster.find(member => member.user_id === user?.team?.captain_id || member.role === 'captain');
  const isCaptain = isSolo || Boolean(user?.team?.is_captain || (user?.team?.captain_id && user.team.captain_id === user.id));
  const isRegistrationOpen = tournament.status === 'registration_open' && tournament.participants.length < tournament.maxParticipants;

  const currentTeamMembers = user?.team?.members?.length || user?.team?.memberCount || (user?.teamName && user.teamName !== 'Sin equipo' ? 1 : 0);
  const isTeamComplete = isSolo || (!!(user?.team || (user?.teamName && user.teamName !== 'Sin equipo')) && currentTeamMembers >= requiredTeamSize);

  // Check if user is already participating in this tournament in any team
  const alreadyInParticipant = findMyRegistration(tournament, user);
  const isAlreadyRegistered = !!alreadyInParticipant;
  const canManageSoloRoster = isSolo && Boolean(user?.team?.is_captain || user?.team?.captain_id === user?.id) && roster.length > 0;
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => [user?.id || ''].filter(Boolean));
  const registeredUserIds = new Set(tournament.participants.flatMap(participant => [participant.userId, ...participant.roster.map(member => member.userId)].filter(Boolean)));
  const selectedAlreadyRegistered = selectedMemberIds.some(memberId => registeredUserIds.has(memberId));
  const payerIsSelected = selectedMemberIds.includes(user?.id || '');
  const selectedCount = canManageSoloRoster ? selectedMemberIds.length : 1;
  const totalAmount = (tournament.entryFeeAmount || 0) * selectedCount;

  React.useEffect(() => {
    if (!canManageSoloRoster) return;
    setSelectedMemberIds(current => current.filter(memberId => !registeredUserIds.has(memberId)));
  }, [canManageSoloRoster, tournament.id, tournament.participants]);

  const [captainInGameId, setCaptainInGameId] = useState(() => {
    const gameId = tournament.gameId.toLowerCase();
    return /valorant|league|lol|tft/.test(gameId) ? user?.riotId || '' : /fortnite|rocket/.test(gameId) ? user?.epicGamesUsername || '' : /apex|ea-sports|fifa/.test(gameId) ? user?.eaId || '' : /counter|cs2|dota|pubg/.test(gameId) ? user?.steamId || '' : '';
  });
  const [captainDiscord, setCaptainDiscord] = useState(user?.discordTag || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ id: string; checkoutUrl?: string } | null>(null);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({ fullName: user?.fullName || '', birthDate: user?.birthDate?.slice(0, 10) || '', documentNumber: '', phone: '+56' });
  const isPaid = (tournament.entryFeeAmount || 0) > 0;

  React.useEffect(() => {
    if (!user || !isPaid) return;
    const controller = new AbortController();
    fetch(`/api/payments?tournamentId=${encodeURIComponent(tournament.id)}`, {
      headers: { Authorization: `Bearer ${token || ''}` }, cache: 'no-store', signal: controller.signal
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || controller.signal.aborted) return;
      const pending = data.payments?.find((payment: { id: string; status: string }) => ['creating', 'pending', 'review'].includes(payment.status));
      if (pending) setPendingPayment({ id: pending.id });
    }).catch(() => { /* The registration endpoint still prevents duplicate payments. */ });
    return () => controller.abort();
  }, [isPaid, token, tournament.id, user]);

  React.useEffect(() => {
    if (!pendingPayment) return;
    let stopped = false;
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(pendingPayment.id)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('caoz_auth_token') || ''}` },
          cache: 'no-store'
        });
        const data = await response.json();
        if (stopped || !response.ok) return;
        if (data.payment?.status === 'confirmed') {
          await refreshTournaments({ silent: true });
          if (!stopped) window.location.reload();
        } else if (['failed', 'cancelled', 'refund_required'].includes(data.payment?.status)) {
          setErrorMsg('El pago no se confirmó. Revisa su estado en Mis pagos antes de intentar nuevamente.');
          setPendingPayment(null);
        }
      } catch {
        // Keep checking while the player completes the provider checkout.
      }
    };
    void checkPayment();
    const timer = window.setInterval(() => void checkPayment(), 4000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [pendingPayment, refreshTournaments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Debes iniciar sesión para inscribirte en el torneo.');
      return;
    }
    if (!isRegistrationOpen) { setErrorMsg('Las inscripciones están cerradas o ya no quedan cupos.'); return; }
    if (!isCaptain) { setErrorMsg('Solo el capitán puede confirmar la inscripción del equipo.'); return; }
    if (!acceptedRules) { setErrorMsg('Lee y acepta las bases del torneo para continuar.'); return; }

    if (selectedAlreadyRegistered || (!canManageSoloRoster && isAlreadyRegistered)) {
      setErrorMsg(`Ya te encuentras registrado en este torneo${alreadyInParticipant ? ` (en "${alreadyInParticipant.name}")` : ''}. Cada usuario solo puede participar en 1 equipo por torneo.`);
      return;
    }

    // 1. Validation for team tournaments
    if (!isSolo) {
      if (!user.teamName && !user.team) {
        setErrorMsg(`Este torneo es de modalidad ${requiredTeamSize}v${requiredTeamSize}. Debes crear o unirte a un equipo en tu perfil.`);
        return;
      }
      if (!isTeamComplete) {
        setErrorMsg(`Tu equipo tiene ${currentTeamMembers}/${requiredTeamSize} integrantes. Este torneo (${requiredTeamSize}v${requiredTeamSize}) requiere un equipo completo para inscribirse. Invita a más integrantes desde tu perfil.`);
        return;
      }
    }

    if ((!isSolo || payerIsSelected) && !captainInGameId.trim()) {
      setErrorMsg(`Por favor ingresa tu ${game?.tagFieldLabel || 'In-Game ID'}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const details = payerIsSelected ? validateRegistrationDetails(personalDetails) : undefined;
      const result = await registerParticipant(tournament.id, {
        username: user.username,
        teamName: isSolo ? user.username : user.teamName!,
        teamTag: isSolo ? 'SOLO' : (user.teamTag || 'TEAM'),
        captainDiscord,
        captainInGameId,
        personalDetails: details,
        selectedMemberIds: canManageSoloRoster ? selectedMemberIds : undefined
      });

      if (!result.success) {
        setErrorMsg(result.message);
        setIsSubmitting(false);
        return;
      }

      if (result.checkoutUrl && result.paymentId) {
        if (result.existingPayment) {
          setPendingPayment({ id: result.paymentId, checkoutUrl: result.checkoutUrl });
          return;
        }
        const paymentWindow = window.open(result.checkoutUrl, '_blank');
        if (!paymentWindow) {
          // Keep the existing payment reservation and offer a user-initiated
          // link below when the browser blocks programmatic popups.
          setPendingPayment({ id: result.paymentId, checkoutUrl: result.checkoutUrl });
          return;
        }
        // Flow is third-party content; it must not retain control of Arena.
        paymentWindow.opener = null;
        setPendingPayment({ id: result.paymentId, checkoutUrl: result.checkoutUrl });
        return;
      }
      setSuccess(true);
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.55 }
        });
      } catch {}

      setTimeout(() => {
        onRegisteredSuccess?.();
        onClose();
        setSuccess(false);
      }, 1600);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar la inscripción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative w-full max-w-2xl bg-[#191213] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#211719] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 id={titleId} className="text-base font-bold text-white">
                Inscripción al Torneo
              </h3>
              <p className="text-xs text-slate-400">
                {tournament.title} • {formatTournamentMode(tournament)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar inscripción"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {pendingPayment ? (
            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300"><ShieldCheck className="w-9 h-9" /></div>
              <h4 className="text-lg font-bold text-white">Tienes un pago pendiente</h4>
              <p className="max-w-md text-sm text-slate-300">No puedes iniciar otra inscripción para este torneo hasta que Flow confirme, rechace o venza este pago.</p>
              <Link href={`/arena/pago?paymentId=${encodeURIComponent(pendingPayment.id)}`} className="arena-secondary-button">Consultar estado del pago</Link>
              {pendingPayment.checkoutUrl && <a href={pendingPayment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-300 underline">Continuar pago en Flow</a>}
            </div>
          ) : success ? (
            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-white">¡Inscripción Confirmada!</h3>
              <p className="text-xs text-slate-300 max-w-sm">
                {isSolo 
                  ? `Te has inscrito exitosamente como @${user?.username}. Ya apareces en la llave del torneo.`
                  : `Tu equipo "${user?.teamName}" ha sido inscrito oficialmente en el torneo.`}
              </p>
            </div>
          ) : !user ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Inicia Sesión para Inscribirte</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Necesitas tener una cuenta e iniciar sesión en CZ ARENA para inscribirte en los torneos.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal('login');
                }}
                className="px-5 py-2.5 rounded-xl bg-red-400 hover:bg-red-300 text-black font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer"
              >
                Cerrar e Iniciar Sesión
              </button>
            </div>
          ) : !isSolo && !user.teamName ? (
            /* User trying to register for team tournament but has no team formed! */
            <div className="py-6 space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                <div className="flex items-center space-x-2.5 text-rose-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm">Equipo no formado</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Este es un torneo oficial por equipos <strong>({tournament.teamSize}v{tournament.teamSize})</strong>. Actualmente tu cuenta no tiene un equipo registrado en la plataforma.
                </p>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="text-white font-semibold">¿Cómo inscribirse a un torneo por equipos?</p>
                  <p>1. Ve a tu perfil y crea tu equipo con un Nombre y Tag oficial.</p>
                  <p>2. Comparte el <strong>enlace de invitación</strong> con tus compañeros para que se unan al roster.</p>
                  <p>3. Una vez formado, podrás inscribir a tu equipo en las llaves del torneo.</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/profile?returnTo=${encodeURIComponent(`/tournament/${tournament.slug}?tab=overview#inscripcion`)}`);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-lg shadow-red-400/20 transition-all font-mono flex items-center justify-center space-x-2"
                >
                  <span>Ir a mi Perfil a Crear mi Equipo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {errorMsg && (
                <div role="alert" className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                  {isPaid && <Link href="/arena/pagos" className="underline">Consultar mis pagos</Link>}
                </div>
              )}

              {/* Tournament Slot Info */}
              {!isRegistrationOpen && <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">Las inscripciones están cerradas o se completaron los cupos. Cierra este formulario para consultar el estado del torneo.</p>}
              {!isCaptain && <p className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">Solo el capitán puede inscribir al equipo. Comparte el enlace del torneo con {captain?.username || 'tu capitán'}.</p>}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Cupos Ocupados:</span>
                <span className="font-mono font-bold text-red-400">
                  {tournament.participants.length} / {tournament.maxParticipants} {isSolo ? 'Jugadores' : 'Equipos'}
                </span>
              </div>

              {/* Legal Age & Eligibility Status Banner */}
              {!isPaid ? null : !user.birthDate ? (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Falta registrar tu Fecha de Nacimiento para validar tu aptitud legal.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/profile?returnTo=${encodeURIComponent(`/tournament/${tournament.slug}?tab=overview#inscripcion`)}`);
                    }}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold shrink-0 border border-amber-500/40"
                  >
                    Ir al Perfil
                  </button>
                </div>
              ) : user.age != null && user.age < 14 ? (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>No cumples con la edad mínima legal (14 años) para competir en torneos según la ley chilena.</span>
                </div>
              ) : user.age != null && user.age >= 14 && user.age < 18 ? (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-red-400" />
                  <span>
                    <strong>Menor de edad ({user.age} años):</strong> Habilitado para competir. En caso de avanzar y ganar premios, se solicitará la firma de Acta de Entrega con Carnet de Identidad del apoderado.
                  </span>
                </div>
              ) : null}

              {/* Mode Specific Info */}
              {isSolo ? (
                /* SOLO MODE: Username highlighted */
                <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                    <UserCheck className="w-4 h-4" />
                    <span>Inscripción individual</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Competirás en las llaves del torneo con tu usuario oficial:
                  </p>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Nombre en Bracket:</span>
                    <span className="font-mono font-bold text-white text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                      @{user.username}
                    </span>
                  </div>
                  {canManageSoloRoster && <div className="mt-3 space-y-2 border-t border-red-500/20 pt-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-white">Selecciona usernames a inscribir</p><button type="button" onClick={() => setSelectedMemberIds(roster.filter(member => !registeredUserIds.has(member.user_id)).map(member => member.user_id))} className="text-[11px] text-red-300 underline">Seleccionar disponibles</button></div><ul className="space-y-1">{roster.map(member => { const unavailable = registeredUserIds.has(member.user_id); const selected = selectedMemberIds.includes(member.user_id); return <li key={member.id || member.user_id} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-xs"><label className={`flex min-w-0 items-center gap-2 ${unavailable ? 'text-slate-500' : 'text-slate-200'}`}><input type="checkbox" checked={selected} disabled={unavailable} onChange={() => setSelectedMemberIds(current => selected ? current.filter(id => id !== member.user_id) : [...current, member.user_id])} className="accent-red-400"/><span>@{member.username}{member.user_id === user?.id ? ' · Tú' : ''}</span></label><span className={unavailable ? 'text-amber-300' : 'text-slate-500'}>{unavailable ? 'Ya inscrito' : 'Disponible'}</span></li>; })}</ul><p className="text-[11px] text-slate-400">El pago quedará registrado solo a tu nombre como capitán.</p></div>}
                </div>
              ) : (
                /* TEAM MODE: User has a team */
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Equipo que será Inscrito ({requiredTeamSize}v{requiredTeamSize})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      isTeamComplete 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {currentTeamMembers} / {requiredTeamSize} Integrantes
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{user.teamName || user.team?.name || 'Sin equipo'}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        TAG: [{user.teamTag || user.team?.tag || 'TEAM'}] • Capitán: {captain?.username ? `@${captain.username}` : isCaptain ? `@${user.username}` : 'Ver roster del equipo'}
                      </p>
                    </div>
                    <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded ${
                      isTeamComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {isTeamComplete ? '✓ Completo' : '⚠️ Incompleto'}
                    </span>
                  </div>

                  {roster.length > 0 && <div className="space-y-2"><p className="text-xs font-semibold text-white">Integrantes que se inscribirán</p><ul className="space-y-1.5">{roster.map(member => <li key={member.id || member.user_id} className="flex flex-wrap items-center justify-between gap-1 rounded-lg bg-black/20 px-3 py-2 text-xs"><span className="text-slate-200">@{member.username} <span className="text-slate-500">{member.user_id === user.team?.captain_id ? '· Capitán' : member.role === 'sub' ? '· Suplente' : '· Titular'}</span></span><span className={member.in_game_id ? 'text-slate-400' : 'text-amber-300'}>{member.in_game_id || 'ID de juego pendiente'}</span></li>)}</ul><p className="text-[11px] text-slate-400">Revisa titulares, suplentes e IDs antes de confirmar. Puedes actualizar tu equipo desde el perfil.</p></div>}

                  {!isTeamComplete && (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                      <span>Faltan {Math.max(0, requiredTeamSize - currentTeamMembers)} integrante(s) para completar el equipo.</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/profile?returnTo=${encodeURIComponent(`/tournament/${tournament.slug}?tab=overview#inscripcion`)}`);
                        }}
                        className="ml-2 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold shrink-0 border border-amber-500/40"
                      >
                        Invitar en Perfil
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Tu equipo aparecerá en la llave del torneo como <strong>{user.teamName || user.team?.name}</strong>.
                  </p>
                </div>
              )}

              {/* Player In-Game Data */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSolo ? 'Datos de tu Cuenta de Juego' : 'Datos del Capitán en el Juego'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`${titleId}-game-id`} className="block text-[11px] text-slate-400 mb-1">
                      {game?.tagFieldLabel || 'In-Game ID'} *
                    </label>
                    <input
                      id={`${titleId}-game-id`}
                      type="text"
                      placeholder={game?.tagPlaceholder || 'Ingresa tu ID'}
                      value={captainInGameId}
                      onChange={(e) => setCaptainInGameId(e.target.value)}
                      required={!isSolo || payerIsSelected}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${titleId}-discord`} className="block text-[11px] text-slate-400 mb-1">
                      Usuario de Discord (opcional)
                    </label>
                    <input
                      id={`${titleId}-discord`}
                      type="text"
                      placeholder="Tu usuario de Discord"
                      value={captainDiscord}
                      onChange={(e) => setCaptainDiscord(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Already Registered Alert */}
              {(selectedAlreadyRegistered || (!canManageSoloRoster && isAlreadyRegistered)) && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Ya te encuentras participando en este torneo (en <strong>{alreadyInParticipant?.name}</strong>). Las reglas del torneo solo permiten 1 participación por usuario.
                  </span>
                </div>
              )}

              {payerIsSelected && <fieldset className="space-y-3 rounded-xl border border-red-400/30 bg-red-950/10 p-4">
                  <legend className="px-2 text-sm font-bold text-red-300">Datos del jugador</legend>
                  <p className="text-xs text-slate-400">Completa tus datos para confirmar tu inscripción. Estos datos son privados y no se muestran en las llaves.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs text-slate-300">Nombre completo *
                      <input required autoComplete="name" maxLength={150} value={personalDetails.fullName} onChange={e => setPersonalDetails({ ...personalDetails, fullName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white" />
                    </label>
                    <label className="text-xs text-slate-300">Fecha de nacimiento *
                      <input required type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={personalDetails.birthDate} onChange={e => setPersonalDetails({ ...personalDetails, birthDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white [color-scheme:dark]" />
                    </label>
                    <label className="text-xs text-slate-300">N° de documento *
                      <input required maxLength={80} value={personalDetails.documentNumber} onChange={e => setPersonalDetails({ ...personalDetails, documentNumber: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white" />
                    </label>
                    <div className="text-xs text-slate-300">Número de teléfono *
                      <CountryPhoneInput value={personalDetails.phone} onChange={phone => setPersonalDetails({ ...personalDetails, phone })} />
                    </div>
                  </div>
              </fieldset>}
              {/* Submit CTA */}
              {isPaid && (
                <fieldset className="space-y-3 rounded-xl border border-red-500/30 p-4">
                  <legend className="px-2 text-sm font-bold text-red-300">Pagar inscripción: {isSolo && canManageSoloRoster ? `$${totalAmount.toLocaleString('es-CL')}` : tournament.entryFee}</legend>
                  <p className="text-xs text-slate-400">Pago único por {isSolo && canManageSoloRoster ? `${selectedCount} jugador(es) seleccionado(s)` : isSolo ? 'jugador' : 'equipo'} mediante Flow. Reservamos el cupo durante 30 minutos. La inscripción se confirma cuando se aprueba el pago.</p>
                  <p className="text-xs text-slate-400">Elegirás tu medio de pago en el checkout seguro de Flow. Al volver podrás consultar tu inscripción.</p>
                </fieldset>
              )}
              <div className="pt-2">
                <label className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-slate-300"><input type="checkbox" required checked={acceptedRules} onChange={event => setAcceptedRules(event.target.checked)} className="mt-1 accent-red-400" /><span>He leído y acepto las <a href={`/tournament/${tournament.slug}?tab=rules`} target="_blank" rel="noreferrer" className="text-red-300 underline">bases del torneo</a> y la <Link href="/privacidad" target="_blank" className="text-red-300 underline">política de privacidad</Link>.</span></label>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedAlreadyRegistered || (!canManageSoloRoster && isAlreadyRegistered) || !isRegistrationOpen || !isCaptain || !acceptedRules || (!isSolo && !isTeamComplete) || (canManageSoloRoster && selectedMemberIds.length === 0)}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-lg shadow-red-400/25 transition-all font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? 'PROCESANDO INSCRIPCIÓN...' 
                    : selectedAlreadyRegistered || (!canManageSoloRoster && isAlreadyRegistered)
                    ? `YA INSCRITO EN ESTE TORNEO (${alreadyInParticipant?.name?.toUpperCase()})`
                    : !isSolo && !isTeamComplete
                    ? `EQUIPO INCOMPLETO (${currentTeamMembers}/${requiredTeamSize})`
                    : isPaid
                    ? `PAGAR ${isSolo && canManageSoloRoster ? `$${totalAmount.toLocaleString('es-CL')}` : tournament.entryFee} EN FLOW`
                    : isSolo 
                    ? `CONFIRMAR INSCRIPCIÓN COMO @${user.username}` 
                    : `CONFIRMAR INSCRIPCIÓN DE ${(user.teamName || user.team?.name)?.toUpperCase()}`}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
