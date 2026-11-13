> Integración anterior, conservada como referencia histórica. Para pagos nuevos utiliza [Flow](../FLOW.md). Las rutas de VirtualPOS ya no están activas.

# VirtualPOS en CAOZ ARENA

La integración utiliza la API v3 de Payments. Las inscripciones gratuitas se confirman directamente; las pagadas reservan un cupo durante 15 minutos y solo generan participante y bracket tras consultar el estado `pagado` en la API autenticada del proveedor. La tarifa es un monto entero en CLP por inscripción (un pago por equipo en torneos por equipos).

## Configuración del servidor

Configura estas variables en el alojamiento. Nunca uses variables `NEXT_PUBLIC_` para las llaves ni las subas al repositorio:

```dotenv
VIRTUALPOS_ENV=sandbox
VIRTUALPOS_API_KEY=REEMPLAZAR_EN_EL_SERVIDOR
VIRTUALPOS_SECRET_KEY=REEMPLAZAR_EN_EL_SERVIDOR
APP_URL=https://tu-dominio.cl
DATABASE_URL=postgresql://CONFIGURAR_EN_EL_SERVIDOR
```

Obtén las llaves de la cuenta y ambiente correspondientes en VirtualPOS, Perfil → Configuración de cuenta → Integración. Con `sandbox` se usa `api.virtualpos-sandbox.com`; con `production`, `api.virtualpos.cl`. La aplicación no activa cobros si faltan las llaves o la URL pública. Producción requiere HTTPS y una base PostgreSQL persistente compartida entre instancias; PGlite es solo para desarrollo local. El pagador completa nombre, apellido, RUT y teléfono; no se almacenan datos de tarjeta.

## Rutas y operación

- `/api/payments/virtualpos/webhook`: recibe el UUID y consulta al proveedor. Nunca confía en un estado enviado por el navegador ni en el cuerpo de la notificación. Las URL se envían al proveedor codificadas en Base64.
- `/api/payments/virtualpos/return`: redirige mediante 303 a la consulta autenticada del resultado.
- `/arena/pago?paymentId=...`: verifica el pago y permite retomar el checkout pendiente dentro de la reserva.
- `/arena/pagos`: historial propio del participante; el administrador ve las últimas 100 operaciones de todos los participantes.

Se comprueban UUID, monto y referencia interna antes de confirmar. Las transacciones bloquean el torneo y el pedido para impedir que notificaciones repetidas creen participantes duplicados o excedan los cupos. Si el pago llega después de 15 minutos o con el torneo cerrado, queda como `refund_required`, sin inscripción. Una excepción de red al crear un pago queda en `review`: **no repetir el cobro sin revisar en VirtualPOS**, porque puede haberse creado aunque no haya llegado la respuesta. La referencia del pedido es `merchant_internal_code` en VirtualPOS.

Los reembolsos no se ejecutan automáticamente: el organizador debe resolverlos con VirtualPOS y comunicarse con el pagador. La vista de historial señala las operaciones que requieren atención. No se permite eliminar torneos con historial de pagos ni retirar por autoservicio una inscripción pagada. Se pueden ocultar torneos para conservar los registros. La aprobación del rubro y las condiciones comerciales deben acordarse con VirtualPOS antes de habilitar producción.

## Verificación antes de producción

1. Configurar credenciales sandbox y una URL HTTPS pública para retorno y webhook.
2. Crear un torneo de pago en CLP e iniciar una inscripción con una cuenta de prueba.
3. Probar pago aprobado, rechazado y cancelado, retorno del navegador y notificaciones sin retorno.
4. Confirmar que el monto enviado al proveedor sale de la base de datos, que no hay inscripción antes del pago y que repetir el webhook no duplica el participante.
5. Probar expiración de reserva y revisar el circuito manual de devolución con VirtualPOS.
6. Cambiar a credenciales de producción y `VIRTUALPOS_ENV=production` solo tras las pruebas y habilitación comercial.

Las pruebas locales usan PostgreSQL en memoria y un proveedor simulado: `node scripts/test-virtualpos.cjs`. No sustituyen una transacción sandbox real con las credenciales del comercio.

Fuentes oficiales: [firma](https://virtualpos.readme.io/reference/autenticaci%C3%B3n-y-firma), [objeto Payment](https://virtualpos.readme.io/reference/objeto-payment), [webhooks](https://virtualpos.readme.io/reference/webhook), [checkout](https://virtualpos.readme.io/reference/obtener-link-webcheckout).
