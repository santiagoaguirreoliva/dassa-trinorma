#!/usr/bin/env node
// Dispara manualmente un job de Triny. Útil cuando un cron quedó atrás.
// Uso: node scripts/triny-run-job.cjs <recordatorios_lunes|resumen_viernes|informe_mensual|intimacion_vencidas>

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

(async () => {
  console.log(`[triny-run-job] disparando ${key}…`);
  try {
    const r = await JOBS[key]({ force: true });
    console.log('[triny-run-job] OK:', JSON.stringify(r));
    process.exit(0);
  } catch (e) {
    console.error('[triny-run-job] ERR:', e.message, e.stack);
    process.exit(2);
  }
})();
