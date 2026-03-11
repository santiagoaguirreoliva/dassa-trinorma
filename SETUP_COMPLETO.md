# 🚀 DASSA Trinorma — Setup Completo

## PASO 1 — Supabase (5 min)

1. https://supabase.com -> New Project: `dassa-trinorma`
South America (Sao Paulo)
2. SQL Editor -> Run: 001_initial_schema.sql y 002_seed_data.sql
3. Settings -> API -> copiar URL y anon key

## PASO 2 — Environment

1. Renombrar `.env.local.example` -> `.env.local`
2. Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

## PASO 3 — Deploy Vercel

1. https://vercel.com -> Import repo
2. Agregar env vars
3. Deploy

## Usuarios

| Email | Rol |
|-------|-----|
| santiago@dassa.com.ar | master_admin |
| manuel@dassa.com.ar | sgi_leader |

Crear en Authentication > Users, luego asignar rol en tabla user_roles.