# DASSA SGI · Diseño Multi-Tenant (OLA 7)

## Estrategia elegida
**Shared schema con `tenant_id` column** (no schema-per-tenant, no database-per-tenant).

**Por qué:**
- 67 tablas existentes · cambiar a schema-per-tenant requiere DDL clonado y backup/restore más complejo
- Database-per-tenant tiene overhead operativo alto (47 DBs si tenés 47 clientes)
- Shared schema + index en tenant_id = performance comparable y operación simple
- Permite roll-out gradual: agregar `tenant_id` sin romper queries actuales

## Estado actual (post-Migration 021)
✅ Tabla `tenants` creada · DASSA pre-cargado
✅ 47 tablas con columna `tenant_id` (con default DASSA para todo lo existente)
✅ Indexes `idx_<tabla>_tenant` para performance
✅ View `v_tenant_stats` con métricas por tenant

## Lo que FALTA para activar multi-tenant real

### 1) Middleware tenant
Crear `server/middleware/tenant.js` que:
- Extrae `tenant_id` del JWT al loguearse
- Inyecta `req.tenant_id` en todos los requests
- Cada query agrega automáticamente `WHERE tenant_id = $current_tenant`

### 2) Refactor de queries (~210 endpoints)
Cada SELECT/INSERT/UPDATE necesita filtrar por tenant_id:
```sql
SELECT * FROM findings WHERE tenant_id = $1 AND ...
INSERT INTO findings (..., tenant_id) VALUES (..., $current_tenant)
```

### 3) Onboarding self-service
- Página pública `/signup-empresa`
- Wizard: nombre + industria + admin user
- Provisioning: crear tenant + admin user + cargar template de su industria

### 4) Templates por industria
Tablas `industry_templates` con:
- Fichas de puesto base
- Riesgos típicos del rubro
- Procedimientos modelo
- FODA de partida

Al crear tenant nuevo: COPY del template a sus tablas (con su nuevo tenant_id).

### 5) Pricing tiers
| Tier | Usuarios | Empleados | Features |
|---|---|---|---|
| Free | 1 | 5 | SGI base · sin IA |
| Pro | 10 | 50 | + IA agente · + comunicaciones · + BI |
| Enterprise | ∞ | ∞ | + multi-tenant · + SSO · + custom domain |

### 6) Subdomain por tenant
- `dassa.trinorma.app` → tenant DASSA
- `cliente2.trinorma.app` → tenant 2
- Whitelabel: cada uno tiene su logo + colores propios

### 7) Cron de billing
- Stripe/MercadoPago integración
- Métricas mensuales por tenant
- Bloqueos por impago

## Esfuerzo estimado
- Middleware + refactor queries: **3-4 semanas** (mucho cuidado)
- Onboarding + templates: **1-2 semanas**
- Subdomain + whitelabel: **1 semana**
- Billing: **1-2 semanas**
- **Total: ~7-9 semanas** de trabajo enfocado para producto vendible

## Roadmap sugerido
1. **Fase A** (esta migration) · BASE: tenants table + tenant_id columns ✅ HECHO
2. **Fase B** (cuando haya cliente potencial) · Middleware + refactor crítico de queries
3. **Fase C** (con cliente piloto firmado) · Onboarding + templates + UI multi-tenant
4. **Fase D** (post-piloto) · Subdomains + whitelabel + billing

## Cómo activar multi-tenant para un cliente
1. INSERT en `tenants` con su slug e info
2. Asignar features del plan en `tenants.features` JSONB
3. Crear admin user con `tenant_id` del nuevo cliente
4. (Eventualmente) copiar template de industria

Mientras tanto, DASSA seguirá usando el sistema sin cambios — todos los registros existentes ya tienen `tenant_id` = DASSA.
