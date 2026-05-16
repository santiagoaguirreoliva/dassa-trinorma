# 01 — Discovery acotado · `sgi` (Trinorma)

**Fecha**: 2026-05-16
**Modo**: read-only · ejecutado por Claude (skill `super-auditor` no instalada)
**Alcance**: delta desde la entrega 2026-05-14 + verificación de seguridad (Light workflow)

---

## Mapa de arquitectura

- **SPA**: React 18 + Vite, servido como estático en producción desde `dist/` por el propio Express.
- **API**: Express monolítico (`server/index.js`), **38 routers** bajo `/api/*`, ~235 endpoints.
- **DB**: PostgreSQL directo vía `pg.Pool` (`server/db/db.js`), 24 migraciones, 251 índices. **No usa Supabase** pese a lo que declara el manifest.
- **Auth**: doble vía — JWT propio (`middleware/auth.js`, `authenticate` + `requireRole`) y SSO ticket de la app madre `smart-dassa-apps` (`/api/sso/consume`).
- **Cron**: jobs node-cron embebidos en `index.js` (digests, recordatorios Triny, wake-up alerts).
- **IA**: agente "Triny" con `@anthropic-ai/sdk` + knowledge base ingestada (`agent_knowledge`).
- **Proceso**: PM2 `dassa-sgi`, puerto 4001, detrás de nginx (`trust proxy: 1`).

## Estado de salud (verificado)

| Check | Resultado |
|---|---|
| `tsc --noEmit` (typecheck) | ✅ 0 errores |
| `npm run lint` (`--max-warnings 0`) | ✅ 0 errores / 0 warnings |
| `npm run build` | ✅ built 6.5s · `index` 497.8 KB raw / 103.5 KB gzip (≤ 500 KB DASSA) |
| `npm audit --omit=dev` (prod) | ✅ 0 vulnerabilidades |
| `npm audit` (con dev) | ⚠️ 3 moderate (esbuild/vite/postcss) — heredado |
| Permisos `.env` | ✅ `-rw-------` (600) |
| Secretos hardcodeados en código | ✅ ninguno encontrado |
| Middleware `authenticate` | ✅ verifica JWT + `is_active` contra DB |
| Rate limiting | ✅ login 10/15min · register 5/h · API global 300/15min |
| Helmet + CSP | ✅ presente con directivas explícitas |

**Conclusión de salud**: la base de la entrega del 2026-05-14 se mantiene sólida. El delta introdujo
hallazgos nuevos, ninguno de build/tipos.

---

## Hallazgos catalogados

### 🔴 Crítico

**H-01 · `/api/auditor` y `/api/profiles` rotos en producción (mounting order)**
En `server/index.js`, el catch-all SPA de producción `app.get('*', …)` (línea 314, dentro del bloque
`NODE_ENV === 'production'`) se registra **antes** de montar `auditorRouter` y `profilesRouter`
(líneas 327-328). Express evalúa middleware en orden de registro: en producción, cualquier
**GET** a `/api/auditor/*` o `/api/profiles/*` matchea primero el catch-all y devuelve `index.html`
en lugar de la respuesta JSON de la API.
Afecta GETs reales: `/api/auditor/runs`, `/api/auditor/insights`, `/api/auditor/my-latest-report`,
`/api/profiles/me`, `/api/profiles/`. El frontend de las páginas Auditor y Perfiles recibe HTML
y falla al parsear JSON. POST/PUT/DELETE no se ven afectados (el catch-all es `app.get`).
**Fix**: mover el montaje de `/api/auditor` y `/api/profiles` antes del bloque `if (NODE_ENV === 'production')`.

### 🟠 Alto

**H-02 · Error handler centralizado mal posicionado**
`app.use((err, _req, res, _next) => …)` (línea 322) se monta **antes** que `/api/auditor` y
`/api/profiles` (327-328). Los errores lanzados en esos dos routers no llegan al handler
centralizado → respuestas de error inconsistentes / stack traces potencialmente filtrados.
**Fix**: mover el error handler al final, después de todos los `app.use` de routers.

**H-03 · `manifest.json` declara Supabase pero la app usa Postgres directo**
`manifest.json` declara `stack: [...,"supabase"]` y `databases: [{type:"supabase", role:"service_role"}]`.
El código real usa `pg.Pool` contra PostgreSQL (`DATABASE_URL`), sin cliente Supabase ni RLS.
El manifest miente sobre la superficie de datos — confunde auditorías futuras y la app madre.
**Fix**: corregir `stack` y `databases` en el manifest al stack real (postgres).

**H-04 · `/uploads` servido estático sin autenticación**
`app.use('/uploads', express.static(UPLOADS_DIR))` (línea 163) expone los archivos subidos sin
control de acceso. Hoy contiene fotos de no conformidades (`*-nc-publica.jpeg`). Para un SGI
con evidencia de calidad/incidentes, las fotos son semi-confidenciales: cualquiera con la URL
las ve. Las URLs son predecibles (`/uploads/<timestamp>-nc-publica.jpeg`).
**Fix**: servir `/uploads` detrás de `authenticate`, o mover a almacenamiento privado con URLs firmadas.

### 🟡 Medio

**H-05 · Carpeta basura en `src/` por brace expansion fallida**
Existe `src/{components/` con un único subdirectorio literal
`{layout,ui,common,dashboard,findings},contexts,hooks,lib,pages}`. Resultado de un
`mkdir -p src/{components/{...},contexts,...}` corrido en un shell sin expansión de llaves.
No tiene archivos ni referencias en el código. Es ruido en el árbol de fuentes.
**Fix**: `rm -rf 'src/{components'`.

**H-06 · Namespace `/api/public` monta el findingsRouter completo**
`app.use('/api/public', findingsRouter)` (línea 220) expone el router entero de findings bajo un
namespace llamado "public". Solo `POST /nc` es realmente público (está antes del
`router.use(authenticate)` de `findings.js:89`); el resto sí exige auth. Funcionalmente no hay
fuga, pero el naming es engañoso y acopla el router público al de gestión.
**Fix**: extraer `POST /nc` a un router mínimo `public-nc` y montar solo eso en `/api/public`.

**H-07 · Cambios sin commitear + archivo sin trackear**
`git status` muestra modificados `manifest.json`, `knowledge-base/ingest.sh`,
`server/scripts/amfe-seed-bg.cjs` (correcciones de path de la migración `dassa-sgi` →
`dassa4/apps/sgi`, correctas) y `ecosystem.config.cjs` sin trackear. Trabajo correcto sin
versionar — riesgo de pérdida y de auditar sobre código no-HEAD.
**Fix**: commitear los cambios de path + agregar `ecosystem.config.cjs` al repo.

### 🟢 Bajo / informativo

**H-08 · 3 vulnerabilidades `moderate` dev-only** — esbuild/vite/postcss. Heredado de la entrega
2026-05-14. No afectan runtime de producción (`npm audit --omit=dev` = 0). Requieren major bump
de Vite para resolver. Diferible.

**H-09 · Docs con path viejo** — `ENTREGA_dassa-sgi-trinorma_2026-05-14.md` y otros referencian
`/home/dassa/dassa-sgi`. La app se migró a `/home/dassa/dassa4/apps/sgi` el 2026-05-15.

**H-10 · `saveBase64File` deriva la extensión del mime-type del data-URI** (`findings.js`),
que es controlado por el cliente en la ruta pública `/nc`. No hay traversal real (el nombre base
es fijo), pero conviene whitelistear extensiones (`jpg/jpeg/png/webp/pdf`). Hardening menor.

---

## Pendientes heredados de la entrega 2026-05-14 (estado)

| Pendiente | Estado 2026-05-16 |
|---|---|
| Commitear los ~67 archivos de la sesión | ✅ Hecho (git log 2026-05-14) |
| Validar CSV / atajos en browser real | ⏳ No verificable en esta sesión (sin browser) — queda para QA manual |
| Verificar mobile 375×667 | ⏳ Igual — QA manual |
| ~60 hex hardcoded restantes | ⏳ Diferido (paletas Tailwind semánticas, aceptable) |
| 3 vulnerabilidades moderate | ⏳ Abierto → H-08 |
| Lighthouse ≥ 80 | ⏳ Requiere deploy — fuera de alcance Light |

---

## Gate de Fase 1

✅ **El sistema es entendible**: arquitectura, DB, endpoints y rutas mapeados. Hay un mapa claro.
Se avanza a Fase 2 (Plan de remediación).

**Resumen**: 1 🔴 · 3 🟠 · 3 🟡 · 3 🟢 — total 10 hallazgos.
