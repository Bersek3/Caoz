import { GameInfo, Tournament } from '../types/tournament';

export const POPULAR_GAMES: GameInfo[] = [
  {
    id: 'fortnite',
    name: 'Fortnite',
    genre: 'Battle Royale',
    publisher: 'Epic Games',
    defaultTeamSize: 1,
    coverImage: '/assets/fortnite.svg',
    bannerImage: '/assets/fortnite.svg',
    tagFieldLabel: 'Epic Games ID',
    tagPlaceholder: 'TuUsuarioEpic'
  },
  {
    id: 'pubg',
    name: 'PUBG: BATTLEGROUNDS',
    genre: 'Battle Royale',
    publisher: 'KRAFTON',
    defaultTeamSize: 4,
    coverImage: '/assets/pubg.svg',
    bannerImage: '/assets/pubg.svg',
    tagFieldLabel: 'Nombre de jugador en PUBG',
    tagPlaceholder: 'TuUsuarioPUBG'
  },
  {
    id: 'valorant',
    name: 'Valorant',
    genre: 'Tactical FPS',
    publisher: 'Riot Games',
    defaultTeamSize: 5,
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    tagFieldLabel: 'Riot ID',
    tagPlaceholder: 'Jugador#LAS'
  },
  {
    id: 'league-of-legends',
    name: 'League of Legends',
    genre: 'MOBA',
    publisher: 'Riot Games',
    defaultTeamSize: 5,
    coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1600&auto=format&fit=crop',
    tagFieldLabel: 'Summoner Name & Tag',
    tagPlaceholder: 'Faker#T1'
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    genre: 'Tactical FPS',
    publisher: 'Valve',
    defaultTeamSize: 5,
    coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1600&auto=format&fit=crop',
    tagFieldLabel: 'Steam ID / Trade URL',
    tagPlaceholder: 'STEAM_0:1:12345678'
  },
  {
    id: 'ea-fc-25',
    name: 'EA SPORTS FC 25',
    genre: 'Sports / Soccer',
    publisher: 'EA Sports',
    defaultTeamSize: 1,
    coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop',
    tagFieldLabel: 'EA Account ID',
    tagPlaceholder: 'ProPlayer_FC'
  },
  {
    id: 'rocket-league',
    name: 'Rocket League',
    genre: 'Vehicular Soccer',
    publisher: 'Psyonix / Epic Games',
    defaultTeamSize: 3,
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
    tagFieldLabel: 'Epic Games ID',
    tagPlaceholder: 'SupersonicRocket'
  },
  {
    id: 'street-fighter-6',
    name: 'Street Fighter 6',
    genre: 'Fighting',
    publisher: 'Capcom',
    defaultTeamSize: 1,
    coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    tagFieldLabel: 'Capcom Fighters ID (CFN)',
    tagPlaceholder: 'RyuMaster_SF'
  }
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'trn-valorant-latam-clash',
    title: 'VALORANT LATAM Masters Series - Season 4',
    slug: 'valorant-latam-masters-s4',
    gameId: 'valorant',
    gameName: 'Valorant',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    organizer: {
      name: 'CAOZ Esports League',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop',
      verified: true,
      followers: 12450
    },
    status: 'in_progress',
    format: 'single_elimination',
    teamType: 'team',
    teamSize: 5,
    region: 'LATAM',
    entryFee: 'Gratis',
    prizePool: '$1,500 USD + Riot Points',
    prizeDistribution: [
      { place: '1er Lugar (Campeón)', prize: '$1,000 USD + Trofeo Físico + 15,000 VP' },
      { place: '2do Lugar (Subcampeón)', prize: '$350 USD + 7,500 VP' },
      { place: '3er Lugar', prize: '$150 USD + 2,500 VP' }
    ],
    maxParticipants: 8,
    startDate: 'Hoy, 20:00 GMT-3',
    checkInOpensAt: 'Hoy, 19:15 GMT-3',
    checkInClosesAt: 'Hoy, 19:55 GMT-3',
    checkInActive: false,
    description: 'El torneo insignia de Valorant en Latinoamérica Sur y Norte. 8 escuadras de élite compitiendo en formato Eliminación Directa. Todas las partidas al mejor de 3 (BO3) y Gran Final BO5.',
    rules: [
      'Todos los equipos deben contar con un mínimo de 5 jugadores titulares registrados.',
      'Check-in obligatorio 45 minutos antes de la hora estipulada.',
      'Modo de juego: Torneo Estándar, Servidor Santiago / Miami (según consenso ping).',
      'Desconexiones: Tiempo técnico de máximo 10 minutos por equipo.',
      'Es obligatorio subir captura de pantalla de la pantalla de victoria/derrota al finalizar la partida.',
      'Cualquier actitud antideportiva o insulto en el chat del torneo resultará en descalificación inmediata.'
    ],
    schedule: [
      { stage: 'Check-in y Confirmación', time: '19:15 - 19:55 GMT-3', format: 'Automático' },
      { stage: 'Cuartos de Final (Round 1)', time: '20:00 GMT-3', format: 'Best of 3 (BO3)' },
      { stage: 'Semifinales (Round 2)', time: '22:00 GMT-3', format: 'Best of 3 (BO3)' },
      { stage: 'Gran Final', time: '00:00 GMT-3', format: 'Best of 5 (BO5)' }
    ],
    participants: [
      {
        id: 'team-krü',
        name: 'KRÜ Esports Academy',
        tag: 'KRU',
        avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop',
        seed: 1,
        checkedIn: true,
        registeredAt: 'Ayer, 14:20',
        captain: { name: 'Klaus', discord: 'klaus_vlr#0001', inGameId: 'KRU Klaus#LAS', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: [
          { id: 'p1', name: 'Klaus', inGameId: 'KRU Klaus#LAS', role: 'captain', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
          { id: 'p2', name: 'Melser', inGameId: 'KRU Melser#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
          { id: 'p3', name: 'KeznitdeUS', inGameId: 'KRU Keznit#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop' },
          { id: 'p4', name: 'Shyy', inGameId: 'KRU Shyy#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop' },
          { id: 'p5', name: 'Heat', inGameId: 'KRU Heat#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop' }
        ]
      },
      {
        id: 'team-lev',
        name: 'Leviatán Talents',
        tag: 'LEV',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
        seed: 2,
        checkedIn: true,
        registeredAt: 'Ayer, 16:45',
        captain: { name: 'Kingg', discord: 'kingg_lev#1234', inGameId: 'LEV kingg#LATAM', avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?q=80&w=200&auto=format&fit=crop' },
        roster: [
          { id: 'p6', name: 'Kingg', inGameId: 'LEV kingg#LATAM', role: 'captain', avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?q=80&w=200&auto=format&fit=crop' },
          { id: 'p7', name: 'Aspas_Fan', inGameId: 'LEV Clone#BR', role: 'starter', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
          { id: 'p8', name: 'Mazino', inGameId: 'LEV Mazino#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
          { id: 'p9', name: 'C0M', inGameId: 'LEV Corbin#NA', role: 'starter', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop' },
          { id: 'p10', name: 'Tex', inGameId: 'LEV Tex#NA', role: 'starter', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop' }
        ]
      },
      {
        id: 'team-9z',
        name: '9z Team Violet',
        tag: '9Z',
        avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop',
        seed: 3,
        checkedIn: true,
        registeredAt: 'Ayer, 18:10',
        captain: { name: 'Mizu', discord: 'mizu9z#9999', inGameId: '9z Mizu#LAS', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
        roster: [
          { id: 'p11', name: 'Mizu', inGameId: '9z Mizu#LAS', role: 'captain', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
          { id: 'p12', name: 'Toli', inGameId: '9z Toli#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop' },
          { id: 'p13', name: 'Deigara', inGameId: '9z Deigara#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop' },
          { id: 'p14', name: 'Ruben', inGameId: '9z Ruben#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop' },
          { id: 'p15', name: 'Blink', inGameId: '9z Blink#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop' }
        ]
      },
      {
        id: 'team-furious',
        name: 'Furious Gaming Red',
        tag: 'FG',
        avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop',
        seed: 4,
        checkedIn: true,
        registeredAt: 'Ayer, 20:00',
        captain: { name: 'Ignis', discord: 'ignisfg#2222', inGameId: 'FG Ignis#LAS', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop' },
        roster: [
          { id: 'p16', name: 'Ignis', inGameId: 'FG Ignis#LAS', role: 'captain', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop' },
          { id: 'p17', name: 'Shadow', inGameId: 'FG Shadow#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
          { id: 'p18', name: 'Vortex', inGameId: 'FG Vortex#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop' },
          { id: 'p19', name: 'Aero', inGameId: 'FG Aero#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop' },
          { id: 'p20', name: 'Nova', inGameId: 'FG Nova#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop' }
        ]
      },
      {
        id: 'team-isurus',
        name: 'Isurus Gaming Sharks',
        tag: 'ISG',
        avatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=200&auto=format&fit=crop',
        seed: 5,
        checkedIn: true,
        registeredAt: 'Hoy, 10:15',
        captain: { name: 'Tiburón', discord: 'tiburon#3333', inGameId: 'ISG Shark#LAS', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'team-infinity',
        name: 'Infinity Esports Prime',
        tag: 'INF',
        avatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?q=80&w=200&auto=format&fit=crop',
        seed: 6,
        checkedIn: true,
        registeredAt: 'Hoy, 11:30',
        captain: { name: 'Solar', discord: 'solar#4444', inGameId: 'INF Solar#LAN', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'team-allknights',
        name: 'All Knights Royal',
        tag: 'AK',
        avatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=200&auto=format&fit=crop',
        seed: 7,
        checkedIn: true,
        registeredAt: 'Hoy, 12:00',
        captain: { name: 'Knight', discord: 'knight#5555', inGameId: 'AK Lancelot#LAS', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'team-caoz-wolves',
        name: 'Caoz Cyber Wolves',
        tag: 'CAOZ',
        avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200&auto=format&fit=crop',
        seed: 8,
        checkedIn: true,
        registeredAt: 'Hoy, 13:10',
        captain: { name: 'Francisco Bersek', discord: 'bersek#1106', inGameId: 'Caoz Bersek#LAS', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: [
          { id: 'p21', name: 'Francisco Bersek', inGameId: 'Caoz Bersek#LAS', role: 'captain', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
          { id: 'p22', name: 'ViperX', inGameId: 'Caoz Viper#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
          { id: 'p23', name: 'ApexPhantom', inGameId: 'Caoz Phantom#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop' },
          { id: 'p24', name: 'Spectre', inGameId: 'Caoz Spectre#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop' },
          { id: 'p25', name: 'Titan', inGameId: 'Caoz Titan#LAS', role: 'starter', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop' }
        ]
      }
    ],
    rounds: [
      {
        roundIndex: 0,
        title: 'Cuartos de Final (BO3)',
        bracketType: 'winners',
        matches: [
          {
            id: 'm-qf-1',
            roundIndex: 0,
            roundTitle: 'Cuartos de Final',
            matchIndex: 0,
            bracketType: 'winners',
            team1: { participantId: 'team-krü', name: 'KRÜ Esports Academy', score: 2, isWinner: true, seed: 1, avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'team-caoz-wolves', name: 'Caoz Cyber Wolves', score: 1, isWinner: false, seed: 8, avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200&auto=format&fit=crop' },
            status: 'completed',
            winnerId: 'team-krü',
            bestOf: 3,
            scheduledTime: '20:00 GMT-3',
            proofImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
            chatMessages: [
              { id: 'c1', senderName: 'Klaus', senderRole: 'team1', message: '¡Buenas noches muchachos! Listos en el lobby personalizado.', timestamp: '19:55' },
              { id: 'c2', senderName: 'Francisco Bersek', senderRole: 'team2', message: 'Buenas noches, dentro del lobby. Suerte!', timestamp: '19:57' },
              { id: 'c3', senderName: 'Klaus', senderRole: 'team1', message: 'GG gran serie, 2-1 muy peleado!', timestamp: '21:10' }
            ]
          },
          {
            id: 'm-qf-2',
            roundIndex: 0,
            roundTitle: 'Cuartos de Final',
            matchIndex: 1,
            bracketType: 'winners',
            team1: { participantId: 'team-furious', name: 'Furious Gaming Red', score: 2, isWinner: true, seed: 4, avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'team-isurus', name: 'Isurus Gaming Sharks', score: 0, isWinner: false, seed: 5, avatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=200&auto=format&fit=crop' },
            status: 'completed',
            winnerId: 'team-furious',
            bestOf: 3,
            scheduledTime: '20:00 GMT-3',
            chatMessages: []
          },
          {
            id: 'm-qf-3',
            roundIndex: 0,
            roundTitle: 'Cuartos de Final',
            matchIndex: 2,
            bracketType: 'winners',
            team1: { participantId: 'team-lev', name: 'Leviatán Talents', score: 1, isWinner: false, seed: 2, avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'team-allknights', name: 'All Knights Royal', score: 1, isWinner: false, seed: 7, avatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=200&auto=format&fit=crop' },
            status: 'in_progress',
            bestOf: 3,
            scheduledTime: '20:00 GMT-3',
            chatMessages: [
              { id: 'c4', senderName: 'Kingg', senderRole: 'team1', message: 'Empatados 1 a 1, vamos a Bind mapa decisivo.', timestamp: '21:30' },
              { id: 'c5', senderName: 'Knight', senderRole: 'team2', message: 'Listos, reiniciando lobby!', timestamp: '21:32' }
            ]
          },
          {
            id: 'm-qf-4',
            roundIndex: 0,
            roundTitle: 'Cuartos de Final',
            matchIndex: 3,
            bracketType: 'winners',
            team1: { participantId: 'team-9z', name: '9z Team Violet', score: 0, seed: 3, avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'team-infinity', name: 'Infinity Esports Prime', score: 0, seed: 6, avatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?q=80&w=200&auto=format&fit=crop' },
            status: 'ready',
            bestOf: 3,
            scheduledTime: '20:00 GMT-3',
            chatMessages: []
          }
        ]
      },
      {
        roundIndex: 1,
        title: 'Semifinales (BO3)',
        bracketType: 'winners',
        matches: [
          {
            id: 'm-sf-1',
            roundIndex: 1,
            roundTitle: 'Semifinales',
            matchIndex: 0,
            bracketType: 'winners',
            team1: { participantId: 'team-krü', name: 'KRÜ Esports Academy', score: 0, seed: 1, avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'team-furious', name: 'Furious Gaming Red', score: 0, seed: 4, avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop' },
            status: 'ready',
            bestOf: 3,
            scheduledTime: '22:00 GMT-3',
            chatMessages: [
              { id: 'c6', senderName: 'Sistema Torneo', senderRole: 'system', message: 'Matchroom abierto. Ambos equipos pueden coordinar el veto de mapas en este chat.', timestamp: '21:40' }
            ]
          },
          {
            id: 'm-sf-2',
            roundIndex: 1,
            roundTitle: 'Semifinales',
            matchIndex: 1,
            bracketType: 'winners',
            team1: { name: 'Ganador QF3', score: 0 },
            team2: { name: 'Ganador QF4', score: 0 },
            status: 'pending',
            bestOf: 3,
            scheduledTime: '22:00 GMT-3',
            chatMessages: []
          }
        ]
      },
      {
        roundIndex: 2,
        title: 'Gran Final (BO5)',
        bracketType: 'winners',
        matches: [
          {
            id: 'm-gf-1',
            roundIndex: 2,
            roundTitle: 'Gran Final',
            matchIndex: 0,
            bracketType: 'winners',
            team1: { name: 'Finalista 1', score: 0 },
            team2: { name: 'Finalista 2', score: 0 },
            status: 'pending',
            bestOf: 5,
            scheduledTime: '00:00 GMT-3',
            chatMessages: []
          }
        ]
      }
    ]
  },
  {
    id: 'trn-lol-summoners-cup',
    title: 'League of Legends: Summoner Crown Cup',
    slug: 'lol-summoner-crown-cup',
    gameId: 'league-of-legends',
    gameName: 'League of Legends',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1600&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
    organizer: {
      name: 'Riot Community Partner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      verified: true,
      followers: 8400
    },
    status: 'check_in',
    format: 'single_elimination',
    teamType: 'team',
    teamSize: 5,
    region: 'LATAM',
    entryFee: 'Gratis',
    prizePool: '$800 USD + Skins Riot',
    prizeDistribution: [
      { place: '1er Lugar', prize: '$500 USD + 5x Skins Legendarias' },
      { place: '2do Lugar', prize: '$300 USD + 5x Cofres Hextech' }
    ],
    maxParticipants: 16,
    startDate: 'Hoy, 21:00 GMT-3',
    checkInOpensAt: 'Ahora activo',
    checkInClosesAt: 'En 35 minutos',
    checkInActive: true,
    description: 'Torneo abierto de League of Legends en Servidor LAS. Fase de Check-In actualmente en curso. Asegura el slot de tu equipo haciendo check-in antes de que cierre la ventana.',
    rules: [
      'Nivel de cuenta mínimo requerido: Nivel 30 con al menos 20 campeones desbloqueados.',
      'Partidas jugadas en Mapa Grieta del Invocador en Modo Reclutamiento de Torneo.',
      'Check-in activo hasta 10 minutos antes del inicio de la primera ronda.'
    ],
    schedule: [
      { stage: 'Check-In', time: '20:15 - 20:50 GMT-3', format: 'Confirmación de asistencia' },
      { stage: 'Octavos de Final', time: '21:00 GMT-3', format: 'BO1' },
      { stage: 'Cuartos de Final', time: '22:00 GMT-3', format: 'BO1' },
      { stage: 'Semifinales y Final', time: '23:00 GMT-3', format: 'BO3' }
    ],
    participants: [
      {
        id: 'team-baron',
        name: 'Baron Nashor Slayers',
        tag: 'BNS',
        avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop',
        seed: 1,
        checkedIn: true,
        registeredAt: 'Hoy, 18:00',
        captain: { name: 'MidKing', discord: 'midking#1111', inGameId: 'BNS Mid#LAS', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'team-dragon',
        name: 'Elder Drake Hunters',
        tag: 'EDH',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
        seed: 2,
        checkedIn: false,
        registeredAt: 'Hoy, 18:15',
        captain: { name: 'JungleGod', discord: 'jg_edh#2222', inGameId: 'EDH Smite#LAS', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
        roster: []
      }
    ],
    rounds: []
  },
  {
    id: 'trn-ea-fc-champions',
    title: 'EA SPORTS FC 25 - Ultimate Pro Series 1v1',
    slug: 'ea-fc-25-ultimate-pro-series',
    gameId: 'ea-fc-25',
    gameName: 'EA SPORTS FC 25',
    bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    organizer: {
      name: 'South American Esports Club',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      verified: true,
      followers: 18900
    },
    status: 'registration_open',
    format: 'single_elimination',
    teamType: 'solo',
    teamSize: 1,
    region: 'GLOBAL',
    entryFee: 'Gratis',
    prizePool: '$1,000 USD en Efectivo',
    prizeDistribution: [
      { place: '1er Lugar', prize: '$700 USD' },
      { place: '2do Lugar', prize: '$200 USD' },
      { place: '3er Lugar', prize: '$100 USD' }
    ],
    maxParticipants: 16,
    startDate: 'Mañana, 18:00 GMT-3',
    checkInOpensAt: 'Mañana, 17:15 GMT-3',
    checkInClosesAt: 'Mañana, 17:55 GMT-3',
    checkInActive: false,
    description: 'Compite 1v1 en EA FC 25 en modalidad Amistoso Online. Demuestra tu jerarquía en la cancha virtual con premios directos en efectivo.',
    rules: [
      'Duración de mitad: 6 minutos.',
      'Controles: Cualquiera.',
      'Velocidad de juego: Normal.',
      'Tipo de plantilla: 95 Overall / Estándar balanceado.',
      'En caso de empate en 90 min: Prórroga clásica y Penales.'
    ],
    schedule: [
      { stage: 'Check-In', time: '17:15 GMT-3', format: 'Confirmación' },
      { stage: 'Ronda 1 a Cuartos', time: '18:00 GMT-3', format: 'Partido único' },
      { stage: 'Semifinal y Final', time: '20:30 GMT-3', format: 'Ida y Vuelta (Global)' }
    ],
    participants: [
      {
        id: 'p-golazo',
        name: 'Matías Golazo',
        tag: 'GOL',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
        seed: 1,
        checkedIn: false,
        registeredAt: 'Hoy, 09:00',
        captain: { name: 'Matías Golazo', discord: 'matias#9090', inGameId: 'MatiasG_FC25', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'p-chilena',
        name: 'Rodrigo CR7',
        tag: 'CR7',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
        seed: 2,
        checkedIn: false,
        registeredAt: 'Hoy, 10:45',
        captain: { name: 'Rodrigo CR7', discord: 'rodri#7777', inGameId: 'RodriCR7_EA', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
        roster: []
      }
    ],
    rounds: []
  },
  {
    id: 'trn-cs2-retake-cup',
    title: 'Counter-Strike 2: Double Elimination Cup',
    slug: 'cs2-double-elimination-cup',
    gameId: 'cs2',
    gameName: 'Counter-Strike 2',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1600&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
    organizer: {
      name: 'CS2 Competitive Hub',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop',
      verified: true,
      followers: 14200
    },
    status: 'in_progress',
    format: 'double_elimination',
    teamType: 'team',
    teamSize: 5,
    region: 'LATAM',
    entryFee: '$10 USD / Equipo',
    prizePool: '$2,000 USD',
    prizeDistribution: [
      { place: '1er Lugar', prize: '$1,300 USD' },
      { place: '2do Lugar', prize: '$500 USD' },
      { place: '3er Lugar', prize: '$200 USD' }
    ],
    maxParticipants: 8,
    startDate: 'En juego ahora',
    checkInOpensAt: 'Finalizado',
    checkInClosesAt: 'Finalizado',
    checkInActive: false,
    description: 'Torneo de CS2 en formato Doble Eliminación (con Upper Bracket y Lower Bracket). Los equipos tienen una segunda oportunidad en el cuadro de perdedores.',
    rules: [
      'Configuración competitiva MR12 oficial con tiempos suplementarios OT MR3.',
      'Anticheat obligatorio activado durante todos los encuentros.',
      'Veto de mapas realizado en la sala de match de la plataforma.'
    ],
    schedule: [
      { stage: 'Upper Bracket R1', time: '17:00 GMT-3', format: 'BO1' },
      { stage: 'Lower Bracket R1', time: '18:30 GMT-3', format: 'BO1' },
      { stage: 'Finales de Cuadros', time: '20:00 GMT-3', format: 'BO3' },
      { stage: 'Gran Final', time: '22:30 GMT-3', format: 'BO3 con ventaja de mapa' }
    ],
    participants: [
      {
        id: 'cs-t1',
        name: 'MIBR Youngsters',
        tag: 'MIBR',
        avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop',
        seed: 1,
        checkedIn: true,
        registeredAt: 'Ayer',
        captain: { name: 'brnz4n', discord: 'brnz#0001', inGameId: 'STEAM_0:1:998877', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'cs-t2',
        name: 'Imperial Fe',
        tag: 'IMP',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
        seed: 2,
        checkedIn: true,
        registeredAt: 'Ayer',
        captain: { name: 'Aidy', discord: 'aidy#0002', inGameId: 'STEAM_0:1:445566', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'cs-t3',
        name: 'Bestia Academy',
        tag: 'BST',
        avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop',
        seed: 3,
        checkedIn: true,
        registeredAt: 'Ayer',
        captain: { name: 'Pino', discord: 'pino#0003', inGameId: 'STEAM_0:1:223344', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'cs-t4',
        name: 'Sharks Esports',
        tag: 'SHK',
        avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop',
        seed: 4,
        checkedIn: true,
        registeredAt: 'Ayer',
        captain: { name: 'Gafolo', discord: 'gaf#0004', inGameId: 'STEAM_0:1:112233', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
        roster: []
      }
    ],
    rounds: [
      {
        roundIndex: 0,
        title: 'Upper Bracket Semis (BO1)',
        bracketType: 'winners',
        matches: [
          {
            id: 'cs-ub-1',
            roundIndex: 0,
            roundTitle: 'Upper Semis',
            matchIndex: 0,
            bracketType: 'winners',
            team1: { participantId: 'cs-t1', name: 'MIBR Youngsters', score: 13, isWinner: true, seed: 1, avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'cs-t4', name: 'Sharks Esports', score: 9, isWinner: false, seed: 4, avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop' },
            status: 'completed',
            winnerId: 'cs-t1',
            bestOf: 1,
            scheduledTime: '17:00 GMT-3',
            chatMessages: []
          },
          {
            id: 'cs-ub-2',
            roundIndex: 0,
            roundTitle: 'Upper Semis',
            matchIndex: 1,
            bracketType: 'winners',
            team1: { participantId: 'cs-t2', name: 'Imperial Fe', score: 11, isWinner: false, seed: 2, avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'cs-t3', name: 'Bestia Academy', score: 13, isWinner: true, seed: 3, avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop' },
            status: 'completed',
            winnerId: 'cs-t3',
            bestOf: 1,
            scheduledTime: '17:00 GMT-3',
            chatMessages: []
          }
        ]
      },
      {
        roundIndex: 1,
        title: 'Upper Bracket Final (BO3)',
        bracketType: 'winners',
        matches: [
          {
            id: 'cs-ub-final',
            roundIndex: 1,
            roundTitle: 'Upper Final',
            matchIndex: 0,
            bracketType: 'winners',
            team1: { participantId: 'cs-t1', name: 'MIBR Youngsters', score: 1, seed: 1, avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'cs-t3', name: 'Bestia Academy', score: 1, seed: 3, avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop' },
            status: 'in_progress',
            bestOf: 3,
            scheduledTime: '20:00 GMT-3',
            chatMessages: [
              { id: 'cs-c1', senderName: 'brnz4n', senderRole: 'team1', message: 'Nuke para nosotros, Mirage para ustedes. Decider Inferno!', timestamp: '20:05' }
            ]
          }
        ]
      }
    ],
    losersRounds: [
      {
        roundIndex: 0,
        title: 'Lower Bracket Round 1 (BO1)',
        bracketType: 'losers',
        matches: [
          {
            id: 'cs-lb-1',
            roundIndex: 0,
            roundTitle: 'Lower R1',
            matchIndex: 0,
            bracketType: 'losers',
            team1: { participantId: 'cs-t4', name: 'Sharks Esports', score: 13, isWinner: true, seed: 4, avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'cs-t2', name: 'Imperial Fe', score: 7, isWinner: false, seed: 2, avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
            status: 'completed',
            winnerId: 'cs-t4',
            bestOf: 1,
            scheduledTime: '18:30 GMT-3',
            chatMessages: []
          }
        ]
      },
      {
        roundIndex: 1,
        title: 'Lower Bracket Final (BO3)',
        bracketType: 'losers',
        matches: [
          {
            id: 'cs-lb-final',
            roundIndex: 1,
            roundTitle: 'Lower Final',
            matchIndex: 0,
            bracketType: 'losers',
            team1: { participantId: 'cs-t4', name: 'Sharks Esports', score: 0, seed: 4, avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop' },
            team2: { name: 'Perdedor Upper Final', score: 0 },
            status: 'pending',
            bestOf: 3,
            scheduledTime: '21:30 GMT-3',
            chatMessages: []
          }
        ]
      }
    ]
  },
  {
    id: 'trn-rocket-league-open',
    title: 'Rocket League Cyber Open 3v3',
    slug: 'rocket-league-cyber-open-3v3',
    gameId: 'rocket-league',
    gameName: 'Rocket League',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    organizer: {
      name: 'Rocket League Latam',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      verified: true,
      followers: 7800
    },
    status: 'completed',
    format: 'single_elimination',
    teamType: 'team',
    teamSize: 3,
    region: 'LATAM',
    entryFee: 'Gratis',
    prizePool: '$600 USD',
    prizeDistribution: [
      { place: '1er Lugar (Campeón)', prize: '$450 USD' },
      { place: '2do Lugar', prize: '$150 USD' }
    ],
    maxParticipants: 4,
    startDate: 'Finalizado Ayer',
    checkInOpensAt: 'Finalizado',
    checkInClosesAt: 'Finalizado',
    checkInActive: false,
    description: 'Torneo relámpago de 4 escuadras de Rocket League finalizado con éxito.',
    rules: ['Servidor SAM', 'Partidas 5 minutos sin mutadores', 'BO5 en Final'],
    schedule: [{ stage: 'Torneo Completo', time: '19:00 GMT-3', format: 'Directo' }],
    participants: [
      {
        id: 'rl-1',
        name: 'SAM Titans',
        tag: 'TIT',
        avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop',
        seed: 1,
        checkedIn: true,
        registeredAt: 'Ayer',
        captain: { name: 'Speedy', discord: 'speedy#01', inGameId: 'SpeedyRL', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        roster: []
      },
      {
        id: 'rl-2',
        name: 'Aerial Gods',
        tag: 'AG',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
        seed: 2,
        checkedIn: true,
        registeredAt: 'Ayer',
        captain: { name: 'Aero', discord: 'aero#02', inGameId: 'AeroFlip', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
        roster: []
      }
    ],
    rounds: [
      {
        roundIndex: 0,
        title: 'Gran Final (BO5)',
        bracketType: 'winners',
        matches: [
          {
            id: 'm-rl-f',
            roundIndex: 0,
            roundTitle: 'Gran Final',
            matchIndex: 0,
            bracketType: 'winners',
            team1: { participantId: 'rl-1', name: 'SAM Titans', score: 3, isWinner: true, seed: 1, avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=200&auto=format&fit=crop' },
            team2: { participantId: 'rl-2', name: 'Aerial Gods', score: 1, isWinner: false, seed: 2, avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
            status: 'completed',
            winnerId: 'rl-1',
            bestOf: 5,
            scheduledTime: '20:00 GMT-3',
            chatMessages: []
          }
        ]
      }
    ]
  }
];
