#!/usr/bin/env node
// Crea el procedimiento P-OP-003 "Verificación de Contenedores House de Importación
// en Plazoleta" (Seguridad Operacional) en documents, con el formato de los
// procedimientos del SGI, y lo vincula a las fichas Apuntador / Supervisor de
// Depósito / Plazoletero. Idempotente (ON CONFLICT code).
// Uso: node scripts/crear-procedimiento-verificaciones-house.cjs
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CODE = 'P-OP-003';
const TITLE = 'Verificación de Contenedores House de Importación en Plazoleta';
const FICHAS = ['Apuntador / Controlador de Cargas', 'Supervisor de Depósito', 'Plazoletero'];
const KEYWORDS = ['verificación', 'house', 'importación', 'plazoleta', 'aduana', 'DGA', 'seguridad operacional', 'ZOTE', 'apuntador', 'contenedor', 'zona de espera'];

const CONTENT = `Procedimiento de Seguridad Operacional · Proceso: Operaciones · Normas aplicables: ISO 9001:2015, ISO 14001:2015, ISO 45001:2018. Controla una actividad de alto riesgo de interacción entre peatones, maquinaria pesada, camiones y operaciones simultáneas.

## 1. Objetivo
Establecer el procedimiento operativo y las medidas de seguridad para la realización de verificaciones aduaneras (HOUSE) de contenedores de importación en plazoleta, garantizando la seguridad de las personas, la integridad de la carga y la correcta coordinación operativa durante toda la maniobra.

## 2. Alcance
Aplica a todas las verificaciones aduaneras de contenedores House de Importación realizadas dentro de las instalaciones de DASSA. Comprende desde la programación de la verificación hasta el cierre del contenedor y el retiro seguro del personal interviniente.

## 3. Responsabilidades
**Administración**
- Emitir la Orden de Verificación.
- Asignar el apuntador responsable.
- Coordinar la operación en Orden del Día.

**Coordinación**
- Programar la maniobra.
- Definir el lugar donde se realizará la verificación según el tipo de operación.
- Coordinar con Operaciones.

**Encargados y apuntadores autorizados** (Marcelo · Franco · apuntadores asignados) son responsables de:
- Acompañar permanentemente al personal externo.
- Controlar la seguridad del área.
- Abrir y cerrar el contenedor.
- Coordinar con Aduana.

## 4. Desarrollo

**4.1 Programación previa**
Toda verificación deberá estar previamente registrada en la aplicación Orden del Día, indicando: tipo de verificación, dimensiones de la operación, necesidad de maquinaria, espacio requerido y observaciones particulares. No podrá iniciarse ninguna verificación sin coordinación previa.

**4.2 Orden de Verificación**
Previo al inicio deberá emitirse la Orden de Verificación, indicando: contenedor, cliente, despachante, horario, apuntador asignado y observaciones.

**4.3 Zona de espera**
El despachante, verificador y cualquier personal externo deberán esperar exclusivamente en la **Zona de Espera para Verificaciones House**, identificada mediante rectángulo amarillo pintado sobre el piso del tinglado, cartelería visible y señalización peatonal. Está prohibido que personas externas ingresen por cuenta propia a la plazoleta.

**4.4 Traslado al contenedor**
Cuando el contenedor esté listo, el apuntador responsable deberá retirar al personal desde la zona de espera, acompañarlo hasta el contenedor, verificar que el recorrido sea seguro y controlar el tránsito de camiones y maquinaria. El personal externo nunca podrá desplazarse solo por la plazoleta.

**4.5 Condiciones para la verificación**
Las verificaciones House deberán realizarse únicamente sobre contenedores apoyados en piso. Queda prohibido verificar contenedores suspendidos, sobre camiones, elevados o manipulados por maquinaria.

**4.5.1 Verificaciones exhaustivas o con presencia de autoridades aduaneras**
Las verificaciones que, por su naturaleza, requieran una inspección exhaustiva de la mercadería o la presencia permanente de personal de la Dirección General de Aduanas (DGA) deberán cumplir obligatoriamente:
- El contenedor deberá ubicarse **bajo tinglado**, salvo autorización expresa de la Gerencia de Operaciones por razones operativas debidamente justificadas.
- Previo al inicio se deberá establecer una **Zona Operativa Temporal Exclusiva (ZOTE)** alrededor del contenedor, delimitada con conos, cadenas, cintas de seguridad u otros elementos de señalización claramente visibles.
- Durante toda la verificación queda **prohibido el tránsito de maquinaria, camiones y cualquier otra operación** dentro de la zona delimitada, salvo autorización expresa del apuntador responsable.
- El apuntador designado será responsable de habilitar y de liberar nuevamente la zona una vez finalizada la verificación y retirado todo el personal interviniente.
- Ninguna maniobra operativa podrá interferir con la inspección mientras la ZOTE permanezca activa.

**4.6 Durante la verificación**
El apuntador permanecerá durante toda la operación, siendo responsable de: controlar la seguridad del área, impedir circulación innecesaria, coordinar con Aduana y con maquinaria, y mantener comunicación permanente con Operaciones. Ninguna persona podrá quedar sin acompañamiento.

**4.7 Cierre del contenedor**
Finalizada la verificación: cerrar el contenedor, colocar nuevos precintos cuando corresponda, presentar el cierre ante Aduana y registrar observaciones.

**4.8 Retorno**
Finalizada la operación, el apuntador deberá acompañar nuevamente al personal hasta la Zona de Espera o una senda peatonal segura. Recién allí finalizará la responsabilidad del acompañamiento.

## 5. Registros obligatorios
- Orden de Verificación.
- Registro en Orden del Día.
- Apuntador asignado.
- Tally correspondiente.
- Fotografías del contenedor.
- Fotografías de la carga.
- Ubicación del contenedor.
- Observaciones de seguridad.
- Firma del apuntador.
- Firma del personal actuante cuando corresponda.

## 6. Medidas de seguridad
**Es obligatorio:**
- Utilizar EPP.
- Permanecer acompañado por personal de DASSA.
- Respetar los recorridos peatonales.
- Mantener comunicación permanente con Operaciones.
- Verificar previamente la ausencia de movimientos de maquinaria.
- Suspender la operación ante cualquier condición insegura.
- Delimitar una Zona Operativa Temporal Exclusiva (ZOTE) para toda verificación exhaustiva o con presencia de autoridades aduaneras.
- Suspender temporalmente las maniobras de maquinaria y el tránsito de vehículos dentro del perímetro delimitado.
- Mantener el contenedor completamente apoyado en piso y bajo tinglado durante toda inspección exhaustiva o con Aduana.

**Está prohibido:**
- Caminar por la plazoleta sin acompañamiento.
- Que el personal externo ingrese directamente al contenedor.
- Atravesar zonas operativas.
- Permanecer cerca de la containera.
- Realizar verificaciones sobre contenedores elevados.
- Iniciar verificaciones sin Orden emitida.
- Comenzar verificaciones sin programación previa.

## 7. Anexos
- Plano de la Zona de Espera de Verificaciones House.
- Cartelería.
- Modelo de Orden de Verificación.
- Instructivo de Orden del Día.
- Registro fotográfico.

## 8. Acciones de implementación
1. **Infraestructura:** pintar un rectángulo amarillo bajo tinglado, identificarlo como ZONA DE ESPERA VERIFICACIONES HOUSE e incorporar flechas y senda peatonal.
2. **Cartelería:** cartel principal "ZONA DE ESPERA VERIFICACIONES HOUSE — toda persona externa deberá permanecer en este sector hasta ser acompañada por personal autorizado de DASSA. Prohibido ingresar a la plazoleta sin acompañamiento".
3. **Capacitación:** a Administración, Coordinación, Operaciones, apuntadores y encargados, sobre riesgos de interacción peatón-maquinaria, procedimiento completo, responsabilidades, emergencias y uso de la zona de espera.
4. **Comunicación:** mail informativo a todo el personal sobre la entrada en vigencia del procedimiento.`;

(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const tn = await c.query("SELECT tenant_id FROM documents WHERE tenant_id IS NOT NULL LIMIT 1");
    const tenant = tn.rows[0]?.tenant_id || null;
    const doc = await c.query(
      `INSERT INTO documents (code, title, content_md, proceso, norma, doc_type, status, keywords, needs_source, tenant_id, version)
       VALUES ($1,$2,$3,'OPERACIÓN','ISO 45001','procedimiento','aprobado',$4,false,$5,1)
       ON CONFLICT (code) DO UPDATE SET
         title=EXCLUDED.title, content_md=EXCLUDED.content_md, proceso=EXCLUDED.proceso,
         norma=EXCLUDED.norma, status=EXCLUDED.status, keywords=EXCLUDED.keywords,
         needs_source=false, updated_at=now()
       RETURNING id`,
      [CODE, TITLE, CONTENT, KEYWORDS, tenant]
    );
    const docId = doc.rows[0].id;

    // Vincular a las 3 fichas (role='responsable'), idempotente por nota
    await c.query("DELETE FROM job_profile_procedures WHERE document_id=$1 AND notes=$2", [docId, 'P-OP-003 verificaciones house 2026-06-25']);
    const r = await c.query(
      `INSERT INTO job_profile_procedures (profile_id, document_id, role, notes, tenant_id)
       SELECT jp.id, $1, 'responsable', $2, jp.tenant_id
       FROM job_profiles jp WHERE jp.is_active=true AND jp.role_label = ANY($3::text[])`,
      [docId, 'P-OP-003 verificaciones house 2026-06-25', FICHAS]
    );
    await c.query('COMMIT');
    console.log('Procedimiento ' + CODE + ' creado/actualizado (doc ' + docId + ')');
    console.log('Vínculos a fichas insertados: ' + r.rowCount + ' (' + FICHAS.join(' · ') + ')');
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ROLLBACK:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
})();
