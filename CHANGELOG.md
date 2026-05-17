# Changelog — DASSA SGI Trinorma

Todas las versiones notables del Sistema de Gestión Integrado (ISO 9001 · 14001 · 45001).

Formato basado en [Keep a Changelog](https://keepachangelog.com/), versionado [SemVer](https://semver.org/).

---

## [Sin publicar]

### Mejoras post-auditoría · 2026-05-17
- **H-11 · Performance de carga inicial**: code-splitting por ruta. Las 44 páginas pasaron a `React.lazy()` (Login y el shell `AppLayout` quedan estáticos). `Suspense` global para rutas públicas + `Suspense` sobre el `<Outlet/>` de `AppLayout` (mantiene el sidebar mientras carga la página). El bundle inicial `index.js` cayó de **497 KB / 103 KB gzip → 38 KB / 12 KB gzip**; `recharts` (108 KB gzip) ya no se descarga en la pantalla de login.
- **H-12 · Accesibilidad de páginas públicas** (`Login.tsx`, `PublicNC.tsx`, `PublicComm.tsx`): landmark `<main>` en todas las vistas; `aria-label` en botones-ícono (toggle contraseña, quitar foto, spinner) e inputs sin `<label>`; contraste corregido (`text-gray-400 → text-gray-500`, fallaba 4.5:1 AA); touch targets de íconos ampliados a 36–40 px.
- **Deploy**: commit `b27cf24` (botón HOME al portal Smart DASSA Apps) buildeado y activo en producción.

### Módulo de No Conformidades — cumplimiento ISO 10.2 + robustecimiento · 2026-05-17

**Cumplimiento ISO 10.2** (migración 027):
- Cambio de estado de NC restringido a roles admin del SGI.
- No se puede cerrar una NC sin verificar la eficacia de la acción correctiva (ISO 10.2 d).
- `DELETE` de NC pasó a soft-delete (`deleted_at`) — ISO exige retener la información documentada; no se destruye evidencia.
- Tabla `finding_status_history` + `closed_by`: trazabilidad completa de transiciones de estado.
- `days_open` se congela en `closed_at` para NC cerradas; alta de NC y de acción correctiva ahora transaccionales; kanban con columna "Sin clasificar" para estados fuera de rango.

**Fase 1 — Aviso automático**: nuevo `findings-mailer.cjs`; cada alta de NC envía un correo branded al equipo de calidad (`maria@` + `santiago@`).

**Fase 2 — Análisis IA con Triny** (migración 028): `findings-ai.cjs` analiza causa raíz (5 porqués), sugiere acciones correctivas y oportunidad de mejora. Endpoint `POST /findings/:id/ai-analyze`, pre-análisis automático de Nixa al alta, panel IA en los tabs Causas y Acciones de `FindingDetail`.

**Fase 3 — Dashboard y UI**: barra de KPIs en la página de NC; tab Historial con trazabilidad de estados; botón Archivar.

**Fase 4 — Informe mensual**: `findings-report.cjs` + cron día 1 08:00 AR — Triny arma el informe del tratamiento de NC del mes (KPIs, distribución, análisis de tendencias) y lo envía a `maria@` + `santiago@`. Endpoint `POST /findings/report/monthly` para generación on-demand.

**Fase 5 — Vista de informes históricos** (migración 029): tabla `findings_reports`, endpoints lista/detalle, tercer modo de vista en el módulo de NC con los informes mensuales persistidos y su detalle en modal.

**Fase 6 — Detección de recurrencia IA**: `analyzeFinding` compara cada NC con las anteriores del mismo sector/tipo y detecta recurrencia (acción correctiva previa no eficaz, ISO 10.2); banner de alerta en `FindingDetail`.

**Fase 7 — Recordatorios de eficacia V30/V60** (migración 030): cron diario 09:00 AR que intima al responsable y avisa a calidad cuando una NC cumple 30/60 días sin verificar la eficacia.

**Fase 8 — Gráficos y Pareto**: endpoint `/findings/analytics`; gráfico de tendencia mensual (creadas vs cerradas) y Pareto de NC por origen con % acumulado.

**Fase 9 — Kanban interactivo**: drag & drop de tarjetas entre columnas para cambiar estado; filtros por estado y por responsable.

### Módulo de Tareas — saneamiento y seguimiento · 2026-05-17

**Fase T1 — Saneamiento** (migración 031): `tasks.js` lee y escribe `task_assignees` (antes una tarea multi-responsable no aparecía para los colaboradores); notificación in-app al asignar; cierre de tarea consistente entre endpoints (observación opcional, se agrega al historial); fix del rol colaborador en el wizard de comité; índice duplicado eliminado; `priority` con CHECK constraint; ruta `/tasks` redirige a `/mis-pendientes` (los mails enlazaban a una ruta inexistente).

**Fase T2 — Comentarios** (migración 032): tabla `task_comments` con historial (autor, fecha, tipo); endpoints `GET`/`POST /tasks/:id/comments`; la observación de cierre queda registrada como comentario; sección de comentarios en el detalle de Mis Pendientes.

**Fase T3 — Agrupación y acciones**: tareas agrupadas por vencimiento / estado / origen; cambio de prioridad y "marcar en curso" desde el detalle.

**Fase T4 — Seguimiento con Triny** (migración 033): desactivado el digest quincenal legacy de `email.js` que se solapaba con el recordatorio de lunes; el seguimiento de tareas queda centralizado en Triny (lunes personal, viernes y mensual a María y Santiago, intimación diaria de vencidas).

**Fase T5 — Vista de equipo**: `/team-overview` cuenta por los tres caminos de asignación; pantalla de carga por persona (pendientes/vencidas/prioridad) con toggle "Mis tareas / Equipo" para supervisores.

**Fase T6 — Alta rápida y búsqueda**: botón "Nueva tarea" con modal en Mis Pendientes; búsqueda por título, número o descripción.

**Fase T7 — Métricas**: endpoint `/tasks/analytics` (cumplimiento de plazos, tiempo promedio de cierre, tendencia semanal); modo "Métricas" con KPIs y gráfico.

**Fase T8 — Cierre por responsable + IA**: cada responsable cierra su parte (`task_assignees.completed_at`); la tarea se cierra cuando todos terminan. El resumen semanal del viernes abre con un análisis ejecutivo generado por Triny.

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
