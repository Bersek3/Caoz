'use client';
import { showAlert } from './StyledDialog';

import React, { useState } from 'react';
import { 
  X, 
  Swords, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  Image as ImageIcon, 
  Trophy, 
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTournament } from '../context/TournamentContext';
import { useAuth } from '../context/AuthContext';
import { TournamentMatch, Tournament } from '../types/tournament';

interface MatchRoomModalProps {
  tournament: Tournament;
  match: TournamentMatch | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MatchRoomModal: React.FC<MatchRoomModalProps> = ({
  tournament,
  match,
  isOpen,
  onClose
}) => {
  const { updateMatchScore, sendMatchChatMessage, reportMatchDispute, resolveDispute, currentUser } = useTournament();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [score1, setScore1] = useState<number>(match?.team1.score ?? 0);
  const [score2, setScore2] = useState<number>(match?.team2.score ?? 0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(match?.chatMessages || []);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const fetchLatestMessages = React.useCallback(async () => {
    if (!isOpen || !match?.id || !match.canAccessRoom) return;
    try {
      const token = localStorage.getItem('caoz_auth_token');
      const res = await fetch(`/api/matches/${match.id}/chat`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          setChatError('');
        }
      } else {
        setMessages([]);
        const data = await res.json();
        setChatError(data.error || 'No se pudo acceder al chat privado.');
      }
    } catch (e) {
      // ignore
    }
  }, [isOpen, match?.id, match?.canAccessRoom, user?.id]);

  // Keep scores and messages in sync when match changes
  React.useEffect(() => {
    if (match) {
      setScore1(match.team1.score ?? 0);
      setScore2(match.team2.score ?? 0);
      setMessages([]);
      setChatError('');
      fetchLatestMessages();
    }
  }, [match, fetchLatestMessages]);

  // Real-time polling while matchroom modal is open
  React.useEffect(() => {
    if (isOpen && match?.id) {
      const interval = setInterval(fetchLatestMessages, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen, match?.id, fetchLatestMessages]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !match || !match.canAccessRoom) return null;

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || savingScore) return;
    if (score1 === score2) {
      showAlert('En torneos eliminatorios no puede haber empate. Uno de los dos debe resultar ganador de la serie.');
      return;
    }

    try {
      setSavingScore(true);
      setChatError('');
      await updateMatchScore(tournament.id, match.id, score1, score2, proofUrl || undefined);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No se pudo guardar el marcador.');
      return;
    } finally {
      setSavingScore(false);
    }
    
    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string, isProofImage = false) => {
    if (e) e.preventDefault();
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || !match || sendingMsg) return;

    try {
      setSendingMsg(true);
      setChatError('');
      const senderName = user?.username ? `@${user.username}` : (currentUser.name || 'Participante');
      const senderRole = isAdmin ? 'admin' : 'player';

      const res = await fetch(`/api/matches/${match.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('caoz_auth_token') || ''}`
        },
        body: JSON.stringify({
          senderName: isAdmin ? `Staff CAOZ (@${user?.username || 'Admin'})` : senderName,
          senderRole,
          message: textToSend,
          isProofImage
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        } else {
          await fetchLatestMessages();
        }
        if (!customText) setChatInput('');
      } else {
        const data = await res.json();
        setChatError(data.error || 'No se pudo enviar el mensaje.');
      }
    } catch (err) {
      console.error('Error sending match message:', err);
      setChatError('No se pudo conectar con el chat. Inténtalo nuevamente.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setChatError('Selecciona una imagen JPG, PNG o WEBP de hasta 2 MB.');
      return;
    }
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });
      await handleSendMessage(undefined, image, true);
    } catch {
      setChatError('No se pudo leer la imagen. Inténtalo nuevamente.');
    }
  };

  const handleReportDispute = () => {
    if (!disputeReason.trim()) {
      showAlert('Por favor detalla el motivo de la disputa (ej: no se presentaron, trampa, desconexión sin aviso)');
      return;
    }
    reportMatchDispute(tournament.id, match.id, disputeReason.trim());
    setShowDisputeInput(false);
    setDisputeReason('');
  };

  const isCompleted = match.status === 'completed';
  const isDisputed = match.status === 'disputed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#191213] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {chatError && <p role="alert" className="p-3 text-sm text-rose-300">{chatError}</p>}
        
        {/* Match Header */}
        <div className="px-6 py-4 bg-[#211719] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Sala de Partida • {match.roundTitle}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-red-300 border border-slate-700">
                  BO{match.bestOf}
                </span>
                {isDisputed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 flex items-center space-x-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    DISPUTA ACTIVA
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    FINALIZADO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{tournament.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split into Match Board & Live Chat */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* LEFT: Teams Faceoff & Scoring Controls (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6">
            
            {/* Versus Cards */}
            <div className="grid grid-cols-11 items-center gap-2 bg-[#090e17] p-5 rounded-2xl border border-slate-800/80">
              
              {/* Team 1 */}
              <div className={`col-span-5 flex flex-col items-center text-center p-3 rounded-xl transition-all ${
                match.team1.isWinner ? 'bg-emerald-500/10 border border-emerald-500/30' : ''
              }`}>
                <div className="relative mb-2">
                  <img
                    src={match.team1.avatar || 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop'}
                    alt={match.team1.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-red-500/40 shadow-lg"
                  />
                  {match.team1.isWinner && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold text-xs shadow-md">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-sm text-white line-clamp-1">
                  {match.team1.name === 'Vacío' || match.team1.name.startsWith('Semilla') ? 'Cupo Vacío' : match.team1.name}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {match.team1.name === 'Vacío' || match.team1.name.startsWith('Semilla') ? 'Esperando rival' : `Participante #${match.team1.seed || 1}`}
                </span>

                <div className="text-3xl font-black font-mono text-red-400 mt-2">
                  {match.team1.score ?? 0}
                </div>
              </div>

              {/* VS badge */}
              <div className="col-span-1 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
                  VS
                </span>
              </div>

              {/* Team 2 */}
              <div className={`col-span-5 flex flex-col items-center text-center p-3 rounded-xl transition-all ${
                match.team2.isWinner ? 'bg-emerald-500/10 border border-emerald-500/30' : ''
              }`}>
                <div className="relative mb-2">
                  <img
                    src={match.team2.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop'}
                    alt={match.team2.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/40 shadow-lg"
                  />
                  {match.team2.isWinner && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold text-xs shadow-md">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-sm text-white line-clamp-1">
                  {match.team2.name === 'Vacío' || match.team2.name.startsWith('Semilla') ? 'Cupo Vacío' : match.team2.name}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {match.team2.name === 'Vacío' || match.team2.name.startsWith('Semilla') ? 'Esperando rival' : `Participante #${match.team2.seed || 2}`}
                </span>

                <div className="text-3xl font-black font-mono text-purple-400 mt-2">
                  {match.team2.score ?? 0}
                </div>
              </div>

            </div>

            {/* Score Reporting Form */}
            {isAdmin ? (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {isCompleted ? 'Actualizar / Modificar Marcador' : 'Reportar Marcador de la Serie'}
                </h4>
                <span className="text-[11px] text-slate-400">
                  Objetivo: Ganar {Math.ceil(match.bestOf / 2)} partidas
                </span>
              </div>

              <form onSubmit={handleScoreSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 truncate">
                      Puntaje {match.team1.name}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={match.bestOf}
                      value={score1}
                      onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-lg font-bold focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 truncate">
                      Puntaje {match.team2.name}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={match.bestOf}
                      value={score2}
                      onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-lg font-bold focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Screenshot Proof */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>Enlace a Captura de Pantalla / Foto de Victoria (Opcional)</span>
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  </label>
                  <input
                    type="url"
                    placeholder="https://imgur.com/tu-captura-o-screenshot.png"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:border-red-400 focus:outline-none"
                  />
                  {match.proofImageUrl && (
                    <div className="mt-2 flex items-center space-x-2 text-xs text-red-400">
                      <span>Captura adjunta:</span>
                      <a
                        href={match.proofImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline flex items-center space-x-1 hover:text-red-300"
                      >
                        <span>Ver imagen</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingScore}
                  className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-lg shadow-red-400/20 transition-all font-mono"
                >
                  {savingScore ? 'GUARDANDO...' : isCompleted ? 'CONFIRMAR NUEVO MARCADOR' : 'ENVIAR RESULTADO OFICIAL'}
                </button>
              </form>
            </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 space-y-2">
                <h4 className="font-bold text-white">Envía tus pruebas de la partida</h4>
                <p>Adjunta las capturas en el chat privado. El administrador revisará las imágenes y actualizará el marcador manualmente.</p>
              </div>
            )}

            {/* Dispute & Admin Resolution Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              {!showDisputeInput ? (
                <button
                  onClick={() => setShowDisputeInput(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1.5 transition-colors font-medium"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Reportar problema / Llamar a un árbitro</span>
                </button>
              ) : (
                <div className="w-full space-y-2 p-3 rounded-xl bg-red-950/20 border border-red-500/30 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-red-300 font-bold">
                    <span>Llamar a un Árbitro Oficial</span>
                    <button
                      onClick={() => setShowDisputeInput(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Describe el motivo (ej: El rival no se conecta, uso de trampas, toxicidad)"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-red-500/40 text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={handleReportDispute}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
                  >
                    Notificar a los Organizadores
                  </button>
                </div>
              )}

              {/* Admin quick force resolve */}
              {isAdmin && (
                <div className="text-right">
                  <span className="text-[10px] text-purple-400 block font-mono">
                    Acción de Organizador:
                  </span>
                  <div className="flex space-x-2 mt-1">
                    <button
                      onClick={() => resolveDispute(tournament.id, match.id, match.team1.participantId || match.team1.name).catch(error => setChatError(error.message))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-red-300 border border-slate-700"
                    >
                      Avanzar T1
                    </button>
                    <button
                      onClick={() => resolveDispute(tournament.id, match.id, match.team2.participantId || match.team2.name).catch(error => setChatError(error.message))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-purple-300 border border-slate-700"
                    >
                      Avanzar T2
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Real-time Match Chat (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-[480px] lg:h-auto bg-[#130f10]">
            
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-800/80 bg-[#191213] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Canal de Match & Soporte Staff
                </span>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    Staff CAOZ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-300 border border-red-500/30 font-mono">
                    Oficial
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span>En vivo</span>
              </span>
            </div>

            {/* Quick action chips */}
            <div className="px-3 py-2 border-b border-slate-800/50 flex space-x-2 overflow-x-auto text-[11px] no-scrollbar">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, '🛡️ [STAFF CAOZ]: Por favor ingresen el código/ID del lobby en este chat para iniciar la partida.')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-[10px] font-semibold"
                  >
                    🛡️ Solicitar Lobby
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, '⏱️ [STAFF CAOZ]: Tienen 10 minutos para iniciar la partida o se aplicará W.O. por reglamento.')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-[10px] font-semibold"
                  >
                    ⏱️ Alerta Tiempo W.O.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, '⚠️ [STAFF CAOZ]: Revisando pruebas y capturas de la partida con el equipo de jueces.')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-500/40 text-[10px] font-semibold"
                  >
                    ⚠️ Revisando Pruebas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, '✅ [STAFF CAOZ]: Marcador verificado y validado por la administración.')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 text-[10px] font-semibold"
                  >
                    ✅ Marcador Validado
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, '¡Hola! ¿Listos para invitar al lobby?')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    👋 ¿Listos para el lobby?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, 'Servidor y lobby creado, solicitando veto.')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    🎮 Lobby Creado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, '🚨 Solicitando asistencia del Staff / Árbitro de CAOZ para este match.')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 text-[10px] font-semibold"
                  >
                    🚨 Llamar al Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(undefined, 'GG muy buenas partidas!')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    🤝 GG WP
                  </button>
                </>
              )}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[380px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <p className="text-xs">No hay mensajes aún en esta sala de match.</p>
                  <p className="text-[10px] text-slate-600">
                    Usa este chat para comunicarte con tu oponente y el Staff del torneo.
                  </p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isSystem = msg.senderRole === 'system';
                  const isStaff = msg.senderRole === 'admin';
                  const content = msg.isProofImage && /^data:image\/(png|jpeg|webp);base64,/.test(msg.message)
                    ? <img src={msg.message} alt={`Prueba de la partida enviada por ${msg.senderName}`} className="max-h-80 max-w-full rounded-lg object-contain" />
                    : msg.message;

                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-xl text-xs leading-relaxed bg-slate-900/90 border border-slate-800 text-slate-300"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span className="text-red-400 font-mono">SISTEMA</span>
                          <span>{msg.timestamp || 'Ahora'}</span>
                        </div>
                        <div>{content}</div>
                      </div>
                    );
                  }

                  if (isStaff) {
                    return (
                      <div
                        key={msg.id}
                        className="p-3 rounded-xl text-xs leading-relaxed bg-purple-950/40 border border-purple-500/50 shadow-md shadow-purple-950/30"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                          <span className="text-purple-300 flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/30 border border-purple-400/40 text-[9px] uppercase tracking-wider">
                              Staff Oficial
                            </span>
                            <span>{msg.senderName}</span>
                          </span>
                          <span className="text-slate-400 font-mono">{msg.timestamp || 'Ahora'}</span>
                        </div>
                        <div className="text-purple-100 font-medium">{content}</div>
                      </div>
                    );
                  }

                  const isMe =
                    (user?.username && msg.senderName.includes(user.username)) ||
                    msg.senderName === currentUser.name;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">{msg.senderName}</span>
                        <span>•</span>
                        <span className="font-mono">{msg.timestamp || 'Ahora'}</span>
                      </div>
                      <div
                        className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-red-500/20 text-red-100 border border-red-500/30 rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                        }`}
                      >
                        {content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3 border-t border-slate-800 bg-[#191213]">
              <label className={`mb-2 flex items-center gap-2 text-xs text-red-300 ${sendingMsg ? 'opacity-50' : 'cursor-pointer'}`}>
                <ImageIcon className="w-4 h-4" />
                {sendingMsg ? 'Enviando...' : 'Adjuntar imagen de prueba (JPG, PNG, WEBP · hasta 2 MB)'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={sendingMsg} onChange={handleProofUpload} className="sr-only" />
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={
                    isAdmin
                      ? 'Escribe un mensaje oficial del Staff a los jugadores...'
                      : 'Escribe a tu oponente o solicita ayuda al Staff...'
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingMsg}
                  className="p-2 rounded-xl bg-red-500 text-black hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                  title="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
};
