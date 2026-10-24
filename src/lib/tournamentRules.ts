import type { GameId, TournamentFormat } from '../types/tournament';

export const RULES_TEMPLATE_VERSION = 'CAOZ-FN-1.0';
export type RulesMode = 'automatic' | 'custom';
export interface RulesConfiguration {
  gameId: GameId;
  format: TournamentFormat;
  teamType: 'solo' | 'team';
  teamSize: number;
  maxParticipants: number;
  region: string;
  title?: string;
  startDate?: string;
  entryFeeAmount?: number;
  prizePool?: string;
  checkInOpensAt?: string;
  checkInClosesAt?: string;
}

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: 'Eliminación simple', double_elimination: 'Doble eliminación',
  round_robin: 'Round Robin', swiss: 'Sistema suizo'
};
export const DEFAULT_TOURNAMENT_RULES = [
  'Check-in obligatorio 30 minutos antes de comenzar.',
  'Subir captura de pantalla del resultado final a la sala de partida.',
  'Tolerancia de 10 minutos por partida antes de considerar abandono.'
];

export function getTournamentRulesPreset(config: RulesConfiguration) {
  if (config.gameId !== 'fortnite') return { title: 'Reglas generales CAOZ Arena', version: 'CAOZ-GENERAL-1.0', rules: [...DEFAULT_TOURNAMENT_RULES] };
  const format = FORMAT_LABELS[config.format];
  if (!format) throw new Error('Selecciona un formato válido para las bases de Fortnite.');
  if (!['solo','team'].includes(config.teamType) || !Number.isInteger(config.teamSize) ||
    (config.teamType === 'solo' ? config.teamSize !== 1 : config.teamSize < 2 || config.teamSize > 4)) throw new Error('Fortnite admite individual, dúos, tríos o escuadras de cuatro.');
  if (![8,16,32].includes(config.maxParticipants)) throw new Error('Los cupos de Fortnite deben ser 8, 16 o 32.');
  const solo = config.teamType === 'solo';
  const modality = solo ? 'Individual (Solo)' : config.teamSize === 2 ? 'Dúos' : config.teamSize === 3 ? 'Tríos' : 'Escuadras';
  const units = solo ? 'jugadores' : 'equipos';
  const title = `Bases de Fortnite · ${format} · ${modality}`;
  const structure: Record<TournamentFormat, string[]> = {
    single_elimination: [
      'Formato: eliminación simple. Cada encuentro enfrenta a dos inscritos. El ganador avanza y el perdedor queda eliminado; una sola derrota finaliza la participación.',
      'Series: al mejor de tres partidas (BO3); la gran final se disputa al mejor de cinco (BO5). Gana quien alcance primero dos victorias en BO3 o tres en BO5. El marcador oficial registra partidas ganadas, no eliminaciones.'
    ],
    double_elimination: [
      'Formato: doble eliminación. La primera derrota envía al cuadro inferior y la segunda elimina. El ganador de cada cuadro accede a la gran final; un pase libre no cuenta como victoria jugada.',
      'Series: BO3 en los cuadros superior e inferior; gran final BO5. Si el finalista del cuadro inferior gana la primera serie final, se juega una segunda BO5 de desempate para respetar las dos derrotas. El marcador registra partidas ganadas.'
    ],
    round_robin: [
      `Formato: Round Robin a una vuelta. Cada uno de los ${config.maxParticipants} ${units} juega contra todos los demás una vez, para un total de ${config.maxParticipants - 1} encuentros por inscrito. No hay eliminación durante esta fase.`,
      'Encuentros: BO3 sin empate; gana quien consiga dos victorias. La clasificación otorga tres puntos por serie ganada y cero por perdida. Un abandono validado se registra como derrota 0-2.',
      'Desempates de tabla: puntos de clasificación, victorias entre los empatados cuando todos se hayan enfrentado, diferencia de partidas ganadas y perdidas, y partidas ganadas. Si el empate afecta premios o al campeón, se juega una BO1 adicional entre los involucrados, con orden sorteado.'
    ],
    swiss: [
      `Formato: sistema suizo de ${Math.log2(config.maxParticipants)} rondas para ${config.maxParticipants} ${units}. La primera ronda se sortea y las siguientes emparejan inscritos con igual puntaje o el más cercano disponible; se evitan rivales repetidos. Nadie se elimina antes de finalizar las rondas.`,
      'Encuentros: BO3 sin empate, con tres puntos por serie ganada y cero por perdida. Si queda un inscrito sin rival, recibe un único pase libre con tres puntos, sin partidas ni eliminaciones ficticias; no puede recibir otro si hay candidatos sin pase.',
      'Desempates de tabla: puntos de clasificación, suma de puntos de los rivales enfrentados (Buchholz), diferencia de partidas y partidas ganadas. Un empate que determine premios o campeón se resuelve con una BO1 adicional entre los involucrados, con orden sorteado.'
    ]
  };
  const fee = config.entryFeeAmount || 0;
  return { title, version: RULES_TEMPLATE_VERSION, rules: [
    `${title}. Versión ${RULES_TEMPLATE_VERSION}. Evento: ${config.title?.trim() || 'Torneo CAOZ Arena'}. La organización responsable es la indicada en la ficha del torneo.`,
    `Convocatoria: ${config.maxParticipants} ${units}; ${solo ? 'una persona por inscripción' : `${config.teamSize} titulares por equipo, ${config.maxParticipants * config.teamSize} plazas de jugador en total`}. Región de convocatoria: ${config.region}. Inicio: ${config.startDate || 'el horario publicado en la ficha del torneo'}.`,
    'Modalidad de juego: Battle Royale con construcción, en salas privadas habilitadas por la organización. Todos los rivales de un encuentro juegan en el mismo lobby, región de servidor y versión del juego. No se mezclan partidas públicas, Cero Construcción ni islas creativas con esta convocatoria.',
    solo
      ? 'Participación individual: cada jugador utiliza su propia cuenta de Epic Games y el Epic Games ID registrado. No se permite ayuda en partida, compartir cuenta, sustituir al titular ni formar alianzas con otro inscrito.'
      : `Participación por equipos: ${config.teamSize} titulares inscritos forman un ${modality.toLowerCase()}. El capitán coordina la sala y presenta los resultados. La alineación se cierra al finalizar el check-in; solo un reemplazo autorizado por la organización antes del siguiente encuentro puede cambiarla. No se comparten jugadores entre equipos.`,
    'Acceso: edad mínima de la plataforma, 14 años, sin perjuicio de una exigencia mayor aplicable al evento. Los menores requieren autorización de su representante. Se usa una sola cuenta personal por jugador, sin sanción competitiva vigente que impida participar. Los datos de identidad se entregan a la organización, nunca en el chat de la partida.',
    `Inscripción: ${fee > 0 ? `${new Intl.NumberFormat('es-CL').format(fee)} CLP por ${solo ? 'jugador' : 'equipo'}, conforme a la ficha y sujeto a las autorizaciones necesarias para un evento con cobro` : 'gratuita, sin compra dentro del juego como requisito'}. Solo se confirma al completar el formulario y, cuando corresponda, la confirmación de pago. Una persona no puede ocupar dos inscripciones del mismo torneo.`,
    `Check-in: abre ${config.checkInOpensAt || '45 min antes'} y cierra ${config.checkInClosesAt || '10 min antes'} del inicio. El participante debe estar disponible en su sala al menos diez minutos antes del encuentro. La ausencia se revisa con el árbitro; nadie puede adjudicarse un abandono por cuenta propia.`,
    ...structure[config.format],
    'Ganador de cada partida: se compara la posición final oficial de los dos rivales del encuentro; vence el jugador o equipo mejor ubicado. Para equipos se usa la posición de equipo, no la de un integrante aislado. Las eliminaciones sirven como evidencia y no suman puntos adicionales a la serie. Una partida anulada no otorga victoria.',
    'Empate o resultado ilegible: si ambos rivales aparecen con la misma posición o falta evidencia suficiente, el árbitro revisa capturas y repetición. Si no puede determinar un ganador, ordena repetir únicamente esa partida; no se decide por orden de inscripción ni por un sorteo.',
    'Sala y servidor: la organización comunica por el chat privado el código, servidor y hora. Solo el administrador autoriza el inicio. El código no se comparte con terceros. Una sala completa no puede superar la capacidad admitida por el modo de juego; la organización separará lobbies cuando corresponda.',
    'Resultados y pruebas: al terminar cada partida, el capitán o jugador sube en su sala una captura con identificador, posición y resultado, y conserva la repetición hasta el cierre de las reclamaciones. El administrador valida y registra el marcador; los jugadores no lo oficializan por acuerdo privado.',
    'Incidencias: una desconexión individual no concede automáticamente repetición. Se informa de inmediato en la sala y el árbitro evalúa el momento y la evidencia. Ante una caída general del servidor o mantenimiento, la organización puede pausar, reprogramar o anular la partida afectada con explicación para ambos rivales.',
    'Juego limpio: se prohíben trampas, automatizaciones que otorguen ventaja, explotación deliberada de fallos, suplantación, manipulación de resultados, alianzas entre rivales y acoso. No se puede obtener información de la transmisión de un rival para usarla en la partida.',
    'Reclamaciones: se presentan en la sala mediante la solicitud de árbitro dentro de los quince minutos siguientes a la publicación del resultado, con identificación de la partida y pruebas. La organización comunica su resolución y permite aportar antecedentes antes de aplicar una sanción.',
    'Sanciones: según la gravedad y las pruebas, pueden consistir en advertencia, pérdida de una partida, pérdida de serie o exclusión. Se documentan la conducta y la decisión; una sanción individual no se extiende sin fundamento a rivales ajenos al hecho.',
    `Premios: el premio total anunciado es ${config.prizePool?.trim() || 'el indicado en la ficha'}. La distribución por puestos se consulta en la ficha y se fija antes del inicio. La organización informa por un canal privado la verificación y entrega; los datos de documentos y teléfono no se publican.`,
    'Cambios: las bases se publican antes de abrir la competición. Los cambios posteriores se anuncian a todos los inscritos antes de aplicarse y no alteran retroactivamente resultados validados. Al inscribirse se aceptan estas bases y las condiciones de uso del juego.',
    'Independencia: este evento no está patrocinado, respaldado ni administrado por Epic Games. La información de inscripción se entrega a la organización del evento y no a Epic Games.'
  ] };
}

export function resolveTournamentRules(config: RulesConfiguration, input: { rulesMode?: unknown; rules?: unknown }): { rules: string[]; rulesMode: RulesMode; rulesTemplateVersion: string | null } {
  const mode = input.rulesMode ?? (config.gameId === 'fortnite' || input.rules === undefined ? 'automatic' : 'custom');
  if (mode !== 'automatic' && mode !== 'custom') throw new Error('Selecciona bases automáticas o personalizadas.');
  // Validate the Fortnite configuration even when the administrator supplies custom rules.
  const preset = getTournamentRulesPreset(config);
  if (mode === 'automatic') return { rules: preset.rules, rulesMode: mode, rulesTemplateVersion: preset.version };
  if (!Array.isArray(input.rules) || input.rules.length < 1 || input.rules.length > 100 || input.rules.some(rule => typeof rule !== 'string' || !rule.trim() || rule.length > 5000)) throw new Error('Ingresa entre 1 y 100 reglas válidas de hasta 5000 caracteres.');
  return { rules: input.rules.map(rule => rule.trim()), rulesMode: mode, rulesTemplateVersion: null };
}

export function formatRulesDocument(title: string, rules: string[]) {
  return `CAOZ ARENA — BASES Y REGLAMENTO\n${title}\n\n${rules.map((rule,index) => `${index+1}. ${rule}`).join('\n\n')}\n`;
}
