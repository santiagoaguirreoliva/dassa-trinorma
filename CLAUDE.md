# DASSA SGI — Trinorma
> Sistema de Gestión Integrado ISO 9001 + 14001 + 45001 (TRINORMA): empleados, organigrama, NC, auditorías internas, rondas de inspección, capacitaciones, comité, agentes IA (Triny, Briefer, DT, NOVA, MEMO, VIGIL).
>
> ℹ️ **Consolidación 2026-05-23**: este repo (161 commits) es el único repo del SGI/Trinorma. El fork viejo `apps/trinorma/` (6 commits, primer intento con Railway) fue eliminado. Repo remoto: `dassa-trinorma.git`.

## Stack
- Runtime: Node >=18 (ESM, `"type": "module"`)
- Backend: Express 4 (`server/index.js`)
- Frontend: React 18 + Vite 5 + TypeScript + Tailwind + lucide-react + recharts + react-router 6 + @tanstack/react-query
- DB: Postgres `dassa_sgi` (local) — migraciones propias
- IA: sólo Claude (`@anthropic-ai/sdk`) vía `server/services/llm-meter.cjs`. **No hay fallback Gemini/Ollama implementado** (existió un router legacy Ollama/Gemini, hoy archivado en `_archive/`; sólo quedan menciones en comentarios)
- Auth: JWT propio + SSO con Smart DASSA Apps
- Cron: `node-cron`
- Mailer: nodemailer (auto@dassa.com.ar)

## Proceso PM2
- Nombre: `dassa-sgi`
- Puerto: `4001` (PORT)
- Start: `pm2 start ecosystem.config.cjs`

## Base de datos
- Postgres local `dassa_sgi`. **Fuente de verdad del schema = las migraciones** en `server/db/migrations/` (aplicadas en orden por el runner). `server/db/schema.sql` es el snapshot inicial (idéntico a `001_schema.sql`) y está drifteado ~60 migraciones — NO es el schema actual. Para un canónico real: `pg_dump --schema-only`.
- Migrador propio: `server/db/migrate.js` (lee `server/db/migrations/`).
- Tablas clave: empleados, puestos, organigrama, nc (no conformidades), auditorías, rondas, capacitaciones, comité, agentes_iso, contactos_externos, comunicaciones_iso.
- Centro de Comunicaciones replicado desde SDA por HMAC.

## Variables de entorno requeridas
- Runtime: NODE_ENV, PORT, APP_URL, APP_HOST
- DB: DATABASE_URL, LOG_QUERIES
- Auth: JWT_SECRET, CORS_ORIGIN
- SMTP: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, MAIL_BCC
- Cron: CRON_SECRET
- SSO: DASSA_APPS_SSO_URL, DASSA_APPS_SSO_SECRET
- IA: ANTHROPIC_API_KEY, FINDINGS_AI_MODEL (opt), FINDINGS_ALERT_TO (opt), DEPOFIS_CONTEXT_PATH (opt)
  - Legacy / no implementadas (no las lee ningún código vivo): GEMINI_API_KEY, OLLAMA_URL, OLLAMA_MODEL. `GEMINI_API_KEY` sigue presente en `.env` — credencial huérfana, decidir rotar/borrar.

## Archivos críticos
- `server/db/migrations/` — migraciones SQL ordenadas (solo aplicar con confirmación)
- `server/db/schema.sql` — snapshot inicial (= `001_schema.sql`), drifteado; el schema canónico son las migraciones (ver sección Base de datos)
- `server/db/migrate.js` — runner (`npm run db:migrate`, `db:migrate:dry`)
- `ecosystem.config.cjs` — no renombrar el proceso
- `docs/SPEC-RONDA-INSPECCIONES.md` + `docs/ESTADO-RONDA-INSPECCIONES.md` — módulo Ronda de Inspecciones
- `docs/MULTITENANT_DESIGN.md` — diseño multi-tenant
- `docs/manual-usuario.md`
- `CHANGELOG.md`, `DEPLOYMENT.md`, `DEPOFIS-AGENT-CONTEXT.md`
- `knowledge-base/` — base ISO para los agentes
- `.eslintrc.json` — lint estricto (`--max-warnings 0`)

## Convenciones
- Módulos: **ESM** (`"type": "module"`) en el front y root; algunos servicios server son `.cjs`
- Tipos: TypeScript en `src/**/*.{ts,tsx}`, JavaScript en `server/`
- Estilo: ESLint + `eslint-plugin-unused-imports`; correr `npm run check` (typecheck + lint) antes de commitear
- Naming: snake_case en BD, camelCase en JS/TS
- Mails: BCC obligatorio a santiago@dassa.com.ar (`MAIL_BCC`)

## Comandos frecuentes
```bash
npm run dev                 # vite + node --watch en paralelo
npm run build               # build de Vite
npm start                   # server prod
npm run db:migrate          # aplicar migraciones
npm run db:migrate:dry      # dry-run
npm run check               # typecheck + lint (gate pre-commit)
pm2 restart dassa-sgi
```

## Estado al cerrar última sesión
- Último commit: `df99a8b` chore(agents): avatars BRIEFER + NOVA + MEMO + VIGIL
- Últimos 5 commits:
  - `df99a8b` chore(agents): avatars BRIEFER + NOVA + MEMO + VIGIL
  - `b1803b6` F16 · Triny tools — empleados, puestos, organigrama, externos
  - `8d83570` F15 · UI de contactos externos en la app Trinorma
  - `50a8a9c` F14 · UI edición del organigrama desde la app
  - `942b48d` F12 + F13 · backend CRUD puestos/nodos/externos + UI edición Puestos
- Archivos en progreso:
  - `M public/agents/avatar-fico.svg`
  - `?? server/.agent-inbox/`

## Restricciones y gotchas conocidos
- TODOs activos: `server/routes/bienvenida.js`, `server/routes/committee.js`, `server/services/auditor-context.cjs`
- Programación base CERRADA 2026-05-20; fase actual: completar pendientes meta 01/06 (32 tareas, 5 NC, 24 capacitaciones, 13 rondas).
- Módulo Ronda de Inspecciones: F0–F6 desplegadas. Pendiente: calibrar geofence, revisar SSHH con Fer y setear HMAC propio.
- Centro de Comunicaciones: este repo es **réplica HMAC** del centro madre en smart-dassa-apps; modelo de migración final aún pendiente.
- Nixa (responsable de conformidad ISO): correo `nixa.8908@gmail.com` solo para mails importantes; el resto por inbox de la app.
- Sheet de nómina compartido con María: `1xkbIBNDK15rqe3om4bVazk6Z44...` (completar WhatsApp/emails de 30 internos + 2 externos).

## Estado al cierre 2026-06-04 · Cierre auditoría Master DASSA v2026 (P1-P5)
- Commit `22067fa` feat(sgi): Master DASSA v2026 + Mi Perfil 360 + audit fixes (P1-P5) — 17 archivos · +3753/-63 · pusheado a `dassa-trinorma`
- BD `dassa_sgi`: 25/25 fichas activas · **14 críticos** (Balancero sumado) · 24/24 successions con `titular_id` · 21/25 con iso_45001 · 25/25 con marco legal/risks/authority/records
- P1 Maq Containera: backup Fabián Fuentes + externo · P2 Balancero: backup Franco Di Dio + Vergara externo + crítico · P3 política emails Triny respetada · P4 succession FK reparada · P5 iso_45001 cargada
- `npm run check` verde · `pm2 dassa-sgi` online · `/api/health` triny status:ok
- `.gitignore`: agregado `server/.agent-inbox/` (runtime del agent-bus)
- Pendiente sesión próxima: PARTE 15 (UI panel RR.AI, calendar sesiones multi-cap, radar madurez, KPIs RRHH, portal externo QR+PIN) + PARTE 16 (Triny tools mis-capacitaciones/mis-kpis/evaluar-competencias) + 3ra iteración ChatGPT para Matriz O/R/OP/NA completa

## Estado al cierre 2026-06-10 · Objetivos 2026 + Comité Acta Viva + FODA + Instructivos + Video (SESION-2026-06-10-02)
- 11 commits (`cb2bbde`→`86b8ace`), 52 archivos (+1699/-36), 3 migraciones prod: 048 `committee_agenda_items`, 049 `foda_validation`, 050 `committee_summary_sent`.
- **Objetivos 2026** cargados con responsables; destacados en `/mi-perfil` (orgchart `/mi-perfil` ahora devuelve `objectives`).
- **Comité Mixto "Acta Viva"** F1-F3: `CommitteeDetail.tsx` ruta `/committee/:id` (notas vivas autosave 700ms + panel contexto + cierre con firma TRINY en `signatures` jsonb + `send-summary` a todos). Fuente de verdad = tabla `tasks`. Botón "Nueva reunión" gate ampliado a `director`+`auditor_externo`.
- **FODA 2026** consolidado (29 ítems) + validación Validar/Rechazar (`/context/foda?active=1`, `PATCH /foda/:id/validation`).
- **Instructivos de carga** con capturas reales → web `https://trinorma.dassa.com.ar/instructivos/` + mail TRINY a María/Manuel/Fer/Nixa.
- **Video recorrido** (informativo ~82s + ventas ~30s) generado con ffmpeg (capturas + zoompan + xfade + drawtext) → `https://trinorma.dassa.com.ar/video/` + guión en `docs/video/`.
- Estáticos publicados en `public/{instructivos,video}/` (copiados a `dist/` para servirse ya).
- `pm2 dassa-sgi` online. Pendiente: acciones de mejora (change_requests) desde FODA + `current_value` objetivos (tras validación Nixa); fix Bienvenida (accept-pact no persiste `accepted_at`).
- Gotchas video: Puppeteer `screencast()` = 0 bytes en este box; inyectar JWT con `evaluateOnNewDocument` antes de navegar; scripts /tmp con `NODE_PATH` al node_modules de la app.

## Estado al cierre 2026-07-08 · Landing Proveedores/Contratistas + acuse ISO + módulo F-TRI-17 + fix drift
- **Landing pública proveedores/contratistas** `trinorma.dassa.com.ar/proveedores/` (`public/proveedores/index.html`, visual-first, on-brand, mobile): selector por perfil (proveedor/contratista/transportista) + protocolo 7 pasos + EPP + normas + scoring F-TRI-17 + acordeones de detalle legal + **acuse digital** + contactos. Fuente de verdad: `docs/proveedores/FUENTES-LANDING-PROVEEDORES-2026-07-07.md` (P-TRI-11/F-TRI-18/F-TRI-52/F-TRI-17).
- **Acuse digital ISO** (reemplaza firma papel F-TRI-18/F-TRI-52): migr **065** `supplier_acknowledgements`; `server/routes/public-proveedores.js` POST `/api/public/proveedores/acuse` (rate-limit 5/h, CUIT mod-11+prefijo, vínculo por CUIT); `server/routes/proveedores.js` GET `/api/proveedores/acuses` (autenticado).
- **Módulo Proveedores F-TRI-17 digital**: migr **066** `suppliers.is_critical` + `supplier_evaluations` (4 criterios, total/result GENERATED, upsert por año, refleja homologación solo si es el año más reciente; POST gateado `requireRole`). `Suppliers.tsx`: badge CRÍTICO + Acuse✓ + `EvaluationModal` + solapa Acuses + KPI Críticos.
- **Fix drift front↔back** en Suppliers: el front usaba `type/status/email/phone` inexistentes → rubro/email/tel vacíos + KPIs en 0. Ahora mapea a columnas reales (`category/contact_email/contact_phone/is_active/is_homologated`) y el **estado se DERIVA** (`estadoDe`): is_active + homologación + resultado de la última evaluación F-TRI-17. GET con LEFT JOIN LATERAL.
- Commits `dd9e658` (landing+acuse+módulo) + `0fab97d` (fix drift), pusheados a `dassa-trinorma`. Migr 065/066 aplicadas en prod. `npm run check` verde, build+pm2 OK, smoke E2E OK. Workflow 8 agentes (build ∥ + review adversarial + fixer). Plan futuro F1-F6 en `docs/proveedores/PLAN-FORTALECIMIENTO-PROVEEDORES-2026-07.md`.
- **Estado auditoría/Nixa (vivo 08/07)**: ciclo DAG 2026 trabado — etapa FODA **rechazada** bloquea 8 etapas (legal_requirements ya validada); FODA de contenido homologado 25/06. 3 legales VENCIDOS (CAA/ADR/Habilitación Municipal). 0 asistencias de capacitaciones. 0/10 objetivos con current_value. Landings vivas: /previa-auditoria/ (87%), /validacion-nixa/, /instructivos/, /proveedores/.

## Estado al cierre 2026-06-25 · Portal del Empleado (externo QR+PIN) + tablero de Dirección 3 niveles
- **Portal del Empleado** (`/portal-empleado`, público): operarios sin cuenta entran por **link de invitación** (generado desde la vista Empleados) → **crean su PIN** propio (único) → **onboarding obligatorio** (datos personales + contacto + emergencia) → portal mobile-first con: Mi ficha · Mis capacitaciones · Organigrama · Mapa de procesos · Procedimientos · Identidad DASSA · **Comunicaciones con acuse de lectura ISO 7.3**. Backend `server/routes/public-portal.js`, migraciones **059–061** (`employees.portal_*`/`marital_status`, `communication_reads.employee_id`). Front `src/pages/PortalEmpleado.tsx` + botón `PortalLinkButton` en `Employees.tsx`.
- **Tablero de Dirección 3 niveles** (sesión previa, ya pusheado `fdcb728`→`fd89a94`): Objetivos estratégicos (10/61 KPIs, habilitación progresiva) · Proyectos (30) · Plan de Inversiones · Revisión por la Dirección (ISO 9.3). Previa auditoría `/previa-auditoria/` readiness 87%.
- Gotchas portal: sesión **HMAC efímera** (`PORTAL_EMPLEADO_HMAC_SECRET`||`JWT_SECRET`), no tabla de sesiones; login por **PIN-solo** itera bcrypt sobre empleados con pin (unicidad garantizada al activar); el `/login` devuelve `onboarded` (reiniciar pm2 tras tocarlo). Capturas: inyectar `portal_empleado_session` en sessionStorage vía `evaluateOnNewDocument`. PINs/datos de prueba ya limpiados de la BD.
- Pendiente: activar KPIs vivos + sync `current_value`; cron TRINY mensual; familia/grupo en legajo (no pedido aún); endurecer GET "solo mis datos" (deuda mono-tenant global ya documentada).

## Estado al cierre 2026-06-26 · Portal (link en tabla) + Validación NIXA + TRINY voz propia
- **Portal del Empleado**: botón "Acceso" (link de 1er ingreso) en cada fila de `/employees` (`5656fc0`). Mail instructivo de rollout enviado a María.
- **Validación DASSA↔NIXA**: landing `/validacion-nixa/` explica la dinámica del Ciclo 2026 (DAG: validar una etapa desbloquea la siguiente). `24f3b56`. Mail tutorial a NIXA = BORRADOR en casilla de Santi (pendiente su OK para enviar a nixa.8908@gmail.com).
- **TRINY voz propia** (`9d72ee1`): `server/services/triny-persona.cjs` = fuente única de identidad (voseo, 4 modos), prepended a los 5 system prompts. El chat (`POST /api/agent/chat`) dejó de ser "DASSA IA"/tuteo → ahora TRINY/voseo. Fix `/api/health`: en error de BD devuelve `degraded` (antes mentía `ok`).
- **TRINY crons** (`8e4391d`): 4 jobs más al crontab del SO vía `scripts/sgi-run-cron.cjs` (findings_monthly, trainings_reminders, efficacy_reminders, wakeup). Los de Rondas siguen in-process.
- ⚠️ Pendiente Santi: `UPDATE triny_policies SET alert_recipients (… nixa.8908@gmail.com) + dry_run=false` — el classifier lo frenó 2× (toca envíos autónomos a destino externo).

## Estado al cierre 2026-07-13 · FODA + Contexto + Sistema de Gestión + Matrices de Riesgo (Dirección)
6 commits `c92807e`→`bb0d5b9` pusheados a `dassa-trinorma`. Migraciones prod **067** (`/risks` template general) y **068** (`/riesgos-amfe` F-TRI-08). Cargas de datos directas a prod.
- **FODA (`context_analysis`)**: reemplazado (soft-delete activos + INSERT validados, ciclo `2025-2026`, category `General`). Versión final = **edición de Nixa: 55 ítems** (22F/13O/10D/10A, nota "Edición NIXA", incorpora ISO 9/14/45). Rollback snapshot en `/tmp/foda-activos-antes-nixa-2026-07-13.txt`.
- **`/context` (Context.tsx)** = **solo FODA**: removidas pestañas Estrategias y Partes Interesadas + código huérfano (`df39a7e`, 599→322 líneas). Endpoints backend (`context_strategies`, `stakeholders`) intactos → reversible.
- **`/sistema-gestion` (SistemaGestion.tsx)**: showcase on-brand (hero+logo, MVV en tarjetas, Valores grilla íconos, Política de Gestión Integrada en bloques) leyendo `system_content`; texto oficial del PDF sembrado. **Fix**: el front usaba `api.patch` pero el backend solo expone **PUT** `/sistema-gestion/:section` (`7928b93`). Formato editable: `valores`/`politica_gestion` = líneas "Título: descripción".
- **`/risks` (Risks.tsx + misc.js + migr 067)**: alineada al template general Trinorma. Sumadas `area`, `condition` (normal/anormal/emergencia); expone Acción de mitigación, fechas, Riesgo residual. **Estado pasó a escala 0-4** (`control_status` es **integer** en BD; el front mandaba strings → edición estaba rota, ahora arreglado). `e588099`.
- **`/objetivos` y `/proyectos`**: vista Dirección limpia (`67e9ab1`). Objetivos: jerga de conector (Vivo/Congelado/Construible/Manual) + caja explicativa → **admin-only**; KPI resalta valor actual. Proyectos: **edición inline** de estado/avance para líderes (usa `PATCH /proyectos/:id`).
- **`/riesgos-amfe` (RiesgosAMFE.tsx + sgi-modules.js + migr 068)**: cargada la **matriz AMFE F-TRI-08 Rev. 2 de Nixa = 66 riesgos/oportunidades** (33 CONTEXTO [20R+13O] + 33 por proceso), reemplazando las 30 previas. Parseado del **xlsx con Python/openpyxl** (bajado con `gog drive download` → `~/.config/gogcli/drive-downloads/`). Nuevas columnas: `responsible_text`, `ro_type` (riesgo/oportunidad), `residual_detection`, `matrix_version`, `matrix_date`. **CHECK de G/O/D relajado a 1-10** (el CONTEXTO usa escala 1-10; los procesos 1-4/1-5). Banner "F-TRI-08 · Rev. 2 · actualizada 13/07/2026" + columnas Tipo/Responsable/NPR residual. NPR = G×O×D verificado 100%. Rollback en `/tmp/risks-activos-antes-2026-07-13.txt`.
- **Gotchas nuevos**: `risks.control_status` = integer (Estado 0-4); CHECK G/O/D original 1-5/1-5/1-4; sin FK que dependa de `risks.id` (soft-delete seguro); `/risks` y `/riesgos-amfe` comparten `risks` y filtran `is_active`; `system_content` se edita por **PUT** no PATCH.
- **Pendiente**: renombrar el grupo de menú Estrategia a las etiquetas de Santi (Foda/Objetivos/Proyectos/Inversiones/Cambios/**ISO NORMAS**); matriz de acciones asociadas al FODA (F-TRI-01, pausada); confirmar "(si aplica)" en Fortaleza 22 del FODA; evaluar unificar `/risks` + `/riesgos-amfe`.
