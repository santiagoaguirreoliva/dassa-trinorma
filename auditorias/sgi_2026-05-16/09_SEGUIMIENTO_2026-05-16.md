# 09 — Seguimiento post-certificado · `sgi` (Trinorma)

**Fecha**: 2026-05-16 (misma jornada, posterior al certificado)
**Origen**: Santiago pidió "arreglar todo lo que se pueda" de los pendientes listados al cierre.

---

## Trabajo realizado

### ✅ Color de marca DASSA — discrepancia resuelta

El código usaba **`#BE1E2D`** (rojo) y **`#5BBFCC`** (celeste). Verificado contra
`dassa-design-system` (fuente autoritativa): los oficiales son **`#BF1E2E`** y **`#5BBDC9`**.
La pasada de brand del 2026-05-14 había tomado valores equivocados.
- Corregidas 8 ocurrencias de rojo + 4 de celeste en 7 archivos (`tailwind.config.js`,
  `charts.tsx`, `Dashboard.tsx`, `Committee.tsx`, `MisPendientes.tsx`, `NovedadesAdmin.tsx`,
  `ErrorBoundary.tsx`). El navy `#0F1A4A` ya era correcto.
- Commit `11669aa`.

### ✅ H-06 — namespace `/api/public` desacoplado

- Nuevo `server/services/uploads.js`: `saveBase64File` extraído como utilidad compartida.
- Nuevo `server/routes/public-nc.js`: router público con solo `POST /nc`.
- `findings.js`: ya no define la ruta pública ni la utilidad; importa de `services/uploads.js`.
- `index.js`: `/api/public` ahora monta `publicNcRouter` (antes el `findingsRouter` completo).
- Commit `101079b`. Build/typecheck/lint limpios.

### ✅ H-08 — parcialmente resuelto

- **postcss** actualizado a 8.5.14 vía `npm audit fix` (sin breaking change) — resuelve la vuln
  GHSA-qx2v-qp2m-jg93. Commit `5c0bb15`.
- **esbuild/vite** (2 vulns restantes): **diferidas con fundamento**. El único fix es
  `npm audit fix --force` → instala **Vite 8** (hoy Vite 5.4 — salto de 3 versiones mayores),
  con alto riesgo de romper build/plugins. La vulnerabilidad de esbuild (GHSA-67mh-4wv8-2f99)
  afecta **solo al dev server**, no al runtime de producción. Riesgo real en prod: nulo.
- Resultado: **3 vulns → 2** (ambas dev-only).

---

## Hallazgos NUEVOS detectados por Lighthouse

Lighthouse corrió contra `https://trinorma.dassa.com.ar` **sin sesión** — midió la página de
**Login / pública**, no la app autenticada.

| Categoría | Score | Umbral DASSA |
|---|---|---|
| Performance | 59 | ≥ 80 ❌ |
| Accessibility | 75 | ≥ 90 ❌ |
| Best Practices | 100 | — ✓ |
| SEO | 83 | — |

### H-11 🟠 — Performance de carga inicial baja (59)
- FCP / LCP / Speed Index: **7,4 s** (TBT 0 ms y CLS 0 — esos sí están bien).
- Causa: la SPA descarga ~900 KB de JS (incluido el chunk `recharts` de 400 KB) **antes de
  pintar nada**, incluso para mostrar el login. Oportunidad principal de Lighthouse:
  "Reduce unused JavaScript" — 4,2 s.
- **Recomendación**: code-splitting por ruta (`React.lazy` + `Suspense`) para que Login y las
  pantallas sin gráficos no carguen `recharts` ni el resto de páginas. Es un refactor con
  medición iterativa — **amerita una pasada dedicada**, no un fix puntual.

### H-12 🟠 — Accesibilidad de la página pública baja (75)
Fallos de Lighthouse en la pantalla de Login:
- Botones sin nombre accesible (íconos sin `aria-label`).
- Contraste de color insuficiente en algún texto/fondo.
- Falta landmark `<main>` en la página pública (la app interna `AppLayout` sí lo tiene).
- Touch targets por debajo del tamaño mínimo.
- **Recomendación**: pasada de accesibilidad sobre `Login.tsx` y páginas públicas
  (`PublicNC.tsx`, `PublicComm.tsx`) — `aria-label` en botones-ícono, `<main>`, revisar
  contraste contra tokens DASSA, agrandar targets a 44×44.

---

## Estado de despliegue

⚠️ Los cambios de este seguimiento (brand, H-06, postcss) están **commiteados y buildeados**
pero **no desplegados**. Para activarlos: `pm2 restart dassa-sgi` y verificar que
`POST /api/public/nc` siga funcionando (router nuevo).

## Resumen actualizado de hallazgos

| ID | Sev | Estado |
|---|---|---|
| H-01…H-05, H-07, H-09, H-10 | varios | ✅ Resueltos (ver `08_RECHECK.md`) |
| H-06 | 🟡 | ✅ Resuelto (antes diferido) |
| H-08 | 🟢 | ◑ Parcial — postcss resuelto; 2 vulns dev-only diferidas con fundamento |
| **H-11** | 🟠 | ⏳ Nuevo — performance carga inicial, requiere pasada dedicada |
| **H-12** | 🟠 | ⏳ Nuevo — accesibilidad página pública, requiere pasada dedicada |

El certificado `🟢 APROBADO` se mantiene: H-11 y H-12 son de la pantalla pública pre-login y
no afectan la operación del SGI ni la seguridad. Se recomiendan como próximo ciclo de mejora.
