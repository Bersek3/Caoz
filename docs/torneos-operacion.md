# Torneos de CZ ARENA

El catálogo está en `/arena`; `/torneos` redirige allí. Los filtros se guardan en la URL. Los favoritos y los avisos leídos se conservan por usuario en este navegador.

## Ciclo de una competencia

1. El administrador crea un torneo de eliminación simple, con fecha y hora de Chile. Los instantes se guardan en UTC y se muestran con la zona indicada.
2. Los jugadores o capitanes se inscriben. Los pagos reservan el cupo durante 30 minutos; la aprobación confirma la inscripción.
3. El administrador abre el check-in desde la ficha. Esto cierra las inscripciones. Cada participante confirma asistencia dentro de la ventana publicada.
4. Al cerrar el check-in, el administrador revisa los confirmados y sortea las llaves. Se incluyen únicamente confirmados, con pases libres cuando corresponda.
5. El staff registra marcadores de series BO1/BO3/BO5. El sistema avanza al ganador y confirma el campeón al guardar la final.
6. La organización actualiza la entrega de premios: pendiente, en coordinación o entregados.

La creación y la edición ofrecen eliminación simple. Los formatos anteriores sin motor operativo necesitan convertirse y reconstruirse explícitamente. Una reconstrucción conserva inscripciones y reinicia la confirmación de asistencia. No se permite reconstruir una competencia con premios entregados ni corregir un ganador cuando invalidaría resultados posteriores.

## Lista de espera y soporte

La espera se ordena por llegada. Cada vacante se ofrece durante 15 minutos; el jugador consulta el turno en la ficha y completa su inscripción cuando le corresponde. La espera no cobra ni confirma automáticamente una inscripción. Los pagos pendientes y las ofertas se cuentan para evitar sobreasignar cupos.

Los avisos se actualizan dentro de la plataforma mientras se navega. El calendario descargable incluye un recordatorio una hora antes del inicio. No hay envíos de correo ni notificaciones push configurados.

El correo de contacto publicado es `contacto.caoz@gmail.com`. Las devoluciones se solicitan con la referencia de pago y se resuelven manualmente. El enlace de Discord queda pendiente de configuración por el propietario.

## Verificación

- `npm.cmd run build`: compilación de producción y tipos.
- `node scripts/test-tournament-competition.cjs`: fases, permisos, llaves, byes, marcadores y premios.
- `node scripts/test-tournament-waitlist.cjs`: turnos, expiración, equipos y reservas.
- `node scripts/test-tournament-experience.cjs`: zonas horarias, acciones y podio.
- `node scripts/test-flow-integration.cjs`: pagos con proveedor simulado.
- `node scripts/test-tournament-ui.cjs`: navegador, requiere Playwright Core disponible mediante `PLAYWRIGHT_CORE_PATH` y servidor local. Opcionalmente `BASE_URL` y `PLAYWRIGHT_EXECUTABLE_PATH`. Todas las llamadas API se interceptan con datos sintéticos y las capturas se guardan en la carpeta temporal `caoz-tournament-review`.

Las pruebas de servicios usan PostgreSQL en memoria; no escriben en la base de datos del proyecto ni realizan cobros reales.
