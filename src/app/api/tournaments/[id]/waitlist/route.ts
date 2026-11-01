import { NextResponse } from 'next/server';
import { initDb, withDbTransaction } from '@/lib/db';
import { getMatchViewer } from '@/lib/matchAccess';
import { advanceWaitlist, joinWaitlist, ownsWaitlistEntry, WaitlistError } from '@/lib/tournamentWaitlist';

async function handle(request: Request, params: Promise<{ id: string }>) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Inicia sesión para consultar la lista de espera.' }, { status: 401 });
    const { id } = await params;
    const result = await withDbTransaction(async db => {
      const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 OR slug=$1 FOR UPDATE',[id])).rows[0];
      if (!tournament || tournament.is_hidden) throw new WaitlistError('Torneo no encontrado.',404);
      const isTeam = tournament.team_type === 'team' && Number(tournament.team_size) > 1;
      const membership = isTeam ? (await db.query(`SELECT e.id,e.captain_id FROM teams e LEFT JOIN team_members m ON m.team_id=e.id
        WHERE e.captain_id=$1 OR m.user_id=$1 LIMIT 1`,[viewer.id])).rows[0] : undefined;
      const teamId = isTeam ? membership?.id || null : null;
      if (request.method === 'DELETE') {
        await db.query('DELETE FROM tournament_waitlist WHERE tournament_id=$1 AND ((team_id IS NULL AND user_id=$2) OR ($3::text IS NOT NULL AND team_id=$3 AND $4))',
          [tournament.id,viewer.id,teamId,membership?.captain_id===viewer.id]);
      }
      if (request.method === 'POST') {
        if (tournament.status !== 'registration_open') throw new WaitlistError('La lista de espera está cerrada.',409);
        if (isTeam && (!teamId || membership?.captain_id !== viewer.id)) throw new WaitlistError('El capitán debe añadir al equipo a la lista de espera.',403);
        const accounts = isTeam ? (await db.query(`SELECT u.id,u.account_status FROM users u JOIN team_members m ON m.user_id=u.id WHERE m.team_id=$1`,[teamId])).rows :
          (await db.query('SELECT id,account_status FROM users WHERE id=$1',[viewer.id])).rows;
        if (isTeam && (accounts.length < Number(tournament.team_size) || !accounts.some(account=>account.id===viewer.id))) throw new WaitlistError('Completa el equipo y su roster antes de entrar a la lista de espera.',409);
        if (!accounts.length || accounts.some(account=>account.account_status !== 'activa')) throw new WaitlistError('Todos los participantes deben tener su cuenta habilitada antes de entrar a la lista.',403);
        const userIds = new Set(accounts.map(account=>account.id));
        const registered = (await db.query('SELECT user_id,team_id,roster FROM tournament_participants WHERE tournament_id=$1',[tournament.id])).rows;
        const rosterOverlaps = (roster: unknown) => Array.isArray(roster) && roster.some(member=>member && userIds.has(member.userId));
        if (registered.some(participant=>userIds.has(participant.user_id) || (teamId && participant.team_id===teamId) || rosterOverlaps(participant.roster))) {
          throw new WaitlistError('Tú o un integrante del equipo ya están inscritos en este torneo.',409);
        }
        const payments = (await db.query(`SELECT user_id,registration_key,registration FROM tournament_payments WHERE tournament_id=$1
          AND status IN ('creating','pending','review') AND expires_at>CURRENT_TIMESTAMP`,[tournament.id])).rows;
        if (payments.some(payment=>userIds.has(payment.user_id) || (teamId && payment.registration_key===teamId) || rosterOverlaps(payment.registration?.roster))) {
          throw new WaitlistError('Ya existe una inscripción con pago pendiente para ti o tu equipo. Revisa ese pago antes de entrar a la lista.',409);
        }
        await joinWaitlist(db,tournament.id,viewer.id,teamId);
      }
      await advanceWaitlist(db,tournament);
      const rows = (await db.query("SELECT id,user_id,team_id,status,offer_expires_at FROM tournament_waitlist WHERE tournament_id=$1 AND status IN ('waiting','offered') ORDER BY created_at,id",[tournament.id])).rows;
      const index = rows.findIndex(row=>ownsWaitlistEntry(row,viewer.id,teamId));
      return { joined:index>=0,position:index>=0?index+1:null,total:rows.length,offered:index>=0 && rows[index].status==='offered',expiresAt:index>=0?rows[index].offer_expires_at:null };
    });
    return NextResponse.json(result,{ headers:{ 'Cache-Control':'private, no-store' } });
  } catch (error) {
    if (error instanceof WaitlistError) return NextResponse.json({ error:error.message },{ status:error.status });
    console.error('Waitlist error:',error);
    return NextResponse.json({ error:'No se pudo actualizar la lista de espera. Inténtalo de nuevo.' },{ status:500 });
  }
}
export async function GET(request: Request,{ params }: { params:Promise<{ id:string }> }) { return handle(request,params); }
export async function POST(request: Request,{ params }: { params:Promise<{ id:string }> }) { return handle(request,params); }
export async function DELETE(request: Request,{ params }: { params:Promise<{ id:string }> }) { return handle(request,params); }
