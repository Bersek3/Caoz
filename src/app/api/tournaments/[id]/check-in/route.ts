import { NextResponse } from 'next/server';
import { initDb, withDbTransaction } from '@/lib/db';
import { getMatchViewer, ownsMatchParticipant } from '@/lib/matchAccess';
import { getCheckInWindow, parseTournamentDate } from '@/lib/dateUtils';
import { CompetitionError } from '@/lib/tournamentCompetition';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const viewer = await getMatchViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Inicia sesión para confirmar tu asistencia.' }, { status: 401 });
    const { id } = await params;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    const result = await withDbTransaction(async db => {
      const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 OR slug=$1 FOR UPDATE', [id])).rows[0];
      if (!tournament) throw new CompetitionError('Torneo no encontrado.', 404);
      const now = new Date();
      if (body.action !== undefined) {
        if (viewer.role !== 'admin') throw new CompetitionError('Solo el staff puede abrir o cerrar el check-in.', 403);
        if (!['open','close'].includes(body.action)) throw new CompetitionError('Acción de check-in inválida.');
        if (!['registration_open','check_in'].includes(tournament.status)) throw new CompetitionError('El torneo ya comenzó o finalizó.', 409);
        if (body.action === 'open') {
          const start = parseTournamentDate(tournament.start_date);
          if (!start || start.getTime() <= now.getTime()) throw new CompetitionError('Configura una fecha de inicio futura antes de abrir el check-in.', 409);
          const window = getCheckInWindow({ startDate: tournament.start_date, checkInOpensAt: tournament.check_in_opens_at,
            checkInClosesAt: tournament.check_in_closes_at, status: tournament.status, checkInActive: tournament.check_in_active });
          const closesAt = window.closesAt && window.closesAt.getTime() > now.getTime() ? window.closesAt : start;
          await db.query("UPDATE tournaments SET status='check_in',check_in_active=true,check_in_opens_at=$1,check_in_closes_at=$2 WHERE id=$3",
            [now.toISOString(),closesAt.toISOString(),tournament.id]);
          return { success: true, message: 'Check-in abierto. Las inscripciones están cerradas.' };
        }
        if (tournament.status !== 'check_in') throw new CompetitionError('Primero abre el check-in.', 409);
        await db.query('UPDATE tournaments SET check_in_active=false,check_in_closes_at=$1 WHERE id=$2', [now.toISOString(),tournament.id]);
        return { success: true, message: 'Check-in cerrado. Ya puedes sortear las llaves de los participantes confirmados.' };
      }
      if (tournament.is_hidden) throw new CompetitionError('Este torneo no está disponible.', 404);
      const window = getCheckInWindow({ startDate: tournament.start_date, checkInOpensAt: tournament.check_in_opens_at,
        checkInClosesAt: tournament.check_in_closes_at, status: tournament.status, checkInActive: tournament.check_in_active });
      if (!window.isOpen) throw new CompetitionError(window.hasClosed ? 'El plazo de check-in ya terminó.' : 'El check-in todavía no está abierto.', 409);
      if (typeof body.participantId !== 'string' || !body.participantId) throw new CompetitionError('Selecciona tu inscripción para confirmar asistencia.');
      const participant = (await db.query('SELECT * FROM tournament_participants WHERE id=$1 AND tournament_id=$2', [body.participantId,tournament.id])).rows[0];
      if (!participant) throw new CompetitionError('Inscripción no encontrada.', 404);
      if (viewer.role !== 'admin' && !ownsMatchParticipant(viewer, participant)) throw new CompetitionError('Solo puedes confirmar la asistencia de tu inscripción.', 403);
      await db.query('UPDATE tournament_participants SET checked_in=true WHERE id=$1 AND tournament_id=$2', [participant.id,tournament.id]);
      return { success: true, message: participant.checked_in ? 'Tu asistencia ya estaba confirmada.' : '¡Asistencia confirmada!' };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CompetitionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'No se pudo confirmar el check-in. Inténtalo de nuevo.' }, { status: 500 });
  }
}
