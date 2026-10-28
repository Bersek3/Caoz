export type GameId = string;

export type TournamentFormat = 
  | 'single_elimination' 
  | 'double_elimination' 
  | 'round_robin' 
  | 'swiss';

export type TournamentStatus = 
  | 'registration_open' 
  | 'check_in' 
  | 'in_progress' 
  | 'completed';

export interface GameInfo {
  id: GameId;
  name: string;
  genre: string;
  publisher: string;
  defaultTeamSize: number;
  coverImage: string;
  bannerImage: string;
  tagFieldLabel: string;
  tagPlaceholder: string;
}

export interface PlayerRosterMember {
  id: string;
  name: string;
  inGameId: string;
  role: 'captain' | 'starter' | 'sub';
  avatar: string;
}

export interface Participant {
  id: string;
  teamId?: string;
  userId?: string;
  name: string;
  tag: string;
  avatar: string;
  seed: number;
  checkedIn: boolean;
  registeredAt: string;
  captain: {
    name: string;
    discord: string;
    inGameId: string;
    avatar: string;
  };
  roster: PlayerRosterMember[];
}

export interface MatchChatMessage {
  id: string;
  senderName: string;
  senderRole: 'team1' | 'team2' | 'admin' | 'system';
  message: string;
  timestamp: string;
  isProofImage?: boolean;
}

export interface MatchParticipant {
  participantId?: string;
  name: string;
  avatar?: string;
  score?: number;
  isWinner?: boolean;
  seed?: number;
}

export interface TournamentMatch {
  canAccessRoom?: boolean;
  id: string;
  roundIndex: number;
  roundTitle: string;
  matchIndex: number;
  bracketType: 'winners' | 'losers' | 'grand_finals';
  team1: MatchParticipant;
  team2: MatchParticipant;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'disputed';
  winnerId?: string;
  bestOf: number;
  scheduledTime: string;
  proofImageUrl?: string;
  reportedBy?: string;
  disputeReason?: string;
  chatMessages: MatchChatMessage[];
}

export interface TournamentRound {
  roundIndex: number;
  title: string;
  bracketType: 'winners' | 'losers' | 'grand_finals';
  matches: TournamentMatch[];
}

export interface Tournament {
  id: string;
  title: string;
  slug: string;
  gameId: GameId;
  gameName: string;
  bannerUrl: string;
  thumbnailUrl: string;
  organizer: {
    name: string;
    avatar: string;
    verified: boolean;
    followers: number;
  };
  status: TournamentStatus;
  format: TournamentFormat;
  teamType: 'solo' | 'team';
  teamSize: number;
  region: 'LATAM' | 'NA' | 'EU' | 'GLOBAL';
  entryFee: string;
  entryFeeAmount?: number;
  prizePool: string;
  prizeDistribution: { place: string; prize: string }[];
  maxParticipants: number;
  startDate: string;
  checkInOpensAt: string;
  checkInClosesAt: string;
  checkInActive: boolean;
  description: string;
  rules: string[];
  schedule: { stage: string; time: string; format: string }[];
  participants: Participant[];
  rounds: TournamentRound[];
  losersRounds?: TournamentRound[];
  grandFinal?: TournamentMatch;
  isHidden?: boolean;
}

export type UserRole = 'player' | 'organizer';
