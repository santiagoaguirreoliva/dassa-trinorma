# DASSA SGI — Trinorma
> Sistema de Gestión Integrado ISO 9001 + 14001 + 45001 (TRINORMA): empleados, organigrama, NC, auditorías internas, rondas de inspección, capacitaciones, comité, agentes IA (Triny, Briefer, DT, NOVA, MEMO, VIGIL).
>
> ℹ️ **Consolidación 2026-05-23**: este repo (161 commits) es el único repo del SGI/Trinorma. El fork viejo `apps/trinorma/` (6 commits, primer intento con Railway) fue eliminado. Repo remoto: `dassa-trinorma.git`.

## Stack
- Runtime: Node >=18 (ESM, `"type": "module"`)
- Backend: Express 4 (`server/index.js`)
- Frontend: React 18 + Vite 5 + TypeScript + Tailwind + lucide-react + recharts + react-router 6 + @tanstack/react-query
- DB: Postgres `dassa_sgi` (local) — migraciones propias
- IA: `@anthropic-ai/sdk` (Claude) + Gemini + Ollama fallback
- Auth: JWT propio + SSO con Smart DASSA Apps
- Cron: `node-cron`
- Mailer: nodemailer (auto@dassa.com.ar)

## Proceso PM2
- Nombre: `dassa-sgi`
- Puerto: `4001` (PORT)
- Start: `pm2 start ecosystem.config.cjs`

## Base de datos
- Postgres local `dassa_sgi`. Schema en `server/db/schema.sql`.
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
- IA: ANTHROPIC_API_KEY, GEMINI_API_KEY, FINDINGS_AI_MODEL (opt), FINDINGS_ALERT_TO (opt), DEPOFIS_CONTEXT_PATH (opt), OLLAMA_URL, OLLAMA_MODEL

## Archivos críticos
- `server/db/migrations/` — migraciones SQL ordenadas (solo aplicar con confirmación)
- `server/db/schema.sql` — schema canónico
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
