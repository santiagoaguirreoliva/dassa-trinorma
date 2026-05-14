# Changelog — DASSA SGI Trinorma

Todas las versiones notables del Sistema de Gestión Integrado (ISO 9001 · 14001 · 45001).

Formato basado en [Keep a Changelog](https://keepachangelog.com/), versionado [SemVer](https://semver.org/).

---

## [Sin publicar]

### Pre-entrega · auditoría 2026-05-14
- **Fix crítico de auth**: `auditor.cjs`, `profiles.cjs` y `users-extra.cjs` ahora aplican `router.use(authenticate)` (antes `requireAdmin` chequeaba `req.user` sin middleware previo).
- **Fix bug SQL** `dashboard.js` charts: `COALESCE(status::text, ...)` en findings y purchases (el enum no aceptaba el fallback como string).
- **Limpieza**: 4 archivos `.bak.*` versionados eliminados de git; carpeta `.backups/` (352 KB) y 19 backups físicos removidos.
- **CSP activado** en helmet con whitelist específica (Anthropic, Gemini, dassa.com.ar, fonts).
- **TypeScript**: 17 errores resueltos (`HeaderProps.icon`, tipos en `Auditor.tsx`, conflicto `List` en `Trainings.tsx`, `api.get<T>` correcto).
- **ESLint**: 0 errors / 0 warnings con `--max-warnings 0` (plugin `unused-imports` agregado, override `.cjs` corregido).
- **`.env.example`** completado: 6 → 21 variables (SMTP, ANTHROPIC_API_KEY, GEMINI_API_KEY, SSO, OLLAMA, CRON_SECRET, APP_URL).
- **DEPLOYMENT.md**: backup actualizado de `cp .db` (SQLite) a `pg_dump` (Postgres) + plan de rollback en 6 pasos.

---

## [v1.7-triny-mailer-fix] — 2026-05-12
### Fixed
- `triny cron`: corregir path `./services/triny-mailer.cjs` (estaba apuntando a `./server/services/`).

## [v1.7-triny-mailer] — 2026-05-12
### Added
- **TRINY mailer**: 4 cron jobs (recordatorios L 8h, resumen V 16h, informe 1d 9h, intimación diaria 10h).
- 6 endpoints de preview y trigger manual de jobs.
- Alias remitente `TRINY DASSA 🤖 <auto@dassa.com.ar>` con reply-to a santi.
- `DRY_RUN` por defecto para testing seguro de mailers.

## [v1.6-triny-unified] — 2026-05-12
### Added
- **TRINY**: unificación de 3 agentes IA dispersos bajo un solo agente con 6 capabilities.
- Pantalla `/triny` con tabs (Capacidades, Logs, Cron, Stats).
- Endpoint `/api/triny/*` API completa.

## [v1.5-comite-wizard] — 2026-05-12
### Added
- Wizard de Comité (3 pasos): agenda → asistentes → cierre con firma forense.
- Endpoints `wizard/pending-alive/close-with-signature`.
- Filtro multi-responsable en `MisPendientes` via `task_assignees`.

## [v1.4-comite-import] — 2026-05-12
### Added
- Import de 72 tareas históricas con numeración global `#T-NNNN`.
- Multi-responsable por tarea via tabla `task_assignees`.
- Endpoint `/mine` con assignees expandidos.

## [v1.3-admin-onboarding] — 2026-05-12
### Added
- **PactosAdmin**: CRUD de pactos firmables por rol.
- **NovedadesAdmin**: CRUD de anuncios.
- Email de bienvenida masivo.
- Endpoint `health-deep` con checks de DB y servicios.
- Manifest fix port 4001.

## [v1.2-triny-nixa] — 2026-05-12
### Added
- **TRINY** agente IA conversacional vs **NIXA** auditora real (separación clara).
- 8 profiles por rol (master_admin, director, sgi_leader, seguridad_higiene, rrhh, operaciones, auditor_externo, etc.).
- **Modo Espejo** para master_admin y auditor_externo: ver el sistema como otro rol.

## [v1.1-bienvenida] — 2026-05-12
### Added
- Landing `/bienvenida` personalizada por rol con pacto firmable (firma forense con IP/UA/timestamp).
- Auto-redirect post-login a `/bienvenida` si pacto no firmado.
- Sección Novedades dinámica desde DB.

## [v1.0-stable] — 2026-05-12
### Fixed
- 3 `r.data.X` latentes en Purchases, Auditor, MisPendientes (el helper `api` no es axios).
- ResetPassword: `r.data.X → r.X` (afectaba a Christian/María/etc).
- Import faltante de `SignupEmpresa` causaba `ReferenceError`.
- Cache: `no-store` para HTML + `immutable` para assets; ErrorBoundary global evita pantalla blanca por bundle viejo cacheado.

### Added
- Wizard `/signup-empresa` (4 pasos, ruta pública).
- Charts agregados en Dashboard y RiesgosAMFE (recharts nativo).
- Code splitting y lazy routes.

## [v3-multitenant-ready] — 2026-05-11
### Added
- **OLA 7 · Multi-tenant**: `tenant_id` en 47 tablas + middleware de tenant.
- Onboarding multi-tenant con admin del tenant.
- Design doc `docs/MULTITENANT_DESIGN.md`.

## [ola-completa-v2] — 2026-05-11
### Added
- **OLA 1** — CRUD completo: objetivos, cambios, procedimientos, riesgos.
- **OLA 2** — Editor rico DASSA + renderer multimedia + WhatsApp share manual + firma forense enriquecida + schema de polls.
- **OLA 3** — Sidebar jerárquico TRINORMA por sectores + criterio C híbrido + gráficos nativos recharts en módulos clave + botones/modales "Nuevo" en Objetivos · Cambios · Procedimientos.
- **OLA 4** — BI Operativo: Metabase self-hosted con iframe embebido.
- **OLA 5** — Auto-validador IA + wake-up notifications proactivas.
- **OLA 6** — Calendario NIXA + firma digital de validaciones.

---

_Para versiones anteriores y detalle de commits, ver `git log` o tags `ola-*` / `pre-superplan-*`._
