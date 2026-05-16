# Certificado de Calidad DASSA

**Sistema**: DASSA SGI — Sistema de Gestión Integrado (Trinorma · ISO 9001 / 14001 / 45001)
**App**: `dassa-sgi` · child app de `smart-dassa-apps` (SSO ticket)
**Versión base**: commit `984b862` + fixes Fase 3 sin commitear al momento de certificar
**Fecha**: 2026-05-16
**Tipo**: re-auditoría Light (entrega previa certificada 2026-05-14)

---

Este sistema fue auditado siguiendo el **Master Workflow DASSA** (variante Light) y cumple
con los estándares de:

- **Seguridad y confidencialidad** (Fase 3) — 1 hallazgo crítico + 3 altos resueltos.
- **UX Mobile / Desktop** (Fases 5-6) — heredado y verificado de la entrega 2026-05-14.
- **Identidad visual de marca DASSA** (Fase 7) — Montserrat, formato `es-AR`, tokens severity.
- **Gates de entrega** (Fase 7) — 8/8 gates en ✅.

**Todos los hallazgos críticos (🔴) y altos (🟠) del diagnóstico fueron resueltos:**

| ID | Sev | Hallazgo | Estado |
|---|---|---|---|
| H-01 | 🔴 | `/api/auditor` y `/api/profiles` rotos en producción (mounting order) | ✅ Resuelto |
| H-02 | 🟠 | Error handler centralizado mal posicionado | ✅ Resuelto |
| H-03 | 🟠 | `manifest.json` declaraba Supabase en vez de Postgres | ✅ Resuelto |
| H-04 | 🟠 | `/uploads` sin autenticación (URLs enumerables) | ✅ Resuelto |

## Hallazgos diferidos (acordados con cliente)

- **H-06** 🟡 — Refactor del namespace `/api/public` (extraer router público dedicado). Sin
  riesgo activo de datos; programado para el próximo ciclo de mantenimiento.
- **H-08** 🟢 — 3 vulnerabilidades `moderate` en dependencias de desarrollo
  (esbuild/vite/postcss). No afectan el runtime de producción; requieren un major bump de Vite.

## Cierre — completado 2026-05-16

- ✅ Cambios commiteados: 5 commits en `main` (`f95bf21` → `c04a4fe`).
- ✅ Proceso `dassa-sgi` (PM2 id 53) reiniciado — `online`.
- ✅ Fix crítico H-01 **verificado en producción**: `/api/auditor/runs` y `/api/profiles/me`
  devuelven `application/json` HTTP 401 (antes devolvían `text/html`). `/api/health` → 200.

El sistema queda con la entrega completa y el fix crítico activo en producción.

Próxima auditoría recomendada: **2026-08-14** (90 días desde la entrega base).

---

## Firma

- **Auditor IA**: Claude — skill `dassa-master-workflow` v1 (Light)
- **Aprobación**: Santiago Aguirre Oliva
- **Fecha de entrega al cliente**: __________
