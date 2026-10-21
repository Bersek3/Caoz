import { randomUUID } from 'crypto';
import { getDb, withDbTransaction } from './db';
import { insertRegistration, Registration } from './tournamentRegistration';
import { virtualposConfig, virtualposRequest, validateCheckoutUrl } from './virtualpos';

const activeStatuses = ['creating', 'pending', 'review'];

export async function reserveRegistration(tournamentId: string, registration: Registration, payer: { first_name: string; last_name: string; social_id: string; phone: string }) {
  const reserved = await withDbTransaction(async db => {
    const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [tournamentId])).rows[0];
    if (!tournament || tournament.status !== 'registration_open' || tournament.is_hidden) throw new Error('Las inscripciones no están abiertas.');
    const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id=$1', [tournamentId])).rows;
    if (participants.some(participant => participant.user_id === registration.userId ||
      (registration.teamId && participant.team_id === registration.teamId) ||
      (participant.roster || []).some((member: { userId: string }) => registration.roster.some(candidate => candidate.userId === member.userId)))) {
      throw new Error('El jugador o un integrante del equipo ya está inscrito en este torneo.');
    }
    const rows = (await db.query('SELECT * FROM tournament_payments WHERE tournament_id=$1', [tournamentId])).rows;
    const key = registration.teamId || registration.userId;
    const existing = rows.find(p => p.registration_key === key && (p.status === 'review' || (activeStatuses.includes(p.status) && new Date(p.expires_at).getTime() > Date.now())));
    if (existing) {
      if (existing.user_id !== registration.userId) throw new Error('Tu equipo ya tiene un pago iniciado. Debe completarlo la persona que lo inició.');
      if (!existing.checkout_url || existing.status === 'review') throw new Error('Existe un pago en preparación o revisión. Contacta al organizador antes de volver a pagar.');
      return { paymentId: existing.id, checkoutUrl: existing.checkout_url, create: false };
    }
    const count = participants.length;
    const pending = rows.filter(p => activeStatuses.includes(p.status) && new Date(p.expires_at).getTime() > Date.now());
    if (count + pending.length >= tournament.max_participants) throw new Error('No quedan cupos disponibles. Algunos pueden estar reservados por pagos pendientes.');
    if (pending.some(p => p.registration.roster.some((member: { userId: string }) => registration.roster.some(candidate => candidate.userId === member.userId)))) throw new Error('Un integrante ya tiene una inscripción pendiente de pago.');
    if (!tournament.entry_fee_amount) {
      if (!/^(gratis|free|free to play|0)$/i.test(tournament.entry_fee.trim())) throw new Error('El organizador debe configurar el precio en CLP antes de habilitar las inscripciones.');
      const participantId = await insertRegistration(db, tournamentId, tournament.max_participants, registration);
      return { participantId, create: false };
    }
    virtualposConfig();
    if (!payer.first_name?.trim() || !payer.last_name?.trim() || !/^[0-9kK.-]{8,12}$/.test(payer.social_id || '') || !/^\d{9,15}$/.test(payer.phone || '')) throw new Error('Completa nombre, apellido, RUT y teléfono del pagador.');
    const user = (await db.query('SELECT email FROM users WHERE id=$1', [registration.userId])).rows[0];
    const paymentId = `pay-${randomUUID()}`;
    await db.query(`INSERT INTO tournament_payments (id,tournament_id,user_id,registration_key,amount,registration) VALUES ($1,$2,$3,$4,$5,$6)`, [paymentId,tournamentId,registration.userId,key,tournament.entry_fee_amount,JSON.stringify(registration)]);
    return { paymentId, amount: tournament.entry_fee_amount, title: tournament.title, email: user.email, create: true };
  });
  if (!reserved.create) return reserved;
  const db = await getDb();
  try {
    const config = virtualposConfig();
    const return_url = Buffer.from(`${config.site}/api/payments/virtualpos/return?paymentId=${reserved.paymentId}`).toString('base64');
    const callback_url = Buffer.from(`${config.site}/api/payments/virtualpos/webhook?paymentId=${reserved.paymentId}`).toString('base64');
    const result = await virtualposRequest('', { first_name: payer.first_name.trim(), last_name: payer.last_name.trim(), social_id: payer.social_id, phone: payer.phone,
      email: reserved.email, amount: reserved.amount,
      description: `Inscripción ${reserved.title}`.slice(0, 200), merchant_internal_code: reserved.paymentId,
      merchant_internal_channel: 'CAOZ_ARENA', return_url, callback_url });
    const order = result.payment?.order;
    if (!order?.uuid || order.merchant_internal_code !== reserved.paymentId || Number(order.amount) !== reserved.amount) throw new Error('La respuesta del proveedor no coincide con el pedido.');
    await db.query('UPDATE tournament_payments SET provider_uuid=$1 WHERE id=$2', [order.uuid, reserved.paymentId]);
    const checkout = result.url_redirect ? result : await virtualposRequest(`${encodeURIComponent(order.uuid)}/webcheckout`, { return_url, callback_url, payment_method: 'all' });
    const checkoutUrl = validateCheckoutUrl(checkout.url_redirect);
    await db.query("UPDATE tournament_payments SET status='pending',checkout_url=$1 WHERE id=$2 AND status='creating'", [checkoutUrl,reserved.paymentId]);
    return { paymentId: reserved.paymentId, checkoutUrl };
  } catch (error) {
    // A network error can occur after the gateway created the charge. Never start another automatically.
    await db.query("UPDATE tournament_payments SET status='review' WHERE id=$1 AND status='creating'", [reserved.paymentId]);
    throw error;
  }
}

export async function reconcilePayment(uuid: string, paymentId?: string) {
  const db = await getDb();
  const saved = (await db.query('SELECT * FROM tournament_payments WHERE provider_uuid=$1 OR (id=$2 AND provider_uuid IS NULL)', [uuid,paymentId || ''])).rows[0];
  if (!saved) throw new Error('Pago no encontrado.');
  if (saved.status === 'confirmed' || saved.status === 'refund_required') return saved;
  const response = await virtualposRequest(encodeURIComponent(uuid));
  const order = response.payment?.order;
  if (order?.uuid !== uuid || order.merchant_internal_code !== saved.id || Number(order.amount) !== saved.amount) throw new Error('El pago no coincide con la inscripción.');
  return withDbTransaction(async tx => {
    // All registration paths lock tournament first, then payment, to serialize capacity and callbacks.
    const tournament = (await tx.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [saved.tournament_id])).rows[0];
    const payment = (await tx.query('SELECT * FROM tournament_payments WHERE id=$1 FOR UPDATE', [saved.id])).rows[0];
    if (payment.provider_uuid && payment.provider_uuid !== uuid) throw new Error('Referencia de pago inválida.');
    await tx.query('UPDATE tournament_payments SET provider_uuid=$1 WHERE id=$2', [uuid,saved.id]);
    if (['confirmed', 'refund_required'].includes(payment.status)) return payment;
    if (order.status === 'pagado') {
      const count = Number((await tx.query('SELECT COUNT(*) AS count FROM tournament_participants WHERE tournament_id=$1', [saved.tournament_id])).rows[0].count);
      if (new Date(payment.expires_at).getTime() < Date.now() || tournament.status !== 'registration_open' || tournament.is_hidden || count >= tournament.max_participants) {
        await tx.query("UPDATE tournament_payments SET status='refund_required' WHERE id=$1", [saved.id]);
        return { ...payment, status: 'refund_required' };
      }
      // Use a savepoint so duplicate registrations remain refundable without partial bracket changes.
      await tx.query('SAVEPOINT registration');
      try {
        const participantId = await insertRegistration(tx, tournament.id, tournament.max_participants, payment.registration);
        await tx.query("UPDATE tournament_payments SET status='confirmed',participant_id=$1 WHERE id=$2", [participantId,saved.id]);
        return { ...payment, status: 'confirmed', participant_id: participantId };
      } catch {
        await tx.query('ROLLBACK TO SAVEPOINT registration');
        await tx.query("UPDATE tournament_payments SET status='refund_required' WHERE id=$1", [saved.id]);
        return { ...payment, status: 'refund_required' };
      }
    }
    const status = ['rechazado', 'cancelado', 'expirado'].includes(order.status) ? 'failed' : 'pending';
    await tx.query('UPDATE tournament_payments SET status=$1 WHERE id=$2', [status,saved.id]);
    return { ...payment, status };
  });
}
