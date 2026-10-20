'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tournament, GameInfo, Participant, TournamentMatch, TournamentRound, UserRole } from '../types/tournament';
import { POPULAR_GAMES, INITIAL_TOURNAMENTS } from '../data/mockData';
import { useAuth } from './AuthContext';

interface TournamentContextType {
  tournaments: Tournament[];
  games: GameInfo[];
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: {
    id: string;
    name: string;
    username: string;
    tag: string;
    discord: string;
    avatar: string;
    teamName: string;
    teamTag: string;
  };
  isLoading: boolean;
  refreshTournaments: () => Promise<void>;
  getTournament: (id: string) => Tournament | undefined;
  registerParticipant: (tournamentId: string, participantData: {
    username?: string;
    teamName: string;
    teamTag: string;
    captainDiscord: string;
    captainInGameId: string;
    rosterMembers?: { name: string; inGameId: string; role: 'starter' | 'sub' }[];
  }) => Promise<{ success: boolean; message: string; participantId?: string }>;
  checkInParticipant: (tournamentId: string, participantId: string) => Promise<void>;
  createTournament: (data: Partial<Tournament>) => Promise<string>;
  updateMatchScore: (tournamentId: string, matchId: string, score1: number, score2: number, proofUrl?: string) => Promise<void>;
  sendMatchChatMessage: (tournamentId: string, matchId: string, text: string, isProof?: boolean) => Promise<void>;
  reportMatchDispute: (tournamentId: string, matchId: string, reason: string) => Promise<void>;
  resolveDispute: (tournamentId: string, matchId: string, winnerId: string) => Promise<void>;
  generateBracketFromParticipants: (tournamentId: string) => Promise<void>;
  withdrawFromTournament: (tournamentId: string) => Promise<{ success: boolean; message: string }>;
  toggleHideTournament: (tournamentId: string, isHidden: boolean) => Promise<{ success: boolean; message: string }>;
  deleteTournament: (tournamentId: string) => Promise<{ success: boolean; message: string }>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('player');
  const [isLoading, setIsLoading] = useState(false);

  // Sync role with authUser role
  useEffect(() => {
    if (authUser?.role === 'admin' || authUser?.role === 'organizer') {
      setUserRole('organizer');
    } else {
      setUserRole('player');
    }
  }, [authUser]);

  const currentUser = {
    id: authUser?.id || '',
    name: authUser?.username || authUser?.fullName || 'Participante',
    username: authUser?.username || '',
    tag: authUser?.riotId || authUser?.steamId || authUser?.eaId || '',
    discord: authUser?.discordTag || '',
    avatar: authUser?.avatarUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop',
    teamName: authUser?.teamName || '',
    teamTag: authUser?.teamTag || ''
  };

  const refreshTournaments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.tournaments || []);
      }
    } catch (e) {
      console.error('Failed to load tournaments from API:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTournaments();
  }, []);

  const getTournament = (id: string) => {
    return tournaments.find((t) => t.id === id || t.slug === id);
  };

  const registerParticipant = async (
    tournamentId: string,
    participantData: {
      username?: string;
      teamName: string;
      teamTag: string;
      captainDiscord: string;
      captainInGameId: string;
      rosterMembers?: { name: string; inGameId: string; role: 'starter' | 'sub' }[];
    }
  ) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('caoz_auth_token') : null;
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...participantData,
          username: participantData.username || authUser?.username || '',
          captainName: authUser?.username || authUser?.fullName || currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || data.error || 'Error al inscribirse' };
      }

      await refreshTournaments();
      return { success: true, message: data.message || '¡Inscripción confirmada!', participantId: data.participantId };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al conectar con el servidor' };
    }
  };

  const checkInParticipant = async (tournamentId: string, participantId: string) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, teamName: currentUser.teamName })
      });
      await refreshTournaments();
    } catch (e) {
      console.error('Check-in error:', e);
    }
  };

  const createTournament = async (data: Partial<Tournament>): Promise<string> => {
    try {
      const token = localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...data,
          organizerId: currentUser.id,
          organizerName: currentUser.name,
          organizerAvatar: currentUser.avatar
        })
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok || !resData?.success || typeof resData.slug !== 'string' || !resData.slug) {
        throw new Error(resData?.error || 'No se pudo publicar el torneo. Inténtalo nuevamente.');
      }
      await refreshTournaments();
      return resData.slug;
    } catch (e) {
      console.error('Create tournament error:', e);
      throw e;
    }
  };

  const updateMatchScore = async (
    tournamentId: string,
    matchId: string,
    score1: number,
    score2: number,
    proofUrl?: string
  ) => {
    try {
      await fetch(`/api/matches/${matchId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score1, score2, proofUrl })
      });
      await refreshTournaments();
    } catch (e) {
      console.error('Update score error:', e);
    }
  };

  const sendMatchChatMessage = async (
    tournamentId: string,
    matchId: string,
    text: string,
    isProof: boolean = false
  ) => {
    try {
      await fetch(`/api/matches/${matchId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: currentUser.name,
          senderRole: userRole === 'organizer' ? 'admin' : 'team1',
          message: text,
          isProofImage: isProof
        })
      });
      await refreshTournaments();
    } catch (e) {
      console.error('Send chat error:', e);
    }
  };

  const reportMatchDispute = async (tournamentId: string, matchId: string, reason: string) => {
    try {
      await fetch(`/api/matches/${matchId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: 'Árbitro / Soporte',
          senderRole: 'admin',
          message: `⚠️ DISPUTA ABIERTA: "${reason}". Un administrador revisará las pruebas.`,
          isDispute: true,
          disputeReason: reason
        })
      });
      await refreshTournaments();
    } catch (e) {
      console.error('Report dispute error:', e);
    }
  };

  const resolveDispute = async (tournamentId: string, matchId: string, winnerId: string) => {
    const tournament = getTournament(tournamentId);
    if (!tournament) return;

    let targetMatch: TournamentMatch | undefined;
    for (const round of [...tournament.rounds, ...(tournament.losersRounds || [])]) {
      const found = round.matches.find((m) => m.id === matchId);
      if (found) {
        targetMatch = found;
        break;
      }
    }

    if (!targetMatch) return;

    const isTeam1 = targetMatch.team1.participantId === winnerId || targetMatch.team1.name === winnerId;
    const score1 = isTeam1 ? 2 : 0;
    const score2 = isTeam1 ? 0 : 2;

    await updateMatchScore(tournamentId, matchId, score1, score2);
  };

  const generateBracketFromParticipants = async (tournamentId: string) => {
    const tournament = getTournament(tournamentId);
    if (!tournament || tournament.participants.length === 0 || tournament.rounds.length === 0) return;

    // Seed participants into round 0 matches
    const firstRound = tournament.rounds[0];
    for (let idx = 0; idx < firstRound.matches.length; idx++) {
      const m = firstRound.matches[idx];
      const p1 = tournament.participants[idx * 2];
      const p2 = tournament.participants[idx * 2 + 1];

      if (p1 || p2) {
        await fetch(`/api/matches/${m.id}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score1: 0,
            score2: 0,
            team1Name: p1 ? p1.name : (m.team1.name.startsWith('Semilla') ? 'Vacío' : m.team1.name),
            team2Name: p2 ? p2.name : (m.team2.name.startsWith('Semilla') ? 'Vacío' : m.team2.name)
          })
        });
      }
    }

    await refreshTournaments();
  };

  const withdrawFromTournament = async (tournamentId: string) => {
    try {
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('caoz_auth_token') : null;
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Error al retirarse del torneo' };
      }
      await refreshTournaments();
      return { success: true, message: data.message || 'Participación retirada exitosamente' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  };

  const toggleHideTournament = async (tournamentId: string, isHidden: boolean) => {
    try {
      const savedToken = localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/tournaments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`
        },
        body: JSON.stringify({ id: tournamentId, isHidden })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Error al cambiar visibilidad del torneo' };
      }
      await refreshTournaments();
      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    try {
      const savedToken = localStorage.getItem('caoz_auth_token');
      const res = await fetch(`/api/tournaments?id=${tournamentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${savedToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Error al eliminar torneo' };
      }
      await refreshTournaments();
      return { success: true, message: data.message || 'Torneo eliminado correctamente' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  };

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        games: POPULAR_GAMES,
        userRole,
        setUserRole,
        currentUser,
        isLoading,
        refreshTournaments,
        getTournament,
        registerParticipant,
        checkInParticipant,
        createTournament,
        updateMatchScore,
        sendMatchChatMessage,
        reportMatchDispute,
        resolveDispute,
        generateBracketFromParticipants,
        withdrawFromTournament,
        toggleHideTournament,
        deleteTournament
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};
