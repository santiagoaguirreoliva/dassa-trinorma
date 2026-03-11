# DASSA TRINORMA MANAGER

Sistema de Gestión Integrada — ISO 9001 · 14001 · 45001

---

## ⚡ Setup en 15 minutos

### PASO 1 — Crear proyecto Supabase

1. Ir a **https://supabase.com** → New Project
2. Nombre: `dassa-trinorma`
3. Contraseña DB: guardala (la vas a necesitar)
4. Región: `South America (São Paulo)` ← importante para latencia AR
5. Esperar ~2 min que se cree

---

### PASO 2 — Ejecutar el schema

1. En Supabase → **SQL Editor** → New Query
2. Abrir la migración `supabase/migrations/001_initial_schema.sql`
3. Copiar y pegar en el editor
4. Click **Run**
5. Repetir con `002_seed_data.sql`

---

### PASO 3 — Configurar variables de entorno

1. En Supabase → Settings → API
2. Copiar URL y anon key
3. Renombrar `.env.local.example` a `.env.local` y completar

---

## 📞 Stack

- React 18 + Vite + TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- TanStack React Query v5
- Recharts
- Vercel
