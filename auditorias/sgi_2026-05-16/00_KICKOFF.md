# 00 — Kickoff · Master Workflow DASSA · `sgi` (Trinorma)

**Fecha**: 2026-05-16
**Director de Calidad**: Claude (skill `dassa-master-workflow` v1)
**Solicitado por**: Santiago Aguirre Oliva (santiago@dassa.com.ar)

---

## Inputs (Fase 0)

| Campo | Valor |
|---|---|
| `NOMBRE_SISTEMA` | DASSA SGI — Sistema de Gestión Integrado (Trinorma · ISO 9001 / 14001 / 45001) |
| `PATH_REPO` | `/home/dassa/dassa4/apps/sgi` |
| `URL_PRODUCCION` | https://trinorma.dassa.com.ar |
| `TIPO_SISTEMA` | Web app híbrida (React 18 + Vite SPA + API Express) |
| `USUARIOS` | Ambos — mobile (operativos) + desktop (director, líder SGI, auditor) |
| `URGENCIA` | Re-auditoría preventiva (no hay release pendiente urgente) |
| App key / tipo | `trinorma` · `child_app` de `smart-dassa-apps` (SSO ticket) |
| Proceso PM2 | `dassa-sgi` · puerto 4001 |
| Criticidad | `high` (manifest) |

## Stack confirmado

- **Frontend**: React 18.3 · Vite 5.4 · TypeScript 5.5 · Tailwind 3.4 · react-router 6 · TanStack Query 5 · Recharts
- **Backend**: Express 4 · `pg` (PostgreSQL directo, `pg.Pool`) · JWT · bcryptjs · helmet · express-rate-limit · node-cron · nodemailer
- **IA**: `@anthropic-ai/sdk` (agente SGI / Triny)
- **Auth**: SSO ticket vía app madre `smart-dassa-apps` (`/api/sso/consume`), sin login local

---

## Contexto: esta app YA fue auditada

`sgi` pasó el flujo de pre-entrega el **2026-05-14** (ver `ENTREGA_dassa-sgi-trinorma_2026-05-14.md`):
resultado 🟢 APROBADO, 5 bloqueantes 🔴 + 9 items 🟠 resueltos, 8/8 gates en ✅.
Los ~67 archivos que en ese momento estaban sin commitear **sí fueron commiteados** después
(git log 2026-05-14: `fix(security)`, `fix(types)`, `feat(brand)`, `feat(ux-*)`, `docs`).

## Alcance acordado — **Master Workflow Light**

Decidido con Santiago (2026-05-16): no se repite el flujo completo de 8 fases. Se corre la
variante **Light** del workflow + Discovery acotado al delta:

| Fase | Acción |
|---|---|
| F1 — Discovery acotado | Diagnóstico read-only enfocado en lo que cambió desde 2026-05-14 y verificación de hallazgos abiertos. Lo ejecuta Claude directamente (skill `super-auditor` no instalada). |
| F2 — Plan de remediación | Plan priorizado del delta. Requiere aprobación de Santiago. |
| F3 — Hardening Seguridad | `dassa-seguridad-confidencialidad`. |
| F4/F5/F6 — UX mobile/desktop/brand | **N/A** — cubiertas en la entrega del 2026-05-14. Se re-chequean solo si F1 encuentra regresiones. |
| F7 — Pre-Entrega | `dassa-auditoria-pre-entrega` — 8 gates. |
| F8 — Re-check + Certificado | Verificación final + certificado firmable. |

### Skills no instaladas
- `super-auditor` — Discovery lo asume Claude (read-only, mismo rigor).
- `dassa-tech-context` — contexto técnico derivado del repo y del manifest.

---

## Hallazgos preliminares (antes del Discovery formal)

| ID | Sev | Hallazgo |
|---|---|---|
| P-01 | 🟡 | Carpeta basura en `src/`: `src/{components/` contiene un subdir literal `{layout,ui,common,dashboard,findings},contexts,hooks,lib,pages}` — `mkdir` con brace expansion fallida (shell sin expansión de llaves). |
| P-02 | 🟠 | `manifest.json` declara `stack: [...,"supabase"]` y `databases: [{type:"supabase"}]`, pero el código real usa **PostgreSQL directo** (`pg`, dependencia `postgres-local`). Inconsistencia declarado vs. real. |
| P-03 | 🟡 | Cambios sin commitear: `manifest.json`, `knowledge-base/ingest.sh`, `server/scripts/amfe-seed-bg.cjs`; `ecosystem.config.cjs` sin trackear. |
| P-04 | 🟢 | `ENTREGA` previa apunta a path viejo `/home/dassa/dassa-sgi`; la app se migró a `/home/dassa/dassa4/apps/sgi` el 2026-05-15. Doc desactualizada. |

Estos se confirman y amplían en `01_DISCOVERY.md`.

## Pendientes heredados de la entrega 2026-05-14 (a verificar en F1)

1. Validar botón CSV + atajos de teclado en browser real.
2. Verificar app mobile en 375×667.
3. ~60 hex hardcoded restantes (paletas Tailwind semánticas — consolidables).
4. 3 vulnerabilidades `moderate` (esbuild/vite/postcss) sin resolver.
5. Lighthouse ≥ 80 contra producción.

---

## Carpeta de trabajo

```
/home/dassa/dassa4/apps/sgi/auditorias/sgi_2026-05-16/
├── 00_KICKOFF.md            ← este documento
├── 01_DISCOVERY.md
├── 02_PLAN_REMEDIACION.md
├── 03_SECURITY_FIXES.md
├── 07_ENTREGA_sgi_2026-05-16.md
├── 08_RECHECK.md
└── CERTIFICADO_sgi_2026-05-16.md
```

**Estado**: Fase 0 ✅ completada — alcance confirmado. Avanza a Fase 1 (Discovery acotado).
