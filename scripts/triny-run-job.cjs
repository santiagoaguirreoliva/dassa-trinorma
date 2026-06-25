#!/usr/bin/env node
// Dispara un job de Triny. Dos modos:
//   manual (default):  node scripts/triny-run-job.cjs <key>              → force:true (corre aunque esté disabled, p/ test)
//   programado:        node scripts/triny-run-job.cjs <key> --scheduled → respeta enabled/dry_run de triny_scheduled_jobs
// El modo --scheduled lo usa el crontab del SO (ver `crontab -l`), inmune al bloqueo del event loop de dassa-sgi.
// Uso: node scripts/triny-run-job.cjs <recordatorios_lunes|resumen_viernes|informe_mensual|intimacion_vencidas> [--scheduled]

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const m = require('../server/services/triny-mailer.cjs');

const JOBS = {
  recordatorios_lunes: m.jobRecordatoriosLunes,
  resumen_viernes:     m.jobResumenViernes,
  informe_mensual:     m.jobInformeMensual,
  intimacion_vencidas: m.jobIntimacionVencidas,
};

const key = process.argv[2];
if (!key || !JOBS[key]) {
  console.error('Uso: node scripts/triny-run-job.cjs <' + Object.keys(JOBS).join('|') + '>');
  process.exit(1);
}

const scheduled = process.argv.includes('--scheduled');

(async () => {
  const stamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  console.log(`[triny-run-job][${stamp}] disparando ${key} (modo=${scheduled ? 'scheduled' : 'manual/force'})…`);
  try {
    const r = await JOBS[key](scheduled ? {} : { force: true });
    console.log('[triny-run-job] OK:', JSON.stringify(r));
    process.exit(0);
  } catch (e) {
    console.error('[triny-run-job] ERR:', e.message, e.stack);
    process.exit(2);
  }
})();
