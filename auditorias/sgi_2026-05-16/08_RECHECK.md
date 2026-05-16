# 08 — Re-check final · `sgi` (Trinorma)

**Fecha**: 2026-05-16
**Base**: 10 hallazgos de `01_DISCOVERY.md`

---

## Tabla de verificación

| ID | Sev | Estado | Resuelto en | Validación |
|---|---|---|---|---|
| H-01 | 🔴 | ✅ Resuelto y verificado | F3 | `server/index.js`: routers remontados antes del catch-all SPA. **Verificado en producción post-restart**: `/api/auditor/runs` y `/api/profiles/me` devuelven `application/json` HTTP 401 (antes `text/html`). |
| H-02 | 🟠 | ✅ Resuelto | F3 | Error handler `app.use((err…))` movido a línea 325, después del catch-all. |
| H-03 | 🟠 | ✅ Resuelto | F3 | `manifest.json`: `stack` y `databases` corregidos a Postgres. JSON válido. |
| H-04 | 🟠 | ✅ Resuelto | F3 | `findings.js` `saveBase64File`: nombres con `randomUUID()` — URLs no enumerables. |
| H-05 | 🟡 | ✅ Resuelto | F7 | Carpeta basura `src/{components/…` eliminada (`rm -rf`). |
| H-06 | 🟡 | ⚠️ Diferido | — | Refactor `/api/public` — acordado con Santiago para próximo ciclo (sin riesgo activo). |
| H-07 | 🟡 | ✅ Resuelto | F7 | 5 commits agrupados en `main` (`f95bf21`→`c04a4fe`): server, uploads, manifest, paths, auditoría. |
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

Se emite el certificado.

### Cierre — completado 2026-05-16

- Cambios commiteados: 5 commits en `main` (`f95bf21`→`c04a4fe`).
- Proceso `dassa-sgi` (PM2 id 53) reiniciado por Santiago — `online`.
- Fix 🔴 H-01 **verificado en producción**: `/api/auditor/runs` y `/api/profiles/me`
  devuelven `application/json` HTTP 401. `/api/health` → 200.

**Workflow cerrado al 100%.**
