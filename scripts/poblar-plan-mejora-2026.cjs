#!/usr/bin/env node
// Puebla la capa de gestión del SGI a partir del Plan de Mejora 2025-2026,
// derivado del FODA. Fuente de verdad = docs/PLAN-MEJORA-2026.md (se parsea, no se
// transcribe a mano). Cierra la brecha P0 #8: context_strategies vacía + change_requests
// 2026 = 0 (todas las existentes eran de 2024).
//
//   - context_strategies  ← las 8 líneas estratégicas FODA (FO/FA/DO/DA) con sus acciones
//   - change_requests      ← los 26 proyectos de mejora CC-2026-01..26 (status 'propuesto')
//
// NO toca objectives.current_value (se carga con datos reales, no se inventa).
// Idempotente: change_requests por ON CONFLICT (code); context_strategies por nombre.
// Uso: node scripts/poblar-plan-mejora-2026.cjs [--dry]
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DRY = process.argv.includes('--dry');
const TENANT = '00000000-0000-0000-0000-000000000001';
const DOC = path.join(__dirname, '..', 'docs', 'PLAN-MEJORA-2026.md');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Responsable (texto del plan) → email del user. Orden de chequeo importa.
const RESP_EMAIL = (txt) => {
  if (/SySO/i.test(txt)) return 'fer_ponzi@hotmail.com';
  if (/Marcelo/i.test(txt)) return 'marcelo@dassa.com.ar';
  if (/Guillermo/i.test(txt)) return 'guillermo@dassa.com.ar';
  if (/Mar[ií]a|RRHH/i.test(txt)) return 'maria@dassa.com.ar';
  if (/Nixa/i.test(txt)) return 'nixa.8908@gmail.com';
  if (/Comercial/i.test(txt)) return 'santiago@dassa.com.ar';
  if (/\(Manuel\)|CEO\/Gerente/i.test(txt)) return 'manuel@dassa.com.ar';
  return 'santiago@dassa.com.ar'; // Director / Analista / Tecnología
};

const QUARTER_DEADLINE = { Q1: '2026-03-31', Q2: '2026-06-30', Q3: '2026-09-30', Q4: '2026-12-31' };

function slice(md, startRe, endRe) {
  const s = md.search(startRe);
  const rest = md.slice(s);
  const e = rest.slice(1).search(endRe);
  return e === -1 ? rest : rest.slice(0, e + 1);
}

function parseStrategies(md) {
  const sec = slice(md, /## Estrategias \(8/, /## Proyectos de mejora/);
  const blocks = sec.split(/^### /m).slice(1);
  return blocks.map((b) => {
    const lines = b.split('\n');
    const head = lines[0].trim();
    const m = head.match(/^\[([A-Z]{2})\]\s*(.+)$/);
    if (!m) return null;
    const type = m[1];
    const name = m[2].trim();
    const respLine = lines.find((l) => /^-\s*Responsable:/i.test(l)) || '';
    const responsable = respLine.replace(/^-\s*Responsable:\s*/i, '').trim();
    const descLine = lines.find((l) => /^-\s*Estrategia/i.test(l)) || '';
    const description = descLine.replace(/^-\s*/, '').trim();
    // Acciones = sub-bullets indentados que siguen a "- Acciones:"
    const actions = [];
    let inActions = false;
    for (const l of lines) {
      if (/^-\s*Acciones:/i.test(l)) { inActions = true; continue; }
      if (inActions) {
        const a = l.match(/^\s+-\s+(.+)$/);
        if (a) actions.push(a[1].trim());
        else if (/^-\s/.test(l) || /^#/.test(l)) break;
      }
    }
    return { type, name, description, responsable, actions };
  }).filter(Boolean);
}

function parseProjects(md) {
  const sec = slice(md, /## Proyectos de mejora 2026/, /## Roadmap trimestral/);
  const blocks = sec.split(/^### /m).slice(1);
  return blocks.map((b) => {
    const lines = b.split('\n');
    const head = lines[0].trim();
    const cm = head.match(/^(CC-2026-\d+)\s*·\s*(.+)$/);
    if (!cm) return null;
    const code = cm[1];
    const title = cm[2].trim();
    const meta = lines.find((l) => /^\*\*\[/.test(l)) || '';
    const priority = (meta.match(/\[(P\d)/) || [])[1] || 'P1';
    const quarter = (meta.match(/(Q[1-4])\s*2026/) || [])[1] || 'Q2';
    const objetivos = (meta.match(/OBJ-2026-\d+/g) || []);
    const responsable = (meta.match(/Responsable:\s*(.+?)\s*·\s*Estrategia:/) || [])[1] || '';
    const estrategia = (meta.match(/Estrategia:\s*(.+?)\s*$/) || [])[1] || '';
    // purpose = párrafo(s) entre la meta y la línea _KPI:_
    const metaIdx = lines.indexOf(meta);
    const purposeLines = [];
    let kpi = '';
    for (let i = metaIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^_KPI:_/.test(l.trim())) { kpi = l.trim().replace(/^_KPI:_\s*/, ''); break; }
      if (l.trim()) purposeLines.push(l.trim());
    }
    return { code, title, priority, quarter, objetivos, responsable, estrategia, purpose: purposeLines.join(' ').trim(), kpi };
  }).filter(Boolean);
}

async function main() {
  const md = fs.readFileSync(DOC, 'utf8');
  const strategies = parseStrategies(md);
  const projects = parseProjects(md);
  console.log(`📄 Parseado: ${strategies.length} estrategias · ${projects.length} proyectos`);
  if (strategies.length !== 8) throw new Error(`Esperaba 8 estrategias, parseé ${strategies.length}`);
  if (projects.length !== 26) throw new Error(`Esperaba 26 proyectos, parseé ${projects.length}`);

  // Mapas: email→user_id  y  OBJ code→objective_id
  const { rows: us } = await pool.query('SELECT id, email FROM users WHERE is_active');
  const userByEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  const { rows: objs } = await pool.query('SELECT id, code FROM objectives WHERE year = 2026');
  const objById = Object.fromEntries(objs.map((o) => [o.code, o.id]));

  // Validación de mapeos antes de tocar nada
  for (const s of strategies) {
    if (!userByEmail[RESP_EMAIL(s.responsable)]) throw new Error(`Sin user para estrategia "${s.name}" (${s.responsable})`);
    if (!s.actions.length) throw new Error(`Estrategia sin acciones: ${s.name}`);
  }
  for (const p of projects) {
    if (!userByEmail[RESP_EMAIL(p.responsable)]) throw new Error(`Sin user para ${p.code} (${p.responsable})`);
    const missing = p.objetivos.filter((c) => !objById[c]);
    if (missing.length) throw new Error(`${p.code}: objetivos inexistentes ${missing.join(',')}`);
    if (!p.purpose || !p.kpi) throw new Error(`${p.code}: purpose o KPI vacío`);
  }
  console.log('✅ Mapeos validados (responsables→users, objetivos→ids, textos no vacíos)');

  if (DRY) {
    console.log('\n— DRY RUN —');
    strategies.forEach((s) => console.log(`  [${s.type}] ${s.name}  → ${RESP_EMAIL(s.responsable)} · ${s.actions.length} acciones`));
    projects.forEach((p) => console.log(`  ${p.code} [${p.priority}·${p.quarter}] ${p.title.slice(0, 50)}  → ${RESP_EMAIL(p.responsable)} · obj ${p.objetivos.join(',')}`));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── context_strategies (idempotente por name) ─────────────────────────
    const names = strategies.map((s) => s.name);
    await client.query('DELETE FROM context_strategies WHERE name = ANY($1::text[])', [names]);
    for (const s of strategies) {
      await client.query(
        `INSERT INTO context_strategies (strategy_type, name, description, actions, deadline, responsible_id, status, tenant_id)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,'planned',$7)`,
        [s.type, s.name, s.description, JSON.stringify(s.actions), '2026-12-31', userByEmail[RESP_EMAIL(s.responsable)], TENANT]
      );
    }

    // ── change_requests (idempotente por code; no pisa status si ya avanzó) ─
    for (const p of projects) {
      const impact = `Prioridad ${p.priority} · ${p.quarter} 2026 · Estrategia FODA: ${p.estrategia}.\nKPI: ${p.kpi}`;
      const objIds = p.objetivos.map((c) => objById[c]);
      await client.query(
        `INSERT INTO change_requests
           (code, year, title, purpose, impact_description, related_objective_ids, responsible_id, status, plazo_target, tenant_id)
         VALUES ($1,2026,$2,$3,$4,$5::uuid[],$6,'propuesto',$7,$8)
         ON CONFLICT (code) DO UPDATE SET
           title=EXCLUDED.title, purpose=EXCLUDED.purpose, impact_description=EXCLUDED.impact_description,
           related_objective_ids=EXCLUDED.related_objective_ids, responsible_id=EXCLUDED.responsible_id,
           plazo_target=EXCLUDED.plazo_target, tenant_id=EXCLUDED.tenant_id, updated_at=NOW()`,
        [p.code, p.title, p.purpose, impact, objIds, userByEmail[RESP_EMAIL(p.responsable)], QUARTER_DEADLINE[p.quarter], TENANT]
      );
    }

    await client.query('COMMIT');
    const cs = (await client.query('SELECT count(*) FROM context_strategies')).rows[0].count;
    const cr = (await client.query("SELECT count(*) FROM change_requests WHERE year=2026")).rows[0].count;
    console.log(`\n✅ COMMIT · context_strategies=${cs} · change_requests 2026=${cr}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
