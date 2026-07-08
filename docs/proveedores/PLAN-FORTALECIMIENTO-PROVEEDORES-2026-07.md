# Plan de Fortalecimiento · Módulo Proveedores y Contratistas (Trinorma)

**Fecha:** 2026-07-07 · **Autor:** Claude Fable 5 · **Estado:** PROPUESTA — requiere OK de Santi antes de codear (regla: planificar antes de codear)
**Fuente de verdad de requisitos:** `docs/proveedores/FUENTES-LANDING-PROVEEDORES-2026-07-07.md` (P-TRI-11, F-TRI-17, F-TRI-18, F-TRI-52)
**Norma:** ISO 9001 §8.4 (control de procesos, productos y servicios suministrados externamente) + 14001/45001 (requisitos ambientales y SST a contratistas)

---

## 1. Diagnóstico honesto (dónde vive hoy cada cosa)

1. `suppliers` en prod: 24 activos. CRUD plano (`server/routes/suppliers.js`, 87 líneas) con campos de homologación (`is_homologated/date/expiry`) y `score` que **nadie alimenta sistemáticamente**. `is_critical` no existe (llega HOY).
2. **Bug vivo front↔back**: `src/pages/Suppliers.tsx` envía `type/status/email/phone` pero el backend persiste `category/is_active/contact_email/contact_phone` → tipo, estado, email y teléfono del modal **no se guardan**, y los KPIs "Activos/En Evaluación/Suspendidos" cuentan sobre `s.status` que el server nunca devuelve (siempre 0). Los filtros `status`/`type` del front tampoco matchean los query params del server (`active`/`category`). Fix obligado antes de cualquier fase.
3. **Evaluación F-TRI-17**: Excel en Drive, ~50 proveedores evaluados 2024/2025 con los 4 criterios. Cero presencia en la app (la evaluación digital hacia adelante llega HOY; el histórico queda en el Excel → F2).
4. **Legajo documental** (ART, RC endosada, VTV, LINTI, habilitaciones, F.931): carpetas de Drive por proveedor + papel. Sin fechas de vencimiento estructuradas, sin alertas — un seguro vencido solo se descubre revisando a mano.
5. **`purchases`**: workflow completo (borrador→aprobada→ejecución→completada, permisos, IA parseProductInfo) pero el proveedor es `supplier_name` TEXTO LIBRE → imposible cruzar compras↔evaluación o frenar compras a NO aptos.
6. **NC (`findings`)**: sin vínculo a proveedor → la regla F-TRI-11 de resta de puntos (−1/−2/−3) y recupero (+1 cada 5 entregas) hoy es manual o directamente no se aplica.
7. **Acuses F-TRI-18/F-TRI-52**: firma en papel → HOY se digitaliza vía landing + acuse.
8. Protocolo de ingreso de 7 pasos (recepción/vigilancia): papel + control de accesos físico. **Fuera de alcance** de este plan.
9. TRINY no sabe nada de proveedores: ni tools de consulta, ni jobs de alerta.
10. Conclusión: la base CRUD está sana pero **toda la evidencia ISO 8.4 vive fuera de la app** (Excel + Drive + papel). Un auditor hoy pide "mostrame la evaluación y la ART vigente del transportista X" y la respuesta es buscar en 3 lugares.

---

## 2. Lo que se resuelve HOY (referencia, no parte de este plan)

- Landing pública `trinorma.dassa.com.ar/proveedores/` con los requisitos consolidados (P-TRI-11 / F-TRI-18 / F-TRI-52).
- **Acuse digital** de aceptación de requisitos: `POST /api/public/proveedores/acuse` (company_name, cuit, person_name, email, phone, activity_type, comments) + listado autenticado `GET /api/proveedores/acuses`.
- `suppliers.is_critical` (flag proveedores con incidencia en el SGI).
- **Evaluación F-TRI-17 digital** hacia adelante (4 criterios × escala 0–5, resultado APTO >12 / SUSPENDIDO 10–12 / NO APTO <10, vigencia 1 año).

Las fases siguientes asumen esto deployado.

---

## 3. Fases futuras priorizadas

> Esfuerzo: S = horas · M = 1–2 días · L = varios días/sesiones. Orden recomendado: F1 → F2 → F3 → F6 → F5 → F4 (F4 es la más cara y abre superficie pública; F5 depende de F3+F6).

### F0 (pre-requisito) · Fix desalineación Suppliers front↔back — **S**
Alinear nombres de campos del modal/filtros/KPIs de `Suppliers.tsx` con el schema real (`category/is_active/contact_email/contact_phone`), o agregar `type`(≈category)/`status` si se prefiere el modelo del front. Decidir cuál gana. Sin esto, las fases siguientes construyen sobre datos que no se persisten.

### F1 · Legajo documental por proveedor + semáforo + alerta TRINY — **M** · Valor ISO: ALTO
El corazón del fortalecimiento: pasar de "carpetas Drive" a documentos con vencimiento estructurado.

Modelo propuesto (migración 065):

```sql
CREATE TABLE supplier_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL,      -- catálogo sugerido (ver abajo), TEXT libre para no frenar carga
  description  TEXT,
  file_path    TEXT,               -- upload local (uploads/, randomUUID) …
  drive_url    TEXT,               -- … o link a la carpeta/archivo Drive existente (al menos uno de los dos)
  issued_date  DATE,
  expiry_date  DATE,               -- NULL = no vence (ej. estatuto, antecedentes "única vez")
  uploaded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_supplier_docs_supplier ON supplier_documents(supplier_id);
CREATE INDEX idx_supplier_docs_expiry   ON supplier_documents(expiry_date) WHERE expiry_date IS NOT NULL;
```

- **Catálogo `doc_type`** (de FUENTES §4/§5, constante compartida front/back, no enum de BD): `art_cobertura` · `art_no_repeticion` · `art_aviso_no_pago` · `rc_endosada` · `seguro_automotor` · `vtv` · `linti` · `licencia_conducir` · `habilitacion_transporte` · `ruta` · `cedula_verde` · `f931` · `apto_medico` · `nomina_personal` · `cert_iso` · `habilitacion_ambiental` · `otro`.
- **Semáforo computado en query** (sin trigger ni columna de estado): `vencido` (expiry < hoy) · `por_vencer` (< hoy+30d) · `vigente`. Se muestra en la fila del proveedor y agregado en KPI de la página.
- **Alerta TRINY semanal**: job nuevo `proveedores_vencimientos` en el patrón existente (`triny_scheduled_jobs` + crontab del SO vía `triny-run-job.cjs --scheduled` — ⚠ NO node-cron in-process, ver `reference_triny-jobs-crontab-so`). SQL puro + plantilla determinística (0 tokens): mail a María (+Dirección si hay vencidos de proveedor `is_critical`) con vencidos y por-vencer 30d. Respeta `dry_run` para el shakedown.
- UI: tab "Legajo" en el detalle del proveedor (lista + alta con upload o link Drive). Carga inicial: solo los ~críticos, a mano (ver Riesgos).

### F2 · Import histórico F-TRI-17 2024/2025 desde el Excel del Drive — **M** · Valor ISO: MEDIO-ALTO (evidencia de continuidad de la evaluación anual)
- Script one-shot (`server/scripts/`) que lee el Excel del Drive (~50 proveedores evaluados) y lo vuelca a la tabla de evaluaciones creada HOY, marcando origen `import_excel_2024|2025`.
- **Match difuso por nombre** contra `suppliers.name` (pg_trgm `similarity()` o normalización + Levenshtein en JS): ≥0.85 auto-match · 0.5–0.85 a revisión · <0.5 candidato a alta nueva.
- **Revisión asistida de María**: el script NO decide solo — genera una pantalla/CSV de pares propuestos (excel_name → supplier) que María confirma o corrige antes del INSERT definitivo. Dry-run primero, siempre.
- Efecto lateral sano: probablemente destape proveedores evaluados que no están en `suppliers` (24 activos vs ~50 evaluados) → alta masiva opcional con OK de María.

### F3 · Vínculo purchases↔suppliers + gate suave — **S/M** · Valor ISO: ALTO (cierra el loop 8.4: solo se compra a evaluados)
- Migración: `purchases.supplier_id UUID NULL REFERENCES suppliers(id)`. `supplier_name` queda como estaba (histórico + fallback), NO se borra.
- Front: el campo proveedor de la compra pasa a autocomplete sobre `suppliers` (con opción "texto libre" para compras menores ML/WhatsApp, que P-TRI-11 permite).
- Backfill difuso opcional de las compras existentes (mismo matcher de F2, misma revisión asistida).
- **Gate SUAVE** (decisión explícita: warning, no bloqueo — P-TRI-11 no prohíbe, exige control): al crear/aprobar una compra cuyo `supplier_id` está NO APTO, SUSPENDIDO o con evaluación vencida (>1 año) → banner de advertencia + el warning queda registrado en la compra (evidencia de que se compró "a sabiendas", que es exactamente lo que un auditor quiere ver).

### F4 · Portal del proveedor (link tokenizado) — **L** · Valor ISO: MEDIO (reduce carga de María, mejora frescura de legajos)
- Patrón `portal-empleado` (`server/routes/public-portal.js`): link tokenizado por proveedor generado desde la fila en `/suppliers`, sin cuenta.
- El proveedor: ve su legajo (qué docs se le exigen según `activity_type`, cuáles vencieron) → **sube su propia documentación** (entra como `pendiente_revision`, María aprueba → pasa al legajo) → **re-acepta requisitos anualmente** (nuevo acuse sobre la tabla de HOY, con `doc_version`).
- ⚠ Lecciones del P0-6 del portal empleado: desde el día 1 → token largo no adivinable + expiración, rate-limit, identificación CUIT+token, y **blindaje antes de exponer** (skill dassa-blindaje-apps). Es superficie pública nueva con PII.
- Hacerla DESPUÉS de F1: sin legajo estructurado no hay nada que el proveedor pueda "completar".

### F5 · Re-evaluación anual asistida por TRINY — **M** · Valor ISO: ALTO (la evaluación anual es LA obligación de P-TRI-11) · Depende de F3 + F6
- Job TRINY mensual (mismo patrón crontab): detecta evaluaciones que cumplen 1 año en los próximos 30 días.
- Para cada una, arma **borrador de evaluación** con datos objetivos del año: NCs atribuidas al proveedor (F6), compras completadas/canceladas (F3), estado del legajo (F1), acuse vigente (HOY). El borrador NO se autocompleta como definitivo: María/Dirección puntúan los 4 criterios viendo el contexto al lado.
- Recordatorio por mail a María + Dirección con link directo al borrador. Plantilla determinística; si se quiere párrafo narrativo de TRINY, es 1 llamada Sonnet por evaluación (costo ínfimo, opcional).

### F6 · Integración NC↔proveedor (F-TRI-11) — **M** · Valor ISO: ALTO · Conviene ANTES de F5
- Migración: `findings.supplier_id UUID NULL REFERENCES suppliers(id)` + `findings.supplier_gravity TEXT NULL` (`leve|grave|muy_grave`). ⚠ `findings` NO tiene columna `severity` hoy (la auditoría 2026-07-06 encontró código que referenciaba una inexistente — no repetir: campo propio y explícito para esto).
- Al cargar una NC atribuible a un proveedor: selector de proveedor + gravedad → descuenta del `score` según F-TRI-11 (leve −1 · grave −2 · muy grave −3; muy grave además alerta a Dirección por posible baja).
- **Recupero +1 cada 5 entregas conformes consecutivas**: la "entrega conforme" se registra sobre compras completadas sin NC asociada (F3). Contador simple por proveedor; una NC resetea la racha.
- El movimiento de puntos queda en una tabla de log (`supplier_score_events`: supplier_id, delta, motivo, finding_id/purchase_id, created_at) — el score nunca se edita a mano sin rastro.

---

## 4. Riesgos y decisiones abiertas

1. **Multi-tenant**: deuda global ya documentada (`docs/MULTITENANT_DESIGN.md`, migración 021). Las tablas nuevas siguen el patrón mono-tenant actual — NO resolver acá, solo no empeorar (mismas convenciones).
2. **Quién carga los datos**: María es un solo par de manos. F1 sin criterio de arranque = módulo muerto. Propuesta: cargar legajo SOLO de los proveedores `is_critical` + transportistas al inicio; el resto entra por F4 (autoservicio) o cuando renueven. Confirmar con María antes de F1.
3. **Doble fuente de verdad en transición**: el Excel F-TRI-17 sigue en Drive. Definir fecha de corte: tras F2, las evaluaciones nuevas SOLO en la app y el Excel queda congelado como histórico (read-only).
4. **PII de choferes** (DNI, CUIL, LINTI, apto médico, libreta sanitaria, nóminas): Ley 25.326. Guardar el mínimo (documento con vencimiento, no datos sueltos), acceso por rol (María/Dirección/SGI), y en F4 el proveedor solo ve lo suyo. Definir retención de docs vencidos (propuesta: conservar — son evidencia de auditoría).
5. **Storage**: ¿uploads locales (`uploads/`, ya gitignored y con randomUUID) o links a las carpetas Drive existentes? Propuesta F1: **ambos** (el modelo tiene `file_path` y `drive_url`) para no obligar migración de Drive. Riesgo del link Drive: permisos/borrado fuera del control de la app.
6. **Gate F3 suave vs duro**: propuesto suave (warning registrado). Si Dirección quiere bloqueo duro para NO APTOS, es un `if` más — pero cambia la operatoria de compras urgentes. Decisión de Santi/Dirección.
7. **F4 abre superficie pública**: no arrancarla sin pasar dassa-blindaje-apps; evaluar si el valor (proveedores subiendo docs) justifica el mantenimiento de otra superficie externa además de landing + portal empleado + portal mudancera.

---

## 5. Tabla resumen

| Fase | Alcance | Esfuerzo | Depende de |
|---|---|---|---|
| F0 | Fix campos front↔back en Suppliers (bug vivo) | S | — |
| F1 | Legajo documental + semáforo + alerta TRINY semanal | M | F0; trabajo de HOY deployado |
| F2 | Import histórico F-TRI-17 2024/2025 (match difuso + revisión María) | M | Evaluación digital de HOY |
| F3 | FK purchases→suppliers + gate suave NO APTO/SUSPENDIDO | S/M | F0 |
| F6 | NC↔proveedor: −1/−2/−3 + recupero +1 c/5 entregas + log de score | M | F3 (entregas conformes) |
| F5 | Re-evaluación anual asistida TRINY (borrador con datos del año) | M | F1, F3, F6 |
| F4 | Portal del proveedor tokenizado (sube docs + re-acepta anual) | L | F1 + blindaje |

**Orden recomendado:** F0 → F1 → F2 → F3 → F6 → F5 → F4. Cada fase es deployable sola y con valor propio; ninguna requiere tocar lo que la landing/acuse de HOY deja en prod.
