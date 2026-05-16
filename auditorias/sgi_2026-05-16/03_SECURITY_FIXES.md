# 03 — Hardening / Fixes · Fase 3 · `sgi` (Trinorma)

**Fecha**: 2026-05-16
**Skill aplicada**: `dassa-seguridad-confidencialidad` (rol: Security Officer)
**Hallazgos abordados**: H-01, H-02, H-03, H-04, H-10 (H-06 diferido por decisión de Santiago)

---

## Fixes aplicados

### H-01 🔴 + H-02 🟠 — Orden de montaje de routers y error handler (`server/index.js`)

**Problema**: `/api/auditor` y `/api/profiles` se montaban en las líneas 327-328, después del
catch-all SPA de producción `app.get('*')`. En producción, los GET a esos endpoints devolvían
`index.html` en vez de JSON. Además el error handler estaba antes de esos dos routers.

**Cambio**:
- `app.use('/api/auditor', …)` y `app.use('/api/profiles', …)` movidos a las líneas 267-268,
  junto al resto de routers `/api/*`, **antes** del bloque `if (NODE_ENV === 'production')`.
- Error handler `app.use((err, …) => …)` movido al final (línea 325), después del catch-all SPA.

**Orden final verificado**:
```
267  app.use('/api/auditor', auditorRouter)
268  app.use('/api/profiles', profilesRouter)
303  if (NODE_ENV === 'production') {
316    app.get('*', …)            ← catch-all SPA
       }
325  app.use((err, …) => …)      ← error handler, al final
333  app.listen(PORT)
```

### H-03 🟠 — `manifest.json` declaraba Supabase

**Problema**: el manifest declaraba `stack: [...,"supabase"]` y `databases: [{type:"supabase",
role:"service_role"}]`, pero la app usa PostgreSQL directo vía `pg.Pool`.

**Cambio**:
- `stack`: `supabase` → `express`, `postgres`.
- `databases`: `type: "postgres"`, `access: "pg.Pool via DATABASE_URL"`, nota aclarando "sin
  Supabase ni RLS".
- `credentials_vault_keys`: `sgi/supabase_service_key` → `sgi/database_url`.

### H-04 🟠 — `/uploads` sin autenticación → nombres no-enumerables

**Decisión de Santiago**: opción UUID (en vez de endpoint proxy con auth). Las fotos de NC son
semi-sensibles; el riesgo real era la enumerabilidad de las URLs por timestamp secuencial.

**Cambio** (`server/routes/findings.js`, `saveBase64File`):
- Nombre de archivo: `${Date.now()}-${label}.${ext}` → `${label}-${randomUUID()}.${ext}`.
  La URL deja de ser adivinable. Se importó `randomUUID` de `crypto`.
- El `label` (siempre un literal del código: `nc-publica` / `nc-interna` / `nc-evidencia`) se
  sanitiza antes de usarse en el path.

**Nota**: `/uploads` sigue sirviéndose como estático. El riesgo residual (alguien con el link
exacto ve la foto) es aceptable para este tipo de dato. Si en el futuro se suben documentos más
sensibles, escalar a un endpoint proxy con `authenticate` — anotado como mejora futura.

### H-10 🟢 — Whitelist de extensiones en upload base64

**Cambio** (`server/routes/findings.js`, `saveBase64File`):
- Se reemplazó `ext = matches[1].split('/')[1] || 'bin'` (extensión derivada sin control del
  mime-type del cliente) por un mapa `MIME_TO_EXT` + set `ALLOWED_UPLOAD_EXT`
  (`jpg/jpeg/png/webp/pdf`).
- Si el mime-type no está en la whitelist, `saveBase64File` devuelve `null` y no escribe nada.

### H-06 🟡 — Diferido

Refactor del namespace `/api/public` (extraer `POST /nc` a router dedicado). Diferido a próximo
ciclo por decisión de Santiago: es higiene de arquitectura, sin fuga de datos activa.

---

## Validaciones (re-corridas post-fix)

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| `npm run lint` (`--max-warnings 0`) | ✅ 0 errores / 0 warnings |
| `npm run build` | ✅ built 5.96s · `index` 497.8 KB / 103.5 KB gzip |
| `node --check server/index.js` | ✅ sintaxis OK |
| `node --check server/routes/findings.js` | ✅ sintaxis OK |
| `manifest.json` JSON válido | ✅ |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades |

## Pendiente de verificación en runtime

⚠️ El reinicio del proceso PM2 `dassa-sgi` (producción) **no se ejecutó** — requiere
aprobación explícita de Santiago para desplegar. Una vez reiniciado, verificar:

```bash
pm2 restart dassa-sgi --update-env
curl -s -w '%{content_type}\n' http://127.0.0.1:4001/api/auditor/runs   # debe ser application/json, HTTP 401
curl -s -w '%{content_type}\n' http://127.0.0.1:4001/api/profiles/me    # debe ser application/json, HTTP 401
```
Antes del fix devolvían `text/html` (el `index.html` del SPA). Después deben devolver JSON 401.

---

## Archivos modificados

- `server/index.js` — orden de montaje de routers + error handler.
- `server/routes/findings.js` — `saveBase64File`: UUID + whitelist de extensiones + `import randomUUID`.
- `manifest.json` — stack y databases reales (Postgres).

**Estado Fase 3**: ✅ completada (4 hallazgos resueltos en código, 1 diferido). Gate de fase:
build/typecheck/lint limpios, sin secretos, sin vulnerabilidades de producción. Pasa a Fase 7.
