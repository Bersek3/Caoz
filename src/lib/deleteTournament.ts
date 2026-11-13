import { withDbTransaction } from './db';

export class TournamentDeleteError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function deleteTournaments(id: string, all: boolean, administratorId: string) {
  return withDbTransaction(async tx => {
    // Serialize with registration, provider callbacks and administrator payment reviews.
    const tournaments = (await tx.query('SELECT id,title FROM tournaments WHERE ($1::boolean OR id=$2 OR slug=$2) ORDER BY id FOR UPDATE', [all,id])).rows;
    if (!all && !tournaments.length) throw new TournamentDeleteError('Torneo no encontrado.', 404);
    for (const tournament of tournaments) {
      const payments = (await tx.query('SELECT * FROM tournament_payments WHERE tournament_id=$1 ORDER BY id FOR UPDATE', [tournament.id])).rows;
      const protectedHistory = payments.some(payment => payment.provider !== 'flow' || payment.status !== 'failed' || !payment.archived_at || payment.archive_reason !== 'flow_order_not_found_admin_verified' || payment.provider_uuid || payment.provider_order || payment.participant_id || payment.checkout_url);
      if (protectedHistory) throw new TournamentDeleteError('Este torneo tiene pagos pendientes, cobros o historial de órdenes del proveedor. Resuelve los intentos fallidos sin orden con «Revisar y archivar», o utiliza Ocultar para conservar los registros.', 409);
      await tx.query(`INSERT INTO removed_tournament_payment_attempts
        (payment_id,tournament_id,tournament_title,user_id,amount,currency,provider,archive_reason,archived_at,archived_by,created_at,removed_by)
        SELECT p.id,p.tournament_id,$2,p.user_id,p.amount,p.currency,p.provider,p.archive_reason,p.archived_at,p.archived_by,p.created_at,$3
        FROM tournament_payments p WHERE p.tournament_id=$1`, [tournament.id,tournament.title,administratorId]);
      await tx.query('DELETE FROM tournament_payments WHERE tournament_id=$1', [tournament.id]);
      await tx.query('DELETE FROM match_messages WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id=$1)', [tournament.id]);
      await tx.query('DELETE FROM tournament_matches WHERE tournament_id=$1', [tournament.id]);
      await tx.query('DELETE FROM tournament_rounds WHERE tournament_id=$1', [tournament.id]);
      await tx.query('DELETE FROM tournament_participants WHERE tournament_id=$1', [tournament.id]);
      await tx.query('DELETE FROM tournaments WHERE id=$1', [tournament.id]);
    }
    return tournaments.length;
  });
}
