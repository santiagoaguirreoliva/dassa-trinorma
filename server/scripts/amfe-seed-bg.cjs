require("dotenv").config({ path: "/home/dassa/dassa-sgi/.env" });
const { Pool } = require("pg");
const Anthropic = require("@anthropic-ai/sdk");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Sos experto en AMFE para SGI TRINORMA ISO 9001+14001+45001.
Recibís riesgos con: actividad, peligro, factor, probabilidad (1-4), severidad (1-5), controles_actuales.
Devolvé JSON estricto (array) con un objeto por riesgo:
[{
  "code": "R-001",
  "detection": 1-4 (1=detectable obvio; 4=imposible detectar),
  "causes": "string breve",
  "process": "RRHH|Comercial|Operación|Mantenimiento|Compras|Coordinación|Facturación|Dirección|General",
  "recommended_action": "string breve",
  "opportunity": "string si aplica o null"
}]
Reglas detection:
- "automático","biométrico","alarmas","doble control" → 1-2
- "manual","supervisión","planilla","semanal" → 2-3
- "no hay control","solo al final","puntual" → 3-4
Salida: JSON puro sin markdown.`;

(async () => {
  const { rows: risks } = await pool.query(`
    SELECT id, code, activity, hazard, risk_factor, probability, severity, current_controls
    FROM risks WHERE is_active = TRUE ORDER BY code`);
  console.log(`[${new Date().toISOString()}] ${risks.length} riesgos a procesar`);

  let all = [];
  for (let i = 0; i < risks.length; i += 10) {
    const batch = risks.slice(i, i + 10);
    const userMsg = "Procesá:\n" + JSON.stringify(batch.map(r => ({
      code: r.code, activity: r.activity, hazard: r.hazard, risk_factor: r.risk_factor,
      probability: r.probability, severity: r.severity, current_controls: r.current_controls
    })));
    try {
      const resp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }]
      });
      const text = resp.content[0].text;
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) { console.log(`  batch ${i}: sin JSON`); continue; }
      const parsed = JSON.parse(m[0]);
      console.log(`  batch ${i}: ${parsed.length} parseados | tokens ${resp.usage.input_tokens}/${resp.usage.output_tokens}`);
      all.push(...parsed);
    } catch (e) {
      console.log(`  batch ${i}: ERROR ${e.message}`);
    }
  }

  let upd = 0;
  for (const r of all) {
    try {
      await pool.query(`UPDATE risks SET detection=$2, causes=$3, process=$4, recommended_action=$5, opportunity=$6, updated_at=NOW() WHERE code=$1`,
        [r.code, r.detection, r.causes, r.process, r.recommended_action, r.opportunity]);
      upd++;
    } catch (e) { console.log(`  ${r.code} fail: ${e.message}`); }
  }
  console.log(`[${new Date().toISOString()}] ${upd}/${all.length} riesgos actualizados`);
  await pool.end();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
