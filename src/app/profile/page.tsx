'use client';
import { showAlert, showConfirm } from '../../components/StyledDialog';

import { getUserAvatar } from '../../lib/userAvatar';
import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  ShieldCheck, 
  Trophy, 
  Gamepad2, 
  Users, 
  Save, 
  LogOut, 
  Mail, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Shield,
  PlusCircle,
  Link as LinkIcon,
  AlertCircle,
  Crown,
  Share2,
  CheckCircle2,
  Trash2,
  UserMinus,
  FileText,
  Download,
  Upload,
  AlertTriangle,
  Eye,
  EyeOff,
  Archive
} from '@/components/icons';
import { EditTournamentModal } from '../../components/EditTournamentModal';
import type { Tournament } from '../../types/tournament';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { findMyRegistration, formatTournamentMode, getTournamentAction, sortTournaments } from '../../lib/tournamentPresentation';
import { TournamentReturnLink } from '../../components/TournamentReturnLink';

interface TeamMember {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  inGameId: string;
  discordTag: string;
  joinedAt: string;
}

interface TeamData {
  id: string;
  name: string;
  tag: string;
  logoUrl: string;
  captainId: string;
  inviteCode: string;
  isCaptain: boolean;
  captain?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    discord_tag: string;
    riot_id: string;
    steam_id: string;
    ea_id: string;
  };
  members: TeamMember[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const { user, token, logout, updateProfile, refreshUser, isLoading } = useAuth();
  const { tournaments, withdrawFromTournament, toggleHideTournament, deleteTournament } = useTournament();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [riotId, setRiotId] = useState('');
  const [steamId, setSteamId] = useState('');
  const [eaId, setEaId] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [epicGamesUsername, setEpicGamesUsername] = useState('');
  const [psnId, setPsnId] = useState('');
  const [xboxGamertag, setXboxGamertag] = useState('');
  const [avatarSource, setAvatarSource] = useState('');
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarX, setAvatarX] = useState(0);
  const [avatarY, setAvatarY] = useState(0);

  // Parental authorization modal & form
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRut, setGuardianRut] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [relationship, setRelationship] = useState('Padre');
  const [documentUrl, setDocumentUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docFileSize, setDocFileSize] = useState('');
  const [docFileType, setDocFileType] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showAlert('El archivo es demasiado grande. El límite máximo es 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setDocumentUrl(dataUrl);
      setDocFileName(file.name);
      setDocFileSize(
        file.size > 1024 * 1024
          ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
          : (file.size / 1024).toFixed(1) + ' KB'
      );
      setDocFileType(file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image'));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocFile = () => {
    setDocumentUrl('');
    setDocFileName('');
    setDocFileSize('');
    setDocFileType('');
  };

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);



  // Team state
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [activeTeamTab, setActiveTeamTab] = useState<'create' | 'join'>('create');
  
  // Create team inputs
  const [createTeamName, setCreateTeamName] = useState('');
  const [createTeamTag, setCreateTeamTag] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Join team inputs
  const [joinCode, setJoinCode] = useState('');
  const [joinInGameId, setJoinInGameId] = useState('');
  const [joinDiscord, setJoinDiscord] = useState('');
  const [joiningTeam, setJoiningTeam] = useState(false);

  // Notifications
  const [teamError, setTeamError] = useState('');
  const [teamSuccess, setTeamSuccess] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);


  // Auth protection guard: If not logged in, redirect to '/arena' with replace so back-navigation doesn't re-render profile!
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/arena');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setBio(user.bio || '');
      setRiotId(user.riotId || '');
      setSteamId(user.steamId || '');
      setEaId(user.eaId || '');
      setDiscordTag(user.discordTag || '');
      setEpicGamesUsername(user.epicGamesUsername || '');
      setPsnId(user.psnId || '');
      setXboxGamertag(user.xboxGamertag || '');
      setAvatarSource(user.avatarUrl || '');
      setJoinInGameId(user.riotId || user.steamId || user.epicGamesUsername || user.eaId || '');
      setJoinDiscord(user.discordTag || '');
    }
  }, [user]);

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      showAlert('Selecciona una imagen JPG, PNG o WEBP de hasta 5 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setAvatarSource(String(reader.result || '')); setAvatarZoom(1); setAvatarX(0); setAvatarY(0); };
    reader.readAsDataURL(file);
  };

  const croppedAvatar = async () => new Promise<string>((resolve, reject) => {
    const image = new window.Image(); image.onload = () => {
      const size = 320; const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * avatarZoom;
      const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
      const x = (size - width) / 2 + (width - size) * avatarX / 200;
      const y = (size - height) / 2 + (height - size) * avatarY / 200;
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      canvas.getContext('2d')?.drawImage(image, x, y, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    }; image.onerror = reject; image.src = avatarSource;
  });

  const fetchMyTeam = async () => {
    const savedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('caoz_auth_token') : null);
    if (!savedToken) return;

    try {
      setLoadingTeam(true);
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
      }
    } catch (e) {
      console.error('Failed to fetch team:', e);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyTeam();
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const avatarUrl = avatarSource.startsWith('data:image/') ? await croppedAvatar() : undefined;
    const res = await updateProfile({
      fullName,
      avatarUrl,
      bio,
      riotId,
      steamId,
      eaId,
      discordTag,
      epicGamesUsername,
      psnId,
      xboxGamertag
    });

    setSaving(false);
    if (res.success) {
      setSavedSuccess(true);
      await refreshUser();
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      showAlert(res.error || 'Error al guardar cambios');
    }
  };

  const handleSubmitAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!guardianName.trim() || !guardianRut.trim() || !guardianPhone.trim() || !guardianEmail.trim()) {
      setAuthError('Todos los datos del apoderado son requeridos.');
      return;
    }

    if (!documentUrl) {
      setAuthError('Por favor adjunta el documento firmado (PDF, JPG, JPEG o PNG) de tu apoderado.');
      return;
    }

    try {
      setIsSubmittingAuth(true);
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/auth/parental-authorization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`
        },
        body: JSON.stringify({
          guardianName,
          guardianRut,
          guardianPhone,
          guardianEmail,
          relationship,
          documentUrl: documentUrl.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Error al enviar la autorización');
        return;
      }

      setAuthSuccess('¡Autorización enviada exitosamente! El equipo de administración revisará la documentación.');
      await refreshUser();
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccess('');
      }, 2000);
    } catch (err: any) {
      setAuthError(err.message || 'Error de conexión');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError('');
    setTeamSuccess('');

    if (!createTeamName.trim()) {
      setTeamError('Por favor ingresa el nombre de tu equipo.');
      return;
    }
    if (!createTeamTag.trim()) {
      setTeamError('Por favor ingresa la sigla o tag (ej: CAOZ).');
      return;
    }

    try {
      setCreatingTeam(true);
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`
        },
        body: JSON.stringify({
          name: createTeamName.trim(),
          tag: createTeamTag.trim().toUpperCase()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || 'Error al crear el equipo');
        return;
      }

      setTeamSuccess(`¡Equipo "${createTeamName}" creado con éxito! Eres el Capitán.`);
      setCreateTeamName('');
      setCreateTeamTag('');
      await refreshUser();
      await fetchMyTeam();
    } catch (err: any) {
      setTeamError(err.message || 'Error al conectar con el servidor');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError('');
    setTeamSuccess('');

    if (!joinCode.trim()) {
      setTeamError('Ingresa el código de invitación del equipo.');
      return;
    }

    try {
      setJoiningTeam(true);
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`
        },
        body: JSON.stringify({
          inviteCode: joinCode.trim(),
          inGameId: joinInGameId.trim() || riotId || steamId || user.username,
          discordTag: joinDiscord.trim() || discordTag
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || 'Error al unirse al equipo');
        return;
      }

      setTeamSuccess(data.message || '¡Te has unido exitosamente al equipo!');
      setJoinCode('');
      await refreshUser();
      await fetchMyTeam();
    } catch (err: any) {
      setTeamError(err.message || 'Error al conectar con el servidor');
    } finally {
      setJoiningTeam(false);
    }
  };

  const handleKickMember = async (memberId: string, memberUsername: string) => {
    if (!await showConfirm(`¿Estás seguro de que deseas expulsar a @${memberUsername} del equipo?`)) {
      return;
    }
    setTeamError('');
    setTeamSuccess('');
    try {
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch(`/api/teams/members?memberId=${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || 'Error al expulsar integrante');
        return;
      }
      setTeamSuccess(data.message || 'Integrante expulsado exitosamente.');
      await fetchMyTeam();
    } catch (e: any) {
      setTeamError(e.message || 'Error en el servidor');
    }
  };

  const handleDisbandTeam = async () => {
    if (!await showConfirm('⚠️ ¿Estás seguro de que deseas DISOLVER tu equipo? Esta acción no se puede deshacer y desvinculará a todos los miembros.')) {
      return;
    }
    setTeamError('');
    setTeamSuccess('');
    try {
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/teams', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || 'Error al disolver equipo');
        return;
      }
      setTeamSuccess('El equipo ha sido disuelto.');
      setTeam(null);
      await refreshUser();
    } catch (e: any) {
      setTeamError(e.message || 'Error en el servidor');
    }
  };

  const handleLeaveTeam = async () => {
    if (!await showConfirm('¿Estás seguro de que deseas abandonar este equipo?')) {
      return;
    }
    setTeamError('');
    setTeamSuccess('');
    try {
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/teams/leave', {
        method: 'POST',
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || 'Error al salir del equipo');
        return;
      }
      setTeamSuccess(data.message || 'Has abandonado el equipo.');
      setTeam(null);
      await refreshUser();
    } catch (e: any) {
      setTeamError(e.message || 'Error en el servidor');
    }
  };

  const handleCopyInviteLink = () => {
    if (!team) return;
    const url = `${window.location.origin}/join-team?code=${team.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyCode = () => {
    if (!team) return;
    navigator.clipboard.writeText(team.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  // Find user's tournaments (solo by username or team by team name)
  const myTournaments = sortTournaments(tournaments.filter(t => !t.isHidden && t.status !== 'completed' && findMyRegistration(t,user)));

  const handleWithdrawTournament = async (trn: any) => {
    const isSolo = trn.teamType === 'solo' || trn.teamSize === 1;
    const confirmMsg = isSolo
      ? `¿Estás seguro de que deseas salirte de "${trn.title}"? Tu cupo en el torneo volverá a estar vacío.`
      : `¿Estás seguro de que deseas retirar a tu equipo de "${trn.title}"? Como capitán, esta acción dará de baja la participación del equipo completo.`;

    if (!await showConfirm(confirmMsg)) return;

    try {
      setWithdrawingId(trn.id);
      const res = await withdrawFromTournament(trn.id);
      if (res.success) {
        showAlert(res.message || 'Has bajado la participación del torneo.');
      } else {
        showAlert(res.message || 'Error al retirarse del torneo.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error al procesar la solicitud.');
    } finally {
      setWithdrawingId(null);
    }
  };

  const [adminTab, setAdminTab] = useState<'hidden' | 'active'>('hidden');
  const [adminActionId, setAdminActionId] = useState<string | null>(null);

  const hiddenTournaments = tournaments.filter((t) => t.isHidden);
  const activeTournaments = tournaments.filter((t) => !t.isHidden);

  const handleAdminToggleHide = async (tId: string, isHidden: boolean, title: string) => {
    const action = isHidden ? 'ocultar y archivar' : 'desocultar y publicar';
    if (!await showConfirm(`¿Estás seguro de que deseas ${action} el torneo "${title}"?`)) {
      return;
    }

    try {
      setAdminActionId(tId);
      const res = await toggleHideTournament(tId, isHidden);
      showAlert(res.message);
    } catch (e: any) {
      showAlert(e.message || 'Error al cambiar visibilidad');
    } finally {
      setAdminActionId(null);
    }
  };

  const handleAdminDelete = async (tId: string, title: string) => {
    if (!await showConfirm(`¿Estás SEGURO de eliminar definitivamente el torneo "${title}"? Se borrarán todas sus partidas, brackets y participantes permanentemente.`)) {
      return;
    }

    try {
      setAdminActionId(tId);
      const res = await deleteTournament(tId);
      showAlert(res.message);
    } catch (e: any) {
      showAlert(e.message || 'Error al eliminar torneo');
    } finally {
      setAdminActionId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      <Suspense fallback={null}><TournamentReturnLink /></Suspense>
      
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/arena"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Torneos</span>
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-[#0d1320] p-5 flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-bold text-white">Pagos</h2><p className="text-sm text-slate-400">Consulta el historial y estado de los pagos de inscripción.</p></div>
        <Link href="/arena/pagos" className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 text-sm font-semibold text-cyan-300">{user.role === 'admin' ? 'Ver pagos de inscripciones' : 'Ver mis pagos'}</Link>
      </section>
      {/* Profile Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d1320] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex items-center space-x-5 relative">
          <div className="relative">
            <img
              src={avatarSource || getUserAvatar(user.username)}
              alt={user.username}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-red-400 shadow-lg"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0d1320] rounded-full" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {fullName || user.username}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {user.username}
            </p>

          </div>
        </div>

        {/* Quick Stats & Logout */}
        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8">
          <div>
            <span className="text-2xl font-black text-white font-mono block">
              {myTournaments.length}
            </span>
            <span className="text-[11px] text-slate-400">Torneos Jugados</span>
          </div>
          <div>
            <span className="text-2xl font-black text-red-400 font-mono block">
              {team ? '1' : '0'}
            </span>
            <span className="text-[11px] text-slate-400">Equipo</span>
          </div>
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Edit Profile (Left) and Team / Tournaments (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Edit Profile Form (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-[#191213] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <User className="w-4 h-4 text-red-400" />
                <span>Datos del Perfil & Cuentas de Juego</span>
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
                  <Check className="w-4 h-4" />
                  <span>¡Cambios guardados con éxito!</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center gap-4"><div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-red-400 bg-slate-950"><img src={avatarSource || getUserAvatar(user.username)} alt="Vista previa" className="h-full w-full object-cover" style={{ transform: `translate(${avatarX}%, ${avatarY}%) scale(${avatarZoom})` }} /></div><div><label className="cursor-pointer rounded-lg bg-red-400 px-3 py-2 text-xs font-bold text-black"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => chooseAvatar(event.target.files?.[0])} />Subir imagen</label><p className="mt-2 text-[11px] text-slate-400">JPG, PNG o WEBP. Ajusta la posición dentro del círculo.</p></div></div>
                {avatarSource.startsWith('data:image/') && <div className="mt-4 grid gap-3 text-xs text-slate-300"><label>Zoom<input type="range" min="1" max="2.5" step="0.05" value={avatarZoom} onChange={event => setAvatarZoom(Number(event.target.value))} className="ml-2 w-40 accent-red-400" /></label><label>Horizontal<input type="range" min="-100" max="100" value={avatarX} onChange={event => setAvatarX(Number(event.target.value))} className="ml-2 w-40 accent-red-400" /></label><label>Vertical<input type="range" min="-100" max="100" value={avatarY} onChange={event => setAvatarY(Number(event.target.value))} className="ml-2 w-40 accent-red-400" /></label></div>}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Biografía / Presentación</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                />
              </div>

              {/* Identificadores de Videojuegos (In-Game Tags) */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Gamepad2 className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Identificadores de Videojuegos (In-Game Tags)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Sincronizados en brackets y salas de partidas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  {/* Steam ID */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      Steam ID
                    </label>
                    <input
                      type="text"
                      placeholder="STEAM_0:1:12345678 o ID64"
                      value={steamId}
                      onChange={(e) => setSteamId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  {/* Discord Tag */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      Discord Tag
                    </label>
                    <input
                      type="text"
                      placeholder="usuario#0000 o @usuario"
                      value={discordTag}
                      onChange={(e) => setDiscordTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  {/* Epic Games Username */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" />
                      Epic Games Username
                    </label>
                    <input
                      type="text"
                      placeholder="Tu usuario en Epic Games"
                      value={epicGamesUsername}
                      onChange={(e) => setEpicGamesUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  {/* Riot ID */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      Riot ID
                    </label>
                    <input
                      type="text"
                      placeholder="Jugador#LAS (Valorant, LoL)"
                      value={riotId}
                      onChange={(e) => setRiotId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  {/* PSN ID */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                      PSN ID (PlayStation Network)
                    </label>
                    <input
                      type="text"
                      placeholder="Tu ID Online de PSN"
                      value={psnId}
                      onChange={(e) => setPsnId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  {/* Xbox Gamertag */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Xbox Gamertag
                    </label>
                    <input
                      type="text"
                      placeholder="Tu Gamertag de Xbox Live"
                      value={xboxGamertag}
                      onChange={(e) => setXboxGamertag(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-md font-mono flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-black" />
                <span>{saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS EN EL PERFIL'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Team Management & Enrolled Tournaments (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Team Section */}
          <div className="p-6 rounded-2xl bg-[#191213] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Mi Equipo para Torneos</span>
              </h3>
              {team && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono flex items-center space-x-1 ${
                  team.isCaptain 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}>
                  {team.isCaptain ? <Crown className="w-3 h-3 text-amber-400" /> : null}
                  <span>{team.isCaptain ? 'Capitán' : 'Miembro'}</span>
                </span>
              )}
            </div>

            {/* Team Alerts */}
            {teamSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{teamSuccess}</span>
              </div>
            )}
            {teamError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{teamError}</span>
              </div>
            )}

            {loadingTeam ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !team ? (
              /* User DOES NOT have a team: Offer Create or Join */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <p>Aún no formas parte de un equipo. Crea tu propio equipo como Capitán o únete al de tus compañeros con un código de invitación.</p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTeamTab('create');
                      setTeamError('');
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                      activeTeamTab === 'create'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Crear Equipo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTeamTab('join');
                      setTeamError('');
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                      activeTeamTab === 'join'
                        ? 'bg-red-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Unirse con Código</span>
                  </button>
                </div>

                {/* Tab: Create Team */}
                {activeTeamTab === 'create' ? (
                  <form onSubmit={handleCreateTeam} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nombre Oficial del Equipo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Caoz Cyber Wolves, Leviatán"
                        value={createTeamName}
                        onChange={(e) => setCreateTeamName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-purple-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Tag / Siglas del Equipo (2 a 5 letras) *
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="CAOZ"
                        value={createTeamTag}
                        onChange={(e) => setCreateTeamTag(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono uppercase text-xs focus:border-purple-400 focus:outline-none"
                      />
                    </div>

                    <p className="text-[10px] text-slate-400">
                      * Al crear el equipo serás el <strong>Capitán</strong> y se generará un enlace de invitación seguro para que tus compañeros se unan.
                    </p>

                    <button
                      type="submit"
                      disabled={creatingTeam}
                      className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all font-mono disabled:opacity-50"
                    >
                      {creatingTeam ? 'CREANDO EQUIPO...' : 'CREAR EQUIPO Y SER CAPITÁN'}
                    </button>
                  </form>
                ) : (
                  /* Tab: Join Team */
                  <form onSubmit={handleJoinTeam} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Código de Invitación del Equipo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: CZ-8K2Q-94XF"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono uppercase text-xs focus:border-red-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Tu In-Game ID
                        </label>
                        <input
                          type="text"
                          placeholder="Tu Riot ID / Steam ID"
                          value={joinInGameId}
                          onChange={(e) => setJoinInGameId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Discord
                        </label>
                        <input
                          type="text"
                          placeholder="usuario#0000"
                          value={joinDiscord}
                          onChange={(e) => setJoinDiscord(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={joiningTeam}
                      className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-red-400 hover:bg-red-300 shadow-md transition-all font-mono disabled:opacity-50"
                    >
                      {joiningTeam ? 'UNIÉNDOSE...' : 'UNIRME AL ROSTER DEL EQUIPO'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* User HAS a team: Show details, invite link, and roster */
              <div className="space-y-5 animate-fade-in">
                {/* Team Info Card */}
                <div className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <img
                    src={getUserAvatar(team.name)}
                    alt={team.name}
                    className="w-12 h-12 rounded-xl object-cover border border-purple-500/40"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white">{team.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">
                      TAG: [{team.tag}] • {team.members?.length || 1} de 7 Jugadores
                    </p>
                  </div>
                </div>

                {/* Secure Invite Section */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                      <Share2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Enlace de Invitación para tu Equipo</span>
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono">
                      Seguro & Único
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Comparte este enlace directo con tus compañeros. Al ingresar se sumarán automáticamente al roster oficial de tu escuadra:
                  </p>

                  <div className="flex items-center space-x-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-red-300 truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}/join-team?code=${team.inviteCode}` : `/join-team?code=${team.inviteCode}`}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors"
                      title="Copiar Enlace Completo"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-purple-500/20">
                    <span className="text-slate-400">Código individual:</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="font-mono font-bold text-purple-300 hover:text-white flex items-center space-x-1"
                    >
                      <span>{team.inviteCode}</span>
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                    </button>
                  </div>
                </div>

                {/* Team Roster List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Roster Oficial de Jugadores ({team.members?.length || 1}/7)
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {team.members && team.members.length > 0 ? (
                      team.members.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <span className="font-mono text-slate-500 text-[11px]">#{idx + 1}</span>
                            <img
                              src={getUserAvatar(m.username)}
                              alt={m.username}
                              className="w-6 h-6 rounded-md object-cover border border-slate-700"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-white">@{m.username}</span>
                              <span className="text-[10px] text-slate-400 ml-2 font-mono">
                                ({m.inGameId || 'Sin ID'})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {m.role === 'captain' || m.userId === team.captainId ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold font-mono">
                                CAPITÁN
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-bold font-mono">
                                TITULAR
                              </span>
                            )}

                            {/* Captain can kick members */}
                            {team.isCaptain && m.userId !== team.captainId && (
                              <button
                                type="button"
                                onClick={() => handleKickMember(m.id, m.username)}
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1 cursor-pointer"
                                title={`Expulsar a @${m.username} del equipo`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Cargando integrantes del equipo...</p>
                    )}
                  </div>
                </div>

                {/* Team Management Action: Disband (Captain) or Leave (Member) */}
                <div className="pt-2 border-t border-slate-800/80">
                  {team.isCaptain ? (
                    <button
                      type="button"
                      onClick={handleDisbandTeam}
                      className="w-full py-2.5 px-3 rounded-xl bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 hover:border-red-500/60 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disolver y Eliminar Equipo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeaveTeam}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Abandonar Equipo</span>
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Tournaments Participation */}
          <div className="p-6 rounded-2xl bg-[#191213] border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Mis Torneos Activos</span>
            </h3>

            {myTournaments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aún no estás inscrito en ningún torneo.
              </p>
            ) : (
              <div className="space-y-3">
                {myTournaments.map((trn) => {
                  const isSolo = trn.teamType === 'solo' || trn.teamSize === 1;
                  const canWithdraw = Boolean(
                    user && (
                      isSolo
                        ? trn.participants.some((p: any) => p.name === user.username || p.userId === user.id)
                        : (Boolean(team?.isCaptain) || (team && team.captainId === user.id) || Boolean(user.team?.is_captain) || (user.team && user.team.captain_id === user.id) || trn.participants.some((p: any) => p.captain?.name === user.username || p.userId === user.id))
                    )
                  );

                  return (
                    <div
                      key={trn.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-red-500/30 flex items-center justify-between gap-3 transition-colors"
                    >
                      <Link
                        href={getTournamentAction(trn,user).href}
                        className="flex-1 min-w-0 group"
                      >
                        <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1 flex items-center gap-1.5">
                          <span>{trn.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-red-400 shrink-0" />
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {trn.gameName} • {formatTournamentMode(trn)} • {getTournamentAction(trn,user).label}
                        </p>
                      </Link>

                      {canWithdraw && trn.status !== 'completed' && (
                        <button
                          onClick={() => handleWithdrawTournament(trn)}
                          disabled={withdrawingId === trn.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 transition-colors flex items-center space-x-1 shrink-0 disabled:opacity-50"
                          title={isSolo ? 'Salir del torneo' : 'Retirar equipo del torneo (Capitán)'}
                        >
                          <LogOut className="w-3 h-3 text-rose-400" />
                          <span>{withdrawingId === trn.id ? '...' : isSolo ? 'Salir' : 'Retirar Equipo'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ADMINISTRATOR TOURNAMENT MANAGEMENT SECTION */}
      {user.role === 'admin' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#1c1417] border border-purple-500/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    Panel de Gestión de Torneos (Admin)
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                    OFICIAL
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Oculta torneos para dejarlos invisibles al público o elimínalos definitivamente de la plataforma.
                </p>
              </div>
            </div>

            {/* Sub-tabs / Filters */}
            <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setAdminTab('hidden')}
                className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  adminTab === 'hidden'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Ocultos & Archivados ({hiddenTournaments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('active')}
                className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  adminTab === 'active'
                    ? 'bg-red-400 text-black shadow-lg shadow-red-400/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Públicos ({activeTournaments.length})</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Hidden & Archived Tournaments */}
          {adminTab === 'hidden' && (
            <div className="space-y-4">
              {hiddenTournaments.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                  <Archive className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-white">No hay torneos ocultos o archivados</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Cuando ocultes un torneo, los usuarios regulares no podrán verlo ni registrarse, y se listará aquí para tu control.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hiddenTournaments.map((trn) => (
                    <div
                      key={trn.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3.5">
                        <img
                          src={trn.bannerUrl}
                          alt={trn.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-700 filter brightness-75"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono">
                              OCULTO / ARCHIVADO
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {trn.gameName}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                            {trn.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {trn.teamType === 'solo' ? 'Individual 1v1' : `Equipos ${trn.teamSize}v${trn.teamSize}`} • {trn.participants.length}/{trn.maxParticipants} slots
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                        <Link
                          href={`/tournament/${trn.slug}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Torneo</span>
                        </Link>

                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                          <button type="button" onClick={() => setEditingTournament(trn)} className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20">Editar</button>
                          <button
                            type="button"
                            onClick={() => handleAdminToggleHide(trn.id, false, trn.title)}
                            disabled={adminActionId === trn.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/60 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 font-mono"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Desocultar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAdminDelete(trn.id, trn.title)}
                            disabled={adminActionId === trn.id}
                            className="p-1.5 rounded-lg text-rose-400 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 transition-colors cursor-pointer disabled:opacity-50"
                            title="Eliminar torneo permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Public / Active Tournaments */}
          {adminTab === 'active' && (
            <div className="space-y-4">
              {activeTournaments.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-white">No hay torneos públicos activos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTournaments.map((trn) => (
                    <div
                      key={trn.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3.5">
                        <img
                          src={trn.bannerUrl}
                          alt={trn.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-700"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono">
                              PÚBLICO
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {trn.gameName}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                            {trn.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {trn.teamType === 'solo' ? 'Individual 1v1' : `Equipos ${trn.teamSize}v${trn.teamSize}`} • {trn.participants.length}/{trn.maxParticipants} slots
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                        <Link
                          href={`/tournament/${trn.slug}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Torneo</span>
                        </Link>

                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                          <button type="button" onClick={() => setEditingTournament(trn)} className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/20">Editar</button>
                          <button
                            type="button"
                            onClick={() => handleAdminToggleHide(trn.id, true, trn.title)}
                            disabled={adminActionId === trn.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/60 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 font-mono"
                            title="Ocultar del público y archivar"
                          >
                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ocultar / Archivar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAdminDelete(trn.id, trn.title)}
                            disabled={adminActionId === trn.id}
                            className="p-1.5 rounded-lg text-rose-400 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 transition-colors cursor-pointer disabled:opacity-50"
                            title="Eliminar torneo permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Parental Authorization Upload Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto bg-[#191213] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#14120a] border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-amber-400">
                <FileText className="w-5 h-5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Autorización Parental (Menor de Edad)</h3>
                  <p className="text-[11px] text-amber-300/80">Ley N° 19.628 • República de Chile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAuthorization} className="p-6 space-y-4">
              {authError && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed">
                De conformidad con la legislación chilena sobre protección de datos y capacidad civil de menores, para participar en torneos competitivos con premios debes presentar la autorización de tu padre, madre o tutor legal.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Completo del Apoderado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: María José Morales Valenzuela"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">N° de documento del apoderado *</label>
                    <input
                      type="text"
                      required
                      placeholder="DNI, cédula o pasaporte"
                      value={guardianRut}
                      onChange={(e) => setGuardianRut(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Parentesco *</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    >
                      <option value="Padre">Padre</option>
                      <option value="Madre">Madre</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Teléfono Móvil *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+56 9 1234 5678"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="apoderado@email.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Documento Firmado por el Apoderado (PDF o Imagen JPG / JPEG / PNG) *
                  </label>
                  
                  {!documentUrl ? (
                    <div className="relative border-2 border-dashed border-amber-500/30 hover:border-amber-400 rounded-xl p-4 transition-all bg-amber-500/5 hover:bg-amber-500/10 text-center cursor-pointer group">
                      <input
                        type="file"
                        accept=".pdf, image/jpeg, image/jpg, image/png, application/pdf"
                        onChange={handleDocFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center py-2">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-200">
                          Subir documento desde tu dispositivo
                        </p>
                        <p className="text-[10px] text-amber-300/80 mt-0.5">
                          Formatos aceptados: PDF, JPG, JPEG o PNG (Máximo 8MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {docFileType.includes('pdf') || documentUrl.startsWith('data:application/pdf') ? (
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        ) : (
                          <img
                            src={documentUrl}
                            alt="Vista previa del documento"
                            className="w-10 h-10 rounded-lg object-cover border border-amber-500/30 shrink-0"
                          />
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-white truncate max-w-[220px]">
                            {docFileName || 'Documento de Autorización'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {docFileSize ? `${docFileSize} • ` : ''}
                            {docFileType.includes('pdf') || documentUrl.startsWith('data:application/pdf') ? 'Documento PDF' : 'Imagen'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDocFile}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 mt-1">
                    Descarga el formato oficial, haz que tu apoderado lo firme, sácale una foto o escanéalo en PDF y súbelo aquí.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-amber-400 hover:bg-amber-300 font-mono shadow-md disabled:opacity-50"
                >
                  {isSubmittingAuth ? 'ENVIANDO...' : 'ENVIAR AUTORIZACIÓN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {user?.role === 'admin' && editingTournament && <EditTournamentModal key={editingTournament.id} tournament={editingTournament} onClose={() => setEditingTournament(null)} />}
    </div>
  );
}
