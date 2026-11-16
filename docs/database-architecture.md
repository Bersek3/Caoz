# Arquitectura de base de datos

## Límites de propiedad

- `neon_auth` es propiedad de Neon Auth. La aplicación no crea, modifica ni elimina sus tablas.
- `public` contiene los datos operativos de CAOZ.
- Las tablas canónicas de la aplicación están en español: `usuarios`, `torneos`, `participantes_torneo`, `rondas_torneo`, `partidas_torneo` y `mensajes_partida`.
- Los nombres ingleses (`users`, `tournaments`, `tournament_participants`, etc.) son vistas de compatibilidad. Nunca deben recibir migraciones, índices ni datos directamente.

## Datos privados

`usuarios` y `tournament_registration_details` contienen datos personales. El frontend no debe consultar estas tablas directamente ni seleccionar columnas de identificación, teléfono, fecha de nacimiento, RUT, hash de contraseña o documentos salvo desde rutas de servidor autorizadas.

Un administrador inicial solo puede sembrarse en una base local vacía con `SEED_DEFAULT_ADMIN=true`, `SEED_DEFAULT_ADMIN_EMAIL` y `SEED_DEFAULT_ADMIN_PASSWORD`. Estas variables no deben configurarse en Vercel ni subirse a GitHub.

## Migraciones

Las migraciones idempotentes viven en `src/lib/databaseMigrations.ts` y se registran en `database_schema_migrations`. Se ejecutan después de crear las tablas base y no actúan sobre `neon_auth`.

Para cambios futuros:

1. Añadir una migración con un identificador de fecha único.
2. Evitar renombrar, borrar o cambiar tipos de columnas en una sola entrega.
3. Agregar primero una columna nueva, migrar la aplicación, validar, y eliminar la antigua solo en una migración posterior.
4. Antes de restricciones `UNIQUE`, `CHECK` o `NOT NULL`, auditar y corregir los registros existentes.

## Fechas

Las fechas históricas de torneos actualmente usan texto en algunas columnas. No se deben convertir de forma automática porque existen valores como `Por confirmar`. Las nuevas fechas deben evolucionar a columnas `TIMESTAMPTZ` paralelas, con una migración de datos validada y una posterior retirada de las columnas de texto.
