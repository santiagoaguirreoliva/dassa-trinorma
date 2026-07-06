# Auditoría integral de código — Trinorma (dassa-sgi) + TRINY

**Fecha:** 2026-07-06 · **Auditor:** Claude Fable 5 (5 agentes en paralelo: server núcleo/seguridad · rutas de dominio · TRINY/IA · frontend · higiene+DB)
**Alcance:** ~40k líneas propias (server 15,7k · src 23k · scripts) + BD productiva `dassa_sgi` (verificación en vivo, solo lectura)
**Objetivo:** encontrar optimizaciones, simplificaciones y arreglos ANTES de seguir agregando features. Nada fue modificado.

---

## Lo que está BIEN (verificado, no tocar)

- **Frontend base sólido**: cliente API único (`src/lib/api.ts`), code-splitting por ruta completo (recharts en chunk propio de 424K), react-query con invalidaciones correctas en las páginas grandes.
- **BD sana**: 22 MB, 120 tablas, sin problemas de performance reales. Tabla más grande: `triny_comms_log` (1 MB / 292 filas). Índices: nada que tocar (re-medir en 30+ días, stats reseteadas 04/07).
- **Sin doble disparo de crons**: en `index.js` solo quedan in-process los 2 de Rondas + el del auditor (ver P1-6). Los 8 jobs TRINY del crontab SO no tienen duplicado in-process. `triny-run-job.cjs --scheduled` respeta enabled/dry_run.
- **Gasto LLM ínfimo**: `llm_usage` total ~US$0,17. El `wakeup` cada 6h es SQL puro, 0 tokens. Los mails masivos de TRINY son plantillas determinísticas, no LLM disfrazado. Modelo default `claude-sonnet-4-5` vigente.
- **Recordatorios idempotentes**: trainings/findings-reminders con marcas (`reminder_sent_at`, `v30/v60_reminded_at`).
- **pm2 + logs OK**: pm2-logrotate activo, `max_memory_restart 300M`. `dist/`, `uploads/`, `logs/`, `.agent-inbox/` gitignored.
- **Uploads no enumerables**: nombres `randomUUID`.
- **inspections-generator/rollup, mailer.cjs, email.js**: limpios (transacciones completas, carrera 23505 manejada).

---

## P0 — Arreglar YA (riesgo real en producción)

### P0-1 · Endpoints de mail masivo SIN auth: `CRON_SECRET` no existe en `.env`
`server/index.js:234-247` y `:331-343`. El guard es `if (cronSecret && authHeader !== ...)` y `.env` **no define CRON_SECRET** → `POST /api/tasks/send-digest` y `POST /api/tasks/check-notifications` quedan abiertos: cualquiera que llegue al puerto dispara mails a todos los usuarios activos desde info@dassa.
**Fix:** setear `CRON_SECRET` + invertir el guard a `if (!cronSecret || authHeader !== ...)`.

### P0-2 · Estados de NC desincronizados con el enum real → media capa IA opera sobre datos falsos
El enum real de `findings.status` es `abierto/cerrado/analisis/plan_accion/en_ejecucion/verificacion`; el código compara contra `'abierta'/'cerrada'` → Postgres tira error de enum y los `.catch()` silenciosos lo tragan. Afecta:
- `server/services/triny-mailer.cjs:195-205` y `:264-274` — **el resumen de los viernes y el informe mensual a dirección salen con TODOS los KPIs en 0**, y `task-ai.cjs:21` (Sonnet) redacta un "análisis ejecutivo" sobre esos ceros. Confirmado que corre en vivo (3 llamadas en `llm_usage`). Mail ejecutivo con datos inventados.
- `server/services/sgi-agent.cjs:105` (tool `consultar_hallazgos` con estados que no matchean nada) y `:425-427` (tool `resumen_dashboard` del chat TRINY explota entero).
- `server/services/auditor-context.cjs:39` y `:110-111`.
**Fix:** unificar los valores contra el enum real en los 4 archivos + sacar los catch-silenciosos de las queries de KPIs.

### P0-3 · El Auditor IA semanal audita con contexto vacío (columnas inexistentes silenciadas)
`server/services/auditor-context.cjs:61` usa `fecha_vencimiento` (real: `expiration_date`), `:36` usa `findings.severity` (no existe), `:72` usa `documents.last_review_date/next_review_date` (no existen) — todos con `.catch(() => ({rows:[]}))`. Los reportes semanales por usuario (Sonnet, ~25k tokens/corrida) se generan solo con tasks+trainings; **hay 16 NC no cerradas y el auditor reporta 0**.
**Fix:** corregir columnas + error visible en vez de catch.

### P0-4 · El "preview" de jobs TRINY puede mandar mails reales a toda la nómina
`server/routes/triny.js:147-157`: si no hay dry-runs guardados, ejecuta el job con `{force:true}`; como `triny_scheduled_jobs.dry_run=false` en BD, el envío es REAL. Un GET de preview de `recordatorios_lunes` puede spamear a todos. Mismo defecto en `previewJob()` de `triny-mailer.cjs:432-438`.
**Fix:** preview fuerza `dryRun=true` incondicional.

### P0-5 · Autosave de Rondas guarda datos VIEJOS y puede pisar respuestas ya guardadas (stale closure)
`src/pages/RondaDetalle.tsx:210-215`: el intervalo de 30s captura `drafts/notes/signature` del render post-load (snapshot inicial). Escenario: operario completa sección 1 (se guarda bien al cambiar de paso) → edita sección 2 → a los 30s el intervalo POSTea el **borrador inicial vacío**, borrando la sección 1 del server y marcando `dirtyRef=false`. El backup real queda solo en localStorage del dispositivo.
**Fix quirúrgico:** leer el estado actual desde un ref en el tick del intervalo.

### P0-6 · Portal empleado: PIN-solo de 4 dígitos = brute-force a PII
`server/routes/public-portal.js:70-99`: login recibe SOLO el PIN (regex `^\d{4}$`), itera bcrypt sobre todos los empleados; keyspace 10.000 con ~25 PINs vivos. Rate-limit 12/5min es por-IP (no frena IPs rotativas). Cada acierto entrega `/me/legajo`: CUIL, domicilio, fecha nac., contacto de emergencia.
**Fix:** identificador + PIN (legajo/DNI), PIN a 6 dígitos, lockout por empleado tras N fallos.
*(Es la deuda "endurecer solo-mis-datos" ya anotada, ahora con severidad concreta.)*

---

## P1 — Importantes (bugs vivos, seguridad, features rotas en silencio)

1. **`users-extra.cjs:14-26` no relee `is_active`/rol de la BD** — un admin desactivado/degradado sigue operando `admin-reset-password`, `toggle-active` y aprobar accesos por 7 días (vida del JWT). Fix: usar el `authenticate` de `middleware/auth.js`.
2. **Escalada de rol**: `users.js:104-125` — `sgi_leader` puede asignar `master_admin` a otra cuenta. Fix: whitelistear roles asignables / sacar `sgi_leader` del gate.
3. **Password default hardcodeada**: `accessRequests.js:83` (`'Dassa2026x'`) sin `must_change_password`; además `ON CONFLICT ... SET is_active=true` puede reactivar bajas. La implementación paralela en `users-extra.cjs:105-155` lo hace bien → **unificar y borrar la débil** (lógica de aprobación duplicada y divergente, ambas montadas).
4. **`GET /api/committee/:id/pending-from-previous` devuelve 500 SIEMPRE** (`committee.js:325-337`: SQL sin `$1` pero se pasa param) — el front lo tapa con `.catch(() => [])` → panel "pendientes de reuniones anteriores" **vacío en silencio** en prod. Fix: quitar el param (o usar `/pending-alive`, misma query duplicada en `:41`).
5. **`req.userId` no existe** → `documents.js:71` e `incidents.js:73` guardan `created_by`/`reported_by` NULL (trazabilidad ISO perdida, silencioso). Fix: `req.user.id`.
6. **Auditor IA duplica al TRINY de los lunes y es el último cron LLM in-process** (`auditor-cron.cjs:199`, lunes 8AM — misma hora que `recordatorios_lunes` del crontab SO). Dos mails redundantes + mismo riesgo "missed execution" que motivó la migración al crontab. Fix: apagar `auditor_email_enabled` o consolidar; si se conserva, moverlo al crontab SO.
7. **Compras-IA muerta**: `purchases.js:238,252` llaman `parseProductInfo` sin importarla (vive en `url-importer.cjs:173`) → ReferenceError atrapado → `/parse-product-info` e `/import-from-url` devuelven 400 siempre. Fix: importarla vía `createRequire`.
8. **Biblioteca 500 siempre**: `biblioteca.js:30` usa `u.name` (real: `full_name`); además el front no llama `/biblioteca` → candidato a retirar el router.
9. **Pool nuevo por request**: `committee.js:276` (`app.locals.pool` nunca se setea → `new Pool()` descartable por cada wizard, sin `end()`). Fix: `getClient()` de `db/db.js`.
10. **`profiles.cjs` riesgo de crash**: handlers async sin try/catch (`:32-43,46-55,82-85`) — un error de BD tumba el proceso (Node ≥15). Modelo legacy, front no lo llama → desmontar.
11. **CRUD de empleados por la puerta de atrás**: `surveys.js:564-594` crea/edita `employees` con solo `authenticate` (el canónico exige master_admin/director/sgi_leader). Todo el módulo surveys sin gates de rol. Fix: retirar los endpoints duplicados + requireRole en el resto.
12. **Modelo retirado hardcodeado**: `committee.js:158` `claude-sonnet-4-20250514` (retirado 15/06/2026) — "procesar acta con IA" probablemente devuelve 404 hoy; además `fetch` crudo que bypassea llm-meter. Fix: modelo vigente vía `meterClient`.
13. **El fallback Claude→Gemini→Ollama NO existe** — cero código; `GEMINI_API_KEY` en `.env:19` huérfana (rotar/retirar), `OLLAMA_*` solo en docs. Si Anthropic cae, cae todo el stack IA. Fix: borrar doc/env engañosa o implementarlo de verdad.
14. **`triny_policies.dry_run` es un freno fantasma** — nadie lo lee (el mailer mira `triny_scheduled_jobs.dry_run`, todos en `false` → LIVE de facto). `alert_recipients` tampoco lo lee nadie. **El pendiente anotado "poner dry_run=false" es innecesario.** Fix: cablear en `sendWithSignature` (`triny-mailer.cjs:40`) o dropear las columnas.
15. **`wakeup` duplica notificaciones in-app** — `ai-quality.cjs:81-148` usa `ON CONFLICT DO NOTHING` pero `notifications` solo tiene PK → 4 duplicados/día por condición persistente. Fix: índice único (user_id,title,source_module) o marca "ya avisado".
16. **Grilla de maquinaria SIEMPRE vacía**: `RondasMaquinaria.tsx:54 vs 115` — indexa con `scheduled_date` crudo (`"2026-07-06T03:00:00.000Z"`, verificado en wire) y busca con `'YYYY-MM-DD'` → 10 inspecciones reales mostradas como "sin actividad". Fix: `.slice(0,10)` al indexar.
17. **Sin manejo de 401**: `api.ts:18-21` + `AuthContext.tsx:52-59` — JWT vence a los 7 días y la app queda "logueada" pero muerta (alerts "HTTP 401") hasta refrescar. El portal empleado SÍ lo hace bien. Fix: en `request()`, ante 401 limpiar token y redirigir a `/login`.
18. **`schema.sql` "canónico" driftea 60 migraciones** (idéntico a `001_schema.sql`, hoy 120 tablas reales) — regenerar con `pg_dump --schema-only` o dejar de llamarlo canónico. + **Hueco migración 008**: vive en `99-archive/` pero figura aplicada — un ambiente nuevo divergiría en silencio; restaurarla a `migrations/` (inocuo en prod). + **`db:seed` roto** (apunta a `server/db/seed.js` inexistente).

---

## P2 — Mejoras y limpieza (hacer por tandas)

**Seguridad menor**
- Open redirect SSO: `sso.js:129` acepta `next='//evil.com'` (phishing). Rechazar `//` y `/\`.
- `err.message` de Postgres al cliente en ~20 handlers (users, tenants-admin, accessRequests, users-extra) — responder genérico, loguear server-side.
- `POST /api/public/nc` sin rate-limit propio ni tope de longitud (spam de findings + notifs a todos los admins).
- `sistema-gestion.js:8-29`: GETs sin `authenticate` (contenido SGI legible sin token).
- `purchases.js:364-399`: cancelar/borrar compras ajenas sin check de permiso.
- Cualquier autenticado lista todos los usuarios (`users.js:10-36`).
- CSV export sin guard de inyección de fórmulas (`exportCsv.ts:3-10`) — prefijar `'` a celdas que arrancan con `=+-@`.
- Rate-limit in-memory de `auth-extra.cjs:15-22` crece sin purga.

**Bugs menores**
- Re-completar capacitación duplica la próxima edición recurrente (`trainings.js:304-331` no compara estado previo).
- Notas de recepción de compra se guardan como `payment_method` (`purchases.js:347-356`).
- Cierre de comité: mail masivo ANTES de persistir, sin idempotencia (doble click = doble mail masivo); firmas con carrera read-modify-write (`committee.js:619-645`, `:346-373`).
- `committee_tasks` ↔ `tasks` doble escritura sin FK → "Mis Pendientes" queda desactualizado para siempre tras editar (`committee.js:231-267`). Respond de surveys sin transacción (respuestas huérfanas/duplicadas, `surveys.js:70-127`).
- Fechas UTC: `Calendar.tsx:38` y `MiPerfil.tsx:593` (`slice(0,10)` sobre TIMESTAMPTZ = día corrido de noche); "hoy" en UTC en `Committee.tsx:146` y `RondasMaquinaria.tsx:17`. Extraer helper `hoyLocal()` (patrón correcto ya existe en `Calendar.tsx:198`).
- Race al cambiar tab sin guard en `Rondas.tsx:93`/`RondasMaquinaria.tsx:48` — migrar a useQuery.
- Fecha congelada en require-time en `auditor-prompts.cjs:82` (queda fijada al último restart).
- `migrate.js:74-79` auto-marca migraciones fallidas como aplicadas si el error matchea `already exists` — exigir `--force`.
- Documentos: generación de código con `MAX(split_part)` sin lock (colisión posible, `documents.js:67`).

**Perf / costo (ninguno urgente al volumen actual)**
- N+1: `trainings.js:230-271` (3N queries por participante), `surveys.js:311-359`, `committee.js:204-221` (sin transacción), `dashboard.js:11-18` (tablas enteras a JS para contar — COUNT FILTER en SQL).
- ~12 `new Pool` propios (services IA + tasks-mine + profiles) contra el mismo Postgres — módulo `db-pool` compartido.
- `trainings.js:19-35` crea transporter SMTP por mail (email.js ya tiene singleton).
- Sin prompt caching: chat TRINY reenvía system+22 tool schemas (~5k tokens) por iteración ×6 (`sgi-agent.cjs:790`); ídem auditor. Primera palanca si el uso crece: `cache_control: {type:'ephemeral'}`.
- 3 call-sites LLM bypassean llm-meter: `committee.js:150-165`, `sgi-modules.js:271-284`, `server/scripts/amfe-seed-bg.cjs:6`.
- `estimateCost` triplicado con precios contradictorios (`sgi-agent.cjs:852`, `auditor-anthropic.cjs:254` vs `llm-meter.cjs:31` que es el correcto) → exportar `costUsd()` del meter y borrar los locales.
- Jobs de crontab sin lock (`flock -n`) + `sgi-run-cron.cjs:12` corre `findings_monthly` sin gate de enabled/dry_run.

**Simplificación / muerto**
- 32 modales hand-rolled en 23 archivos (sin Escape ni focus-trap) mientras `Dialog.tsx` tiene 1 consumidor → extraer `<Modal>` con el look real y adoptar en código nuevo.
- Doble convención de data-fetching (15 páginas useEffect+useState vs 45 react-query) — migrar solo las que tienen mutaciones cruzadas (MisPendientes, CommitteeDetail).
- Handlers muertos en `auth.js:26-97` (endpoints 410 con lógica viva abajo) + `loginLimiter` de `index.js:172` apuntando a un 410.
- `users-extra.cjs:177-230` "registro público" inalcanzable detrás de authenticate.
- `satisfaction.js` entero sin montar y con schema viejo. `purchases.js:25-52` endpoints sin caller. `orgchart.js:143-181` `/mi-puesto` legacy.
- Páginas huérfanas: `NotFound.tsx` (sin ruta), `MiPuesto.tsx` (241 líneas), `Objetivos.tsx` (116) — solo alcanzables tipeando URL.
- 37/120 tablas con 0 filas (multitenant nunca activado, encuestas sin una sola respuesta, incidents/calendar_events/contacts/management_reviews vacías) — mapa de módulos fantasma; no borrar (romperían migraciones), pero no construir encima sin decidir su destino.
- `mammoth` en package.json sin un solo import.
- README instruye deploy Railway (líneas 43, 117-131) — actualizar al flujo VPS/pm2.
- `uploads/` (27 MB) contiene evidencia ISO fuera de git — confirmar que el backup del VPS lo cubra.

---

## Borrables seguros (cero referencias, verificado con grep + git ls-files)

```
server/services/*.bak.pre-llmmeter          (8 archivos, untracked)
server/db.js.LEGACY_DEPRECATED
server/_archive/agent.js.gemini-ollama-legacy   (actualizar comentario index.js:90)
server/db/add_indexes.sql migrate_agent.sql migrate_surveys.sql migrate_tasks_v2.sql   (byte-idénticos a migrations/003-006)
server/db/seed_surveys.js seed_tasks_comite.js  (one-shot ya corridos)
START.sh railway.json nixpacks.toml TECHNICAL_SUMMARY.txt ENTREGA_dassa-sgi-trinorma_2026-05-14.md
src/pages/Employees.tsx.bak.20260518-170440     (git rm + patrón *.bak.* al .gitignore)
~/.pm2/logs/sgi-loadtest-{out,error}.log
```
**NO borrar:** `99-archive/008_bloque_a_pilares.sql` (restaurar a migrations/), `schema.sql`/`seed.sql` (regenerar/decidir rol), `server/.agent-inbox/` (runtime vivo).

---

## Plan sugerido (3 olas)

- **Ola 0 — quirúrgica (1 sesión):** los 6 P0. Casi todos son fixes de pocas líneas: CRON_SECRET + guard, estados de enum en 4 archivos + sacar catches, columnas del auditor-context, preview dry-run forzado, ref en autosave de rondas. El P0-6 (PIN) es el único con decisión de diseño (identificador+PIN vs PIN de 6).
- **Ola 1 — P1 (1-2 sesiones):** seguridad de usuarios/roles (1-3, 11), features rotas en silencio (4, 5, 7, 8, 16, 17), higiene de crons IA (6, 12-15), base de datos/migraciones (18).
- **Ola 2 — P2 por tandas oportunistas:** limpieza de borrables + Railway/README en un commit; el resto al tocar cada módulo (regla: no refactorizar lo que no está roto, pero no construir encima de lo marcado).
