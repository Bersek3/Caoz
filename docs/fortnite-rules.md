# Bases automáticas de Fortnite

La fuente de las plantillas es `src/lib/tournamentRules.ts`, versión `CAOZ-FN-1.0`.
El archivo público `public/reglamentos/fortnite-caozarena.md` se genera con
`node scripts/generate-fortnite-rules.cjs`. Incluye ejemplos completos para los
cuatro formatos y las modalidades individual, dúos, tríos y escuadras.

Los valores competitivos son decisiones propuestas para CAOZ Arena: Battle Royale
con construcción; clasificación de cada partida por la posición de los dos
rivales; BO3 y final BO5; tres puntos por encuentro en ligas; desempates indicados
en cada variante. No son reglas oficiales de una competición de Epic Games.

## Referencias consultadas el 24 de octubre de 2026

- Documento de estructura facilitado por el usuario:
  https://futvgaming.com/wp-content/uploads/2026/02/20260129-Reglamento-Fornite-2026-1.pdf
- Reglas competitivas y documentación de eventos de Fortnite:
  https://www.fortnite.com/competitive/rules-guidelines
- Licencia de eventos enlazada desde la página oficial:
  https://cms-assets.unrealengine.com/AKtZh9UPWT5uJzqgfWYCRz/cm8ipe74t07fm07o6chnmk9nf

Las bases son una redacción propia. No se transfieren sedes, fechas, premios,
residencia obligatoria ni condiciones particulares del torneo de referencia.
La licencia general consultada condiciona los cobros de entrada a un acuerdo
escrito distinto con Epic; usar una plantilla no concede esa autorización ni el
acceso a salas privadas. La organización debe revisar las condiciones aplicables
a su evento, incluidos avisos y textos exigidos por la licencia.

## Comportamiento

- Crear: bases automáticas, vista previa y descarga; el servidor genera el texto
  desde la configuración, sin confiar en una vista previa enviada por el cliente.
- Editar: un torneo automático regenera sus bases al cambiar su configuración;
  un torneo personalizado conserva sus reglas hasta que se elija otra modalidad.
- Los torneos existentes migran a `custom` y no cambian de reglamento solos.
- El texto y la versión se guardan junto al torneo: actualizar el código de las
  plantillas no reescribe eventos publicados.
- Personalizar copia las bases actuales como punto de partida. Volver a automático
  conserva el borrador personalizado, pero publica la plantilla calculada.
- La descarga de un torneo usa las bases guardadas, no las plantillas actuales.

## Alcance del motor actual

Este cambio automatiza las bases. El motor existente genera llaves de eliminación
y avanza ganadores, pero no calcula tablas Round Robin, emparejamientos suizos ni
el recorrido completo del cuadro inferior. Esas operaciones requieren gestión de
la organización; la plantilla no añade esa automatización.
