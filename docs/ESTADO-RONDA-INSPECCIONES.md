# ESTADO — Módulo "Ronda de Inspecciones" (Trinorma SGI)

> Última actualización: **2026-05-19** · Rama: `feature/sgi-ronda-inspecciones`
> Spec completo: `docs/SPEC-RONDA-INSPECCIONES.md`

## Qué es

Módulo nuevo en el SGI Trinorma (`dassa-sgi`, `/home/dassa/dassa4/apps/sgi`) que
digitaliza 5 formularios de inspección en papel, los dispara como tareas pendientes
según su frecuencia y los pone bajo supervisión de Triny AI. Motor genérico dirigido
por plantillas. Optimizado mobile vertical, con fotos, geofence y firma digital.

## Decisiones congeladas

- **Ingreso público de maquinaria**: QR por máquina + PIN de 4 dígitos por chofer.
- **SSHH** = ronda de Seguridad e Higiene laboral (FER = Fernando Ponzi).
- **Geolocalización**: geofence del predio DASSA — valida y marca `geo_inside`, NO bloquea.
- **Rondines de 2 personas**: tarea única con co-firma.
- **MVP congelado**: limpieza (F-TRI-23) + mantenimiento (F-TRI-20) + SSHH + maquinaria
  (F-TRI-19). Equipos críticos F-TRI-21/22 (trimestral/anual) = fase posterior.

## Responsables (mapeados a users del SGI)

| Formulario | Responsables | user_id |
|---|---|---|
| F-TRI-23 Limpieza (semanal) | María Delgado | `1d04e961-1ac3-4f45-b182-16b3c6c3dade` |
| F-TRI-20 Mantenimiento (semanal, co-firma) | María Delgado + Marcelo Stizza | `8c25332a-3151-49a4-b505-24996cf0ba7a` |
| SSHH Seguridad e Higiene (quincenal, co-firma) | Fernando Ponzi + María Delgado | `e98cdb50-a000-43d8-83a8-48b67f30fa9e` |
| F-TRI-19 Autoelevador (diaria, público) | Maquinistas con PIN | — |

## Progreso

| Fase | Estado | Detalle |
|---|---|---|
| **F0** Schema + seed | ✅ HECHO | Migraciones 039/040 aplicadas. 9 tablas `insp_*`, 4 plantillas, 91 ítems, responsables, 3 autoelevadores, geofence. |
| **F1** Backend `/api/inspections` | ✅ HECHO | `server/routes/inspections.js` montado. CRUD plantillas/máquinas/operadores, listado, stats, analytics, start/complete/cosign/finding. Probado. |
| **F2** Motor de recurrencia + cron | ✅ HECHO | `server/services/inspections-generator.js`, migración 041, cron diario 06:00, endpoint `POST /generate`. Probado: genera 6 instancias, idempotente. |
| **F3** UI rondines (mobile) | ⬜ PENDIENTE | Dashboard `/rondas`, ejecución `/rondas/:id`, co-firma, fotos, geo, firma. |
| **F4** Checklist maquinaria público | ⬜ PENDIENTE | Router público `/api/public/checklist`, página `/checklist-maquina` (QR+PIN+form), histórico `/rondas/maquinaria`. |
| **F5** Integración Triny | ⬜ PENDIENTE | Herramienta `consultar_rondas` en `sgi-agent.cjs` + sección en resumen semanal. |
| **F6** Indicadores + hardening + deploy | ⬜ PENDIENTE | KPIs ISO, pruebas mobile, deploy a producción. |

## Estado de la base de datos

- Migraciones 039/040/041 **aplicadas** en `dassa_sgi` (Postgres local).
- Tablas `insp_*` creadas y sembradas. **Sin datos de inspecciones** (los de prueba
  de F2 fueron borrados — no quedan tareas vivas porque la UI aún no existe).
- ⚠️ El cron NO generará nada hasta el deploy. Cuando se despliegue, correr una vez
  `POST /api/inspections/generate` o esperar al cron 06:00 para sembrar el período.

## Pendientes / cuidados

- ⚠️ **Geofence sin calibrar** (`insp_config.geofence_calibrated=false`). Tomar lat/lng
  reales en el predio DASSA y actualizar `geofence_lat/lng/radius_m`.
- ⚠️ **Ítems SSHH son borrador** — los compuse desde el dominio S&H. FER debe revisarlos
  y ajustarlos vía `PUT /api/inspections/templates/:id/items` o la UI de config (F3).
- Las **3 máquinas** (AE-01/02/03) son placeholder — cargar la flota real de
  autoelevadores en `/rondas/config`.
- El módulo **no está montado en el Sidebar ni el router del frontend** todavía (F3).

## Cómo probar (instancia temporal, sin tocar prod)

```bash
cd /home/dassa/dassa4/apps/sgi
# JWT de admin:
node --input-type=module -e "import 'dotenv/config';import pg from 'pg';import jwt from 'jsonwebtoken';import fs from 'fs';const p=new pg.Pool({connectionString:process.env.DATABASE_URL});const{rows}=await p.query(\"SELECT id FROM users WHERE role='director' AND is_active LIMIT 1\");fs.writeFileSync('/tmp/j.jwt',jwt.sign({userId:rows[0].id},process.env.JWT_SECRET,{expiresIn:'2h'}));await p.end()"
# server temporal en 4099:
PORT=4099 CRON_DISABLED=1 node server/index.js &
curl -s -H "Authorization: Bearer $(cat /tmp/j.jwt)" http://localhost:4099/api/inspections/templates
```

⚠️ La instancia temporal usa la **misma BD que producción**. `POST /generate` escribe
datos reales — limpiarlos después si es solo prueba.

## Archivos del módulo

```
docs/SPEC-RONDA-INSPECCIONES.md            spec completo (10 bloques)
docs/ESTADO-RONDA-INSPECCIONES.md          este archivo
server/db/migrations/039_ronda_inspecciones.sql           schema
server/db/migrations/040_ronda_inspecciones_seed.sql      seed
server/db/migrations/041_ronda_inspecciones_recurrencia.sql  índice + ajuste
server/routes/inspections.js               router autenticado (F1)
server/services/inspections-generator.js   motor de recurrencia (F2)
server/index.js                            router montado + cron registrado
```
