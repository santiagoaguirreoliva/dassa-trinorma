# 02 — Plan de remediación priorizado · `sgi` (Trinorma)

**Fecha**: 2026-05-16
**Base**: 10 hallazgos de `01_DISCOVERY.md`
**Modo**: Master Workflow Light → fases F3 (seguridad/fixes) + F7 (pre-entrega) + F8 (re-check)

---

## Tabla priorizada

| ID | Sev | Hallazgo | Fase | Esfuerzo | Depende de |
|---|---|---|---|---|---|
| H-01 | 🔴 | `/api/auditor` y `/api/profiles` rotos en prod (mounting order) | F3 | XS | — |
| H-02 | 🟠 | Error handler centralizado mal posicionado | F3 | XS | H-01 (mismo archivo) |
| H-03 | 🟠 | `manifest.json` declara Supabase, la app usa Postgres | F3 | XS | — |
| H-04 | 🟠 | `/uploads` estático sin autenticación | F3 | S–M | decisión Santiago |
| H-05 | 🟡 | Carpeta basura `src/{components/…` | F7 | XS | — |
| H-06 | 🟡 | `/api/public` monta el findingsRouter completo | F3 | M | — |
| H-07 | 🟡 | Cambios sin commitear + `ecosystem.config.cjs` sin trackear | F7 | XS | todos (commit al final) |
| H-08 | 🟢 | 3 vulnerabilidades `moderate` dev-only | F7 | — | **diferir** |
| H-09 | 🟢 | Docs con path viejo `/home/dassa/dassa-sgi` | F7 | XS | — |
| H-10 | 🟢 | `saveBase64File` deriva extensión del mime-type | F3 | XS | — |

**Esfuerzo total estimado**: ~3–4 h activas (sin contar H-04 si se elige la opción proxy).

---

## Orden de ejecución

### Fase 3 — Hardening / fixes (skill `dassa-seguridad-confidencialidad`)

1. **H-01 + H-02 juntos** (`server/index.js`): mover el montaje de `/api/auditor` y `/api/profiles`
   antes del bloque `if (NODE_ENV === 'production')`, y mover el error handler `app.use((err…))`
   al final de todos los routers. Commit: `fix(server): orden de montaje de routers + error handler`.
2. **H-03** (`manifest.json`): corregir `stack` (quitar `supabase`) y `databases` (postgres real).
   Commit: `fix(manifest): declarar Postgres como DB real`.
3. **H-10** (`server/routes/findings.js`): whitelist de extensiones en `saveBase64File`
   (`jpg/jpeg/png/webp/pdf`). Commit: `security: whitelist de extensiones en upload base64`.
4. **H-04** (`server/index.js`): proteger `/uploads` — **requiere decisión** (ver abajo).
5. **H-06** (`server/routes/findings.js` + `index.js`): extraer `POST /nc` a un router
   `public-nc` mínimo y montar solo eso en `/api/public`. Commit: `refactor(api): router público dedicado para NC`.

### Fase 7 — Pre-entrega (skill `dassa-auditoria-pre-entrega`)

6. **H-05**: `rm -rf 'src/{components'`.
7. **H-09**: actualizar docs con el path nuevo.
8. **H-08**: documentar como diferido en el reporte.
9. **H-07**: commitear todo lo pendiente al final, agrupado por tipo.
10. Correr los 8 gates de entrega.

### Fase 8 — Re-check + Certificado

11. Verificar cada hallazgo H-01…H-10 resuelto y emitir certificado.

---

## Decisiones que requieren tu aprobación

**D-1 · ¿Cómo proteger `/uploads` (H-04)?**
Servir `/uploads` detrás de `authenticate` rompe los `<img src="/uploads/…">` directos del
frontend (el navegador no manda el header `Authorization` en una etiqueta `<img>`). Opciones:
- **(a)** Endpoint proxy `GET /api/findings/:id/photo` que valida auth y hace stream del archivo. Más prolijo, esfuerzo M.
- **(b)** Token de un solo uso en query string (`?t=…`). Esfuerzo S, menos limpio.
- **(c)** Dejar `/uploads` público pero con nombres de archivo no-predecibles (UUID en vez de timestamp). Esfuerzo XS, mitiga pero no cierra.
- **(d)** Diferir H-04 — aceptar el riesgo (las fotos de NC no son altamente sensibles).

**D-2 · H-06 (`/api/public` refactor)** — es 🟡 y esfuerzo M. ¿Lo incluimos en esta pasada o lo
diferimos a un próximo ciclo? No hay fuga de datos hoy, es higiene de arquitectura.

---

## Resumen para aprobación

> Plan listo: **10 hallazgos**, 1 🔴 + 3 🟠 + 3 🟡 + 3 🟢. Esfuerzo ~3–4 h.
> Los 🔴/🟠 (H-01 a H-04) se resuelven en Fase 3. Necesito tu decisión en **D-1** (cómo proteger
> `/uploads`) y **D-2** (incluir o diferir H-06). Con eso procedo con las correcciones.
