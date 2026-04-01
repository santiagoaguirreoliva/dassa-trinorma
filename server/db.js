import pg from 'pg';
import bcryptjs from 'bcryptjs';

const { Pool } = pg;

// Support both local and Railway PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

// Helper: run a query and return the pg Result object
export const query = (text, params = []) => pool.query(text, params);

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'usuario', 'auditor')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sistema_gestion (
      id SERIAL PRIMARY KEY,
      section TEXT NOT NULL UNIQUE CHECK(section IN ('mision', 'vision', 'valores', 'politica_calidad', 'politica_gestion', 'mapa_procesos', 'partes_interesadas')),
      content TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      position TEXT,
      department TEXT,
      hire_date DATE,
      status TEXT NOT NULL CHECK(status IN ('activo', 'inactivo')),
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('procedimiento', 'instruccion', 'registro', 'manual')),
      norma TEXT NOT NULL CHECK(norma IN ('ISO 9001', 'ISO 14001', 'ISO 45001', 'MIXTO')),
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL CHECK(status IN ('vigente', 'borrador', 'en_revision', 'obsoleto')),
      review_date DATE,
      file_url TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('incidente', 'accidente')),
      date DATE NOT NULL,
      area TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('leve', 'moderado', 'grave', 'muy_grave')),
      status TEXT NOT NULL CHECK(status IN ('abierto', 'en_investigacion', 'cerrado')),
      description TEXT,
      employee_id INTEGER REFERENCES employees(id),
      corrective_action TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS environmental_aspects (
      id SERIAL PRIMARY KEY,
      aspect TEXT NOT NULL,
      activity TEXT,
      impact TEXT,
      frequency INTEGER CHECK(frequency >= 1 AND frequency <= 5),
      severity INTEGER CHECK(severity >= 1 AND severity <= 5),
      detection INTEGER CHECK(detection >= 1 AND detection <= 5),
      significance REAL,
      is_significant BOOLEAN,
      control_measure TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_surveys (
      id SERIAL PRIMARY KEY,
      customer_name TEXT,
      date DATE NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
      comments TEXT,
      category TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trainings (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('induccion', 'capacitacion', 'simulacro', 'auditoria')),
      date DATE NOT NULL,
      duration_hours REAL,
      instructor TEXT,
      status TEXT NOT NULL CHECK(status IN ('planificada', 'en_curso', 'completada', 'cancelada')),
      department TEXT,
      max_participants INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS training_employees (
      id SERIAL PRIMARY KEY,
      training_id INTEGER NOT NULL REFERENCES trainings(id),
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      attendance BOOLEAN,
      score REAL,
      certificate_url TEXT,
      UNIQUE(training_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS findings (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT CHECK(type IN ('nc', 'observacion', 'oportunidad')),
      description TEXT,
      norma TEXT,
      area TEXT,
      status TEXT CHECK(status IN ('abierto', 'en_proceso', 'cerrado')),
      due_date DATE,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_matrix (
      id SERIAL PRIMARY KEY,
      process TEXT NOT NULL,
      risk TEXT NOT NULL,
      probability INTEGER CHECK(probability >= 1 AND probability <= 5),
      impact INTEGER CHECK(impact >= 1 AND impact <= 5),
      risk_level REAL,
      mitigation TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS legal_requirements (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      issuing_body TEXT,
      norma TEXT,
      status TEXT CHECK(status IN ('vigente', 'derogado')),
      compliance_status TEXT CHECK(compliance_status IN ('cumple', 'no_cumple', 'parcial')),
      review_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      supplier TEXT NOT NULL,
      description TEXT,
      amount REAL,
      date DATE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pendiente', 'aprobada', 'recibida', 'cerrada')),
      approved_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
      avatar_url TEXT,
      phone TEXT,
      department TEXT,
      position TEXT
    );
  `);

  await seedDatabase();
}

async function seedDatabase() {
  const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(rows[0].count) > 0) return;

  // Seed users
  const adminHash = bcryptjs.hashSync('Admin123!', 10);
  const userHash  = bcryptjs.hashSync('User123!', 10);
  const auditHash = bcryptjs.hashSync('Audit123!', 10);

  const u1 = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id`,
    ['santiago@dassa.com.ar', adminHash, 'Santiago García', 'admin']
  );
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4)`,
    ['operaciones@dassa.com.ar', userHash, 'María Operaciones', 'usuario']
  );
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4)`,
    ['auditor@dassa.com.ar', auditHash, 'Juan Auditor', 'auditor']
  );

  const adminId = u1.rows[0].id;

  // Seed sistema_gestion
  const sgSections = [
    ['mision',          'Garantizar la excelencia operativa en la gestión de depósito fiscal, proporcionando soluciones de almacenaje seguras y eficientes dentro de la cadena de comercio exterior.'],
    ['vision',          'Ser el depósito fiscal líder en Argentina, reconocido por la innovación tecnológica, el compromiso ambiental y la excelencia en el servicio al cliente.'],
    ['valores',         'Integridad, Seguridad, Innovación, Compromiso ambiental, Excelencia en servicio'],
    ['politica_calidad','Compromiso con la mejora continua y la satisfacción del cliente mediante procesos eficientes y documentados.'],
    ['politica_gestion','Proteger el ambiente, prevenir la contaminación y cumplir con la legislación ambiental vigente.'],
  ];
  for (const [section, content] of sgSections) {
    await pool.query(
      `INSERT INTO sistema_gestion (section, content, updated_by) VALUES ($1,$2,$3)`,
      [section, content, adminId]
    );
  }

  // Seed employees
  const empData = [
    ['E001','Carlos','Rodríguez','Jefe de Operaciones','Operaciones','carlos.rodriguez@dassa.com.ar'],
    ['E002','Laura','González','Coordinadora de Calidad','Administración','laura.gonzalez@dassa.com.ar'],
    ['E003','Roberto','Martínez','Operador de Montacargas','Operaciones','roberto.martinez@dassa.com.ar'],
    ['E004','Daniela','Fernández','Especialista en Seguridad','Operaciones','daniela.fernandez@dassa.com.ar'],
    ['E005','Juan','López','Administrador','Administración','juan.lopez@dassa.com.ar'],
    ['E006','Patricia','Sánchez','Gerente de RRHH','RRHH','patricia.sanchez@dassa.com.ar'],
    ['E007','Miguel','Torres','Inspector de Almacén','Operaciones','miguel.torres@dassa.com.ar'],
    ['E008','Beatriz','Cabrera','Asistente Administrativo','Administración','beatriz.cabrera@dassa.com.ar'],
  ];
  for (const [num, fn, ln, pos, dep, email] of empData) {
    await pool.query(
      `INSERT INTO employees (employee_number, first_name, last_name, position, department, hire_date, status, email)
       VALUES ($1,$2,$3,$4,$5,CURRENT_DATE - (random()*1000)::int,'activo',$6)`,
      [num, fn, ln, pos, dep, email]
    );
  }

  // Seed documents
  const docs = [
    ['P-TRI-001','Procedimiento de Gestión de Depósito Fiscal','procedimiento','ISO 9001','vigente',2],
    ['P-TRI-002','Procedimiento de Seguridad y Salud en el Trabajo','procedimiento','ISO 45001','vigente',1],
    ['I-TRI-001','Instrucción de Uso de Montacargas','instruccion','ISO 45001','vigente',3],
    ['P-TRI-003','Procedimiento de Gestión Ambiental','procedimiento','ISO 14001','en_revision',1],
    ['P-TRI-004','Procedimiento de Control de Registros','procedimiento','MIXTO','vigente',1],
    ['M-TRI-001','Manual de Calidad DASSA','manual','MIXTO','vigente',2],
  ];
  for (const [code, title, type, norma, status, version] of docs) {
    await pool.query(
      `INSERT INTO documents (code, title, type, norma, version, status, created_by, review_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE)`,
      [code, title, type, norma, version, status, adminId]
    );
  }

  // Seed incidents
  const incidents = [
    ['INC-001','incidente','2026-03-15','Operaciones','leve','cerrado','Derrame menor de agua en zona de almacenaje'],
    ['ACC-001','accidente','2026-03-20','Operaciones','moderado','en_investigacion','Tropezón de operario en escalera'],
    ['INC-002','incidente','2026-03-25','Operaciones','leve','abierto','Ruido excesivo en área de carga'],
    ['ACC-002','accidente','2026-03-28','Operaciones','grave','cerrado','Lesión en espalda por carga indebida'],
    ['INC-003','incidente','2026-03-29','Almacén','moderado','en_investigacion','Falta de etiquetado en contenedor químico'],
  ];
  for (const [code, type, date, area, severity, status, description] of incidents) {
    await pool.query(
      `INSERT INTO incidents (code, type, date, area, severity, status, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [code, type, date, area, severity, status, description, adminId]
    );
  }

  // Seed environmental aspects
  const aspects = [
    ['Emisiones al aire',      'Operación de equipos',      'Contaminación del aire',         3,2,3],
    ['Generación de residuos', 'Operaciones diarias',       'Contaminación del suelo',         4,4,2],
    ['Consumo de energía',     'Iluminación y equipos',     'Agotamiento de recursos',         5,2,4],
    ['Consumo de agua',        'Limpieza de áreas',         'Agotamiento de recursos',         2,1,3],
    ['Derrames accidentales',  'Manipuleo de sustancias',   'Contaminación del suelo y agua',  2,5,2],
    ['Ruido ambiental',        'Operación de montacargas',  'Contaminación sonora',            3,2,3],
    ['Vibración',              'Equipamiento pesado',       'Molestia laboral',                3,2,2],
    ['Residuos peligrosos',    'Mantenimiento',             'Riesgo de contaminación',         1,5,2],
  ];
  for (const [aspect, activity, impact, f, s, d] of aspects) {
    const sig = f * s * d;
    await pool.query(
      `INSERT INTO environmental_aspects (aspect, activity, impact, frequency, severity, detection, significance, is_significant, control_measure)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Control implementado')`,
      [aspect, activity, impact, f, s, d, sig, sig > 36]
    );
  }

  // Seed customer surveys
  const surveys = [
    ['Transportes López S.A.','2026-03-01',9,'Excelente servicio, muy profesional','Servicio'],
    ['Aduanas Solutions',      '2026-03-05',8,'Buena disposición del personal','Personal'],
    ['Comercio Global S.A.',   '2026-03-10',10,'Impecable, recomendamos','Calidad'],
    ['Logística Integrada',    '2026-03-18',7,'Bueno pero mejorable en tiempos de entrega','Logística'],
    ['Exportaciones Sur',      '2026-03-25',9,'Muy confiables','Confiabilidad'],
  ];
  for (const [cname, date, rating, comments, category] of surveys) {
    await pool.query(
      `INSERT INTO customer_surveys (customer_name, date, rating, comments, category, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [cname, date, rating, comments, category, adminId]
    );
  }

  // Seed trainings
  const trainings = [
    ['Inducción General',        'induccion',   '2026-04-05', 4, 'Patricia Sánchez',  'planificada', 'General',    10],
    ['Seguridad en Operaciones', 'capacitacion','2026-04-10', 2, 'Daniela Fernández', 'planificada', 'Operaciones',15],
    ['Gestión Ambiental',        'capacitacion','2026-04-12', 3, 'Laura González',    'completada',  'Todos',      20],
    ['Simulacro de Emergencia',  'simulacro',   '2026-04-08', 1, 'Carlos Rodríguez',  'completada',  'Operaciones',25],
    ['Auditoría Interna',        'auditoria',   '2026-04-15', 8, 'Auditor Externo',   'planificada', 'General',     5],
  ];
  for (const [title, type, date, hours, instructor, status, dept, maxp] of trainings) {
    await pool.query(
      `INSERT INTO trainings (title, type, date, duration_hours, instructor, status, department, max_participants)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [title, type, date, hours, instructor, status, dept, maxp]
    );
  }

  console.log('✅ Database seeded successfully');
}

export default pool;
