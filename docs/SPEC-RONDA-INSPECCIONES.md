# SPEC TÉCNICO — Módulo "Ronda de Inspecciones"

> App: **Trinorma SGI** (`dassa-sgi` · `/home/dassa/dassa4/apps/sgi`)
> Fecha: 2026-05-19 · Estado: **borrador para aprobar scope**
> Skill de origen: `nuevo-sistema-dassa` → siguiente paso: `implementacion-guiada`

---

## BLOQUE 1 — BRIEF

DASSA controla hoy con **5 formularios en papel/Excel** (F-TRI-19 a F-TRI-23) el estado
de limpieza, mantenimiento, seguridad e higiene y maquinaria del depósito. No hay
trazabilidad: no se sabe quién completó qué, cuándo ni desde dónde; no hay evidencia
fotográfica; nadie se entera si una ronda no se hizo; y los datos no alimentan ningún
indicador ISO.

El módulo **Ronda de Inspecciones** digitaliza esos formularios dentro de Trinorma,
los dispara automáticamente como **tareas pendientes obligatorias** según su frecuencia,
y los pone bajo supervisión de **Triny AI**. Todo está optimizado para **móvil vertical**
(el caso real es gente recorriendo el depósito con el teléfono), permite **adjuntar fotos**,
guarda **geolocalización con validación de geofence** y **firma digital**.

### Dos familias de uso

| Familia | Quién la usa | Cómo entra | Formularios |
|---|---|---|---|
| **Rondines de supervisión** | Personal **con usuario** Trinorma | Tarea pendiente → form digital | Limpieza, Mantenimiento, SSHH |
| **Checklist de maquinaria** | Maquinistas **sin usuario** | **QR de máquina + PIN** → form público | F-TRI-19 autoelevadores |

### Catálogo de formularios (origen: planilla F-TRI)

| Código | Nombre | Familia | Frecuencia | Responsables | Co-firma |
|---|---|---|---|---|---|
| **F-TRI-23** | Ronda de limpieza | Rondín | Semanal | María | No (1 persona) |
| **F-TRI-20** | Ronda de mantenimiento (32 ítems) | Rondín | Semanal | María + Marcelo | **Sí** |
| **SSHH** | Ronda de Seguridad e Higiene | Rondín | Quincenal (2×/mes) | FER + María | **Sí** |
| **F-TRI-19** | Checklist diario autoelevadores (21 ítems) | Maquinaria | Diaria, por máquina | Maquinistas (PIN) | Firma chofer |
| F-TRI-21 / F-TRI-22 | Equipos críticos (escáner / montacargas) | Preventivo | Trimestral / Anual | Mantenimiento | — *(fase futura)* |

### Decisiones de diseño confirmadas con Santiago

1. **Ingreso público**: QR pegado en cada máquina + **PIN de 4 dígitos** por chofer.
2. **SSHH** = Seguridad e Higiene laboral (matafuegos, señalética, salidas, EPP, riesgos).
3. **Geolocalización**: **geofence** del predio DASSA — se valida; si el envío es fuera
   del perímetro se marca `fuera_de_sitio` pero **no se bloquea**.
4. **Rondines de 2 personas**: **tarea única con co-firma** — completa uno, el segundo
   responsable co-firma para cerrarla.

---

## BLOQUE 2 — ENTIDADES

Motor genérico dirigido por plantillas (un solo motor sirve los 5 formularios).
DB: Postgres del SGI (`DATABASE_URL`). Prefijo de tablas: `insp_`.

```
insp_templates          — definición de cada formulario
  id UUID PK
  code            TEXT UNIQUE      -- F-TRI-19, F-TRI-20, F-TRI-23, SSHH
  name            TEXT
  family          TEXT             -- 'rondin' | 'maquinaria'
  frequency       TEXT             -- 'diaria'|'semanal'|'quincenal'|'mensual'|'trimestral'
  gen_cron        TEXT             -- expresión cron de generación de instancias
  due_offset_days INT              -- días hasta el vencimiento desde que se genera
  requires_cosign BOOLEAN          -- rondines de 2 personas
  active          BOOLEAN DEFAULT true
  created_at, updated_at

insp_template_items     — los ítems del checklist de cada template
  id UUID PK
  template_id     UUID FK -> insp_templates
  section         TEXT             -- agrupador (ej. "Niveles", "Seguridad", "Naves")
  order_idx       INT
  label           TEXT             -- "NIVEL DE ACEITE", "FRENO DE PIE Y MANO", ...
  response_type   TEXT             -- 'si_no' | 'cumple' | 'texto' | 'numero'
  is_critical     BOOLEAN          -- falla habilita/sugiere NC automática
  photo_on_fail   BOOLEAN          -- foto obligatoria si la respuesta es negativa
  created_at

insp_machines           — roster de máquinas (autoelevadores, etc.)
  id UUID PK
  code            TEXT UNIQUE      -- AE-01, AE-02, ...
  name            TEXT
  type            TEXT             -- 'autoelevador' | 'montacargas'
  qr_token        UUID UNIQUE      -- token del QR público (rotable)
  active          BOOLEAN DEFAULT true
  created_at, updated_at

insp_operators          — choferes/maquinistas SIN usuario SSO
  id UUID PK
  employee_id     UUID FK -> employees (nullable, si ya existe como empleado)
  full_name       TEXT
  pin_hash        TEXT             -- bcrypt del PIN de 4 dígitos
  active          BOOLEAN DEFAULT true
  created_at, updated_at

insp_inspections        — cada ejecución (pendiente o completada) de un formulario
  id UUID PK
  code            TEXT UNIQUE      -- RON-2026-### / MAQ-2026-#####
  template_id     UUID FK
  family          TEXT
  status          TEXT             -- 'pendiente'|'en_curso'|'en_cofirma'|'completada'|'vencida'
  period_label    TEXT             -- "Semana 2026-W21", "2026-05-19", "Quincena 1 May"
  scheduled_date  DATE
  due_date        DATE
  machine_id      UUID FK (nullable)   -- familia maquinaria
  operator_id     UUID FK (nullable)   -- familia maquinaria
  completed_by    UUID FK -> users (nullable)
  cosigned_by     UUID FK -> users (nullable)
  task_id         UUID FK -> tasks (nullable)  -- la tarea pendiente vinculada
  machine_hours   NUMERIC (nullable)   -- horómetro del autoelevador
  geo_lat         NUMERIC
  geo_lng         NUMERIC
  geo_inside      BOOLEAN              -- dentro del geofence DASSA
  submitted_ip    TEXT
  submitted_ua    TEXT
  signature_url   TEXT                 -- firma digital (canvas → imagen)
  cosign_url      TEXT
  findings_count  INT DEFAULT 0
  completed_at    TIMESTAMPTZ
  created_at, updated_at, deleted_at

insp_responses          — respuesta a cada ítem en una inspección
  id UUID PK
  inspection_id   UUID FK -> insp_inspections
  item_id         UUID FK -> insp_template_items
  answer          TEXT             -- 'si'|'no'|'cumple'|'no_cumple' | texto/numero
  observations    TEXT
  photo_urls      TEXT[] DEFAULT '{}'
  finding_id      UUID FK -> findings (nullable)  -- NC generada desde el ítem
  created_at

insp_assignees          — responsables de un rondín (María, Marcelo, FER)
  id UUID PK
  inspection_id   UUID FK -> insp_inspections
  user_id         UUID FK -> users
  role            TEXT             -- 'responsable' | 'cofirmante'
  signed          BOOLEAN DEFAULT false
  signed_at       TIMESTAMPTZ
```

Config del **geofence DASSA** (centroide + radio, o polígono) → tabla `insp_config`
key/value, o constante en `.env` (`INSP_GEOFENCE_LAT/LNG/RADIUS_M`).

---

## BLOQUE 3 — FLUJO

### A. Rondín de supervisión (limpieza / mantenimiento / SSHH)

```
1. CRON (según frequency) genera insp_inspections (status 'pendiente')
   + crea task en Tareas pendientes (source_module='rondas') asignada a responsables
2. María/Marcelo/FER ve la tarea → abre el formulario digital (mobile vertical)
3. Recorre los ítems: cumple / no cumple + observación + foto
4. Ítem crítico en 'no cumple' → ofrece generar NC (finding) vinculada
5. Captura geo (geofence valida) + firma digital → guarda
   - Template sin co-firma  → status 'completada'
   - Template con co-firma  → status 'en_cofirma'
6. El 2º responsable abre y co-firma → status 'completada'
7. Al completarse: cierra la task · evento a Triny · suma indicadores
```

Estados: `pendiente → en_curso → [en_cofirma] → completada` · `pendiente/en_curso → vencida` (si pasa due_date).

### B. Checklist diario de maquinaria (público, choferes)

```
1. CRON diario 06:00 genera insp_inspections pendientes por máquina activa
2. Chofer escanea el QR de la máquina → /checklist-maquina?m=<qr_token>  (público, sin auth)
3. Ingresa su PIN de 4 dígitos → backend valida operador → token efímero de sesión
4. Completa los 21 ítems SI/NO + observaciones + fotos + horómetro
5. Captura geo (geofence) + firma en canvas
6. Envía → POST /api/public/checklist → guarda histórico, cierra la instancia del día
7. Ítem crítico en NO (ej. frenos, extintor) → alerta a Mantenimiento + sugiere NC
8. Evento a Triny · histórico auditable por máquina/día en /rondas/maquinaria
```

---

## BLOQUE 4 — API

### Autenticada — `/api/inspections` (middleware `authenticate`)

```
GET    /api/inspections                 listar (filtros: family, status, template,
                                         machine, desde, hasta, mine, overdue)
GET    /api/inspections/stats            KPIs agregados
GET    /api/inspections/analytics        series de tiempo + cumplimiento
GET    /api/inspections/:id              detalle con responses + assignees
POST   /api/inspections/:id/start        marcar en_curso
POST   /api/inspections/:id/complete     enviar respuestas + geo + firma
POST   /api/inspections/:id/cosign       co-firma del 2º responsable
POST   /api/inspections/:id/finding      generar NC desde un ítem en falla

GET    /api/inspections/templates                 listar templates + ítems
POST   /api/inspections/templates                 crear  (admin)
PATCH  /api/inspections/templates/:id              editar (admin)

GET    /api/inspections/machines                   listar máquinas
POST   /api/inspections/machines                   crear  (admin)
PATCH  /api/inspections/machines/:id               editar (admin)
POST   /api/inspections/machines/:id/rotate-qr     rotar qr_token (admin)
GET    /api/inspections/machines/:id/qr.png        PNG del QR para imprimir

GET    /api/inspections/operators                  listar operadores
POST   /api/inspections/operators                  crear + set PIN (admin)
PATCH  /api/inspections/operators/:id              editar / reset PIN (admin)
```

### Pública — `/api/public` (sin auth · router dedicado, patrón `public-nc.js`)

```
GET    /api/public/checklist/machine?token=<qr>    resuelve máquina + template (sin datos sensibles)
POST   /api/public/checklist/verify-pin            { machine_token, pin } → operador + token efímero
POST   /api/public/checklist                       envío completo del checklist diario
```

Anti-abuso de la ruta pública: rate-limit por IP, PIN con bcrypt, token efímero de
sesión (5 min, firma HMAC), `qr_token` rotable, geofence registrado.

---

## BLOQUE 5 — UI (mobile-first, vertical)

```
Página: Rondas (dashboard del módulo)
Ruta:  /rondas
  - Tarjetas: rondines pendientes / vencidos / del día
  - KPIs: % cumplimiento, hallazgos del período, máquinas con alerta
  - Acceso rápido a "completar" cada rondín asignado al usuario

Página: Ejecutar rondín
Ruta:  /rondas/:id
  - Formulario digital paso a paso, una sección por pantalla (mobile vertical)
  - Por ítem: toggle cumple/no cumple, observación, botón cámara/foto
  - Captura de geo + firma en canvas al cerrar
  - Botón co-firma si status = en_cofirma

Página: Maquinaria — histórico
Ruta:  /rondas/maquinaria
  - Grilla máquina × día, semáforo por estado
  - Drill-down al checklist de un día, fotos, firma, geo
  - Filtros para auditoría de Mantenimiento

Página: Configuración (admin)
Ruta:  /rondas/config
  - Tabs: Plantillas (ítems) · Máquinas (QR imprimible) · Operadores (PIN)

Página: Checklist público (choferes)
Ruta:  /checklist-maquina   (ruta SPA pública, sin auth — patrón PublicNC.tsx)
  - Paso 1: QR ya trae la máquina → mostrar máquina y pedir PIN
  - Paso 2: checklist 21 ítems, diseño dedo-gigante, SI/NO grandes
  - Paso 3: horómetro + firma + enviar
  - Confirmación con código MAQ-AAAA-#####
```

Todas las vistas: Tailwind, diseño DASSA, **probadas en viewport 390×844** antes de cerrar.

---

## BLOQUE 6 — AUTH

```
Roles (enum app_role del SGI): master_admin, director, sgi_leader, auditor, employee, guest

- Ejecutar / co-firmar rondín   → employee+ asignado como responsable de esa inspección
- Ver dashboard /rondas         → todos los autenticados
- Config (plantillas/máquinas/  → master_admin, director, sgi_leader
  operadores, rotar QR, PIN)
- Histórico maquinaria          → todos los autenticados (auditoría); editar → sgi_leader+

Ruta pública /checklist-maquita:
  - sin sesión SSO; gate por QR (qr_token) + PIN (bcrypt) + token efímero HMAC 5 min
  - rate-limit por IP

Auditoría: cada complete/cosign/NC registra completed_by, geo, IP, user-agent.
```

---

## BLOQUE 7 — INTEGRACIONES

| Integración | Tipo | Para qué |
|---|---|---|
| Postgres SGI (`DATABASE_URL`) | DB | tablas `insp_*`, reutiliza `users/employees/findings/tasks/notifications` |
| Módulo Tareas (`tasks`) | interno | cada rondín genera una tarea pendiente vinculada (`task_id`) |
| Módulo Hallazgos (`findings`) | interno | ítem crítico en falla → NC vinculada (`finding_id`) |
| `services/uploads.js` | interno | fotos y firmas (base64 → `/uploads/`, whitelist MIME) |
| **Triny** (`sgi-agent.cjs`) | interno IA | herramienta `consultar_rondas` + resumen semanal |
| CRON `node-cron` (`index.js`) | interno | generación de instancias + recordatorios + vencidas |
| `services/email.js` / `triny-mailer.cjs` | SMTP | recordatorios y alertas a Mantenimiento |
| Geolocalización del navegador | Web API | `geo_lat/lng` validados contra geofence DASSA |

### Triny — qué recibe y qué reporta
- **Nueva herramienta** `consultar_rondas` en `ALL_TOOLS` de `sgi-agent.cjs`: estado de
  rondines (pendientes/vencidos/completados), % cumplimiento, hallazgos por ronda,
  últimos checklists de maquinaria, ítems críticos en falla.
- **Resumen semanal** (cron viernes 16:00, `sendWeeklySummary`): se suma una sección
  "Rondas de Inspección" con cumplimiento del período, checklists de maquinaria,
  máquinas con alerta y NC generadas.
- **Alertas**: ítem crítico en falla (ej. frenos) → notificación in-app + email a Mantenimiento.

---

## BLOQUE 8 — STACK ESPECÍFICO

```
Es un MÓDULO dentro de dassa-sgi, no una app nueva. NO requiere registro SSO nuevo.

Backend:  Express ESM (server/routes/inspections.js + server/routes/public-checklist.js)
          Servicios: server/services/inspections-cron.cjs, inspections-triny.cjs
Frontend: React 18 + TS + Vite + Tailwind (src/pages/Rondas*.tsx, PublicChecklist.tsx)
DB:       Postgres SGI — migración server/db/migrations/0XX-ronda-inspecciones.sql
Deploy:   PM2 'dassa-sgi' (proceso existente) — sin proceso nuevo
CRON:     node-cron en server/index.js (timezone America/Argentina/Buenos_Aires)

Dependencias nuevas:
  - bcryptjs        → hash de PIN de operadores
  - qrcode          → generar PNG del QR de cada máquina
  - signature_pad   → firma digital en canvas (frontend)
  - express-rate-limit (si no está) → proteger la ruta pública

Patrones a copiar (file:line):
  - CRUD            server/routes/findings.js
  - Binding SQL     server/routes/employees.js:8
  - Ruta pública    server/routes/public-nc.js
  - Tareas          server/routes/tasks.js  (task_status enum, task_assignees)
  - CRON            server/index.js:40-108
  - Herramienta IA  server/services/sgi-agent.cjs (ALL_TOOLS + HANDLERS)
  - Upload          server/services/uploads.js
  - Página SPA      src/pages/PublicNC.tsx · routing App.tsx
```

---

## BLOQUE 9 — ESTIMACIÓN

| Fase | Módulo | Estimación | Notas |
|---|---|---|---|
| **F0** | Schema + migración + seed (templates F-TRI-19/20/23/SSHH con ítems, máquinas, operadores, geofence) | 1 día | ítems salen de la planilla |
| **F1** | Backend core: `/api/inspections` CRUD + templates + machines + operators | 2 días | base = findings.js |
| **F2** | Motor de recurrencia CRON: generación de instancias + tasks vinculadas | 1 día | |
| **F3** | UI rondines: dashboard, ejecución mobile, co-firma, fotos, geo, firma | 2,5 días | mobile vertical |
| **F4** | Checklist maquinaria público: QR + PIN + form + histórico | 2,5 días | doble cuidado UX chofer |
| **F5** | Integración Triny: `consultar_rondas` + resumen semanal + alertas | 1 día | |
| **F6** | Indicadores ISO + hardening + pruebas mobile + deploy | 1,5 días | |
| | **Total** | **≈ 11,5 días** | con buffer 30% ≈ **15 días** |

---

## BLOQUE 10 — RIESGOS

```
R1 — UX del checklist de chofer demasiado largo (21 ítems) → abandono / completado falso
  Prob: Alta · Impacto: Alto
  Mitigación: una sección por pantalla, botones SI/NO gigantes, autosave parcial,
  copiar respuestas del día anterior como punto de partida editable.

R2 — Geofence mal calibrado bloquea o falsea registros
  Prob: Media · Impacto: Medio
  Mitigación: geofence NO bloqueante (marca 'fuera_de_sitio'); calibrar el centroide y
  radio con lecturas reales en el predio antes del go-live.

R3 — Ruta pública abusada (sin auth)
  Prob: Media · Impacto: Alto
  Mitigación: PIN bcrypt + token efímero HMAC + rate-limit por IP + qr_token rotable;
  la ruta SOLO permite alta de checklist, nada más.

R4 — Choferes pierden/olvidan el PIN
  Prob: Alta · Impacto: Bajo
  Mitigación: reset de PIN en 1 clic desde /rondas/config; PIN simple de 4 dígitos.

R5 — Plantillas de los formularios cambian (revisión ISO)
  Prob: Media · Impacto: Medio
  Mitigación: motor dirigido por plantillas — editar ítems sin tocar código; versionar
  template (las inspecciones viejas conservan sus ítems).

R6 — Scope creep (sumar F-TRI-21/22 equipos críticos a mitad de obra)
  Prob: Media · Impacto: Medio
  Mitigación: MVP = limpieza + mantenimiento + SSHH + maquinaria. Equipos críticos
  trimestral/anual = fase posterior, fuera del scope congelado.
```

---

## SUPERPLAN — orden de ejecución

`F0 → F1 → F2 → F3 → F4 → F5 → F6`, cada fase compila, se prueba y se commitea antes
de pasar a la siguiente. Deploy final con skill `dassa-deploy-vps`.
MVP congelado: **limpieza semanal + mantenimiento semanal + SSHH quincenal + checklist
diario de maquinaria**. F-TRI-21/22 (equipos críticos) quedan para una fase posterior.
