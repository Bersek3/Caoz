const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/tournamentRules.ts');
const loaded = new Module(filename, module);
loaded.paths = module.paths;
loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { getTournamentRulesPreset, FORMAT_LABELS, RULES_TEMPLATE_VERSION } = loaded.exports;
const config = { gameId: 'fortnite', format: 'single_elimination', teamType: 'solo', teamSize: 1, maxParticipants: 8, region: 'LATAM', title: 'Torneo CAOZ Arena', prizePool: 'el publicado en la ficha' };
const base = getTournamentRulesPreset(config);
let document = `# CAOZ Arena: bases y reglamento de Fortnite

Versi\u00f3n ${RULES_TEMPLATE_VERSION}.

Documento general para Battle Royale con construcci\u00f3n. Las bases que rigen cada evento son las guardadas en su ficha, con su formato, modalidad, cupos, horarios, regi\u00f3n y premios. Se pueden descargar desde la pesta\u00f1a Reglamento.

La carga de este documento no crea tablas de clasificaci\u00f3n ni gestiona lobbies de Fortnite. El organizador debe habilitar las salas y validar los resultados. Las clasificaciones Round Robin, suizas y el cuadro inferior requieren la gesti\u00f3n del administrador mientras no exista su automatizaci\u00f3n en la plataforma.

## Bases de ejemplo: individual, eliminaci\u00f3n simple, ocho cupos

${base.rules.map((rule,index) => `${index+1}. ${rule}`).join('\n\n')}

## Variantes por formato y modalidad

`;
for (const format of Object.keys(FORMAT_LABELS)) {
  for (const teamSize of [1,2,3,4]) {
    const preset = getTournamentRulesPreset({ ...config,format,teamType: teamSize === 1 ? 'solo' : 'team',teamSize });
    document += `### ${preset.title}\n\n`;
    // Include the complete snapshot for every variant, not just a list of labels.
    document += preset.rules.map((rule,index) => `${index+1}. ${rule}`).join('\n\n') + '\n\n';
  }
}
const directory = path.resolve(__dirname, '../public/reglamentos');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory,'fortnite-caozarena.md'),document);
console.log('Generated public/reglamentos/fortnite-caozarena.md');
