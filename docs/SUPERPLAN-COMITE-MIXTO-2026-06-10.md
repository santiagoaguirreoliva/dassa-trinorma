# Superplan · Comité Mixto — Acta Viva (toma de notas en vivo)

> **Fecha:** 2026-06-10 · **Módulo:** `apps/sgi` (SGI Trinorma) · **Estado:** plan aprobable
> **Contexto:** el Comité Mixto es el traccionador mes a mes del SGI. Hoy hay reunión.
> Objetivo: tomar notas **dentro de la app** (no en Word para importar después), guardando
> punto por punto, creando tareas con responsable y vencimiento, y dejando trazabilidad.

---

## BLOQUE 1 — BRIEF

**Problema:** hoy la reunión de comité se documenta en Word y luego se importa. Se pierde
progreso, no hay trazabilidad inmediata, las tareas no nacen asignadas y el seguimiento
mes a mes es manual.

**Lo que reemplaza:** el acta en Word + la carga diferida.

**Quién lo usa:** SGI Leader (Manuel), RRHH (María), SySO (Fernando), Operaciones
(Christian), Dirección, Auditora (NIXA). Frecuencia: **mensual/bimestral** (reunión de comité).

**Costo del status quo:** se pierden acuerdos, las tareas quedan sin responsable/fecha,
y en auditoría no hay evidencia trazable de seguimiento.

---

## ESTADO ACTUAL (auditoría 2026-06-10)

**Ya existe y funciona** (`server/routes/committee.js` + `src/pages/Committee.tsx`):
- Lista de reuniones + **wizard 3 pasos** (crear reunión · revisar pendientes vivos · nuevas tareas).
- `POST /:id/process-ai` — Claude extrae tareas del acta (backend listo, **sin botón en UI**).
- `PATCH /:id/close-with-signature` — firma digital en array `signatures[]` (backend listo, **sin UI**).
- Tabla `tasks` (principal) con `committee_id`, `source_module='committee'`, `assigned_to`,
  `collaborator_id`, `task_assignees` (multi-responsable), `finding_id`, `task_number` auto.
- `GET /:id/pending-from-previous` — tareas vivas de reuniones anteriores.

**Falta** (los gaps reales):
- ❌ Página de detalle `/committee/:id` (las cards navegan a una ruta inexistente).
- ❌ Editor de acta **en vivo** con **autosave** (hay patrón listo en `inspections.js:519` + `RondaDetalle.tsx`).
- ❌ Crear/editar tareas **durante** la reunión (hoy solo en el wizard, pre-reunión).
- ❌ Panel de **contexto** (NC abiertas, capacitaciones del mes, objetivos+mediciones).
- ❌ UI de **firma digital** y botón de **IA**.
- ⚠️ Dualidad `committee_tasks` (casi muerta) vs `tasks` (real) → estandarizar a `tasks`.

---

## BLOQUE 2 — ENTIDADES (existen; cambios mínimos)

```
committee_meetings  (EXISTE)
  minutes (text)            ← acta viva (autosave acá)
  agenda, preamble (text)
  topics_discussed (jsonb)  ← puntos tratados, uno por bloque
  signatures (jsonb[])      ← firmas de cierre
  status: programada|realizada|cerrada
  draft_saved_at (ts)       ← NUEVO: timestamp del último autosave

tasks  (EXISTE — fuente de verdad de tareas del comité)
  committee_id, source_module='committee', finding_id
  assigned_to, collaborator_id, task_assignees[]
  due_date, status, priority, task_number

committee_agenda_items  (NUEVO, opcional Fase 2)
  id, meeting_id, orden, tipo (pendiente|nuevo|capacitacion|nc|medicion|otro)
  texto, resuelto (bool), created_at
  → permite "guardar punto por punto" como ítems discretos, no solo un textarea
```

Cambio de schema mínimo para MVP: **1 columna** `committee_meetings.draft_saved_at` (o reusar `updated_at`).

---

## BLOQUE 3 — FLUJO DE LA REUNIÓN EN VIVO

```
1. Abrir reunión (existe wizard) → entrar a /committee/:id
2. [Pendientes anteriores]  levantar tareas vivas → actualizar status por responsable
                            (sigue / completada / cancelada) — guardado al toque
3. [Acta viva]              ir escribiendo el acta → AUTOSAVE cada 20-30s + a localStorage
4. [Nuevas tareas]          agregar tarea inline: título + responsable + colaborador +
                            fecha venc. + prioridad + (opcional link a NC/objetivo) → POST
5. [Contexto]               revisar paneles: NC abiertas · capacitaciones del mes ·
                            objetivos 2026 + últimas mediciones · auditorías
6. [Cerrar]                 (opcional IA: extraer tareas del acta) → firma digital →
                            status='cerrada' cuando firman los asistentes
7. Trazabilidad             cada tarea queda en /mis-pendientes del responsable + ligada
                            a la reunión; el próximo comité las levanta en el paso 2
```

---

## BLOQUE 4 — API (qué agregar; el resto ya existe)

```
NUEVO  POST  /api/committee/:id/draft        autosave del acta (minutes) idempotente,
                                             COALESCE no destructivo + draft_saved_at=now()
                                             (patrón inspections.js:519)
NUEVO  GET   /api/committee/:id/context      agrega para el panel:
                                               · findings abiertos (NC/desvíos)
                                               · capacitaciones vencidas/programadas del mes
                                               · objetivos year actual + última medición
REUSA  GET   /api/committee/:id/full         meeting + tasks hidratadas
REUSA  GET   /api/committee/:id/pending-from-previous
REUSA  POST  /api/committee/:id/tasks        crear tarea durante la reunión
REUSA  PATCH /api/committee/:id/tasks/:tid   actualizar status/responsable/fecha
REUSA  POST  /api/committee/:id/process-ai   extraer tareas del acta (exponer en UI)
REUSA  PATCH /api/committee/:id/close-with-signature
```

---

## BLOQUE 5 — UI · `src/pages/CommitteeDetail.tsx` (NUEVO)

```
Ruta: /committee/:id   (hoy las cards ya apuntan acá → solo falta la página)

Layout (1 columna en mobile, 2 en desktop):
 ├─ Header: fecha · nº reunión · estado · asistentes · indicador autosave
 │          ("Guardado hace 12s" / "Solo local — reconectando")
 ├─ [Panel A] Pendientes del comité anterior (levantados)
 │     fila: task_number · título · responsable · status <select> (sigue/completada/cancelada)
 │     → PATCH al cambiar (optimista)
 ├─ [Panel B] ACTA VIVA — <textarea> grande, autosave 20s + localStorage
 │     (o lista de puntos: "+ Agregar punto" → committee_agenda_items en Fase 2)
 ├─ [Panel C] Nuevas tareas/pendientes — form inline compacto:
 │     título · responsable(s) · fecha venc. · prioridad · [link NC/objetivo opcional] → POST
 │     lista de las creadas en esta reunión (con badge "IA" si vinieron de process-ai)
 ├─ [Panel D] Contexto (colapsable) — GET /context:
 │     · NC/desvíos abiertos   · capacitaciones del mes   · objetivos+mediciones
 ├─ Toolbar: [Procesar acta con IA] [Guardar] 
 └─ Footer: [Cerrar con firma digital] (SignaturePad existente) · X de Y firmas
```

Reutilizar: patrón autosave de `RondaDetalle.tsx`, componente `SignaturePad.tsx`.

---

## BLOQUE 6 — AUTH (ya resuelto)

Usa el JWT propio del SGI (no es app nueva, no aplica SSO/manifest). Acceso al comité:
`master_admin`, `director`, `sgi_leader`, `auditor_externo`, y miembros del comité
(`rrhh`, `seguridad_higiene`, `operaciones`). Crear/cerrar reunión: `sgi_leader`/`master_admin`.
Actualizar status de la propia tarea: el responsable. Auditoría: firma con `user_id + ip + ts`.

---

## BLOQUE 7 — INTEGRACIONES (internas al SGI)

| Integración | Para qué |
|---|---|
| `tasks` / `/mis-pendientes` | las tareas del comité aparecen en los pendientes del responsable |
| `findings` (NC/desvíos) | panel de contexto + ligar tarea a una NC (`tasks.finding_id`) |
| `objectives` + `objective_measurements` | revisar cumplimiento del mes (¡lo cargado hoy!) |
| `trainings` / `v_employee_training_status` | capacitaciones vencidas/programadas del mes |
| Anthropic (Claude) | `process-ai` extrae tareas del acta (ya integrado) |
| Mailer | (Fase 4) avisar a responsables las tareas nuevas |

---

## BLOQUE 8 — STACK

Sin novedad: React+Vite+TS (front), Express ESM (server), Postgres `dassa_sgi`, PM2 `dassa-sgi:4001`.
Migración mínima nueva (1 columna). Sin dependencias nuevas (SignaturePad y autosave ya existen).

---

## BLOQUE 9 — FASES Y ESTIMACIÓN

| Fase | Alcance | Esfuerzo | Para |
|---|---|---|---|
| **F1 · MVP "Acta Viva"** | `CommitteeDetail.tsx` + `POST /:id/draft` (autosave) + Panel A (pendientes con status) + Panel C (nuevas tareas inline) | **S–M (~½ día)** | **HOY** |
| F2 · Panel de Contexto | `GET /:id/context` + Panel D (NC/capacitaciones/objetivos) | S | esta semana |
| F3 · Cierre formal | UI firma digital + botón IA (process-ai) + estado cerrada | S | esta semana |
| F4 · Trazabilidad+ | export PDF acta · notificar responsables · vista seguimiento mes a mes · ligar tarea↔NC↔objetivo | M | próximo sprint |
| F5 · Limpieza | unificar `committee_tasks`→`tasks` · `committee_agenda_items` (puntos discretos) | S | backlog |

**MVP de hoy = F1.** Garantiza: tomar notas sin perder progreso + actualizar pendientes + crear tareas asignadas.

---

## BLOQUE 10 — RIESGOS

```
R1 · Reunión es HOY → tiempo. Mitigación: F1 es chico y reusa patrones existentes
     (autosave de inspecciones, SignaturePad, endpoints ya hechos). Codear solo F1 hoy.
R2 · Pérdida de notas (cierre de pestaña / mobile). Mitigación: doble autosave
     (localStorage inmediato + servidor cada 20s) — patrón probado en RondaDetalle.
R3 · Dualidad committee_tasks vs tasks. Mitigación: el MVP escribe SIEMPRE en `tasks`
     (source_module='committee'); committee_tasks se deja para F5.
R4 · Conflicto de edición concurrente del acta (2 personas). Mitigación: en F1 un solo
     editor (el secretario de actas); multi-cursor queda fuera de alcance.
R5 · process-ai pisa tareas ya creadas a mano. Mitigación: IA solo agrega, marca origen
     'ai_extracted', y se confirma antes de insertar (F3).
```

---

## Definición de Done — F1 (hoy)
- [ ] `POST /api/committee/:id/draft` guarda `minutes` no destructivo + `draft_saved_at`.
- [ ] `/committee/:id` renderiza `CommitteeDetail` (ruta + página).
- [ ] Acta con autosave (localStorage + servidor 20s) e indicador de estado.
- [ ] Panel pendientes anteriores con cambio de status por responsable (PATCH optimista).
- [ ] Alta de tarea inline (responsable + fecha + prioridad) → POST a `tasks`.
- [ ] `npm run check` verde · build · `pm2 restart dassa-sgi`.
