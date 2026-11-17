import { randomUUID } from 'crypto';
import { getDb, withDbTransaction } from './db';
import { insertRegistration, Registration } from './tournamentRegistration';
import { flowConfig, flowRequest, flowCheckoutUrl, validFlowToken, FlowPaymentStatus } from './flow';
import { assertWaitlistTurn } from './tournamentWaitlist';

const activeStatuses = ['creating', 'pending', 'review'];

export async function reserveRegistration(tournamentId: string, registration: Registration) {
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
    const cancelled = rows.find(p => p.registration_key === key && p.status === 'cancelled' && new Date(p.expires_at).getTime() > Date.now());
    if (cancelled) throw new Error('Cancelaste esta inscripción. Espera al vencimiento del enlace anterior de Flow antes de iniciar otro pago.');
    const existing = rows.find(p => p.registration_key === key && (p.status === 'review' || (activeStatuses.includes(p.status) && new Date(p.expires_at).getTime() > Date.now())));
    if (existing) {
      if (existing.provider !== 'flow') throw new Error('Existe un pago pendiente con el proveedor anterior. Contacta al organizador para resolverlo antes de pagar con Flow.');
      if (existing.user_id !== registration.userId) throw new Error('Tu equipo ya tiene un pago iniciado. Debe completarlo la persona que lo inició.');
      if (!existing.checkout_url || existing.status === 'review') throw new Error('Existe un pago en preparación o revisión. Contacta al organizador antes de volver a pagar.');
      return { paymentId: existing.id, checkoutUrl: existing.checkout_url, existingPayment: true, create: false };
    }
    const count = participants.length;
    const pending = rows.filter(p => p.status === 'review' || (activeStatuses.includes(p.status) && new Date(p.expires_at).getTime() > Date.now()));
    if (count + pending.length >= tournament.max_participants) throw new Error('No quedan cupos disponibles. Algunos pueden estar reservados por pagos pendientes.');
    await assertWaitlistTurn(db,tournament,registration.userId,registration.teamId);
    if (pending.some(p => p.registration.roster.some((member: { userId: string }) => registration.roster.some(candidate => candidate.userId === member.userId)))) throw new Error('Un integrante ya tiene una inscripción pendiente de pago.');
    if (!tournament.entry_fee_amount) {
      if (!/^(gratis|free|free to play|0)$/i.test(tournament.entry_fee.trim())) throw new Error('El organizador debe configurar el precio en CLP antes de habilitar las inscripciones.');
      const participantId = await insertRegistration(db, tournamentId, tournament.max_participants, registration);
      await db.query('DELETE FROM tournament_waitlist WHERE tournament_id=$1 AND (user_id=$2 OR ($3::text IS NOT NULL AND team_id=$3))',[tournamentId,registration.userId,registration.teamId]);
      return { participantId, create: false };
    }
    flowConfig();
    const user = (await db.query('SELECT email FROM users WHERE id=$1', [registration.userId])).rows[0];
    const paymentId = `pay-${randomUUID()}`;
    await db.query(`INSERT INTO tournament_payments (id,tournament_id,user_id,registration_key,amount,registration,provider,expires_at) VALUES ($1,$2,$3,$4,$5,$6,'flow',CURRENT_TIMESTAMP + INTERVAL '35 minutes')`, [paymentId,tournamentId,registration.userId,key,tournament.entry_fee_amount,JSON.stringify(registration)]);
    await db.query("UPDATE tournament_waitlist SET status='claimed' WHERE tournament_id=$1 AND (user_id=$2 OR ($3::text IS NOT NULL AND team_id=$3))",[tournamentId,registration.userId,registration.teamId]);
    return { paymentId, amount: tournament.entry_fee_amount, title: tournament.title, email: user.email, create: true };
  });
  if (!reserved.create) return reserved;
  const db = await getDb();
  try {
    const { site } = flowConfig();
    const createdAt = Date.now();
    const order = await flowRequest<{ url: string; token: string; flowOrder: number }>('payment/create', {
      commerceOrder: reserved.paymentId!, subject: ('Inscripci\u00f3n ' + reserved.title).slice(0, 200),
      currency: 'CLP', amount: reserved.amount!, email: reserved.email,
      paymentMethod: 9, timeout: 1800,
      urlConfirmation: site + '/api/payments/flow/confirmation',
      urlReturn: site + '/api/payments/flow/return?paymentId=' + reserved.paymentId,
    }, 'POST');
    if (!validFlowToken(order.token) || !Number.isSafeInteger(order.flowOrder) || order.flowOrder <= 0) throw new Error('Respuesta de Flow inv\u00e1lida.');
    const checkoutUrl = flowCheckoutUrl(order.url, order.token);
    await db.query("UPDATE tournament_payments SET provider_uuid=$1,provider_order=$2,checkout_url=$3,expires_at=$4,status=CASE WHEN status IN ('creating','review') THEN 'pending' ELSE status END WHERE id=$5", [order.token,String(order.flowOrder),checkoutUrl,new Date(createdAt + 1800000),reserved.paymentId]);
    return { paymentId: reserved.paymentId, checkoutUrl };
  } catch (error) {
    // A network error can occur after the gateway created the charge. Never start another automatically.
    await db.query("UPDATE tournament_payments SET status='review' WHERE id=$1 AND status='creating'", [reserved.paymentId]);
    throw error;
  }
}

/** One captain checkout can reserve several individual tournament slots. */
export async function reserveSoloRosterRegistration(tournamentId: string, payerUserId: string, registrations: Registration[]) {
  if (!registrations.length) throw new Error('Selecciona al menos un jugador.');
  const reserved: any = await withDbTransaction(async db => {
    const tournament = (await db.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [tournamentId])).rows[0];
    if (!tournament || tournament.status !== 'registration_open' || tournament.is_hidden) throw new Error('Las inscripciones no están abiertas.');
    if (tournament.team_type !== 'solo' && Number(tournament.team_size) !== 1) throw new Error('Esta inscripción grupal solo está disponible para torneos individuales.');
    const selectedIds = new Set(registrations.map(registration => registration.userId));
    if (selectedIds.size !== registrations.length) throw new Error('Un jugador fue seleccionado más de una vez.');
    const participants = (await db.query('SELECT * FROM tournament_participants WHERE tournament_id=$1', [tournamentId])).rows;
    if (participants.some(participant => participant.user_id && selectedIds.has(participant.user_id) || (participant.roster || []).some((member: { userId: string }) => selectedIds.has(member.userId)))) throw new Error('Uno de los jugadores seleccionados ya está inscrito en este torneo.');
    const payments = (await db.query('SELECT * FROM tournament_payments WHERE tournament_id=$1', [tournamentId])).rows;
    const paymentRegistrations = (payment: any): Registration[] => Array.isArray(payment.registration?.registrations) ? payment.registration.registrations : [payment.registration];
    const active = payments.filter(payment => payment.status === 'review' || (activeStatuses.includes(payment.status) && new Date(payment.expires_at).getTime() > Date.now()));
    if (active.some(payment => paymentRegistrations(payment).some(registration => selectedIds.has(registration.userId)))) throw new Error('Uno de los jugadores seleccionados ya tiene un pago pendiente para este torneo.');
    const reservedSlots = active.reduce((total, payment) => total + paymentRegistrations(payment).length, 0);
    if (participants.length + reservedSlots + registrations.length > tournament.max_participants) throw new Error('No quedan cupos suficientes para los jugadores seleccionados.');
    const existing = active.find(payment => payment.registration_key === payerUserId);
    if (existing) return { paymentId: existing.id, checkoutUrl: existing.checkout_url, existingPayment: true, create: false };
    if (!tournament.entry_fee_amount) {
      const participantIds = [];
      for (const registration of registrations) participantIds.push(await insertRegistration(db, tournamentId, tournament.max_participants, registration));
      return { participantId: participantIds[0], participantIds, create: false };
    }
    flowConfig();
    const payer = (await db.query('SELECT email FROM users WHERE id=$1', [payerUserId])).rows[0];
    const paymentId = `pay-${randomUUID()}`;
    const amount = Number(tournament.entry_fee_amount) * registrations.length;
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('El total del pago no es válido.');
    await db.query(`INSERT INTO tournament_payments (id,tournament_id,user_id,registration_key,amount,registration,provider,expires_at) VALUES ($1,$2,$3,$4,$5,$6,'flow',CURRENT_TIMESTAMP + INTERVAL '35 minutes')`, [paymentId,tournamentId,payerUserId,payerUserId,amount,JSON.stringify({ registrations }),]);
    return { paymentId, amount, title: tournament.title, email: payer.email, create: true };
  });
  if (!reserved.create) return reserved;
  const db = await getDb();
  try {
    const { site } = flowConfig();
    const createdAt = Date.now();
    const order = await flowRequest<{ url: string; token: string; flowOrder: number }>('payment/create', { commerceOrder: reserved.paymentId, subject: (`Inscripción de ${registrations.length} jugadores · ${reserved.title}`).slice(0, 200), currency: 'CLP', amount: reserved.amount, email: reserved.email, paymentMethod: 9, timeout: 1800, urlConfirmation: site + '/api/payments/flow/confirmation', urlReturn: site + '/api/payments/flow/return?paymentId=' + reserved.paymentId }, 'POST');
    if (!validFlowToken(order.token) || !Number.isSafeInteger(order.flowOrder) || order.flowOrder <= 0) throw new Error('Respuesta de Flow inválida.');
    const checkoutUrl = flowCheckoutUrl(order.url, order.token);
    await db.query("UPDATE tournament_payments SET provider_uuid=$1,provider_order=$2,checkout_url=$3,expires_at=$4,status='pending' WHERE id=$5", [order.token,String(order.flowOrder),checkoutUrl,new Date(createdAt + 1800000),reserved.paymentId]);
    return { paymentId: reserved.paymentId, checkoutUrl };
  } catch (error) {
    await db.query("UPDATE tournament_payments SET status='review' WHERE id=$1 AND status='creating'", [reserved.paymentId]);
    throw error;
  }
}

export async function reconcilePayment(uuid: string | null, paymentId?: string) {
  const db = await getDb();
  if (uuid !== null && !validFlowToken(uuid)) throw new Error('Token de Flow inv\u00e1lido.');
  if (!uuid && !paymentId) throw new Error('Falta la referencia del pago.');
  const order = uuid
    ? await flowRequest<FlowPaymentStatus>('payment/getStatus', { token: uuid })
    : await flowRequest<FlowPaymentStatus>('payment/getStatusByCommerceId', { commerceId: paymentId! });
  const saved = (await db.query("SELECT * FROM tournament_payments WHERE id=$1 AND provider='flow'", [order.commerceOrder])).rows[0];
  if (!saved) throw new Error('Pago no encontrado.');
  // Flow returns CLP amounts as either JSON numbers or decimal strings (e.g. "3000").
  // Accept only whole pesos; do not coerce empty strings, exponents, booleans or fractions.
  const amount = typeof order.amount === 'string' && /^(?:0|[1-9]\d*)(?:\.0+)?$/.test(order.amount) ? Number(order.amount) : order.amount;
  if ((paymentId && saved.id !== paymentId) || !Number.isSafeInteger(amount) || amount !== saved.amount || order.currency !== 'CLP' || !Number.isSafeInteger(order.flowOrder) || order.flowOrder <= 0 || ![1,2,3,4].includes(order.status)) throw new Error('El pago no coincide con la inscripci\u00f3n.');
  return withDbTransaction(async tx => {
    // All registration paths lock tournament first, then payment, to serialize capacity and callbacks.
    const tournament = (await tx.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [saved.tournament_id])).rows[0];
    const payment = (await tx.query('SELECT * FROM tournament_payments WHERE id=$1 FOR UPDATE', [saved.id])).rows[0];
    if ((uuid && payment.provider_uuid && payment.provider_uuid !== uuid) || (payment.provider_order && payment.provider_order !== String(order.flowOrder))) throw new Error('Referencia de pago inválida.');
    await tx.query('UPDATE tournament_payments SET provider_uuid=COALESCE($1,provider_uuid),provider_order=$2 WHERE id=$3', [uuid,String(order.flowOrder),saved.id]);
    payment.provider_order = String(order.flowOrder);
    if (['confirmed', 'refund_required'].includes(payment.status)) return payment;
    if (order.status === 2) {
      const count = Number((await tx.query('SELECT COUNT(*) AS count FROM tournament_participants WHERE tournament_id=$1', [saved.tournament_id])).rows[0].count);
      if (payment.archived_at || payment.status === 'cancelled' || tournament.status !== 'registration_open' || tournament.is_hidden || count >= tournament.max_participants) {
        await tx.query("UPDATE tournament_payments SET status='refund_required' WHERE id=$1", [saved.id]);
        return { ...payment, status: 'refund_required' };
      }
      // Use a savepoint so duplicate registrations remain refundable without partial bracket changes.
      await tx.query('SAVEPOINT registration');
      try {
        const registrations: Registration[] = Array.isArray(payment.registration?.registrations) ? payment.registration.registrations : [payment.registration];
        const participantIds: string[] = [];
        for (const registration of registrations) participantIds.push(await insertRegistration(tx, tournament.id, tournament.max_participants, registration));
        await tx.query("UPDATE tournament_payments SET status='confirmed',participant_id=$1 WHERE id=$2", [participantIds[0],saved.id]);
        return { ...payment, status: 'confirmed', participant_id: participantIds[0] };
      } catch {
        await tx.query('ROLLBACK TO SAVEPOINT registration');
        await tx.query("UPDATE tournament_payments SET status='refund_required' WHERE id=$1", [saved.id]);
        return { ...payment, status: 'refund_required' };
      }
    }
    if (payment.archived_at || payment.status === 'cancelled') return payment;
    const status = [3,4].includes(order.status) ? 'failed' : payment.checkout_url ? 'pending' : 'review';
    await tx.query('UPDATE tournament_payments SET status=$1 WHERE id=$2', [status,saved.id]);
    return { ...payment, status };
  });
}

export class PaymentCancellationError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function cancelPendingPayment(paymentId: string, userId: string) {
  const db = await getDb();
  const saved = (await db.query('SELECT * FROM tournament_payments WHERE id=$1', [paymentId])).rows[0];
  if (!saved || saved.user_id !== userId) throw new PaymentCancellationError('Pago no encontrado.', 404);
  if (saved.provider !== 'flow') throw new PaymentCancellationError('Contacta a soporte para cancelar un pago del proveedor anterior.', 409);
  if (saved.status === 'cancelled') return;
  if (saved.status !== 'pending') throw new PaymentCancellationError('Solo puedes cancelar una inscripción pendiente de pago. Si ya pagaste o está en revisión, contacta a soporte.', 409);
  // Do not cancel from a browser-supplied status or while Flow cannot be verified.
  const verified = await reconcilePayment(saved.provider_uuid || null, saved.id);
  if (verified.status !== 'pending') throw new PaymentCancellationError('El estado del pago cambió. Consulta el resultado antes de cancelar.', 409);
  await withDbTransaction(async tx => {
    // Match the lock order used by checkout creation and callbacks.
    await tx.query('SELECT * FROM tournaments WHERE id=$1 FOR UPDATE', [saved.tournament_id]);
    const payment = (await tx.query('SELECT * FROM tournament_payments WHERE id=$1 FOR UPDATE', [saved.id])).rows[0];
    if (payment.status === 'cancelled') return;
    if (payment.user_id !== userId || payment.provider !== 'flow' || payment.status !== 'pending') throw new PaymentCancellationError('El estado del pago cambió. Consulta el resultado antes de cancelar.', 409);
    await tx.query("UPDATE tournament_payments SET status='cancelled',checkout_url=NULL WHERE id=$1", [saved.id]);
  });
}
