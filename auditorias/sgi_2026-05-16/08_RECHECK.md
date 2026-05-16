# 08 — Re-check final · `sgi` (Trinorma)

**Fecha**: 2026-05-16
**Base**: 10 hallazgos de `01_DISCOVERY.md`

---

## Tabla de verificación

| ID | Sev | Estado | Resuelto en | Validación |
|---|---|---|---|---|
| H-01 | 🔴 | ✅ Resuelto | F3 | `server/index.js`: `/api/auditor` y `/api/profiles` montados en líneas 267-268, antes del catch-all SPA (316). Orden verificado por grep. |
| H-02 | 🟠 | ✅ Resuelto | F3 | Error handler `app.use((err…))` movido a línea 325, después del catch-all. |
| H-03 | 🟠 | ✅ Resuelto | F3 | `manifest.json`: `stack` y `databases` corregidos a Postgres. JSON válido. |
| H-04 | 🟠 | ✅ Resuelto | F3 | `findings.js` `saveBase64File`: nombres con `randomUUID()` — URLs no enumerables. |
| H-05 | 🟡 | ✅ Resuelto | F7 | Carpeta basura `src/{components/…` eliminada (`rm -rf`). |
| H-06 | 🟡 | ⚠️ Diferido | — | Refactor `/api/public` — acordado con Santiago para próximo ciclo (sin riesgo activo). |
| H-07 | 🟡 | ⏳ Pendiente | — | Commit de los cambios de Fase 3 + path fixes + `ecosystem.config.cjs`. Requiere autorización de commit. |
| H-08 | 🟢 | ⚠️ Diferido | — | 3 vulns `moderate` dev-only (esbuild/vite/postcss). Sin fix sin major bump de Vite. |
| H-09 | 🟢 | ✅ Resuelto | F7 | Scripts activos (`ingest.sh`, `manifest.json`, `amfe-seed-bg.cjs`) con path nuevo. Doc histórica de entrega 2026-05-14 dejada intacta a propósito. |
| H-10 | 🟢 | ✅ Resuelto | F3 | `saveBase64File`: whitelist `ALLOWED_UPLOAD_EXT` + mapa `MIME_TO_EXT`. |

## Validaciones globales post-fix

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| `npm run lint --max-warnings 0` | ✅ 0 / 0 |
| `npm run build` | ✅ 488 KB / 103.5 KB gzip |
| `node --check` index.js / findings.js | ✅ sintaxis OK |
| `manifest.json` | ✅ JSON válido |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades |
| Health check `/api/health` | ✅ HTTP 200 |

---

## Veredicto

**Todos los hallazgos 🔴 y 🟠 (H-01, H-02, H-03, H-04) están ✅ Resueltos.**

Hallazgos restantes:
- 2 diferidos acordados (H-06 🟡, H-08 🟢) — sin riesgo activo, documentados.
- 1 pendiente operativo (H-07 🟡) — commitear los cambios; no es un defecto de código.

Se cumplen las condiciones para **emitir el certificado**.

### Condición de cierre

El fix 🔴 H-01 está en el código pero **no desplegado**: el reinicio de PM2 `dassa-sgi`
quedó pendiente de aprobación de Santiago. El certificado certifica el código; el deploy y la
verificación runtime (`curl /api/auditor/runs` → JSON 401) son el paso final.
