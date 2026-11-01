import type { Tournament, Participant, TournamentMatch, TournamentFormat } from '@/types/tournament';
import type { AuthUser } from '@/context/AuthContext';
import { getCheckInWindow, parseTournamentDate } from './dateUtils';

export function findMyRegistration(tournament: Tournament, user: AuthUser | null | undefined): Participant | undefined {
  if (!user) return undefined;
  return tournament.participants.find(p => p.userId === user.id || Boolean(!p.roster?.length && user.team?.id && p.teamId === user.team.id) ||
    p.roster?.some(member => member.userId === user.id) ||
    (!p.userId && (p.name === user.username || p.captain?.name === user.username)));
}
export function getMyMatches(tournament: Tournament, user: AuthUser | null | undefined): TournamentMatch[] {
  const participant = findMyRegistration(tournament, user);
  if (!participant) return [];
  const matches = [...tournament.rounds, ...(tournament.losersRounds || [])].flatMap(round => round.matches);
  if (tournament.grandFinal && !matches.some(m => m.id === tournament.grandFinal!.id)) matches.push(tournament.grandFinal);
  return matches.filter(m => m.team1.participantId === participant.id || m.team2.participantId === participant.id)
    .sort((a,b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.roundIndex - b.roundIndex);
}
export function formatTournamentFormat(format: TournamentFormat | string) {
  return ({ single_elimination: 'Eliminación simple', double_elimination: 'Doble eliminación', round_robin: 'Todos contra todos', swiss: 'Sistema suizo' } as Record<string,string>)[format] || 'Formato por definir';
}
export function formatTournamentMode(tournament: Pick<Tournament, 'teamType' | 'teamSize' | 'gameId'>) {
  if (tournament.teamType === 'solo' || tournament.teamSize === 1) return 'Individual';
  if (/fortnite|pubg|warzone|apex|free.?fire/i.test(tournament.gameId)) return ({2:'Dúos',3:'Tríos',4:'Escuadras'} as Record<number,string>)[tournament.teamSize] || `Equipos de ${tournament.teamSize}`;
  return `Equipos ${tournament.teamSize}v${tournament.teamSize}`;
}
export function getTournamentAction(tournament: Tournament, user: AuthUser | null | undefined): {label:string;href:string;kind:'register'|'check_in'|'match'|'results'|'registered'|'full'|'view'} {
  const href = `/tournament/${tournament.slug}`;
  const registered = findMyRegistration(tournament,user);
  if (tournament.status === 'completed') return {label:'Ver resultados',href:href+'?tab=results',kind:'results'};
  if (registered) {
    const canCheckIn = tournament.teamType === 'solo' ? registered.userId === user?.id :
      registered.userId === user?.id || Boolean(user?.team?.is_captain || user?.team?.captain_id === user?.id);
    if (!registered.checkedIn && canCheckIn && getCheckInWindow(tournament).isOpen) return {label:'Confirmar asistencia',href:href+'?tab=overview#mi-participacion',kind:'check_in'};
    const match = getMyMatches(tournament,user).find(m => m.status !== 'completed' && m.canAccessRoom !== false && m.team1.participantId && m.team2.participantId);
    if (match && tournament.status === 'in_progress') return {label:'Ir a mi partida',href:href+'?tab=matches&match='+encodeURIComponent(match.id),kind:'match'};
    return {label:registered.checkedIn?'Asistencia confirmada':'Ver mi participación',href:href+'?tab=overview#mi-participacion',kind:'registered'};
  }
  if (tournament.status === 'registration_open') return tournament.participants.length >= tournament.maxParticipants
    ? {label:'Ver lista de espera',href:href+'?tab=overview#lista-espera',kind:'full'}
    : {label:'Inscribirme',href:href+'?tab=overview#inscripcion',kind:'register'};
  return {label:'Ver partidas',href:href+'?tab=brackets',kind:'view'};
}
export function sortTournaments(tournaments: Tournament[]) {
  const rank = { in_progress:0,check_in:1,registration_open:2,completed:3 };
  return [...tournaments].sort((a,b) => rank[a.status]-rank[b.status] ||
    (a.status==='completed' ? -1 : 1) * ((parseTournamentDate(a.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseTournamentDate(b.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)));
}
export function getFeaturedTournament(tournaments: Tournament[]) {
  const visible = tournaments.filter(t => !t.isHidden && t.status !== 'completed');
  return visible.find(t => t.isFeatured) || sortTournaments(visible)[0];
}
export function getTournamentResults(tournament: Tournament): {participant:Participant;place:number}[] {
  if (tournament.status !== 'completed') return [];
  const rounds = tournament.rounds;
  const final = tournament.grandFinal || rounds.at(-1)?.matches[0];
  if (!final || final.status !== 'completed') return [];
  const winner = tournament.championId || final.winnerId;
  const runnerUp = tournament.runnerUpId || (final.team1.participantId === winner ? final.team2.participantId : final.team1.participantId);
  const results: {participant:Participant;place:number}[] = [];
  for (const [id,place] of [[winner,1],[runnerUp,2]] as const) {
    const participant = tournament.participants.find(p => p.id === id);
    if (participant) results.push({participant,place});
  }
  for (const match of rounds.at(-2)?.matches || []) {
    if (match.status !== 'completed') continue;
    const id = match.team1.participantId === match.winnerId ? match.team2.participantId : match.team1.participantId;
    const participant = tournament.participants.find(p => p.id === id);
    if (participant && !results.some(r => r.participant.id===id)) results.push({participant,place:3});
  }
  return results;
}
const calendarEscape = (text:string) => text.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
export function downloadTournamentCalendar(tournament: Tournament) {
  const start = parseTournamentDate(tournament.startDate);
  if (!start) throw new Error('El torneo todavía no tiene una fecha confirmada.');
  const stamp = (date:Date) => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
  const url = `${window.location.origin}/tournament/${tournament.slug}`;
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CZ ARENA//Torneos//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:${tournament.id}@cz-arena`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,
    `SUMMARY:${calendarEscape(tournament.title)}`,`DESCRIPTION:${calendarEscape(tournament.description+'\n'+url)}`,`URL:${url}`,
    'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY',`DESCRIPTION:${calendarEscape('Prepara tu participación en '+tournament.title)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'];
  const folded = lines.map(line => {let result='',length=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(length+size>73){result+='\r\n ';length=1;}result+=char;length+=size;}return result;}).join('\r\n')+'\r\n';
  const blobUrl = URL.createObjectURL(new Blob([folded],{type:'text/calendar;charset=utf-8'}));
  const link = document.createElement('a');link.href=blobUrl;link.download=`${tournament.slug}.ics`;link.click();setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
}
export async function shareTournament(tournament: Tournament) {
  const url = `${window.location.origin}/tournament/${tournament.slug}`;
  if (navigator.share) {await navigator.share({title:tournament.title,url});return;}
  if (!navigator.clipboard) throw new Error('Copia el enlace desde la barra de direcciones.');
  await navigator.clipboard.writeText(url);
}
