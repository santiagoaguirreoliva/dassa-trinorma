// Sincronización de las 23 fichas de puesto desde el MD F-TRI-34 v2024.
// - UPSERT por role_label canónico
// - Asigna titulares (job_profile_employees) — primero limpia las que no
//   están en el MD, después inserta/asegura las que sí están
// - Marca como inactivos los profiles legacy que no figuran en el MD
// Idempotente.
import 'dotenv/config';
import pg from 'pg';

const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const FICHAS = [
  {
    role_label: 'Director General / Líder SGI', area: 'Dirección', seniority: 'triunvirato',
    mission: 'Generar y liderar las iniciativas de mejora continua y desarrollo empresarial en toda la organización.',
    responsibilities: [
      'Identificar oportunidades de mejora en todos los aspectos de las operaciones de DASSA.',
      'Diseñar estrategias y planes de acción para la optimización de procesos.',
      'Liderar la implementación de iniciativas de mejora en toda la organización.',
      'Supervisar y coordinar equipos multidisciplinarios para ejecutar proyectos de mejora.',
      'Medir y evaluar el impacto de las mejoras mediante KPIs y análisis de datos.',
      'Fomentar una cultura de mejora continua en DASSA.',
      'Liderar la transformación tecnológica (Smart DASSA).',
      'Definir, promover y cumplir la política de calidad, medio ambiente y SySO.',
      'Realizar la revisión por la dirección y aprobar la información documentada del SGI.',
    ],
    competencies: ['Liderazgo estratégico', 'Mejora continua', 'Análisis de datos y KPIs', 'Gestión del cambio', 'Comunicación ejecutiva'],
    titulares: ['Santiago Aguirre Oliva'],
  },
  {
    role_label: 'CEO / Gerente General', area: 'Gerencia', seniority: 'triunvirato',
    mission: 'Gestionar la empresa en su totalidad. Eje desde donde desciende toda la cadena operativa, comercial y administrativa. Ejecutar estrategias de crecimiento sostenible y rentabilidad de DASSA.',
    responsibilities: [
      'Gestionar la asignación de recursos e inversiones de manera efectiva.',
      'Toma de decisiones comerciales, económicas y financieras.',
      'Gestión de compras.',
      'Supervisión de departamentos: Comercial, Administración y Operativo.',
      'Fomentar buen clima laboral.',
      'Fomentar mejoras, cambios e innovación.',
      'Establecer metas y objetivos claros para todas las áreas.',
      'Definir y aprobar la política integrada del SGI.',
    ],
    key_results: [
      'Relaciones estratégicas con clientes clave, proveedores y socios.',
      'Análisis de costos, Cash Flow y Estado de Resultados.',
      'Análisis de ventas (vendedores, clientes, conceptos).',
      'Responsabilidad Social Empresaria.',
    ],
    competencies: ['Liderazgo y gestión de equipos', 'Conocimientos impositivos y contables', 'Planificación estratégica', 'Gestión financiera', 'Comunicación efectiva', 'Título universitario'],
    titulares: ['Manuel De La Arena'],
  },
  {
    role_label: 'Representante Legal y Técnica', area: 'Dirección', seniority: 'triunvirato',
    mission: 'Gestionar los asuntos legales, de compliance y representación institucional de DASSA ante organismos reguladores, Aduana y terceros.',
    responsibilities: [
      'Relaciones con Aduanas y Autoridades Gubernamentales.',
      'Comunicación con Organismos Reguladores.',
      'Asuntos Legales y Compliance.',
      'Representación frente a agentes interventores del sector.',
      'Manejo de documentación societaria: Estatutos, Libros, Actas, Contratos.',
    ],
    key_results: [
      'Monitoreo de la Imagen Institucional.',
      'Supervisión activa de la relación con Aduana del punto.',
      'Interceder ante desvíos operativos de implicancia aduanera.',
      'Interceder ante crisis con personal aduanero.',
    ],
    competencies: ['Conocimiento regulatorio y aduanero', 'Gestión de relaciones públicas e interpersonales', 'Pensamiento estratégico', 'Manejo de crisis'],
    titulares: ['Francisco Urtubey'],
  },
  {
    role_label: 'Directora SGI (Consultora Externa)', area: 'Dirección', seniority: 'director',
    mission: 'Dirigir e implementar el Sistema de Gestión Integrado (SGI) de DASSA, asegurando el cumplimiento de las normas ISO 9001:2015, 14001:2015 y 45001:2018.',
    responsibilities: [
      'Cumplir y velar por la política de calidad, ambiente y SySO.',
      'Mantener y controlar la documentación conforme a las normas ISO vigentes.',
      'Desarrollar el programa anual de formación del SGI.',
      'Planificar y asistir a la revisión por la dirección.',
      'Realizar seguimiento a objetivos e indicadores del SGI.',
      'Gestionar evaluación de proveedores y encuestas de satisfacción.',
      'Colaborar con la Dirección en análisis de riesgos, contexto y partes interesadas.',
      'Promover la mejora continua y el cumplimiento del SGI.',
    ],
    competencies: ['Google Drive', 'ISO 9001 / 14001 / 45001 vigentes'],
    titulares: [],  // Nixa es externa, no aparece en employees
  },
  {
    role_label: 'Gerente de Operaciones', area: 'Operaciones', seniority: 'gerente',
    mission: 'Liderar el departamento de operaciones garantizando la eficiencia y calidad de los servicios dentro del depósito fiscal, así como la coordinación de importaciones, exportaciones y logística nacional.',
    responsibilities: [
      'Planificación y supervisión de las tareas diarias.',
      'Desarrollar y ejecutar estrategias operativas alineadas con los objetivos corporativos.',
      'Toma de decisiones estratégicas para garantizar la eficiencia operativa.',
      'Gestionar y supervisar el equipo de operaciones.',
      'Garantizar la satisfacción del cliente mediante servicios de alta calidad.',
      'Controlar y reducir costos operativos.',
      'Reportar el desempeño operativo con KPIs.',
      'Identificar y gestionar riesgos operativos.',
      'Fomentar comunicación transparente con clientes.',
      'Colaborar con otros departamentos para integrar las operaciones logísticas.',
    ],
    key_results: ['Fomentar el trabajo en equipo', 'Planificar la organización por sector', 'Resolución de desvíos', 'Interactuar con Aduana'],
    competencies: ['Título universitario en Logística / Comex / Adm / Industrial', 'Liderazgo y gestión de equipos', 'Planificación y organización', 'Normativa de Comex y depósitos fiscales', 'Sistemas de calidad e ISO', 'Trabajar bajo presión'],
    titulares: ['Christian Medina'],
  },
  {
    role_label: 'Supervisor de Depósito', area: 'Depósito', seniority: 'lider',
    mission: 'Coordinar, supervisar y optimizar las operaciones físicas diarias del depósito, asegurando el correcto manejo, almacenamiento y distribución. Ejecuta la operativa que Coordinación dispone.',
    responsibilities: [
      'Coordinar y supervisar actividades diarias: recepción, almacenamiento, control de inventarios y despacho.',
      'Asegurar que las operaciones se realicen conforme a procedimientos y normativas de seguridad.',
      'Supervisar y apoyar a apuntadores, maquinistas y operarios.',
      'Asignar tareas y responsabilidades de manera equitativa y eficiente.',
      'Identificar oportunidades de mejora en los procesos del depósito.',
      'Colaborar con Coordinación para cumplir las órdenes del día.',
      'Supervisar al proveedor externo de mantenimiento (Toti) cuando aplica.',
    ],
    key_results: ['Planificar y coordinar actividades', 'Identificar y resolver problemas proactivamente', 'Mantener registros de personal', 'Establecer metas y plazos', 'Analizar KPIs'],
    competencies: ['Apuntador analógico + tablet DASSA', 'Depofis básico', 'Logística y almacén', 'Documentación aduanera', 'Procedimientos DASSA', 'Liderazgo y motivación'],
    titulares: ['Marcelo Stizza'],
  },
  {
    role_label: 'Apuntador — Controlador de Cargas (Importación)', area: 'Depósito', seniority: 'semi',
    mission: 'Realizar el control de bultos y carga por cada operación y movimiento de mercaderías de Importación.',
    responsibilities: [
      'Apunte de datos de cargas, descargas, desconsolidados y consolidados.',
      'Adjuntar fotos de la operación realizada y detalles (MC, embalaje, IMO).',
      'Llevar control de bultos, personal, maquinaria, tiempo y ubicación.',
      'Preparar el sector de trabajo y recursos.',
      'Velar por el orden y la limpieza.',
      'Trabajar en conjunto con sus pares.',
      'Manejo de herramientas para verificaciones y acondicionamiento.',
      'Cumplir con reglamento de depósito y buenas prácticas.',
    ],
    key_results: ['Control de stock', 'Movimientos de carga en almacén', 'Clasificación de mercaderías', 'Espacio disponible para desconsolidados'],
    competencies: ['Apuntador analógico + tablet DASSA', 'Depofis básico', 'Logística, almacén y documentación aduanera', 'Procedimientos DASSA'],
    titulares: ['Federico Estigarribia'],
  },
  {
    role_label: 'Apuntador — Controlador de Cargas (Exportación)', area: 'Depósito', seniority: 'semi',
    mission: 'Realizar el control de bultos y carga por cada operación y movimiento de mercaderías de Exportación.',
    responsibilities: [
      'Apunte de datos de cargas, descargas, desconsolidados y consolidados.',
      'Adjuntar fotos de la operación.',
      'Llevar control de bultos, personal, maquinaria, tiempo y ubicación.',
      'Preparar sector de trabajo y recursos.',
      'Velar por el orden y la limpieza.',
    ],
    competencies: ['Apuntador analógico + tablet DASSA', 'Depofis básico', 'Logística, almacén y documentación aduanera'],
    titulares: ['Claudio Estigarribia'],
  },
  {
    role_label: 'Apuntador — Controlador de Cargas (Varios)', area: 'Depósito', seniority: 'junior',
    mission: 'Realizar el control de bultos y carga por cada operación y movimiento de mercaderías en general, y ejecutar las tareas de carga y descarga del depósito.',
    responsibilities: [
      'Apunte de datos de cargas, descargas, desconsolidados y consolidados.',
      'Adjuntar fotos de la operación.',
      'Llevar control de bultos, personal, maquinaria, tiempo y ubicación.',
      'Preparar sector de trabajo y recursos.',
      'Velar por el orden y la limpieza.',
      'Realizar seguimiento y derivar actividades de personal de carga y descarga.',
      'Control y asignación de herramientas en pañol.',
    ],
    key_results: ['Control de stock', 'Movimientos de carga en almacén', 'Clasificación de mercaderías'],
    competencies: ['Apuntador analógico + tablet DASSA', 'Depofis básico'],
    titulares: ['Franco Pérez', 'Nicolás Nuñez'],  // Apuntadores (no operarios)
  },
  {
    role_label: 'Operario de Carga y Descarga', area: 'Depósito', seniority: 'junior',
    mission: 'Ejecutar las tareas físicas de carga, descarga y movimiento de mercaderías en el depósito.',
    responsibilities: [
      'Realizar tareas de carga y descarga conforme a las indicaciones.',
      'Manipular mercaderías con cuidado.',
      'Mantener orden y limpieza del sector.',
      'Cumplir con uso de EPP y normativas de seguridad.',
    ],
    competencies: ['Manejo de cargas físicas', 'Trabajo en equipo', 'Cumplimiento de procedimientos'],
    titulares: ['Maximiliano Sandoval', 'Mario Goroso'],
  },
  {
    role_label: 'Plazoletero', area: 'Depósito', seniority: 'junior',
    mission: 'Realizar control de los contenedores y del flujo de camiones.',
    responsibilities: [
      'Mantener el orden de la plazoleta dentro de las prioridades operativas.',
      'Optimizar el espacio de plazoleta y acomodar los camiones.',
      'Trabajar en conjunto con depósito para movimientos de contenedores.',
      'Controlar el ingreso y salida verificando el camión asignado.',
      'Mantener comunicación constante con el Balancero.',
      'Controlar el retiro de precintos según autorización de Aduana.',
    ],
    key_results: ['Optimizar recursos distribuyendo tareas de maquinistas', 'Conocer la Orden del Día', 'Movimientos de carga en plazoleta'],
    titulares: ['Franco Di Dio'],
  },
  {
    role_label: 'Balancero', area: 'Depósito', seniority: 'lider',
    mission: 'Controlar la administración y flujo de ingreso/egreso de camiones y contenedores.',
    responsibilities: [
      'Controlar ingreso y egreso de camiones, tomando pesada y cargándola en el sistema.',
      'Controlar la documentación verificando aprobación.',
      'Preparar documentación a rendir a Aduana.',
      'Mantener el orden de la plazoleta.',
      'Optimizar el espacio y acomodar camiones.',
      'Controlar ingreso y salida de contenedores.',
      'Sacar turnos para devolución de contenedores y solicitar libre deuda.',
      'Supervisar al Plazoletero.',
    ],
    key_results: ['Optimizar recursos', 'Conocer la Orden del Día'],
    titulares: ['Cristian Andreini'],
  },
  {
    role_label: 'Maquinista', area: 'Depósito', seniority: 'semi',
    mission: 'Realizar las cargas y descargas de todo el flujo operativo.',
    responsibilities: [
      'Licencia de conducir vigente (requisito excluyente).',
      'Realizar cargas y descargas con responsabilidad, cuidando la mercadería.',
      'Revisar el estado de la unidad asignada y prever desperfectos visibles.',
      'Informar el estado de la mercadería al momento de carga o descarga.',
      'Reportarse al personal de carga y descarga.',
      'Tener conocimiento de la Orden del Día.',
    ],
    competencies: ['Licencia de conducir vigente', 'Manejo de autoelevador y/o containera', 'Conocimiento de procedimientos DASSA'],
    titulares: ['Emmanuel Fernández', 'Fabián Fuentes', 'Rodolfo Espíndola'],
  },
  {
    role_label: 'Maquinista Containera', area: 'Depósito', seniority: 'semi',
    mission: 'Sub-especialización del maquinista para operación específica de contenedores.',
    responsibilities: [
      'Operar containeras para movimiento de contenedores.',
      'Cuidar mercadería e integridad de contenedores.',
      'Cumplir con la Orden del Día.',
    ],
    competencies: ['Licencia de conducir vigente', 'Manejo de containera (requisito excluyente)', 'Conocimiento de procedimientos DASSA'],
    titulares: ['Matías Díaz'],
  },
  {
    role_label: 'Maestranza', area: 'Depósito', seniority: 'junior',
    mission: 'Mantener limpios y ordenados el depósito y las instalaciones de DASSA.',
    responsibilities: [
      'Mantener siempre los espacios comunes limpios y ordenados.',
      'Estar a disposición del personal de la empresa.',
      'Orden y limpieza del tinglado.',
      'Mantener autos con fundas.',
      'Rondas semanales por sector.',
    ],
    titulares: ['Lidia Miño'],
  },
  {
    role_label: 'Mantenimiento (Externo)', area: 'Operaciones', seniority: 'externo',
    mission: 'Reparaciones básicas en los equipos y sistemas del edificio.',
    responsibilities: [
      'Controlar instalaciones y funcionamiento de elementos esenciales.',
      'Realización de pequeñas reparaciones.',
      'Comprobación de paneles de control y cableado eléctrico.',
      'Instalar dispositivos y equipos.',
      'Tareas de mantenimiento de jardines o caminos.',
      'Comprobar funciones de los sistemas de seguridad.',
      'Interrelación con compras para pedidos y presupuestos.',
    ],
    competencies: ['Electricidad', 'Plomería', 'Albañilería', 'Aire Acondicionado (excluyente)', 'Diagramas técnicos', 'Curso CCTV'],
    titulares: [],  // Toti es externo
  },
  {
    role_label: 'Administrativo de Exportación', area: 'Coordinación', seniority: 'semi',
    mission: 'Coordinación y seguimiento de todas las cargas de Exportación — Customer Service.',
    responsibilities: [
      'Inicio de operación con el cliente — Customer Service.',
      'Seguimiento de consolidado marítimo y terrestre.',
      'Remisión de contenedor a puerto y liberación de camiones.',
      'Manejo de reservas y retiro de contenedores con marítimas.',
      'Salida en sistema AFIP de contenedores y camiones.',
      'Planificación de consolidado.',
    ],
    key_results: ['Resolución de desvíos', 'Estado de cargas recibidas', 'Turnos en terminales', 'Envío de fotos y salidas aduaneras al cliente'],
    competencies: ['Documentación de Comex', 'Malvinas / SINTIA', 'Depofis', 'Inglés técnico Comex'],
    titulares: ['Marcos Coria'],
  },
  {
    role_label: 'Administrativo de Importación', area: 'Coordinación', seniority: 'semi',
    mission: 'Coordinación y seguimiento de todas las cargas de Importación — Customer Service.',
    responsibilities: [
      'Inicio de operación con el cliente — Customer Service.',
      'Coordinación de traslados desde terminales a depósito fiscal.',
      'Control de documentación.',
      'Pedido de turno en terminales.',
      'Seguimiento de buque — Arribos.',
      'Pedido de precintos satelitales.',
      'Envío de información del estado a clientes.',
    ],
    key_results: ['Pagos en terminales', 'Confección de traslados', 'Salidas Malvinas', 'Planilla de tráfico interno'],
    competencies: ['Inglés técnico Comex', 'Páginas web y herramientas informáticas', 'Depofis', 'Documentación de Comex', 'Malvinas / SINTIA'],
    titulares: ['Alan Santibañez'],
  },
  {
    role_label: 'Administrativo de Tráfico', area: 'Coordinación', seniority: 'semi',
    mission: 'Gestionar con las Agencias Marítimas el pago y retiro de Documentación Aduanera.',
    responsibilities: [
      'Gestión con Agencias Marítimas del pago y retiro de Documentación Aduanera.',
      'Gestión en Agencias Marítimas.',
      'Gestión de Agente de Transporte.',
      'Confección de Manifiestos.',
      'Confección de Bill of Lading.',
    ],
    key_results: ['Pago en agencias', 'Retiro de documentación', 'Soporte a Coordinadores de Mudanzas', 'Soporte ante desvíos'],
    competencies: ['Malvinas / SINTIA', 'Gestión de Agente de Transporte', 'Comex y reglamentos', 'Inglés técnico (no excluyente)', 'Documentación aduanera', 'Relaciones interpersonales'],
    titulares: ['Luna Villar'],
  },
  {
    role_label: 'Personal de Puerto', area: 'Coordinación IMPO', seniority: 'junior',
    mission: 'Gestión de retiro de contenedores de las terminales portuarias.',
    responsibilities: [
      'Realizar trámite aduanero en puerto para el retiro de contenedores.',
      'Gestionar con el Transporte el ingreso y egreso en terminales portuarias.',
      'Gestionar Salidas Malvinas en terminal.',
    ],
    key_results: ['Pago de gastos en terminal', 'Impresión de documentación', 'Gestión con empresa de satelitales'],
    titulares: ['Carlos Vera', 'Pepo'],
  },
  {
    role_label: 'Vendedor', area: 'Comercial', seniority: 'semi',
    mission: 'Generar nuevos negocios y maximizar las ventas para la compañía.',
    responsibilities: [
      'Identificar y atraer nuevos clientes a través de estrategias de mercado proactivas.',
      'Detectar y desarrollar nuevas oportunidades de negocios.',
      'Crear y mantener relaciones sólidas con clientes potenciales y existentes.',
      'Brindar soluciones logísticas al cliente.',
      'Ofrecer asesoramiento garantizando la satisfacción del cliente.',
      'Diseñar y presentar soluciones logísticas adaptadas.',
      'Desarrollar tarifarios, presupuestos y cotizaciones precisas.',
      'Asegurar la actualización continua de la información del cliente en Depofis.',
      'Contribuir al crecimiento y retención de clientes.',
    ],
    key_results: ['Asistir en cobranzas', 'Alinear ventas con políticas financieras y operativas'],
    competencies: ['Conocimiento operativo y comercial', 'Comex y aduanas', 'LinkedIn y prospección', 'Negociación y cierre', 'Ventas B2B', 'Infraestructura DASSA', 'CRM · Depofis · Power BI · Looker'],
    titulares: ['Guillermo Jorge', 'Alexis Dalpra', 'Enzo Nieto'],
  },
  {
    role_label: 'Administración General / RRHH', area: 'Administración', seniority: 'responsable',
    mission: 'Administrar los recursos humanos, físicos y los valores de la empresa.',
    responsibilities: [
      'Administrar al personal: Altas, bajas, reglamentos y sanciones.',
      'Relevamiento de ingresos y egresos, licencias médicas y otras gestiones.',
      'Pago a proveedores.',
      'Soporte al estudio contable para sueldos e impuestos.',
      'Pago de impuestos y tasas.',
      'Pago de sueldos.',
      'Análisis y control de facturas de compra.',
      'Administrar los recursos físicos.',
      'Logística y compras para la operación.',
      'Armado de Estado de Resultados.',
      'Conciliación de cuentas contables.',
      'Actualización Cash Flow.',
      'Contabilidad general.',
      'Conciliaciones bancarias.',
      'Asistencia gerencial, legal y a directores.',
    ],
    key_results: ['Sistema de cheques', 'Gestionar servicios para operaciones', 'Coordinar capacitaciones', 'Compra y control de ropa al personal (EPP)'],
    competencies: ['Análisis y negociación', 'Contabilidad e impuestos', 'Excel / Sheets · Depofis', 'Liderazgo'],
    titulares: ['María del Carmen Delgado'],
  },
  {
    role_label: 'Facturación · Cobranzas · Asistente Dirección', area: 'Administración', seniority: 'semi',
    mission: 'Supervisar y llevar a cabo el proceso completo de facturación, garantizando la exactitud y el flujo de cobranzas de la empresa.',
    responsibilities: [
      'Supervisar y ejecutar el proceso completo de facturación.',
      'Identificar y abordar problemas relacionados con tarifas o errores de facturación.',
      'Armado y actualización de tarifarios comerciales.',
      'Soporte a clientes en consultas de facturación.',
      'Elaboración de presupuestos.',
      'Procesar y registrar transacciones financieras.',
      'Generar y enviar recibos.',
      'Cuentas por cobrar al día.',
      'Asientos de DDJJ IVA e IIBB.',
    ],
    key_results: ['Re-facturación de pagos en terminal', 'Control de habilitaciones', 'Registro de facturas de proveedores', 'Rendición de facturas en portal'],
    competencies: ['Prolijidad y puntualidad', 'Excel / Sheets', 'Matemáticas y contabilidad básica', 'Depofis · Portal de pagos', 'Comunicación y empatía'],
    titulares: ['Maira Herrera'],
  },
  {
    role_label: 'Responsable SySO', area: 'Seguridad e Higiene', seniority: 'responsable',
    mission: 'Planificar, implementar y controlar el sistema de Seguridad y Salud Ocupacional de DASSA, previniendo accidentes y asegurando el cumplimiento de la normativa vigente (Ley 19.587 / Decreto 351/79).',
    responsibilities: [
      'Elaborar y ejecutar el Programa Anual de Higiene y Seguridad.',
      'Inspecciones periódicas de instalaciones y equipos.',
      'Investigar y registrar accidentes e incidentes.',
      'Capacitar al personal en prevención de riesgos y uso de EPP.',
      'Gestionar la relación con la ART y organismos de control.',
      'Elaborar estadísticas de siniestralidad y reportes periódicos.',
      'Coordinar el Comité Mixto de Higiene y Seguridad.',
      'Cumplimiento de requisitos legales en SySO.',
    ],
    key_results: ['Control y provisión de EPP', 'Señalética y orden', 'Coordinación con SGI (ISO 45001:2018)'],
    competencies: ['Título de Técnico/Lic. en H&S (habilitado SRT)', 'Ley 19.587, Decreto 351/79', 'ISO 45001:2018', 'Experiencia en depósitos / logística'],
    titulares: ['Fernando Ponzi'],
  },
  {
    role_label: 'Responsable de Tecnología', area: 'Tecnología', seniority: 'responsable',
    mission: 'Gestionar y desarrollar la infraestructura tecnológica de DASSA, implementando soluciones de BI, ETL y automatización en el marco del proyecto Smart DASSA.',
    responsibilities: [
      'Desarrollo y mantenimiento de dashboards e informes de BI.',
      'Implementación de procesos ETL.',
      'Soporte técnico a sistemas operativos (Depofis, Malvinas).',
      'Implementación del ecosistema Smart DASSA.',
      'Gestión de la infraestructura de datos y servidores.',
    ],
    key_results: ['Documentación técnica', 'Soporte a usuarios internos', 'Evaluación de nuevas tecnologías'],
    competencies: ['Python · SQL · ETL', 'BI (Power BI, Metabase)', 'PostgreSQL / SQL Server', 'Linux / cloud'],
    titulares: ['Facundo Lastra'],
  },
];

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ─── 1. UPSERT por role_label ────────────────────────────────────
console.log('▶ UPSERT de fichas...');
const profileIdByRole = {};
for (const f of FICHAS) {
  // Buscar primero por role_label
  const existing = await p.query(
    `SELECT id FROM job_profiles WHERE role_label = $1 LIMIT 1`, [f.role_label]);

  if (existing.rows.length) {
    const id = existing.rows[0].id;
    await p.query(`
      UPDATE job_profiles SET
        area = $1, seniority = $2, mission = $3,
        responsibilities = $4, key_results = $5, competencies = $6,
        is_active = true, source = 'md-f-tri-34-v2024', updated_at = NOW()
      WHERE id = $7
    `, [f.area, f.seniority, f.mission, f.responsibilities || null,
        f.key_results || null, f.competencies || null, id]);
    profileIdByRole[f.role_label] = id;
    console.log(`  ↻ ${f.role_label}`);
  } else {
    const r = await p.query(`
      INSERT INTO job_profiles
        (role_label, area, seniority, mission,
         responsibilities, key_results, competencies,
         is_active, source, tenant_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,true,'md-f-tri-34-v2024',$8)
      RETURNING id
    `, [f.role_label, f.area, f.seniority, f.mission,
        f.responsibilities || null, f.key_results || null,
        f.competencies || null, TENANT_ID]);
    profileIdByRole[f.role_label] = r.rows[0].id;
    console.log(`  + ${f.role_label}`);
  }
}

// ─── 2. Desactivar profiles legacy que NO están en el MD ─────────
console.log('');
console.log('▶ Desactivando profiles legacy fuera del MD...');
const labels = FICHAS.map(f => f.role_label);
const deact = await p.query(
  `UPDATE job_profiles
     SET is_active = false, updated_at = NOW()
   WHERE role_label NOT IN (${labels.map((_,i) => `$${i+1}`).join(',')})
     AND is_active = true
   RETURNING role_label`,
  labels);
for (const r of deact.rows) console.log(`  ✗ ${r.role_label}`);
if (!deact.rows.length) console.log('  (ninguno)');

// ─── 3. Limpiar y recrear job_profile_employees ──────────────────
console.log('');
console.log('▶ Refresh de asignaciones empleado↔puesto...');
let asignaciones = 0;
let warns = [];
for (const f of FICHAS) {
  const profileId = profileIdByRole[f.role_label];
  for (const titularName of (f.titulares || [])) {
    const emp = await p.query(
      `SELECT id FROM employees WHERE full_name = $1`, [titularName]);
    if (!emp.rows.length) {
      warns.push(`titular "${titularName}" no encontrado en employees (puesto: ${f.role_label})`);
      continue;
    }
    const empId = emp.rows[0].id;
    // ¿Ya existe la asignación?
    const dup = await p.query(
      `SELECT id FROM job_profile_employees WHERE employee_id=$1 AND profile_id=$2 LIMIT 1`,
      [empId, profileId]);
    if (dup.rows.length) {
      // Update is_primary=true para el primero
      const isPrimary = (f.titulares.indexOf(titularName) === 0);
      await p.query(
        `UPDATE job_profile_employees SET is_primary=$1 WHERE id=$2`,
        [isPrimary, dup.rows[0].id]);
    } else {
      const isPrimary = (f.titulares.indexOf(titularName) === 0);
      await p.query(`
        INSERT INTO job_profile_employees (employee_id, profile_id, is_primary, tenant_id)
        VALUES ($1, $2, $3, $4)
      `, [empId, profileId, isPrimary, TENANT_ID]);
      console.log(`  + ${titularName.padEnd(28)} → ${f.role_label}${isPrimary ? ' (PRIMARY)' : ''}`);
    }
    asignaciones++;
  }
}
console.log(`Asignaciones procesadas: ${asignaciones}`);
if (warns.length) {
  console.log('');
  console.log('⚠ Warnings:');
  for (const w of warns) console.log('  · ' + w);
}

// ─── 4. Eliminar asignaciones HUÉRFANAS (a profiles inactivos) ───
console.log('');
console.log('▶ Limpiando asignaciones a profiles inactivos...');
const cleaned = await p.query(`
  DELETE FROM job_profile_employees jpe
   USING job_profiles jp
   WHERE jpe.profile_id = jp.id AND jp.is_active = false
   RETURNING jpe.id
`);
console.log(`  Eliminadas: ${cleaned.rowCount}`);

// ─── 5. Resumen ──────────────────────────────────────────────────
console.log('');
const summary = await p.query(`
  SELECT
    (SELECT COUNT(*) FROM job_profiles WHERE is_active) AS activos,
    (SELECT COUNT(*) FROM job_profiles WHERE NOT is_active) AS inactivos,
    (SELECT COUNT(*) FROM job_profile_employees) AS asignaciones,
    (SELECT COUNT(*) FROM job_profile_employees WHERE is_primary) AS primarias
`);
console.log('RESUMEN FINAL:');
console.log('  job_profiles activos:    ', summary.rows[0].activos);
console.log('  job_profiles inactivos:  ', summary.rows[0].inactivos);
console.log('  Asignaciones totales:    ', summary.rows[0].asignaciones);
console.log('  Asignaciones primarias:  ', summary.rows[0].primarias);

await p.end();
