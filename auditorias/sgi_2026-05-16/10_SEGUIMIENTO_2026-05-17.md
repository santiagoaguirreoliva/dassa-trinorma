# 10 — Seguimiento · `sgi` (Trinorma) · 2026-05-17

**Origen**: Santiago pidió cerrar los hallazgos abiertos H-11 y H-12 del seguimiento `09_SEGUIMIENTO_2026-05-16.md` y desplegar el commit pendiente.

---

## Trabajo realizado

### ✅ Deploy del commit `b27cf24` (botón HOME)
El build de `dist/` (14:58) era anterior al commit `b27cf24` "Botón HOME al portal Smart DASSA Apps" (15:15) — el botón estaba en el código pero no en producción. `npm run build` + `pm2 restart dassa-sgi`. Verificado: home 200, health 200.

### ✅ H-11 — Performance de carga inicial
- `src/App.tsx`: las 44 páginas pasaron de import estático a `React.lazy()`. `Login` y el shell (`AppLayout`, `Spinner`) quedan estáticos — son la primera pantalla.
- `Suspense` global envolviendo `<Routes>` para las rutas públicas; `Suspense` sobre el `<Outlet/>` en `AppLayout` para que las páginas internas carguen manteniendo el sidebar visible.
- **Resultado del build**:

  | | Antes | Ahora |
  |---|---|---|
  | `index.js` (bundle inicial) | 497 KB / 103 KB gzip | **38 KB / 12 KB gzip** |
  | `recharts` en carga de login | sí (108 KB gzip) | **no** — chunk lazy |

  Cada página interna es ahora su propio chunk de 8–36 KB, descargado solo al navegar. La causa raíz del Lighthouse Performance 59 ("Reduce unused JavaScript — 4,2 s") queda atacada.

### ✅ H-12 — Accesibilidad de páginas públicas
`Login.tsx`, `PublicNC.tsx`, `PublicComm.tsx`:
- Landmark `<main>` en todas las vistas (incluidas las vistas `success` / `error` / `loading`).
- `aria-label` en botones-ícono sin nombre accesible: toggle de contraseña, quitar foto adjunta, spinner de carga.
- `aria-label` en el input de nombre y el textarea de feedback de `PublicComm` (solo tenían `placeholder`).
- Contraste: `text-gray-400 → text-gray-500` en textos secundarios (gray-400 sobre blanco = 2,5:1, falla el 4,5:1 de WCAG AA).
- Touch targets de íconos ampliados de ~15 px a contenedores de 36–40 px.

---

## Validaciones

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| `npm run lint --max-warnings 0` | ✅ 0 / 0 |
| `npm run build` | ✅ `index.js` 38 KB / 12 KB gzip |
| Health `/api/health` | ✅ HTTP 200 |
| `/api/profiles/me` (re-check H-01) | ✅ `application/json` HTTP 401 — no regresó |

## Pendiente

- **Lighthouse autenticado** contra `https://trinorma.dassa.com.ar` para certificar Performance ≥ 80 y Accessibility ≥ 90. La medición previa pegó la pantalla pública sin sesión — repetir post-deploy y, esta vez, también la app autenticada.

## Estado de hallazgos

| ID | Sev | Estado |
|---|---|---|
| H-01…H-10 | varios | ✅ Resueltos (ver `08_RECHECK.md`) |
| H-08 | 🟢 | ◑ Parcial — 2 vulns dev-only diferidas con fundamento |
| **H-11** | 🟠 | ✅ Resuelto — code-splitting por ruta |
| **H-12** | 🟠 | ✅ Resuelto — accesibilidad páginas públicas |

Sin hallazgos 🔴/🟠 abiertos. Resta la verificación Lighthouse post-deploy.
