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

## Estado al cierre 2026-07-22 · Compras públicas + NC/hallazgos + docs proveedores + planilla + rondas pausadas
5 commits `599869d`→`e2052b7` pusheados a `dassa-trinorma`. Migración prod **069**. Smoke E2E 5/5 + capturas.
- **Menú Estrategia** (`Sidebar.tsx`): FODA / Objetivos / Proyectos / Inversiones / Cambios / **ISO NORMAS** (=/sistema-gestion). Comité Mixto igual.
- **Solicitud de compra PÚBLICA** `/solicitud-compra` (ruta SPA pública + `server/routes/public-compras.js` rate-limited 10/h y 15 análisis/h por IP): form sin auth con análisis IA de links (reusa `parseProductInfo` de url-importer.cjs). Migr 069: `purchases.requested_by` **nullable** + `requester_name/email` + `quantity` + `channel` ('app'/'publica' CHECK). Entra como borrador al workflow existente (aprueban Manuel/Santiago, ejecuta María) con notificaciones a autorizadores. `/purchases`: badge QR/LINK PÚBLICO, cantidad (`N×` en lista), sector en detalle, botón "Link público" copia URL. GETs usan `COALESCE(req.full_name, p.requester_name)`.
- ⚠️ **Gotcha ML**: fetch server-side a MercadoLibre devuelve 200 con página esqueleto → IA parsea todos null. El form detecta análisis vacío y despliega campo "pegar texto" (camino que siempre funciona).
- **NC vs hallazgos generales**: `findings.report_kind` ('nc'/'hallazgo', migr 069, histórico default 'nc'). `/reporte-nc` abre con 2 botones grandes (NC TRINORMA → circuito formal | Aviso/hallazgo general → comisión mixta; hallazgo se inserta `finding_type='mejora'`). `/findings` con pestañas segregadas + contadores.
- **Documentos por proveedor**: tabla `supplier_documents` (migr 069) + GET/POST(multi base64 PDF/JPG/PNG/WEBP 5MB)/DELETE(admin) en `suppliers.js` + `DocsModal` (botón 📎 por fila en Suppliers.tsx).
- **Planilla de asistencia imprimible**: `printPlanilla()` en Trainings.tsx (botón en pestaña F-TRI-36) → ventana print con encabezado F-TRI-36/DASSA, datos del curso, participantes prefijados + filas en blanco, columna Firma. Front-only, sin endpoint.
- **Rondas PAUSADAS** (data, sin código): `insp_templates.active=false` para F-TRI-20 (Marcelo+María) y F-TRI-23 (María) + instancias abiertas → 'anulada'. El generador solo crea de active=true. Para retomar: `active=true`.
- ⚠️ **Permisos compras**: `getPerms` shortcircuitea rol `director` con TODOS los permisos (María y NIXA autorizan implícitamente). **Pendiente**: quitar can_authorize/can_execute a Marcelo desde `/purchases`→Permisos (classifier bloqueó el SQL).
- **Pendiente**: difundir links `/solicitud-compra` y `/reporte-nc` al equipo; heredados 13/07 (matriz acciones FODA F-TRI-01, "(si aplica)" Fortaleza 22, unificar /risks+/riesgos-amfe, rotar GEMINI_API_KEY).

## Estado al cierre 2026-08-05 · Auditoría interna EN VIVO — 3 NCs corregidas (SESION-2026-08-05-04)
3 commits `0ef9d43`→`fd69f6d` pusheados a `dassa-trinorma`. Migraciones prod **070** y **071**. Correcciones en vivo mientras el auditor marca no conformidades.
- **Leyenda de revisión en TODO el sistema** (`0ef9d43`, ISO 9001 7.5): catálogo único `src/lib/doc-revisions.json` (código→rev/fecha; revs del F-TRI-09 Listado Maestro de Drive, fecha = última actualización del módulo en la app) + prop `doc` en `Header.tsx` → "F-TRI-XX · Rev.N · dd/mm/aaaa" en 27 pantallas + públicas (PublicNC/PublicCompra/PublicChecklist/ProcedimientosPublico) + planilla F-TRI-36 (pasó de Ver.03 hardcodeado a **Rev.04** del maestro) + PDF QRs F-TRI-19 (server lee el MISMO json) + landings estáticas. **Regla: al tocar un módulo, actualizar su fecha en el catálogo.**
- **F-TRI-14 Cambios completo** (`ed3341c`, migr 070): `change_requests.recursos`+`.verificacion` + tabla /cambios con Plazo (dd/mm/aaaa, antes ISO crudo)/Recursos/Verificación + edición inline (click fila, líderes) + 40/40 completados (2024 con textos de la planilla original de Drive, 2026 derivados del propósito). Replan data-only: 35 abiertos → plazos sep-dic 2026, 9 a en_curso con avance real, 4 purposes desfasados reescritos; completados/cancelados 2024 conservan histórico.
- **F-TRI-44 Ambiental con 3 variables** (`fd69f6d`, migr 071): el form YA mandaba `detection` y la BD la descartaba; ahora `detection` (=Pérdida de control [P]) + `effect`/`legal_desc`/`responsible_text`, significance GENERATED = F×G×P, **is_significant = IPR>32 ó G≥4 ó P≥4** (regla oficial hoja PARAMETROS; reproduce el original 56/56). Recarga 32→**56 aspectos** (15 significativos). Gotcha: GENERATED = DROP+ADD para cambiar expresión.
- Gotchas sesión: JWT smoke con payload `{userId}`; gog keyring pwd en `~/.profile`; F-TRI-44 xlsx control=col 59, responsable=col 70.
- Pendientes: seguir auditoría (memoria `project_trinorma-auditoria-interna-2026-08`) · items de cambios sin recursos (invisibles en UI) · avisar a Nixa que el Listado Maestro está desactualizado (F-TRI-08 v0.0 vs Rev.2 vigente) · /satisfaction sin código propio (muestra P-TRI-10).

## Estado al cierre 2026-08-24 · Objetivos, procedimientos y alcance (auditoría BV en vivo)
3 commits `f966312`→`0ca59e0` pusheados. **Sin migraciones**: casi todo fue cambio de datos en producción.
- 🔴 **Los KPIs automáticos escribían en objetivos ocultos.** Al ocultar el tablero estratégico el 21/08, `kpi-objetivos.cjs` siguió escribiendo en los indicadores de OBJ-01/OBJ-03 (`deleted_at`) por tener el **UUID hardcodeado**, mientras OBJ-2026-05/06 no tenían mediciones de 2026. Ahora se resuelven con `idsPorCodigo` (filtra `deleted_at IS NULL`). **Regla: los jobs apuntan al código del objetivo, nunca a un UUID.**
- **`SQL_DESCONSOLIDACION` reescrito** (OBJ-2026-06): horas promedio entre entrada a balanza y **alta en stock del último subrenglón**, sobre contenedores IMPO con `cordicar.operacion='TD'`. Gotchas: agrupar balanza por `repesada` (mismo camión), `balanza.orden_ing/suborden` vienen en 0 (el puente es `ingresadas_en_stock`), y **`stock.suborden = 0` es el encabezado de la operación** — si entra, mide 20 min en vez de dos días.
- **El upsert sólo pisa lo que escribió el cron** (`notes LIKE '%auto'`): las series cargadas a mano desde el listado de coordinación de cargas son el dato nuevo. Y las operaciones **ya no cargan el mes en curso**.
- **Procedimientos con `Rev.NN · dd/mm/aaaa`** al abrirlos (`Procedimientos.tsx` + `ProcedimientosPublico.tsx`); el router público sirve campos explícitos, hubo que sumar `version/effective_date/approved_at/updated_at`. Los 32 procedimientos tienen vigencia y aprobación **vacías** → la fecha sale de `updated_at`. ⚠️ el listado `/documentos` sigue mostrando `created_at`, que no es la fecha de la revisión.
- **Alcance del SGI** en `/sistema-gestion` (`system_content.alcance`, sección nueva — el router la crea sola en el primer PUT). El mismo texto está publicado en `dassa.com.ar/deposito-fiscal/`.
- "ISO NORMAS" → "Política Integrada" en el sidebar.
- Pendientes: columna IMPO 2025 del cuadro · "Nuevos clientes" sin objetivo visible · decidir si el cron sigue cargando operaciones desde `cordicar` en meses futuros (cuenta distinto al cuadro).

## Estado al cierre 2026-08-25 · Día 2 de BV — legales, procedimientos, objetivos, export Excel
2 commits `6c9f0c5`+`7ba256d` pusheados. El resto fue **cambio de datos en producción** (snapshots en `/tmp/*-antes-2026-08-25.csv`).
- **Objetivos 2026 — repaso integral (data-only)**: 11 visibles, todos con `current_value` + `cumplimiento_nota`. ⭐ **OBJ-2026-07 Energía tenía cargada la LECTURA del medidor, no el consumo** → serie convertida a deltas y **corrida un mes atrás** (la lectura se toma al inicio del mes siguiente; queda ene–jul, el pico 26.064 en marzo): 13.524 kWh/mes vs 12.048 (+12,3%), NO cumple. **OBJ-2026-10** métrica renombrada a "Accidentes registrados/mes" (es lo que se mide): 1 vs 3 ✓. **OBJ-2026-11**: 40 días perdidos (may+jun); meta "≤ baseline 0" incumplible por formulación — para la próxima RxD. **OBJ-2026-05 Forzoso**: `enabled=true` (estaba "en preparación"; `enabled` NO oculta del listado, solo tablero/badge). **OBJ-2026-12 Capacitaciones OCULTO** (`deleted_at`; sin participantes cargados — reactivar al cargar F-TRI-36). **OBJ-2026-16 Odoo REFORMULADO y CUMPLIDO**: indicador = "% de facturación emitida en Odoo" (jul 100 · ago 100; el 0 de junio se quitó porque arrastraba el promedio), + fine tuning 90 días hasta el 30/09. 🆕 **OBJ-2026-17 Nuevos clientes (Agencia)** (meta ≥15/mes, 2026: 15,7 ✓) con la serie copiada del indicador huérfano de OBJ-01; `kpi-objetivos.cjs` lo resuelve por código (`6c9f0c5`), E2E: el cron corrió real sin pisar la serie manual (guard `%auto`).
- **Export Excel + buscador multicampo en TODAS las tablas** (`7ba256d`): `src/lib/exportExcel.ts` (SheetJS chunk lazy) + `ExportExcelButton` + `SearchInput`/`matchesQuery` en 13 vistas (AMFE, Legal, Ambiental, Risks, Findings, Cambios, Trainings, Suppliers, Employees, Incidents, Purchases, Inversiones, Objetivos F-TRI-04 con serie mensual en columnas). Lo exportado = la lista filtrada visible. CSV de Findings/Purchases reemplazados. Front-only, sin restart.
- **Documentos**: los 34 completos y estructurados (7 vacíos redactados: M-SGI-001, P-CAL-003, P-SST-003/004, P-AMB-003, P-OP-001/002 · P-TRI-08 expandido · 10 planos reestructurados a markdown con dedupe: P-TRI-24 párrafo triplicado, P-TRI-17 sección duplicada, P-TRI-09 facturación 2×; fixes: P-TRI-03 refería mal a P-TRI-06, P-TRI-11 año 2028). Los 6 operativos IMPO/EXPO (P-TRI-13*/14*) reescritos a v2 desde Drive + circuito real; ⚠ el Word oficial de P-TRI-14 tiene el objeto copiado del de EXPO — avisar a Nixa.
- **Legales**: RL-002 CAA dado de baja (`is_active=false`); RL-006 ART renovada por otro usuario el mismo día → 0 vencidos visibles. Quedan 7 RL sin estado + 14 LEG sin evaluar.
- Gotchas: `objective_indicators.direction` CHECK 'mayor'/'menor' · el renderer de procedimientos solo soporta `#`/`##`/bullets/`1.`/`**b**` (sin tablas) · `documents` no tiene deleted_at (existencia = fila).
- Pendientes: columna IMPO 2025 del cuadro · participantes de capacitaciones (reactiva OBJ-2026-12) · RL-010 Seguro Incendio vence 15/09 · 14 LEG `sin_evaluar` con Nixa.
