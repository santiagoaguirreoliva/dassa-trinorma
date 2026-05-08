// Seed tasks from Comité Mixto SySO meetings (Jan-Apr 2026)
// Run: node server/db/seed_tasks_comite.js
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Get user IDs by email
  const { rows: users } = await pool.query('SELECT id, email, full_name FROM users');
  const byEmail = {};
  users.forEach(u => { byEmail[u.email.toLowerCase()] = u.id; });

  const fernando = byEmail['fernando@dassa.com.ar'];
  const maria    = byEmail['maria@dassa.com.ar'];
  const santiago = byEmail['santiago@dassa.com.ar'];
  const manuel   = byEmail['manuel@dassa.com.ar'];

  if (!fernando || !maria || !santiago || !manuel) {
    console.error('Missing users:', { fernando, maria, santiago, manuel });
    process.exit(1);
  }

  const tasks = [
    { title: "Reparar inundación en la garita del fondo (desagotar y reparar)", assigned_to: maria, due_date: "2026-05-31", priority: "alta", category: "Infraestructura", iso_norm: "ISO 45001", observations: "Viene pendiente desde ene-2026" },
    { title: "Finalizar el baño de los camioneros (revestimiento)", assigned_to: maria, due_date: "2026-05-31", priority: "media", category: "Infraestructura", iso_norm: "ISO 45001", observations: "Tiene mingitorios pero no se ha finalizado" },
    { title: "Definir circulación del despachante en plazoleta + responsable de Dassa para acompañar", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "alta", category: "Seguridad Operacional", iso_norm: "ISO 45001", observations: "Didio Franco Resp. Plazoleta. Hablar con Plazoleta consolidación/desconsolidación" },
    { title: "Capacitación a plazoleteros, grúa y personal de seguridad sobre movimiento de cargas", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "alta", category: "Capacitación SySO", iso_norm: "ISO 45001", status: "en_curso", observations: "Revisar circuito ingreso despachante" },
    { title: "Actualización de perfil de puesto de plazoletero y nuevas responsabilidades", assigned_to: maria, due_date: "2026-05-31", priority: "media", category: "RRHH / SySO", iso_norm: "ISO 45001", observations: "Uso de zapatos seguridad en plazoleta" },
    { title: "Campañas de reciclaje municipalidad Avellaneda - Ecopunto", assigned_to: maria, due_date: "2026-06-30", priority: "media", category: "Medio Ambiente", iso_norm: "ISO 14001", observations: "Llevar residuos y solicitar manifiesto de disposición" },
    { title: "Contactar bomberos para capacitaciones matafuegos y evacuación (costos)", assigned_to: maria, due_date: "2026-05-31", priority: "alta", category: "Capacitación SySO", iso_norm: "ISO 45001" },
    { title: "Disminuir los grupos de capacitaciones y utilizar la sala de reunión", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "media", category: "Capacitación", iso_norm: "ISO 9001", status: "en_curso" },
    { title: "Analizar accidente David Fernández (tercerizado) - aplica contabilizarlo para Dassa", assigned_to: fernando, collaborator_id: maria, due_date: "2026-04-30", priority: "alta", category: "Incidentes SySO", iso_norm: "ISO 45001", observations: "Consultar con empleador + investigación de incidentes. VENCIDA" },
    { title: "Capacitación de puestos de trabajo y normas de seguridad por puesto", assigned_to: manuel, collaborator_id: santiago, due_date: "2026-05-31", priority: "alta", category: "Capacitación SySO", iso_norm: "ISO 45001" },
    { title: "Capacitación de uso de EPP, cinturones de seguridad, protectores auditivos", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "alta", category: "Capacitación SySO", iso_norm: "ISO 45001" },
    { title: "Implementar controles operativos diarios: EPP, limpieza, máquinas, derrames", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "alta", category: "Control Operacional", iso_norm: "ISO 45001", observations: "María 1x/semana aleatorio. Agregar en app sistema" },
    { title: "Medir ruido dentro de cabina containera - definir necesidad protectores auditivos", assigned_to: fernando, due_date: "2026-04-30", priority: "media", category: "Mediciones SySO", iso_norm: "ISO 45001", observations: "VENCIDA - plazo abril 2026" },
    { title: "Capacitar al acompañante del despachante", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "media", category: "Capacitación SySO", iso_norm: "ISO 45001" },
    { title: "Comprar zapatos de seguridad y obligar ingreso con zapatos de seguridad", assigned_to: maria, due_date: "2026-05-31", priority: "alta", category: "EPP / Compras", iso_norm: "ISO 45001" },
    { title: "Portón del canal 4: hacerlo persiana (marcha atrás molesta operatoria)", assigned_to: santiago, collaborator_id: manuel, due_date: "2026-05-31", priority: "media", category: "Infraestructura", iso_norm: "ISO 45001" },
    { title: "Resolver problema personas tomando mate y dejando residuos (mesada tinglado)", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "baja", category: "Orden y Limpieza", iso_norm: "ISO 14001" },
    { title: "Reparar pozos/bachas en plazoleta - falta bache de tinglado", assigned_to: santiago, due_date: "2026-05-31", priority: "alta", category: "Infraestructura", iso_norm: "ISO 45001", observations: "Balanza: reparado. Falta bache tinglado" },
    { title: "Armar nota comunicación: ingreso a instalaciones con zapatos de seguridad", assigned_to: santiago, due_date: "2026-05-31", priority: "media", category: "Comunicación SySO", iso_norm: "ISO 45001" },
    { title: "Definición de Plan de formación 2026", assigned_to: fernando, due_date: "2026-05-31", priority: "alta", category: "Capacitación", iso_norm: "ISO 9001", status: "en_curso", observations: "Arrancar en mayo" },
    { title: "Definición de objetivos 2026", assigned_to: santiago, collaborator_id: manuel, due_date: "2026-04-30", priority: "alta", category: "Estrategia SGI", iso_norm: "Trinorma", observations: "VENCIDA - plazo abril 2026" },
    { title: "Entrega de compost en municipalidad de Avellaneda - documentar", assigned_to: maria, due_date: "2026-04-30", priority: "media", category: "Medio Ambiente", iso_norm: "ISO 14001", observations: "Lo realiza Dassa directamente" },
    { title: "Manifiesto trapos con aceite + darse de alta como generador de residuos especiales", assigned_to: maria, due_date: "2026-04-30", priority: "alta", category: "Residuos Especiales", iso_norm: "ISO 14001", observations: "Juntar 200 litros + llamar proveedor habilitado. VENCIDA" },
    { title: "Problemas con garrafas en autoelevadores", assigned_to: maria, due_date: "2026-04-30", priority: "media", category: "Mantenimiento", iso_norm: "ISO 45001", status: "en_curso" },
    { title: "Proceso de compras en sistema Dassa Tech", assigned_to: santiago, due_date: "2026-04-30", priority: "media", category: "Sistema SGI", iso_norm: "ISO 9001", status: "en_curso" },
    { title: "Colocar cámara elevada en techo para ver si contenedor está roto antes del ingreso", assigned_to: santiago, due_date: "2026-05-31", priority: "alta", category: "Infraestructura / Control", iso_norm: "ISO 9001", observations: "Para resolver problemas con anticipación" },
    { title: "Notificación apertura persiana para ingreso camiones + cartelería", assigned_to: santiago, due_date: "2026-04-30", priority: "media", category: "Seguridad Operacional", iso_norm: "ISO 45001", observations: "VENCIDA - plazo abril 2026" },
    { title: "Reparar mochila de uno de los baños del vestuario", assigned_to: maria, due_date: "2026-04-30", priority: "baja", category: "Infraestructura", iso_norm: "ISO 45001", observations: "VENCIDA" },
    { title: "Revisión de sector de fumadores, colocar sanciones definidas y divulgar", assigned_to: maria, due_date: "2026-04-30", priority: "media", category: "SySO / Comunicación", iso_norm: "ISO 45001", observations: "VENCIDA" },
    { title: "Reciclaje de pallets y hojas - gestionar contacto", assigned_to: fernando, collaborator_id: maria, due_date: "2026-05-31", priority: "baja", category: "Medio Ambiente", iso_norm: "ISO 14001", observations: "Seguimiento más adelante" },
    { title: "OEA - Seguimiento presentación documentación", assigned_to: santiago, due_date: "2026-06-30", priority: "alta", category: "Comercio Exterior", iso_norm: "ISO 9001", status: "en_curso", observations: "Francisco ya está en curso" },
    { title: "Huella de carbono - Análisis paneles solares y otros", assigned_to: santiago, collaborator_id: manuel, due_date: "2026-06-30", priority: "media", category: "Medio Ambiente", iso_norm: "ISO 14001", observations: "Análisis de implementación en la organización" },
  ];

  let count = 0;
  for (const t of tasks) {
    await pool.query(`
      INSERT INTO tasks (title, description, priority, due_date, assigned_to, collaborator_id,
                         created_by, source_module, category, iso_norm, origin_type,
                         origin_detail, observations, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [t.title, t.observations || null, t.priority || 'media', t.due_date,
       t.assigned_to, t.collaborator_id || null, santiago,
       'general', t.category || null, t.iso_norm || null,
       'comite_mixto', 'Minutas Comité Mixto SySO Ene-Abr 2026',
       t.observations || null, t.status || 'pendiente']);
    count++;
    console.log(`  [${count}] ${t.title.substring(0, 60)}...`);
  }

  console.log(`\n✅ ${count} tareas importadas exitosamente`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
