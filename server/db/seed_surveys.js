// Seed: Import 4 surveys from Google Forms + 22 employees with evaluators
// Run: node server/db/seed_surveys.js
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // ─── Get system user IDs ─────────────────────────────────────
  const { rows: users } = await pool.query('SELECT id, email, full_name FROM users WHERE is_active = true');
  const byEmail = {};
  users.forEach(u => { byEmail[u.email.toLowerCase()] = u; });

  const santiago = byEmail['santiago@dassa.com.ar'];
  const manuel = byEmail['manuel@dassa.com.ar'];
  const marcelo = byEmail['marcelo@dassa.com.ar'];
  const christian = byEmail['christian@dassa.com.ar'];
  const maria = byEmail['maria@dassa.com.ar'];
  const maira = byEmail['mairah@dassa.com.ar'];
  const fernando = byEmail['fer_ponzi@hotmail.com'];

  // ─── Create Employees (nómina) ───────────────────────────────
  console.log('\n=== Creating employees ===');

  // Helper: insert employee and return id
  async function addEmp(name, sector, position, userId) {
    const { rows } = await pool.query(
      `INSERT INTO employees (full_name, sector, position, user_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING RETURNING id`,
      [name, sector, position, userId || null]);
    if (rows[0]) return rows[0].id;
    // Already exists? find it
    const { rows: existing } = await pool.query('SELECT id FROM employees WHERE full_name = $1', [name]);
    return existing[0]?.id;
  }

  // Employees with system users (management/admin)
  const empSantiago = await addEmp('Santiago Aguirre Oliva', 'Dirección', 'Director General', santiago?.id);
  const empManuel = await addEmp('Manuel De La Arena', 'SGI', 'Líder SGI', manuel?.id);
  const empMarcelo = await addEmp('Marcelo Stizza', 'Operaciones', 'Supervisor Operaciones', marcelo?.id);
  const empChristian = await addEmp('Christian Medina', 'Operaciones', 'Supervisor Operaciones', christian?.id);
  const empMaria = await addEmp('María Delgado', 'RRHH / SySO', 'Responsable RRHH', maria?.id);
  const empMaira = await addEmp('Maira Herrera', 'Administración', 'Administrativa', maira?.id);
  const _empFernando = await addEmp('Fernando Ponzi', 'Seguridad e Higiene', 'Responsable SySO', fernando?.id);

  // Operarios evaluados por Marcelo + Christian
  const operarios = [
    ['Federico Estigarribia', 'Operaciones', 'Operario'],
    ['Mario Goroso', 'Operaciones', 'Operario'],
    ['Fabián Fuentes', 'Operaciones', 'Operario'],
    ['Cristian Andreini', 'Operaciones', 'Operario'],
    ['Maximiliano Sandoval', 'Operaciones', 'Operario'],
    ['Claudio Estigarribia', 'Operaciones', 'Operario'],
    ['Rodolfo Espíndola', 'Operaciones', 'Operario'],
    ['Franco Di Dio', 'Operaciones', 'Operario'],
    ['Nicolás Nuñez', 'Operaciones', 'Operario'],
    ['Franco Pérez', 'Operaciones', 'Operario'],
    ['Matías Díaz', 'Operaciones', 'Operario'],
    ['Emmanuel Fernández', 'Operaciones', 'Operario'],
  ];

  for (const [name, sector, pos] of operarios) {
    const eid = await addEmp(name, sector, pos, null);
    await pool.query('UPDATE employees SET evaluator_id = $1, secondary_evaluator_id = $2 WHERE id = $3',
      [empMarcelo, empChristian, eid]);
  }

  // Evaluados por Christian
  const christianTeam = [
    ['Alan Santibañez', 'Operaciones', 'Operario'],
    ['Marcos Coria', 'Operaciones', 'Operario'],
    ['Luna Villar', 'Operaciones', 'Operario/a'],
  ];
  for (const [name, sector, pos] of christianTeam) {
    const eid = await addEmp(name, sector, pos, null);
    await pool.query('UPDATE employees SET evaluator_id = $1 WHERE id = $2', [empChristian, eid]);
  }
  // Marcelo evaluado por Christian
  await pool.query('UPDATE employees SET evaluator_id = $1 WHERE id = $2', [empChristian, empMarcelo]);

  // Evaluados por Santiago + Manuel
  const adminTeam = [
    { id: empChristian },
    { id: empMaria },
    await addEmp('Lidia Miño', 'Administración', 'Administrativa', null),
    { id: empMaira },
    await addEmp('Alexis Dalpra', 'Sistemas', 'Sistemas', null),
    await addEmp('Guillermo Jorge', 'Comercial', 'Comercial', null),
  ];
  for (const e of adminTeam) {
    const eid = typeof e === 'string' ? e : e.id || e;
    await pool.query('UPDATE employees SET evaluator_id = $1, secondary_evaluator_id = $2 WHERE id = $3',
      [empSantiago, empManuel, eid]);
  }

  // Santiago and Manuel are NOT evaluated
  await pool.query('UPDATE employees SET evaluator_id = NULL, secondary_evaluator_id = NULL WHERE id IN ($1, $2)',
    [empSantiago, empManuel]);

  console.log('  22 employees created with evaluators');

  // ─── Survey 1: Encuesta Clientes Visitas (Depósito) ──────────
  console.log('\n=== Creating surveys ===');

  const { rows: [s1] } = await pool.query(`
    INSERT INTO surveys (title, description, type, target, frequency, is_anonymous, created_by)
    VALUES ($1, $2, 'survey', 'external', 'semestral', false, $3) RETURNING id`,
    ['Encuesta de Satisfacción — Clientes Visitas (Depósito)',
     'Encuesta para clientes que visitan presencialmente las instalaciones de DASSA. Evalúa calidad de atención, operaciones, seguridad y medio ambiente.',
     santiago?.id]);

  const s1Questions = [
    { text: 'Nombre completo', type: 'short_text', section: 'Datos del cliente' },
    { text: 'Empresa / Cliente', type: 'short_text', section: 'Datos del cliente' },
    { text: '¿Cuáles son las actividades que realiza con mayor frecuencia en Dassa?', type: 'checkbox', section: 'Actividad',
      options: ['Verificación IMPO / Retiro de House', 'Verificación / Retiro IMPO carga suelta', 'Ingreso EXPO / Canal', 'Verificación EXPO / Remisión a puerto', 'Operaciones de movimiento IMPO/EXPO', 'Operaciones con mercadería peligrosa (IMO)'] },
    { text: '¿Conoce los procedimientos operativos y administrativos de Dassa?', type: 'yes_no', section: 'Conocimiento' },
    { text: 'Calidad de atención del personal de Coordinación', type: 'scale_1_10', section: 'Calidad de Servicio', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Calidad de atención del personal de Depósito / Plazoleta', type: 'scale_1_10', section: 'Calidad de Servicio', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Calidad y agilidad de la Aduana local', type: 'scale_1_10', section: 'Calidad de Servicio', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Estado y calidad de la mercadería', type: 'scale_1_10', section: 'Operaciones', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Calidad de manipulación, entrega y consolidación de carga', type: 'scale_1_10', section: 'Operaciones', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Eficiencia en los tiempos operativos', type: 'scale_1_10', section: 'Operaciones', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Sistema de seguridad y control de acceso', type: 'multiple_choice', section: 'Seguridad',
      options: ['Inexistente', 'Deficiente', 'Amigable', 'Cumple', 'Intensivo', 'Fortaleza'] },
    { text: 'Circulación interna y señalización', type: 'multiple_choice', section: 'Seguridad',
      options: ['Inexistente', 'Deficiente / Peligrosa', 'Intuitiva / Adecuada', 'Confusa / Incómoda', 'Excesivamente restrictiva'] },
    { text: '¿Recomendaría nuestros servicios?', type: 'multiple_choice', section: 'Recomendación',
      options: ['Para nada', 'Quizás', 'Sin dudas'] },
    { text: 'Sugerencias de mejora', type: 'long_text', required: false, section: 'Comentarios' },
    { text: 'Comentarios adicionales', type: 'long_text', required: false, section: 'Comentarios' },
    { text: '¿Su representante comercial se contacta directamente con usted?', type: 'yes_no', section: 'Comercial' },
    { text: '¿Ha recibido información clara sobre medidas de seguridad y salud?', type: 'scale_1_5', section: 'SySO / Medio Ambiente', scale_labels: { min: 'Nada', max: 'Totalmente' } },
    { text: '¿Se siente seguro/a y cómodo/a en las instalaciones?', type: 'multiple_choice', section: 'SySO / Medio Ambiente',
      options: ['NO', 'Indiferente', 'Algo', 'SI', 'SUPER'] },
    { text: 'Limpieza de instalaciones y gestión ambiental', type: 'scale_1_5', section: 'SySO / Medio Ambiente', scale_labels: { min: 'Muy malo', max: 'Excelente' } },
    { text: '¿Cómo percibe las iniciativas de sustentabilidad de Dassa?', type: 'multiple_choice', section: 'SySO / Medio Ambiente',
      options: ['Inexistente', 'Deficiente', 'Cumple', 'Sobresaliente'] },
    { text: '¿Conoce las políticas de seguridad y salud laboral de Dassa?', type: 'multiple_choice', section: 'SySO / Medio Ambiente',
      options: ['Inexistente', 'Deficiente', 'Cumple', 'Sobresaliente'] },
    { text: '¿Le interesaría recibir información sobre sustentabilidad y seguridad?', type: 'yes_no', section: 'SySO / Medio Ambiente' },
    { text: 'Calificación general de la empresa', type: 'stars_1_5', section: 'Calificación General' },
  ];

  for (let i = 0; i < s1Questions.length; i++) {
    const q = s1Questions[i];
    await pool.query(`INSERT INTO survey_questions (survey_id, sort_order, question_text, question_type, options, scale_labels, is_required, section)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s1.id, i + 1, q.text, q.type, q.options ? JSON.stringify(q.options) : null,
       q.scale_labels ? JSON.stringify(q.scale_labels) : null, q.required !== false, q.section || null]);
  }
  console.log(`  [1] Encuesta Clientes Visitas: ${s1Questions.length} preguntas`);

  // ─── Survey 2: Encuesta Clientes Mail (Oficina) ──────────────
  const { rows: [s2] } = await pool.query(`
    INSERT INTO surveys (title, description, type, target, frequency, is_anonymous, created_by)
    VALUES ($1, $2, 'survey', 'external', 'semestral', false, $3) RETURNING id`,
    ['Encuesta de Satisfacción — Clientes Mail (Oficina)',
     'Encuesta para clientes que interactúan de forma remota por mail/teléfono. Evalúa calidad de atención, respuesta comercial, tecnología y sustentabilidad.',
     santiago?.id]);

  const s2Questions = [
    { text: 'Nombre completo', type: 'short_text', section: 'Datos del cliente' },
    { text: 'Empresa / Cliente', type: 'short_text', section: 'Datos del cliente' },
    { text: 'Cargo o sector', type: 'short_text', section: 'Datos del cliente' },
    { text: 'Calidad de atención, tiempos de respuesta y claridad de información del sector Coordinación', type: 'scale_1_10', section: 'Calidad de Servicio', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Calidad de manipulación, condición de almacenamiento y presentación de sus cargas', type: 'scale_1_10', section: 'Calidad de Servicio', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Si experimentó desvíos o problemas, ¿cómo califica la respuesta y gestión comercial?', type: 'scale_1_10', section: 'Calidad de Servicio', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: '¿Recomendaría nuestros servicios a otras empresas?', type: 'multiple_choice', section: 'Recomendación',
      options: ['Para nada', 'Quizás', 'Sin dudas'] },
    { text: '¿Consideraría contratar servicios complementarios con DASSA?', type: 'multiple_choice', section: 'Comercial',
      options: ['Para nada', 'Quizás', 'Sin dudas'] },
    { text: '¿Qué servicios complementarios le interesan?', type: 'long_text', required: false, section: 'Comercial' },
    { text: 'Relevancia de logros recientes de DASSA (habilitación mercadería peligrosa, certificación Trinorma)', type: 'scale_1_10', section: 'Imagen', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: 'Soporte, calidad de respuesta e impacto de su representante comercial', type: 'scale_1_10', section: 'Comercial', scale_labels: { min: 'Insuficiente', max: 'Excelente' } },
    { text: '¿Qué tan útiles le resultan las nuevas automatizaciones y tecnologías implementadas?', type: 'scale_1_5', section: 'Tecnología', scale_labels: { min: 'Poco útil', max: 'Muy útil' } },
    { text: 'Sugerencias para mejorar la experiencia tecnológica/digital', type: 'long_text', required: false, section: 'Tecnología' },
    { text: 'Canales de comunicación preferidos', type: 'checkbox', section: 'Comunicación',
      options: ['Email', 'Teléfono fijo', 'Celular', 'WhatsApp', 'Portal autogestión'] },
    { text: '¿Cómo preferiría gestionar solicitudes de turnos, cotizaciones, facturas?', type: 'multiple_choice', section: 'Comunicación',
      options: ['Email', 'WhatsApp Business BOT', 'Portal web autogestión', 'Me da igual / Me adapto'] },
    { text: '¿DASSA demuestra preocupación por la gestión ambiental?', type: 'multiple_choice', section: 'Sustentabilidad',
      options: ['Inexistente', 'Deficiente', 'Cumple', 'Sobresaliente'] },
    { text: '¿Ha recibido información clara sobre medidas de seguridad y salud?', type: 'yes_no', section: 'Sustentabilidad' },
    { text: '¿Qué tan importantes son las prácticas sustentables y responsables de sus socios comerciales?', type: 'scale_1_5', section: 'Sustentabilidad', scale_labels: { min: 'Nada importante', max: 'Muy importante' } },
    { text: 'Sugerencias para mejorar servicios, experiencia o prácticas de seguridad/ambiente', type: 'long_text', required: false, section: 'Comentarios' },
    { text: 'Comentarios sobre experiencias positivas o negativas', type: 'long_text', required: false, section: 'Comentarios' },
    { text: 'Calificación general de la empresa', type: 'stars_1_5', section: 'Calificación General' },
  ];

  for (let i = 0; i < s2Questions.length; i++) {
    const q = s2Questions[i];
    await pool.query(`INSERT INTO survey_questions (survey_id, sort_order, question_text, question_type, options, scale_labels, is_required, section)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s2.id, i + 1, q.text, q.type, q.options ? JSON.stringify(q.options) : null,
       q.scale_labels ? JSON.stringify(q.scale_labels) : null, q.required !== false, q.section || null]);
  }
  console.log(`  [2] Encuesta Clientes Mail: ${s2Questions.length} preguntas`);

  // ─── Survey 3: Clima Organizacional ──────────────────────────
  const { rows: [s3] } = await pool.query(`
    INSERT INTO surveys (title, description, type, target, frequency, is_anonymous, created_by)
    VALUES ($1, $2, 'climate', 'internal', 'semestral', true, $3) RETURNING id`,
    ['Encuesta de Clima Organizacional',
     'Encuesta interna de clima organizacional y desempeño profesional. Anónima. Se realiza cada 6 meses para todo el equipo DASSA.',
     santiago?.id]);

  const s3Questions = [
    { text: 'Satisfacción general trabajando en DASSA', type: 'scale_1_5', section: 'Satisfacción General', scale_labels: { min: 'Muy insatisfecho/a', max: 'Muy satisfecho/a' } },
    { text: 'Satisfacción con las metodologías y dinámicas de trabajo actuales', type: 'scale_1_5', section: 'Satisfacción General', scale_labels: { min: 'Muy insatisfecho/a', max: 'Muy satisfecho/a' } },
    { text: 'Comunicación interna e interdepartamental', type: 'scale_1_5', section: 'Comunicación', scale_labels: { min: 'Muy pobre', max: 'Excelente' } },
    { text: '¿Siente que su trabajo es valorado por la empresa?', type: 'scale_1_5', section: 'Reconocimiento', scale_labels: { min: 'Nunca', max: 'Siempre' } },
    { text: 'Satisfacción con su puesto de trabajo', type: 'scale_1_5', section: 'Puesto', scale_labels: { min: 'Muy insatisfecho/a', max: 'Muy satisfecho/a' } },
    { text: 'Claridad sobre su descripción de puesto y responsabilidades', type: 'scale_1_5', section: 'Puesto', scale_labels: { min: 'Nada claro', max: 'Clarísimo' } },
    { text: '¿Se siente motivado/a por los objetivos de su departamento?', type: 'scale_1_5', section: 'Motivación', scale_labels: { min: 'Nunca', max: 'Siempre' } },
    { text: '¿Qué fue lo que más disfrutó de su trabajo este año?', type: 'long_text', section: 'Reflexión' },
    { text: '¿Tiene tiempo suficiente para completar sus objetivos y tareas?', type: 'scale_1_5', section: 'Recursos', scale_labels: { min: 'Nunca', max: 'Siempre' } },
    { text: '¿Dispone de las herramientas necesarias para cumplir con sus tareas?', type: 'scale_1_5', section: 'Recursos', scale_labels: { min: 'Nunca', max: 'Siempre' } },
    { text: 'Oportunidades de crecimiento y desarrollo profesional', type: 'scale_1_5', section: 'Desarrollo', scale_labels: { min: 'Muy pobre', max: 'Excelente' } },
    { text: '¿Le interesaría cambiar de puesto o rol?', type: 'multiple_choice', section: 'Desarrollo', options: ['Sí', 'Tal vez', 'No'] },
    { text: 'Evaluación del liderazgo y dirección de su superior', type: 'scale_1_5', section: 'Liderazgo', scale_labels: { min: 'Nunca útil ni claro', max: 'Siempre inspirador y claro' } },
    { text: 'Gestión de conflictos en el trabajo', type: 'scale_1_5', section: 'Liderazgo', scale_labels: { min: 'Muy mal', max: 'Muy bien' } },
    { text: '¿Qué desafíos enfrentó y cómo los superó?', type: 'long_text', section: 'Reflexión' },
    { text: '¿Qué mejoras implementaría en el equipo o la empresa?', type: 'long_text', section: 'Mejoras' },
    { text: '¿Algo más que quiera compartir sobre su experiencia en DASSA?', type: 'long_text', section: 'Comentarios' },
    { text: '¿Qué le gustaría aprender o desarrollar el próximo año?', type: 'long_text', section: 'Desarrollo' },
    { text: 'Otros comentarios', type: 'long_text', required: false, section: 'Comentarios' },
  ];

  for (let i = 0; i < s3Questions.length; i++) {
    const q = s3Questions[i];
    await pool.query(`INSERT INTO survey_questions (survey_id, sort_order, question_text, question_type, options, scale_labels, is_required, section)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s3.id, i + 1, q.text, q.type, q.options ? JSON.stringify(q.options) : null,
       q.scale_labels ? JSON.stringify(q.scale_labels) : null, q.required !== false, q.section || null]);
  }
  console.log(`  [3] Clima Organizacional: ${s3Questions.length} preguntas`);

  // ─── Survey 4: Evaluación de Desempeño ───────────────────────
  const { rows: [s4] } = await pool.query(`
    INSERT INTO surveys (title, description, type, target, frequency, is_anonymous, created_by)
    VALUES ($1, $2, 'evaluation', 'individual', 'anual', false, $3) RETURNING id`,
    ['Evaluación de Desempeño Individual',
     'Evaluación anual de desempeño por empleado. Incluye autoevaluación y evaluación del supervisor. Vence en diciembre de cada año.',
     santiago?.id]);

  const s4Questions = [
    // Escala 1-5: Muy Bajo, Bajo, Moderado, Alto, Muy Alto
    { text: 'Termina su trabajo oportunamente', type: 'scale_1_5', section: 'Productividad', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Cumple con las tareas que se le encomienda', type: 'scale_1_5', section: 'Productividad', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Realiza un volumen adecuado de trabajo', type: 'scale_1_5', section: 'Productividad', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'No comete errores en el trabajo', type: 'scale_1_5', section: 'Calidad', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Hace uso racional de los recursos', type: 'scale_1_5', section: 'Calidad', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'No requiere de supervisión frecuente', type: 'scale_1_5', section: 'Calidad', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se muestra profesional en el trabajo', type: 'scale_1_5', section: 'Relaciones Interpersonales', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se muestra respetuoso y amable en el trato', type: 'scale_1_5', section: 'Relaciones Interpersonales', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se muestra cortés con el personal y compañeros', type: 'scale_1_5', section: 'Relaciones Interpersonales', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Brinda adecuada orientación a sus compañeros', type: 'scale_1_5', section: 'Relaciones Interpersonales', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Evita los conflictos dentro del trabajo', type: 'scale_1_5', section: 'Relaciones Interpersonales', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Muestra nuevas ideas para mejorar los procesos', type: 'scale_1_5', section: 'Iniciativa', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se muestra asequible a los cambios', type: 'scale_1_5', section: 'Iniciativa', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se anticipa a las dificultades', type: 'scale_1_5', section: 'Iniciativa', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Tiene gran capacidad para resolver problemas', type: 'scale_1_5', section: 'Iniciativa', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Muestra aptitud para integrarse al equipo', type: 'scale_1_5', section: 'Trabajo en Equipo', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se identifica fácilmente con los objetivos del equipo', type: 'scale_1_5', section: 'Trabajo en Equipo', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Planifica sus actividades con anticipación', type: 'scale_1_5', section: 'Organización', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Hace uso de indicadores operativos o KPIs', type: 'scale_1_5', section: 'Organización', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: 'Se preocupa por alcanzar las metas propuestas', type: 'scale_1_5', section: 'Organización', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: '¿Cómo calificarías la colaboración dentro del equipo de tu sector?', type: 'scale_1_5', section: 'Equipo', scale_labels: { min: 'Muy bajo', max: 'Muy alto' } },
    { text: '¿Puedes proporcionar ejemplos específicos de logros en tus responsabilidades clave?', type: 'long_text', section: 'Reflexión' },
    { text: '¿Hubo algún desafío que enfrentaste que te haya llevado al límite? ¿Cómo lo abordaste?', type: 'long_text', section: 'Reflexión' },
    { text: '¿Alcanzaste tus objetivos y metas personales para este año? ¿Tienes metas para el próximo año?', type: 'long_text', section: 'Objetivos' },
    { text: '¿Sientes que la comunicación dentro del equipo fue efectiva? ¿Alguna mejora a sugerir?', type: 'long_text', section: 'Comunicación' },
    { text: '¿Has logrado un equilibrio adecuado entre el trabajo y tu vida personal? ¿Qué apoyo necesitarías?', type: 'long_text', section: 'Bienestar' },
    { text: '¿Cuáles crees que deberían ser los KPIs que debemos medir el próximo año desde tu sector?', type: 'long_text', section: 'KPIs' },
    { text: '¿Hay alguna área de atención al cliente o servicio que debamos mejorar?', type: 'long_text', section: 'Mejoras' },
    { text: '¿Qué nuevas herramientas o recursos te ayudarían a potenciar tu trabajo?', type: 'long_text', section: 'Recursos' },
    { text: '¿Tienes sugerencias para mejoras en la oficina, cultura o valores de DASSA?', type: 'long_text', section: 'Cultura' },
    { text: '¿En qué áreas de formación te gustaría recibir capacitación?', type: 'long_text', section: 'Formación' },
    { text: '¿Tienes alguna otra recomendación o comentario para el próximo año?', type: 'long_text', required: false, section: 'Comentarios' },
  ];

  for (let i = 0; i < s4Questions.length; i++) {
    const q = s4Questions[i];
    await pool.query(`INSERT INTO survey_questions (survey_id, sort_order, question_text, question_type, options, scale_labels, is_required, section)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s4.id, i + 1, q.text, q.type, q.options ? JSON.stringify(q.options) : null,
       q.scale_labels ? JSON.stringify(q.scale_labels) : null, q.required !== false, q.section || null]);
  }
  console.log(`  [4] Evaluación de Desempeño: ${s4Questions.length} preguntas`);

  console.log('\n✅ Seed completed successfully!');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
