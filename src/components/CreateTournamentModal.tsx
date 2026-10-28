'use client';
import { showAlert } from './StyledDialog';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Trophy, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Upload,
  CheckCircle2,
  Trash2,
  Clock
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { GameId, TournamentFormat } from '../types/tournament';
import { formatTournamentDate } from '../lib/dateUtils';
import { TournamentPrizesEditor } from './TournamentPrizesEditor';
import { prizePlace, validateTournamentPrizes, type TournamentPrize } from '../lib/tournamentPrizes';
import { TournamentRulesEditor } from './TournamentRulesEditor';
import { DEFAULT_TOURNAMENT_RULES, resolveTournamentRules, type RulesMode } from '../lib/tournamentRules';
import { prepareTournamentBanner } from '../lib/tournamentBanner';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { games, createTournament } = useTournament();

  // Default to tomorrow at 20:00
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [rulesMode, setRulesMode] = useState<RulesMode>('automatic');
  const [customRules, setCustomRules] = useState<string[]>([...DEFAULT_TOURNAMENT_RULES]);
  const [prizeMode, setPrizeMode] = useState<'single' | 'multiple'>('single');
  const [rankedPrizes, setRankedPrizes] = useState<TournamentPrize[]>([{ place: prizePlace(0),prize: '' },{ place: prizePlace(1),prize: '' }]);
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [startDateTime, setStartDateTime] = useState<string>(getDefaultDateTime());
  const [formData, setFormData] = useState({
    title: '',
    gameId: 'valorant' as GameId,
    format: 'single_elimination' as TournamentFormat,
    teamType: 'team' as 'solo' | 'team',
    teamSize: 5,
    maxParticipants: 8,
    region: 'LATAM' as 'LATAM' | 'NA' | 'EU' | 'GLOBAL',
    entryFee: 'Gratis',
    entryFeeAmount: 0,
    prizePool: '',
    startDate: '',
    description: ''
  });

  const prizeDistribution = prizeMode === 'single' ? [{ place: prizePlace(0),prize: formData.prizePool }] : rankedPrizes;

  const [isPreparingBanner, setIsPreparingBanner] = useState(false);
  const bannerVersion = React.useRef(0);
  const [customBanner, setCustomBanner] = useState<string>('');
  const [bannerFileName, setBannerFileName] = useState<string>('');
  const [bannerDimensions, setBannerDimensions] = useState<{
    width: number;
    height: number;
    ratio: string;
    status: 'good' | 'warning';
  } | null>(null);

  const handleGameSelect = (gId: GameId) => {
    const selectedGame = games.find((g) => g.id === gId);
    setFormData((prev) => ({
      ...prev,
      gameId: gId,
      teamSize: selectedGame?.defaultTeamSize || 5,
      teamType: (selectedGame?.defaultTeamSize || 5) > 1 ? 'team' : 'solo'
    }));
  };

  React.useEffect(() => {
    if (games.length && !games.some(game => game.id === formData.gameId)) {
      const game = games[0];
      setFormData(previous => ({ ...previous, gameId: game.id, teamSize: game.defaultTeamSize, teamType: game.defaultTeamSize > 1 ? 'team' : 'solo' }));
    }
  }, [games, formData.gameId]);
  const selectedGame = games.find((g) => g.id === formData.gameId) || games[0];

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const version = ++bannerVersion.current;
    setIsPreparingBanner(true);
    setSubmitError('');
    try {
      const { dataUrl, width, height } = await prepareTournamentBanner(file);
      if (version !== bannerVersion.current) return;
      setBannerDimensions({ width, height, ratio: (width / height).toFixed(1) + ':1', status: width >= 800 && height >= 280 ? 'good' : 'warning' });
      setBannerFileName(file.name);
      setCustomBanner(dataUrl);
    } catch (error) {
      if (version === bannerVersion.current) setSubmitError(error instanceof Error ? error.message : 'No se pudo preparar el banner.');
    } finally {
      if (version === bannerVersion.current) setIsPreparingBanner(false);
    }
  };

  const handleRemoveBanner = () => {
    bannerVersion.current++;
    setIsPreparingBanner(false);
    setCustomBanner('');
    setBannerFileName('');
    setBannerDimensions(null);
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isPreparingBanner) return;
    setSubmitError('');
    if (!formData.title.trim()) {
      showAlert('Por favor, ingresa un nombre para el torneo');
      return;
    }

    let prizeSettings;
    let ruleSettings;
    try {
      prizeSettings = validateTournamentPrizes(formData.prizePool, prizeDistribution, formData.maxParticipants);
      ruleSettings = resolveTournamentRules({ ...formData, ...prizeSettings, startDate: startDateTime }, { rulesMode, rules: customRules.map(rule => rule.trim()).filter(Boolean) });
    } catch (error) { setSubmitError((error as Error).message); return; }

    setIsSubmitting(true);
    try {
      const slug = await createTournament({
        title: formData.title,
        gameId: formData.gameId,
        bannerUrl: customBanner || selectedGame.bannerImage,
        thumbnailUrl: customBanner || selectedGame.coverImage,
        format: formData.format,
        teamType: formData.teamType,
        teamSize: formData.teamSize,
        maxParticipants: formData.maxParticipants,
        region: formData.region,
        entryFee: formData.entryFee,
        entryFeeAmount: formData.entryFeeAmount,
        ...prizeSettings,
        startDate: startDateTime || formData.startDate,
        description: formData.description || `Torneo oficial de ${games.find(g => g.id === formData.gameId)?.name}. Compite por el título y premios.`,
        ...ruleSettings
      });

      onClose();
      setStep(1);
      router.push(`/tournament/${slug}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo conectar con el servidor. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (!selectedGame) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"><div className="rounded-2xl bg-slate-900 p-6 text-white"><p>A?ade un videojuego oficial antes de crear un torneo.</p><button type="button" onClick={onClose} className="mt-4 text-cyan-300">Cerrar</button></div></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#191213] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#21181c]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Crear torneo
              </h2>
              <p className="text-xs text-slate-400">
                Paso {step} de 3 • Configura formato, brackets y reglas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting || isPreparingBanner}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-xs text-center font-medium bg-[#090d16]">
          <div
            className={`py-2.5 transition-colors border-b-2 ${
              step >= 1 ? 'border-red-400 text-red-300 bg-red-500/5' : 'border-transparent text-slate-500'
            }`}
          >
            1. Juego y Datos Básicos
          </div>
          <div
            className={`py-2.5 transition-colors border-b-2 ${
              step >= 2 ? 'border-red-400 text-red-300 bg-red-500/5' : 'border-transparent text-slate-500'
            }`}
          >
            2. Formato y Llaves
          </div>
          <div
            className={`py-2.5 transition-colors border-b-2 ${
              step >= 3 ? 'border-red-400 text-red-300 bg-red-500/5' : 'border-transparent text-slate-500'
            }`}
          >
            3. Premios y Reglas
          </div>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Selecciona el Videojuego
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {games.map((game) => {
                    const isSelected = formData.gameId === game.id;
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => handleGameSelect(game.id)}
                        className={`relative p-3 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-red-500/15 border-red-400 shadow-md shadow-red-500/20'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={game.coverImage}
                          alt={game.name}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10"
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{game.name}</p>
                          <p className="text-[10px] text-slate-400">{game.genre}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre del Torneo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: VALORANT MASTERS LATAM - EDICIÓN OTOÑO"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                />
              </div>

              {/* Banner Upload & Dimension Inspector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Banner Principal del Torneo
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Recomendado: 1200×400px o 16:9 / 21:9
                  </span>
                </div>

                {!customBanner ? (
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-red-500/60 rounded-xl p-4 transition-all bg-slate-900/40 hover:bg-slate-900/70 group text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleBannerUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center py-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        Cargar imagen de banner desde tu dispositivo
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Formatos soportados: JPG, PNG, WEBP (Hasta 5MB)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Si no subes una imagen, se usará el banner predeterminado del juego seleccionado.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      src={customBanner}
                      alt="Banner Preview"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        {bannerDimensions && (
                          <div className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 ${
                            bannerDimensions.status === 'good'
                              ? 'bg-emerald-500/80 text-white'
                              : 'bg-amber-500/80 text-white'
                          }`}>
                            {bannerDimensions.status === 'good' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{bannerDimensions.width} × {bannerDimensions.height} px ({bannerDimensions.ratio})</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveBanner}
                          className="px-2.5 py-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 truncate max-w-[250px] font-mono">
                          {bannerFileName}
                        </span>
                        {bannerDimensions?.status === 'warning' && (
                          <span className="text-[11px] text-amber-300 font-medium">
                            Resolución baja, recomendamos mayor tamaño.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Región del Servidor
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value as typeof formData.region })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-400"
                  >
                    <option value="LATAM">LATAM (Sur / Norte)</option>
                    <option value="NA">Norteamérica (NA)</option>
                    <option value="EU">Europa (EU)</option>
                    <option value="GLOBAL">Global / Todas</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Fecha y Horario de Inicio
                    </label>
                    <span className="text-[10px] text-red-400 font-mono font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                      Horario: GMT-3 (Chile / LATAM)
                    </span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={startDateTime}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-400 font-mono scheme-dark cursor-pointer transition-colors"
                      required
                    />
                  </div>

                  {startDateTime && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-red-500/20 text-[11px] text-slate-300 flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>
                        📅 <strong className="text-white">{formatTournamentDate(startDateTime)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Descripción General
                </label>
                <textarea
                  rows={2}
                  placeholder="Explica de qué trata el torneo, requisitos de rango, etc..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-400"
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Formato de la Llave (Bracket)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, format: 'single_elimination' })}
                    className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                      formData.format === 'single_elimination'
                        ? 'bg-red-500/15 border-red-400 shadow-lg shadow-red-500/15'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">Eliminación Simple</span>
                      {formData.format === 'single_elimination' && (
                        <Check className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      El equipo derrotado queda eliminado inmediatamente. Formato clásico, ágil y de alta tensión.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, format: 'double_elimination' })}
                    className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                      formData.format === 'double_elimination'
                        ? 'bg-purple-500/15 border-purple-400 shadow-lg shadow-purple-500/15'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">Doble Eliminación</span>
                      {formData.format === 'double_elimination' && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Incluye Cuadro Superior (Winners) y Cuadro Inferior (Losers). Los equipos tienen una segunda oportunidad.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Máximo de Participantes (Slots)
                  </label>
                  <select
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-400"
                  >
                    <option value={8}>8 Participantes (3 Rondas)</option>
                    <option value={16}>16 Participantes (4 Rondas)</option>
                    <option value={32}>32 Participantes (5 Rondas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Modalidad de Inscripción
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, teamType: 'team', teamSize: formData.gameId === 'fortnite' ? 2 : selectedGame.defaultTeamSize })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.teamType === 'team'
                          ? 'bg-red-500/20 border-red-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {formData.gameId === 'fortnite' ? 'Por equipos (2 a 4)' : `Por Equipos (${selectedGame.defaultTeamSize}v${selectedGame.defaultTeamSize})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, teamType: 'solo', teamSize: 1 })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.teamType === 'solo'
                          ? 'bg-red-500/20 border-red-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Individual / 1v1 Solo
                    </button>
                  </div>
                </div>
              </div>

              {formData.gameId === 'fortnite' && formData.teamType === 'team' && <label className="block text-xs text-slate-300">Integrantes por equipo
                <select value={formData.teamSize} onChange={event => setFormData({ ...formData, teamSize: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white">
                  <option value={2}>Dúos (2 jugadores)</option><option value={3}>Tríos (3 jugadores)</option><option value={4}>Escuadras (4 jugadores)</option>
                </select>
              </label>}

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 flex items-start space-x-3 text-xs text-red-200">
                <Sparkles className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p>
                  El motor generará automáticamente las llaves interactivas, asignación de semillas (seeding) y salas de chat privadas para cada match programado.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <TournamentPrizesEditor mode={prizeMode} onModeChange={setPrizeMode} total={formData.prizePool} onTotalChange={prizePool => setFormData({ ...formData,prizePool })} distribution={rankedPrizes} onDistributionChange={setRankedPrizes} maxPlaces={formData.maxParticipants} teamType={formData.teamType} />
              <div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Costo de Inscripción (Entry Fee)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    step={1}
                    placeholder="0 = Gratis"
                    value={formData.entryFeeAmount}
                    onChange={(e) => setFormData({ ...formData, entryFeeAmount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-400"
                  />
                  <p className="mt-1 text-xs text-slate-400">Pesos chilenos (CLP) por inscripción. 0 = gratis. En equipos, paga una persona por todo el equipo.</p>
                </div>
              </div>

              <TournamentRulesEditor config={{ ...formData, prizeDistribution, startDate: startDateTime }} mode={rulesMode} customRules={customRules} onChange={(mode,rules) => { setRulesMode(mode); setCustomRules(rules); }} />

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Juego seleccionado:</span>
                  <span className="font-semibold text-white">{selectedGame.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estructura de llaves:</span>
                  <span className="font-semibold text-red-300 capitalize">{formData.format.replace('_', ' ')} ({formData.maxParticipants} slots)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tipo de competición:</span>
                  <span className="font-semibold text-white">{formData.teamType === 'team' ? `Equipos de ${formData.teamSize}` : 'Solo 1v1'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {isPreparingBanner && <p role="status" className="mx-6 mb-4 text-sm text-red-300">Optimizando banner...</p>}
        {/* Footer Navigation */}
        {submitError && (
          <p role="alert" className="mx-6 mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
            {submitError}
          </p>
        )}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#191213] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting || isPreparingBanner}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !formData.title.trim()) {
                  showAlert('Por favor ingresa un título para el torneo');
                  return;
                }
                setStep(step + 1);
              }}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 flex items-center space-x-1.5 shadow-lg shadow-red-500/25 transition-all"
            >
              <span>Continuar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting || isPreparingBanner}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-black bg-red-400 hover:bg-red-300 flex items-center space-x-2 shadow-lg shadow-red-400/30 transition-all font-mono tracking-wider"
            >
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>{isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR TORNEO'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
