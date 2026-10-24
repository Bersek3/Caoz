import { randomUUID, randomInt } from 'crypto';
import { DbSession } from './db';

export interface Registration {
  userId: string;
  teamId: string | null;
  name: string;
  tag: string;
  captainName: string;
  captainDiscord: string;
  captainInGameId: string;
  roster: { userId: string; username: string }[];
  personalDetails?: { fullName: string; birthDate: string; documentNumber: string; phone: string };
}

export async function insertRegistration(db: DbSession, tournamentId: string, maxParticipants: number, data: Registration) {
  const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id = $1', [tournamentId])).rows;
  if (participants.length >= maxParticipants) throw new Error('El torneo ya no tiene cupos.');
  if (participants.some(p => p.user_id === data.userId || (data.teamId && p.team_id === data.teamId) ||
    data.roster.some(member => (p.roster || []).some((registered: { userId: string }) => registered.userId === member.userId)))) {
    throw new Error('Uno de los participantes ya está inscrito.');
  }
  const availableSeeds = Array.from({ length: maxParticipants }, (_, i) => i + 1).filter(seed => !participants.some(p => p.seed === seed));
  const seed = availableSeeds[randomInt(availableSeeds.length)];
  const participantId = `part-${randomUUID()}`;
  const avatar = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';
  await db.query(`INSERT INTO tournament_participants (
    id,tournament_id,team_id,user_id,name,tag,avatar,seed,checked_in,registered_at,captain_name,captain_discord,captain_in_game_id,captain_avatar,roster
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,$11,$12,$7,$13)`, [participantId,tournamentId,data.teamId,data.userId,data.name,data.tag,avatar,seed,new Date().toISOString(),data.captainName,data.captainDiscord,data.captainInGameId,JSON.stringify(data.roster)]);
  if (data.personalDetails) {
    await db.query(`INSERT INTO tournament_registration_details (participant_id, full_name, birth_date, document_number, phone)
      VALUES ($1,$2,$3,$4,$5)`, [participantId, data.personalDetails.fullName, data.personalDetails.birthDate, data.personalDetails.documentNumber, data.personalDetails.phone]);
    await db.query('UPDATE users SET full_name=$1, birth_date=$2 WHERE id=$3', [data.personalDetails.fullName, data.personalDetails.birthDate, data.userId]);
  }
  const side = seed % 2 === 1 ? 'team1' : 'team2';
  await db.query(`UPDATE tournament_matches SET ${side}_participant_id=$1, ${side}_name=$2, ${side}_avatar=$3, ${side}_seed=$4
    WHERE tournament_id=$5 AND round_index=0 AND match_index=$6 AND bracket_type='winners'`, [participantId,data.name,avatar,seed,tournamentId,Math.floor((seed-1)/2)]);
  await db.query(`UPDATE tournament_matches SET status='ready' WHERE tournament_id=$1 AND round_index=0 AND match_index=$2 AND bracket_type='winners' AND team1_participant_id IS NOT NULL AND team2_participant_id IS NOT NULL`, [tournamentId,Math.floor((seed-1)/2)]);
  return participantId;
}
