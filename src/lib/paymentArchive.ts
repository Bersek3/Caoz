import { getDb, withDbTransaction } from './db';
import { FlowApiError } from './flow';
import { reconcilePayment } from './tournamentPayments';

export class PaymentArchiveError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function archivePayment(id: string, administratorId: string, confirmedAccount: boolean) {
  const db = await getDb();
  const saved = (await db.query('SELECT * FROM tournament_payments WHERE id=$1', [id])).rows[0];
  if (!saved) throw new PaymentArchiveError('Pago no encontrado.', 404);
  if (saved.status === 'refund_required') throw new PaymentArchiveError('Resuelve la devolución pendiente antes de archivar.', 409);
  if (saved.archived_at) return;
  if (saved.provider !== 'flow') throw new PaymentArchiveError('Contacta a soporte para revisar el historial del proveedor anterior.', 409);
  if (saved.status === 'confirmed') {
    await withDbTransaction(async tx => {
      const tournament = (await tx.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [saved.tournament_id])).rows[0];
      const current = (await tx.query('SELECT * FROM tournament_payments WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (current.archived_at) return;
      if (tournament?.status !== 'completed' || current.status !== 'confirmed') throw new PaymentArchiveError('Los pagos aprobados solo se archivan cuando el torneo está finalizado.', 409);
      await tx.query("UPDATE tournament_payments SET archived_at=CURRENT_TIMESTAMP,archived_by=$2,archive_reason='completed_tournament_payment' WHERE id=$1", [id,administratorId]);
    });
    return;
  }
  let reason = 'flow_rejected_or_cancelled';
  try {
    const verified = await reconcilePayment(saved.provider_uuid || null, saved.id);
    if (verified.status !== 'failed') {
      const expired = new Date(verified.expires_at).getTime() <= Date.now();
      if (!expired || !['pending','cancelled','review'].includes(verified.status)) throw new PaymentArchiveError('La orden sigue vigente o el pago fue recibido. Consulta su detalle; no se ha archivado.', 409);
      reason = 'flow_expired_unpaid';
    }
  } catch (error) {
    if (!(error instanceof FlowApiError) || error.path !== 'payment/getStatusByCommerceId' || error.httpStatus !== 400 || error.code !== 1700) throw error;
    // A missing order is actionable only for an old creation with no provider references,
    // and an administrator who verified the account/environment have not changed.
    if (!confirmedAccount || saved.provider_uuid || saved.provider_order || !['review','creating','failed'].includes(saved.status) || new Date(saved.created_at).getTime() > Date.now() - 120000) {
      throw new PaymentArchiveError('No se pudo descartar un pago con seguridad. Verifica la cuenta y ambiente originales de Flow y espera al menos dos minutos desde el intento.', 409);
    }
    reason = 'flow_order_not_found_admin_verified';
  }
  await withDbTransaction(async tx => {
    await tx.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [saved.tournament_id]);
    const current = (await tx.query('SELECT * FROM tournament_payments WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (current.archived_at) return;
    if (reason === 'flow_order_not_found_admin_verified') {
      if (current.provider_uuid || current.provider_order || !['review','creating','failed'].includes(current.status)) throw new PaymentArchiveError('El pago cambió durante la revisión. Vuelve a consultar su estado.', 409);
    } else if (reason === 'flow_expired_unpaid') {
      if (!['pending','cancelled','review'].includes(current.status) || new Date(current.expires_at).getTime() > Date.now()) throw new PaymentArchiveError('El pago cambió durante la revisión. Vuelve a consultar su estado.', 409);
    } else if (current.status !== 'failed') throw new PaymentArchiveError('El pago cambió durante la revisión. Vuelve a consultar su estado.', 409);
    await tx.query("UPDATE tournament_payments SET status='failed',checkout_url=NULL,archived_at=CURRENT_TIMESTAMP,archived_by=$2,archive_reason=$3 WHERE id=$1", [id,administratorId,reason]);
  });
}
