'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Users, 
  ShieldCheck, 
  Gamepad2, 
  Plus, 
  Trash2, 
  CheckCircle2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTournament } from '../context/TournamentContext';
import { useAuth } from '../context/AuthContext';
import { Tournament } from '../types/tournament';

interface RegisterModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onRegisteredSuccess?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onRegisteredSuccess
}) => {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();
  const { registerParticipant, games } = useTournament();

  const requiredTeamSize = tournament.teamSize || (tournament.teamType === 'team' ? 5 : 1);
  const isSolo = tournament.teamType === 'solo' || requiredTeamSize === 1;
  const game = games.find((g) => g.id === tournament.gameId) || games[0];

  const currentTeamMembers = user?.team?.members?.length || user?.team?.memberCount || (user?.teamName && user.teamName !== 'Sin equipo' ? 1 : 0);
  const isTeamComplete = isSolo || (!!(user?.team || (user?.teamName && user.teamName !== 'Sin equipo')) && currentTeamMembers >= requiredTeamSize);

  // Check if user is already participating in this tournament in any team
  const alreadyInParticipant = tournament.participants.find(
    (p) =>
      (user && (p.name === user.username || p.userId === user.id)) ||
      (user?.teamName && p.name === user.teamName) ||
      (user?.team?.id && p.teamId === user.team.id) ||
      (user && p.captain?.name === user.username) ||
      (user && p.roster?.some((r: any) => r.userId === user.id || (r.username && r.username.toLowerCase() === user.username.toLowerCase())))
  );
  const isAlreadyRegistered = !!alreadyInParticipant;

  const [captainInGameId, setCaptainInGameId] = useState('');
  const [captainDiscord, setCaptainDiscord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [payer, setPayer] = useState({ first_name: '', last_name: '', social_id: '', phone: '' });
  const isPaid = (tournament.entryFeeAmount || 0) > 0;

  useEffect(() => {
    if (user) {
      setCaptainInGameId(user.riotId || user.steamId || user.epicGamesUsername || user.eaId || '');
      setCaptainDiscord(user.discordTag || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Debes iniciar sesión para inscribirte en el torneo.');
      return;
    }

    if (isAlreadyRegistered) {
      setErrorMsg(`Ya te encuentras registrado en este torneo (en "${alreadyInParticipant.name}"). Cada usuario solo puede participar en 1 equipo por torneo.`);
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

    // 2. Legal age & birth date validation (Chile)
    if (!user.birthDate) {
      setErrorMsg('Debes registrar tu Fecha de Nacimiento en tu Perfil antes de inscribirte a un torneo.');
      return;
    }
    if (user.age != null && user.age < 14) {
      setErrorMsg('No cumples con la edad mínima legal (14 años) para competir en torneos en Chile.');
      return;
    }

    if (!captainInGameId.trim()) {
      setErrorMsg(`Por favor ingresa tu ${game?.tagFieldLabel || 'In-Game ID'}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await registerParticipant(tournament.id, {
        username: user.username,
        teamName: isSolo ? user.username : user.teamName!,
        teamTag: isSolo ? 'SOLO' : (user.teamTag || 'TEAM'),
        captainDiscord,
        captainInGameId,
        payer: isPaid ? payer : undefined
      });

      if (!result.success) {
        setErrorMsg(result.message);
        setIsSubmitting(false);
        return;
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setSuccess(true);
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.55 }
        });
      } catch (e) {}

      setTimeout(() => {
        onRegisteredSuccess?.();
        onClose();
        setSuccess(false);
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la inscripción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0c121d] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f1728] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Inscripción al Torneo
              </h3>
              <p className="text-xs text-slate-400">
                {tournament.title} • {isSolo ? 'Modalidad Solo 1v1' : `Equipos de ${tournament.teamSize}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {success ? (
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
                Necesitas tener una cuenta e iniciar sesión en CAOZ ARENA para inscribirte en los torneos.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal('login');
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer"
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
                    router.push('/profile');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-400/20 transition-all font-mono flex items-center justify-center space-x-2"
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
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tournament Slot Info */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Cupos Ocupados:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {tournament.participants.length} / {tournament.maxParticipants} {isSolo ? 'Jugadores' : 'Equipos'}
                </span>
              </div>

              {/* Legal Age & Eligibility Status Banner */}
              {!user.birthDate ? (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Falta registrar tu Fecha de Nacimiento para validar tu aptitud legal.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push('/profile');
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
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 text-xs flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>
                    <strong>Menor de edad ({user.age} años):</strong> Habilitado para competir. En caso de avanzar y ganar premios, se solicitará la firma de Acta de Entrega con Carnet de Identidad del apoderado.
                  </span>
                </div>
              ) : null}

              {/* Mode Specific Info */}
              {isSolo ? (
                /* SOLO MODE: Username highlighted */
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    <UserCheck className="w-4 h-4" />
                    <span>Inscripción Individual (Solo 1v1)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Competirás en las llaves del torneo con tu usuario oficial:
                  </p>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Nombre en Bracket:</span>
                    <span className="font-mono font-bold text-white text-sm bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                      @{user.username}
                    </span>
                  </div>
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
                        TAG: [{user.teamTag || user.team?.tag || 'TEAM'}] • Capitán: @{user.username}
                      </p>
                    </div>
                    <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded ${
                      isTeamComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {isTeamComplete ? '✓ Completo' : '⚠️ Incompleto'}
                    </span>
                  </div>

                  {!isTeamComplete && (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                      <span>Faltan {Math.max(0, requiredTeamSize - currentTeamMembers)} integrante(s) para completar el equipo.</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push('/profile');
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
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSolo ? 'Datos de tu Cuenta de Juego' : 'Datos del Capitán en el Juego'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {game?.tagFieldLabel || 'In-Game ID'} *
                    </label>
                    <input
                      type="text"
                      placeholder={game?.tagPlaceholder || 'Ingresa tu ID'}
                      value={captainInGameId}
                      onChange={(e) => setCaptainInGameId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Discord de Contacto (Usuario#0000)
                    </label>
                    <input
                      type="text"
                      placeholder="usuario#1234"
                      value={captainDiscord}
                      onChange={(e) => setCaptainDiscord(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Already Registered Alert */}
              {isAlreadyRegistered && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Ya te encuentras participando en este torneo (en <strong>{alreadyInParticipant?.name}</strong>). Las reglas del torneo solo permiten 1 participación por usuario.
                  </span>
                </div>
              )}

              {/* Submit CTA */}
              {isPaid && (
                <fieldset className="space-y-3 rounded-xl border border-cyan-500/30 p-4">
                  <legend className="px-2 text-sm font-bold text-cyan-300">Pagar inscripción: {tournament.entryFee}</legend>
                  <p className="text-xs text-slate-400">Pago único por {isSolo ? 'jugador' : 'equipo'} mediante VirtualPOS. Reservamos el cupo durante 15 minutos. La inscripción se confirma cuando se aprueba el pago.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      ['first_name', 'Nombre del pagador'], ['last_name', 'Apellido del pagador'],
                      ['social_id', 'RUT del pagador'], ['phone', 'Teléfono con código de país (ej. 56912345678)']
                    ] as const).map(([key, label]) => (
                      <label key={key} className="block text-xs text-slate-300">{label}
                        <input required value={payer[key]} onChange={e => setPayer({ ...payer, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white" />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isAlreadyRegistered || (!isSolo && !isTeamComplete)}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-400/25 transition-all font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? 'PROCESANDO INSCRIPCIÓN...' 
                    : isAlreadyRegistered
                    ? `YA INSCRITO EN ESTE TORNEO (${alreadyInParticipant?.name?.toUpperCase()})`
                    : !isSolo && !isTeamComplete
                    ? `EQUIPO INCOMPLETO (${currentTeamMembers}/${requiredTeamSize})`
                    : isPaid
                    ? `PAGAR ${tournament.entryFee} EN VIRTUALPOS`
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
