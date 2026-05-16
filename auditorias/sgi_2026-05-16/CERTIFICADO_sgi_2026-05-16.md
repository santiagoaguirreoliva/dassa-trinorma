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

## Condición de cierre — paso de deploy pendiente

El fix crítico H-01 está aplicado en el código pero **el proceso `dassa-sgi` no fue reiniciado**.
Para completar la entrega:

1. `pm2 restart dassa-sgi --update-env`
2. Verificar: `curl -s -w '%{content_type}' http://127.0.0.1:4001/api/auditor/runs` → debe
   responder `application/json` con HTTP 401 (antes del fix devolvía `text/html`).
3. Commitear los cambios de Fase 3 (H-07).

Próxima auditoría recomendada: **2026-08-14** (90 días desde la entrega base).

---

## Firma

- **Auditor IA**: Claude — skill `dassa-master-workflow` v1 (Light)
- **Aprobación**: Santiago Aguirre Oliva
- **Fecha de entrega al cliente**: __________
