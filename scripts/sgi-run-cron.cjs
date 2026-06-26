#!/usr/bin/env node
// Dispara, desde el crontab del SO, los jobs proactivos de TRINY que antes vivían como
// node-cron in-process en server/index.js. Igual que triny-run-job.cjs (mailer), se sacan
// del event loop de dassa-sgi: a la mañana se saturaba y node-cron descartaba disparos
// ("missed execution"). Proceso node aparte = inmune.
//
// Uso: node scripts/sgi-run-cron.cjs <findings_monthly|trainings_reminders|efficacy_reminders|wakeup>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const JOBS = {
  // Informe mensual de No Conformidades y desvíos (día 1, 08:00 AR)
  findings_monthly: async () => {
    const s = require('../server/services/findings-report.cjs');
    return s.sendMonthlyFindingsReport();
  },
  // Recordatorios de capacitaciones próximas (diario, 07:00 AR)
  trainings_reminders: async () => {
    const s = require('../server/services/trainings-reminders.cjs');
    return s.runTrainingReminders();
  },
  // Recordatorios de verificación de eficacia de NC (diario, 09:00 AR)
  efficacy_reminders: async () => {
    const s = require('../server/services/findings-reminders.cjs');
    return s.runEfficacyReminders();
  },
  // Wake-up: escaneo proactivo cada 6h → notificaciones in-app (reviews ociosas, riesgos
  // sin acción, legales por vencer, objetivos sin medir).
  wakeup: async () => {
    const { generateWakeUpAlerts } = require('../server/services/ai-quality.cjs');
    return generateWakeUpAlerts();
  },
};

const key = process.argv[2];
if (!key || !JOBS[key]) {
  console.error('Uso: node scripts/sgi-run-cron.cjs <' + Object.keys(JOBS).join('|') + '>');
  process.exit(1);
}

(async () => {
  const stamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  console.log(`[sgi-run-cron][${stamp}] disparando ${key}…`);
  try {
    const r = await JOBS[key]();
    console.log('[sgi-run-cron] OK:', JSON.stringify(r));
    process.exit(0);
  } catch (e) {
    console.error('[sgi-run-cron] ERR:', e.message, e.stack);
    process.exit(2);
  }
})();
