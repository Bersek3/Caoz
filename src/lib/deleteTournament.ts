import { withDbTransaction } from './db';
import { flowRequest, validFlowToken, FlowPaymentStatus } from './flow';

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
      for (const payment of payments) {
        if (payment.provider !== 'flow' || payment.status !== 'failed' || payment.participant_id) throw new TournamentDeleteError('Este torneo tiene pagos aprobados, pendientes o sin resolver. Puedes ocultarlo; solo se eliminan torneos sin cobros y con intentos fallidos verificados.', 409);
        const absentOrder = payment.archived_at && payment.archive_reason === 'flow_order_not_found_admin_verified' && !payment.provider_uuid && !payment.provider_order && !payment.checkout_url;
        let flowOrder: string | null = null;
        let flowStatus: number | null = null;
        if (!absentOrder) {
          let order: FlowPaymentStatus;
          try {
            if (payment.provider_uuid && !validFlowToken(payment.provider_uuid)) throw new Error('Invalid token');
            order = payment.provider_uuid
              ? await flowRequest<FlowPaymentStatus>('payment/getStatus', { token: payment.provider_uuid })
              : await flowRequest<FlowPaymentStatus>('payment/getStatusByCommerceId', { commerceId: payment.id });
          } catch {
            throw new TournamentDeleteError('No se pudo verificar el rechazo con Flow. Se conserva el torneo sin cambios; vuelve a intentarlo más tarde.', 503);
          }
          const amount = typeof order.amount === 'string' && /^(?:0|[1-9]\d*)(?:\.0+)?$/.test(order.amount) ? Number(order.amount) : order.amount;
          if (order.commerceOrder !== payment.id || !Number.isSafeInteger(amount) || amount !== payment.amount || order.currency !== 'CLP' || !Number.isSafeInteger(order.flowOrder) || order.flowOrder <= 0 || (payment.provider_order && payment.provider_order !== String(order.flowOrder)) || ![3,4].includes(order.status)) {
            throw new TournamentDeleteError('Flow no confirma que todos los pagos estén rechazados o anulados. No se ha eliminado el torneo.', 409);
          }
          flowOrder = String(order.flowOrder);
          flowStatus = order.status;
        }
        await tx.query(`INSERT INTO removed_tournament_payment_attempts
          (payment_id,tournament_id,tournament_title,user_id,amount,currency,provider,archive_reason,archived_at,archived_by,created_at,removed_by,provider_order,provider_status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz,CURRENT_TIMESTAMP),$10,$11,$12,$13,$14)`,
        [payment.id,tournament.id,tournament.title,payment.user_id,payment.amount,payment.currency,payment.provider,absentOrder?payment.archive_reason:'flow_unpaid_terminal_verified_on_delete',payment.archived_at,payment.archived_by||administratorId,payment.created_at,administratorId,flowOrder,flowStatus]);
      }
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
