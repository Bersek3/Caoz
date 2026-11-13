# Pagos de inscripciones con Flow.cl

## Datos que debes configurar

Como ya tienes cuenta, entra a **Mis datos → Integraciones** en Flow y obtén tu **API Key** y **Secret Key**. Configúralas directamente en las variables del hosting o en `.env.local`; no las envíes por el chat ni las publiques.

```dotenv
APP_URL=https://tu-dominio.cl
FLOW_ENV=production
FLOW_API_KEY=tu_api_key
FLOW_SECRET_KEY=tu_secret_key
DATABASE_URL=postgresql://...
JWT_SECRET=un_secreto_aleatorio_propio_de_al_menos_32_caracteres
```

El dominio debe apuntar a la aplicación desplegada con HTTPS. PostgreSQL debe ser persistente. Haz una copia de seguridad si ya hay datos y reinicia o redespliega tras cambiar variables.

No se necesita clave pública ni un secreto de webhook separado. El servidor envía las URLs al crear cada orden:

- Confirmación: `https://tu-dominio.cl/api/payments/flow/confirmation`
- Retorno del navegador: `https://tu-dominio.cl/api/payments/flow/return?paymentId=pay-...`

Ambas rutas reciben POST y deben ser públicas para Flow, sin login ni bloqueo del hosting. La consulta de pagos de los usuarios mantiene su autenticación. El retorno solo redirige a la página de estado; el servidor verifica el pago mediante una consulta firmada a Flow.

## Pruebas antes de activar producción

1. Usa una cuenta y credenciales del ambiente `sandbox.flow.cl`; las de producción son distintas.
2. Copia `.env.example` a `.env.local` y usa `FLOW_ENV=sandbox`. Para desarrollo local sin PostgreSQL puedes omitir `DATABASE_URL` y usar PGlite.
3. Ejecuta `npm install` y `npm run dev`. Para recibir las confirmaciones desde Flow usa una URL pública HTTPS de pruebas o un túnel y configura `APP_URL` con esa dirección. Flow no puede llamar al localhost de tu equipo.
4. Crea un torneo con inscripciones abiertas y precio mayor que cero en CLP. Inicia el pago desde la web; el servidor crea la orden con ese monto.
5. Completa el pago en el simulador de Flow. Consulta las tarjetas vigentes en la documentación oficial de sandbox. Comprueba que aparece una sola inscripción y el historial muestra `Confirmado`.
6. Prueba pago rechazado, anulado, retorno sin confirmación y notificaciones repetidas. La inscripción debe confirmarse solo al recibir estado pagado desde la API de Flow.
7. Para producción configura el dominio final, `FLOW_ENV=production` y las credenciales productivas. Comprueba los medios de pago habilitados en tu cuenta y realiza una prueba real controlada cuando estés listo.

Pruebas locales automatizadas: `node --test scripts/test-flow.cjs`. Simulan las respuestas del proveedor; no sustituyen un pago en tu cuenta.

## Comportamiento y operación

- Cada inscripción cobra el precio del torneo en CLP, una vez por jugador o equipo. Se ofrecen los medios de pago contratados en tu cuenta mediante `paymentMethod=9`.
- La orden se solicita con vencimiento de 30 minutos. La reserva inicial tiene un margen de 35 minutos mientras se crea la orden y luego se ajusta a 30 minutos desde el inicio de la solicitud. Algunos medios pueden confirmar de forma diferida: si ya no hay cupo o cerró el torneo, el pago queda como devolución pendiente.
- El callback recibe un token y consulta `payment/getStatus` usando parámetros firmados HMAC-SHA256. Se validan orden del comercio, número de orden Flow, monto, moneda, estado y token almacenado. El contenido del callback no se usa como prueba de pago.
- Los estados Flow son pendiente (1), pagado (2), rechazado (3) y anulado (4). Solo pagado confirma la inscripción. Las notificaciones repetidas no crean participantes adicionales.
- Si falla la conexión al crear una orden, se conserva en revisión y no se vuelve a cobrar automáticamente. El usuario puede abrir **Mis pagos → Consultar**; si falta el token se intenta recuperar el estado mediante `payment/getStatusByCommerceId`. Un estado pendiente recuperado sin enlace mantiene la revisión para impedir crear otra orden hasta resolver la existente.
- Si la orden no existe o sigue incierta, el organizador debe verificarla en Flow antes de liberar manualmente la reserva. No marques como fallido un pago sin descartar antes un cobro.
- Las devoluciones se gestionan manualmente en Flow. `refund_required` indica revisión pendiente; no ejecuta una devolución ni se sincroniza automáticamente con el resultado del reembolso.
- En **Mis pagos → Consultar → Cancelar inscripción pendiente**, el titular puede cancelar una inscripción aún no pagada. Primero se consulta Flow; un pago confirmado o incierto no se cancela por este mecanismo. Se libera el cupo y se oculta el checkout, conservando el historial con estado `cancelled`.
- La cancelación es de la inscripción local: la API pública de `payment/create` no documenta un endpoint para anular inmediatamente esa orden de Flow. El enlace anterior conserva su vencimiento de 30 minutos. Durante ese plazo se bloquea un nuevo pago del mismo jugador/equipo para ese torneo. Si llega un pago de la orden cancelada, pasa a `refund_required` sin inscribir al participante. Esto no ejecuta un reembolso automático.
- Todos los cobros ingresan a tu cuenta Flow. No se implementa reparto automático a terceros ni pago de premios.
- La vista de administrador agrupa las operaciones por ID de torneo, permite filtrar una competencia y muestra hasta 100 operaciones por página. El total confirmado indicado corresponde a la página visible, no al total histórico del torneo.
- El historial y el detalle muestran el número de orden Flow (`flowOrder`) al cliente titular y al administrador, con opción para copiar. Se conserva también la referencia interna CAOZ para soporte. Si el intento no llegó a crear una orden, el número figura como no disponible. Los tokens no se exponen como identificadores y el historial no incluye URLs de checkout.
- **Revisar y archivar** consulta Flow y conserva el registro, el administrador y el motivo de archivo. Solo se archivan rechazos/anulaciones verificadas o creaciones de más de dos minutos sin referencias de proveedor para las que Flow responde `1700 Transaction not found`, con confirmación del administrador de haber comprobado la misma cuenta y ambiente originales. Los errores de autenticación o red no autorizan archivar.
- Los intentos archivados quedan como fallidos, liberan su reserva y se ocultan de la lista habitual. Se consultan con **Mostrar archivados**. Si una confirmación tardía encuentra dinero en un intento archivado, se marca para devolución sin inscribir y vuelve a ser visible incluso sin activar ese filtro.
- Se puede eliminar un torneo cuyo único historial sean creaciones fallidas archivadas con motivo `flow_order_not_found_admin_verified`, sin token, orden, enlace ni participante de pago. Antes de eliminar se conserva una auditoría mínima en `removed_tournament_payment_attempts`. Los pagos reales, las órdenes del proveedor y los intentos no resueltos siguen bloqueando la eliminación. La operación individual o masiva es transaccional.
- Los pagos anteriores conservan su proveedor y su historial; no se reanudan ni se verifican con Flow. Resuelve primero las operaciones pendientes de proveedores anteriores.
- La inicialización de la base agrega `provider_order` sin eliminar datos. Los pagos nuevos se guardan con `provider=flow`; el proveedor de los registros históricos se conserva.

## Referencias oficiales

- Credenciales y firma: https://developers.flow.cl/docs/intro
- API, estados y pruebas: https://developers.flow.cl/api
- Retorno del navegador: https://developers.flow.cl/docs/tutorial-basics/order-finished
