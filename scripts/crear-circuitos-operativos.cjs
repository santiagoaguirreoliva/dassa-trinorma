#!/usr/bin/env node
// Crea los 4 circuitos operativos del Mapa de Procesos F-TRI-03 como procedimientos
// nativos HIJOS de P-TRI-13 (Exportación) y P-TRI-14 (Importación):
//   P-TRI-14.1 Importación Marítima · P-TRI-14.2 Importación Terrestre
//   P-TRI-13.1 Exportación Marítima · P-TRI-13.2 Exportación Terrestre
// Contenido = la secuencia de cada circuito según el mapa. Idempotente (ON CONFLICT code).
// Uso: node scripts/crear-circuitos-operativos.cjs
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const md = (alcance, pasos, registros) =>
`## Alcance
${alcance}

## Secuencia del circuito
${pasos.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Registros asociados
${registros.map(r => `- ${r}`).join('\n')}

## Norma
ISO 9001 cláusula 8.1 — Planificación y control operacional. Circuito derivado del Mapa de Procesos F-TRI-03 Rev. 02.`;

const HIJOS = [
  {
    code: 'P-TRI-14.1', parent: 'P-TRI-14', title: 'Importación Marítima', circuito: 'maritimo', sentido: 'impo',
    keywords: ['importación', 'marítimo', 'contenedor', 'desconsolidación', 'puerto', 'operación'],
    md: md(
      'Circuito operativo de importación por vía marítima (contenedor de puerto), dentro del proceso de Operación. Cuelga del procedimiento general P-TRI-14 Operación Importación.',
      ['Recepción documental', 'Coordinación de cargas', 'Traslado e ingreso', 'Confección de documentación para desconsolidación', 'Orden del día (coordinación de trabajos)', 'Informar al cliente el estado', 'Almacenaje', 'Despacho para verificar y/o retirar', 'Coordinación de retiro, control y entrega'],
      ['Tally / estado de mercadería', 'Orden del día', 'Acta de desconsolidación', 'Remito de retiro y entrega'],
    ),
  },
  {
    code: 'P-TRI-14.2', parent: 'P-TRI-14', title: 'Importación Terrestre', circuito: 'terrestre', sentido: 'impo',
    keywords: ['importación', 'terrestre', 'camión', 'preaviso', 'precintos', 'desconsolidación', 'operación'],
    md: md(
      'Circuito operativo de importación por vía terrestre (camión), dentro del proceso de Operación. Cuelga del procedimiento general P-TRI-14 Operación Importación.',
      ['Preaviso del cliente sobre el arribo del camión', 'Arribo y control de precintos del camión', 'Confección de documentación para desconsolidar', 'Confección del estado de la mercadería desconsolidada', 'Informar al cliente el estado', 'Almacenaje', 'Despacho para verificar y/o retirar', 'Coordinación de retiro, control y entrega'],
      ['Control de precintos', 'Tally / estado de mercadería desconsolidada', 'Remito de retiro y entrega'],
    ),
  },
  {
    code: 'P-TRI-13.1', parent: 'P-TRI-13', title: 'Exportación Marítima', circuito: 'maritimo', sentido: 'expo',
    keywords: ['exportación', 'marítimo', 'contenedor', 'consolidado', 'precinto', 'puerto', 'operación'],
    md: md(
      'Circuito operativo de exportación por vía marítima (contenedor a puerto), dentro del proceso de Operación. Cuelga del procedimiento general P-TRI-13 Operación Exportación.',
      ['Recepción documental e inventario (INV)', 'Coordinación e ingreso', 'Confección de estado de mercadería', 'Almacenaje', 'Retiro de vacío de puerto', 'Coordinación de verificación y/o consolidado', 'Precinto y pre-cumplido de contenedor', 'Coordinación de entrega a puerto, confección de documentación y control de salida', 'Ingreso a puerto'],
      ['Estado de mercadería', 'Acta de consolidado', 'Precinto y pre-cumplido', 'Documentación de salida a puerto'],
    ),
  },
  {
    code: 'P-TRI-13.2', parent: 'P-TRI-13', title: 'Exportación Terrestre', circuito: 'terrestre', sentido: 'expo',
    keywords: ['exportación', 'terrestre', 'camión', 'consolidación', 'precintado', 'operación'],
    md: md(
      'Circuito operativo de exportación por vía terrestre (camión), dentro del proceso de Operación. Cuelga del procedimiento general P-TRI-13 Operación Exportación.',
      ['Recepción documental', 'Coordinación e ingreso', 'Confección de estado de mercadería', 'Almacenaje', 'Coordinación de verificaciones', 'Coordinación de consolidación de camión', 'Precintado y pre-cumplido del camión', 'Control de salida y documentación'],
      ['Estado de mercadería', 'Acta de consolidación de camión', 'Precintado y pre-cumplido', 'Control de salida'],
    ),
  },
];

(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const parents = {};
    (await c.query("SELECT code, id, tenant_id FROM documents WHERE code IN ('P-TRI-13','P-TRI-14')")).rows.forEach(r => parents[r.code] = r);

    for (const h of HIJOS) {
      const parent = parents[h.parent];
      if (!parent) { console.error('No existe el padre', h.parent); continue; }
      await c.query(
        `INSERT INTO documents (code, title, content_md, proceso, norma, doc_type, status, parent_document_id, keywords, needs_source, tenant_id, version)
         VALUES ($1,$2,$3,'OPERACIÓN','ISO 9001','procedimiento','aprobado',$4,$5,false,$6,1)
         ON CONFLICT (code) DO UPDATE SET
           title=EXCLUDED.title, content_md=EXCLUDED.content_md, proceso=EXCLUDED.proceso,
           norma=EXCLUDED.norma, status=EXCLUDED.status, parent_document_id=EXCLUDED.parent_document_id,
           keywords=EXCLUDED.keywords, needs_source=false, updated_at=now()`,
        [h.code, h.title, h.md, parent.id, h.keywords, parent.tenant_id]
      );
    }

    // Backfill de keywords básicas para los procedimientos que no tienen (search supplementario)
    await c.query(`UPDATE documents SET keywords = ARRAY[lower(proceso), lower(coalesce(norma,''))]
                   WHERE doc_type='procedimiento' AND (keywords IS NULL OR cardinality(keywords)=0) AND proceso IS NOT NULL`);

    await c.query('COMMIT');
    const r = await c.query("SELECT code,title,parent_document_id IS NOT NULL AS hijo FROM documents WHERE code LIKE 'P-TRI-1_._' ORDER BY code");
    console.log('Circuitos creados/actualizados:');
    r.rows.forEach(x => console.log('  ' + x.code + '  ' + x.title + '  hijo=' + x.hijo));
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ROLLBACK:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
})();
