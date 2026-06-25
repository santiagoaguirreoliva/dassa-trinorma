#!/usr/bin/env node
// Vincula los procedimientos (documents P-TRI/P-OP/...) con las fichas de puesto
// (job_profiles) según el criterio de MATRIZ ISO acordado con Santi (2026-06-25):
//   - Procedimientos SGI TRANSVERSALES  -> TODAS las fichas activas (role='aplica')
//   - Procedimientos de PROCESO/ÁREA    -> solo las fichas de esa área (role='responsable')
// Escribe en job_profile_procedures.document_id. Idempotente: borra la matriz previa
// (por la nota datada) antes de reinsertar. NO toca los vínculos legacy (procedure_id).
//
// Uso: node scripts/vincular-procedimientos-fichas.cjs
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const NOTE = 'Matriz procedimientos por puesto 2026-06-25 (TRINY)';

// 12 SGI + Plan de Emergencia/Evacuación → aplican a todos los puestos
const TRANSVERSAL = [
  'P-TRI-01', 'P-TRI-02', 'P-TRI-03', 'P-TRI-04', 'P-TRI-05', 'P-TRI-06',
  'P-TRI-07', 'P-TRI-08', 'P-TRI-18', 'P-TRI-21', 'P-TRI-22', 'P-TRI-24',
  'P-SST-004',
];

// [code, area] — procedimientos específicos por área operativa
const AREA = [
  ['P-TRI-09', 'Comercial'], ['P-TRI-09', 'Gerencia'], ['P-TRI-09', 'Dirección'],
  ['P-TRI-10', 'Comercial'], ['P-TRI-10', 'Gerencia'], ['P-TRI-10', 'Dirección'],
  ['P-TRI-11', 'Administración'], ['P-TRI-11', 'Operaciones'], ['P-TRI-11', 'Gerencia'],
  ['P-TRI-12', 'Operaciones'], ['P-TRI-12', 'Depósito'], ['P-TRI-12', 'Gerencia'],
  ['P-TRI-13', 'Coordinación'], ['P-TRI-13', 'Coordinación IMPO'], ['P-TRI-13', 'Depósito'], ['P-TRI-13', 'Operaciones'], ['P-TRI-13', 'Gerencia'],
  ['P-TRI-14', 'Coordinación'], ['P-TRI-14', 'Coordinación IMPO'], ['P-TRI-14', 'Depósito'], ['P-TRI-14', 'Operaciones'], ['P-TRI-14', 'Gerencia'],
  ['P-TRI-17', 'Administración'], ['P-TRI-17', 'Dirección'], ['P-TRI-17', 'Gerencia'],
  ['P-TRI-23', 'Seguridad e Higiene'], ['P-TRI-23', 'Depósito'], ['P-TRI-23', 'Operaciones'],
  ['P-TRI-25', 'Seguridad e Higiene'], ['P-TRI-25', 'Depósito'], ['P-TRI-25', 'Operaciones'],
  ['P-OP-001', 'Depósito'], ['P-OP-001', 'Coordinación'], ['P-OP-001', 'Coordinación IMPO'], ['P-OP-001', 'Operaciones'],
  ['P-OP-002', 'Depósito'], ['P-OP-002', 'Seguridad e Higiene'], ['P-OP-002', 'Operaciones'],
  ['P-SST-003', 'Depósito'], ['P-SST-003', 'Seguridad e Higiene'], ['P-SST-003', 'Operaciones'],
  ['P-AMB-003', 'Seguridad e Higiene'], ['P-AMB-003', 'Depósito'], ['P-AMB-003', 'Operaciones'],
  ['P-CAL-003', 'Operaciones'], ['P-CAL-003', 'Coordinación'], ['P-CAL-003', 'Coordinación IMPO'], ['P-CAL-003', 'Comercial'], ['P-CAL-003', 'Gerencia'],
];

(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const del = await c.query('DELETE FROM job_profile_procedures WHERE notes LIKE $1', ['Matriz procedimientos por puesto 2026-06-25%']);

    const t = await c.query(
      `INSERT INTO job_profile_procedures (profile_id, document_id, role, notes, tenant_id)
       SELECT jp.id, d.id, 'aplica', $2, jp.tenant_id
       FROM job_profiles jp CROSS JOIN documents d
       WHERE jp.is_active = true AND d.doc_type = 'procedimiento' AND d.code = ANY($1::text[])`,
      [TRANSVERSAL, NOTE + ' · transversal']
    );

    const vals = AREA.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',');
    const params = AREA.flat();
    const a = await c.query(
      `INSERT INTO job_profile_procedures (profile_id, document_id, role, notes, tenant_id)
       SELECT jp.id, d.id, 'responsable', $${params.length + 1}, jp.tenant_id
       FROM job_profiles jp
       JOIN (VALUES ${vals}) AS m(code, area) ON m.area = jp.area
       JOIN documents d ON d.code = m.code AND d.doc_type = 'procedimiento'
       WHERE jp.is_active = true`,
      [...params, NOTE + ' · por área']
    );

    await c.query('COMMIT');
    console.log(`OK · previas borradas=${del.rowCount} · transversales=${t.rowCount} · por área=${a.rowCount}`);
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ROLLBACK:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
})();
