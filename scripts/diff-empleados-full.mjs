// Diff completo MD ↔ BD. Externos Nixa y Toti quedan FUERA de employees
// (van a tabla aparte). Enzo Nieto entra como interno por excepción.
// "María Delgado" se renombra a "María del Carmen Delgado" (mismo id).
import 'dotenv/config';
import pg from 'pg';

const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const EXTERNOS_FUERA_DE_EMPLOYEES = ['Nixa Méndez', 'Toti'];

// 32 personas del MD (filtramos las que NO van a employees)
const PLANTEL_MD = [
  { name: 'Santiago Aguirre Oliva', position: 'Director General / Líder SGI', sector: 'Dirección', supervisor: null },
  { name: 'Manuel De La Arena', position: 'CEO / Gerente General', sector: 'Gerencia', supervisor: null },
  { name: 'Francisco Urtubey', position: 'Representante Legal y Técnica', sector: 'Dirección', supervisor: null },
  { name: 'Nixa Méndez', position: 'Directora SGI', sector: 'Dirección', supervisor: 'Santiago Aguirre Oliva' },
  { name: 'Facundo Lastra', position: 'Responsable de Tecnología', sector: 'Tecnología', supervisor: 'Santiago Aguirre Oliva' },
  { name: 'Christian Medina', position: 'Gerente de Operaciones', sector: 'Operaciones', supervisor: 'Manuel De La Arena' },
  { name: 'Guillermo Jorge', position: 'Vendedor', sector: 'Comercial', supervisor: 'Manuel De La Arena' },
  { name: 'Alexis Dalpra', position: 'Vendedor', sector: 'Comercial', supervisor: 'Manuel De La Arena' },
  { name: 'Enzo Nieto', position: 'Vendedor', sector: 'Comercial', supervisor: 'Manuel De La Arena' },
  { name: 'María del Carmen Delgado', position: 'Administración General / RRHH', sector: 'Administración', supervisor: 'Manuel De La Arena' },
  { name: 'Maira Herrera', position: 'Facturación · Cobranzas · Asist. Dirección', sector: 'Administración', supervisor: 'Manuel De La Arena' },
  { name: 'Fernando Ponzi', position: 'Responsable SySO', sector: 'Seguridad e Higiene', supervisor: 'María del Carmen Delgado' },
  { name: 'Toti', position: 'Mantenimiento', sector: 'Operaciones', supervisor: 'María del Carmen Delgado' },
  { name: 'Marcelo Stizza', position: 'Supervisor de Depósito', sector: 'Depósito', supervisor: 'Christian Medina' },
  { name: 'Marcos Coria', position: 'Administrativo de Exportación', sector: 'Coordinación', supervisor: 'Christian Medina' },
  { name: 'Alan Santibañez', position: 'Administrativo de Importación', sector: 'Coordinación', supervisor: 'Christian Medina' },
  { name: 'Luna Villar', position: 'Administrativo de Tráfico', sector: 'Coordinación', supervisor: 'Christian Medina' },
  { name: 'Carlos Vera', position: 'Personal de Puerto', sector: 'Coordinación IMPO', supervisor: 'Alan Santibañez' },
  { name: 'Pepo', position: 'Personal de Puerto (Exolgan)', sector: 'Coordinación IMPO', supervisor: 'Alan Santibañez' },
  { name: 'Cristian Andreini', position: 'Balancero', sector: 'Depósito', supervisor: 'Christian Medina' },
  { name: 'Franco Di Dio', position: 'Plazoletero', sector: 'Depósito', supervisor: 'Cristian Andreini' },
  { name: 'Franco Pérez', position: 'Apuntador', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Claudio Estigarribia', position: 'Apuntador — Controlador EXPO', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Federico Estigarribia', position: 'Apuntador — Controlador IMPO', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Nicolás Nuñez', position: 'Apuntador — Esp. Mudanzas', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Maximiliano Sandoval', position: 'Operario Carga y Descarga', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Mario Goroso', position: 'Operario Carga y Descarga', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Emmanuel Fernández', position: 'Maquinista', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Fabián Fuentes', position: 'Maquinista', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Matías Díaz', position: 'Maquinista Containera', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Rodolfo Espíndola', position: 'Maquinista', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
  { name: 'Lidia Miño', position: 'Maestranza', sector: 'Depósito', supervisor: 'Marcelo Stizza' },
];

const PLANTEL = PLANTEL_MD.filter(p => !EXTERNOS_FUERA_DE_EMPLOYEES.includes(p.name));

function norm(s) { return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim(); }

const dbRows = (await p.query('SELECT id, full_name, position, sector, is_active FROM employees ORDER BY full_name')).rows;

// Match: incluye alias "María Delgado" → "María del Carmen Delgado"
const aliasMap = { 'maria del carmen delgado': ['maria delgado'] };
function findInDb(mdName) {
  const n = norm(mdName);
  const direct = dbRows.find(d => norm(d.full_name) === n);
  if (direct) return direct;
  for (const alias of (aliasMap[n] || [])) {
    const al = dbRows.find(d => norm(d.full_name) === alias);
    if (al) return al;
  }
  return null;
}

console.log('='.repeat(70));
console.log('PLAN DE CAMBIOS · empleados (excluye externos Nixa y Toti)');
console.log('='.repeat(70));
console.log(`Plantel objetivo: ${PLANTEL.length} personas · BD actual: ${dbRows.length} · Plantel total MD: ${PLANTEL_MD.length}`);
console.log('');

// Cambios fila a fila
console.log('─── ALTAS NUEVAS ───────────────────────────────────────────────────');
let alta = 0;
for (const p of PLANTEL) {
  if (!findInDb(p.name)) {
    alta++;
    console.log(`  + ${p.name.padEnd(28)} | ${p.position} | ${p.sector} | sup: ${p.supervisor || '—'}`);
  }
}
if (!alta) console.log('  (ninguna)');
console.log('');

console.log('─── RENAME ─────────────────────────────────────────────────────────');
let rn = 0;
for (const p of PLANTEL) {
  const d = findInDb(p.name);
  if (d && norm(d.full_name) !== norm(p.name)) {
    rn++;
    console.log(`  ↻ "${d.full_name}" → "${p.name}" (id ${d.id.slice(0,8)}…)`);
  }
}
if (!rn) console.log('  (ninguno)');
console.log('');

console.log('─── UPDATE PUESTO / SECTOR ────────────────────────────────────────');
let upd = 0;
for (const p of PLANTEL) {
  const d = findInDb(p.name);
  if (!d) continue;
  const posDiff = norm(p.position) !== norm(d.position || '');
  const secDiff = norm(p.sector) !== norm(d.sector || '');
  if (posDiff || secDiff) {
    upd++;
    console.log(`  ${String(upd).padStart(2)}. ${p.name}`);
    if (posDiff) console.log(`      puesto: "${d.position || '—'}" → "${p.position}"`);
    if (secDiff) console.log(`      sector: "${d.sector || '—'}" → "${p.sector}"`);
  }
}
if (!upd) console.log('  (ningún cambio)');
console.log('');

console.log('─── SOBRA EN BD (en plantel BD pero no en MD ni alias) ────────────');
let extra = 0;
for (const d of dbRows) {
  const inMd = PLANTEL.some(p => {
    const n = norm(p.name);
    return n === norm(d.full_name) || (aliasMap[n] || []).includes(norm(d.full_name));
  });
  if (!inMd && d.is_active) {
    extra++;
    console.log(`  - ${d.full_name.padEnd(28)} | ${d.position || '—'} | ${d.sector || '—'}`);
  }
}
if (!extra) console.log('  (ninguno)');
console.log('');

console.log('─── SUPERVISOR_ID a setear ────────────────────────────────────────');
let sup = 0;
for (const p of PLANTEL) {
  if (!p.supervisor) continue;
  sup++;
  console.log(`  ${String(sup).padStart(2)}. ${p.name.padEnd(28)} → supervisor: ${p.supervisor}`);
}
console.log('');

console.log('='.repeat(70));
console.log(`RESUMEN · ALTAS: ${alta} · RENAMES: ${rn} · UPDATES: ${upd} · SOBRA: ${extra} · SUPERVISORES: ${sup}`);
console.log('='.repeat(70));

await p.end();
