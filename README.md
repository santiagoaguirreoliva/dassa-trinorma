# DASSA SGI — Sistema de Gestión Integrado
## ISO 9001 · ISO 14001 · ISO 45001

---

## SETUP LOCAL (10 minutos)

### 1. Instalar dependencias

```bash
cd dassa-sgi
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dassa_sgi
JWT_SECRET=genera_un_secret_largo_aqui
```

**Generar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Crear la base de datos PostgreSQL

**Opción A — PostgreSQL local:**
```bash
createdb dassa_sgi
psql dassa_sgi -f server/db/schema.sql
psql dassa_sgi -f server/db/seed.sql
```

**Opción B — Railway (recomendado para producción):**
- Crear proyecto en railway.app
- Agregar servicio PostgreSQL
- Copiar DATABASE_URL al .env
- Ejecutar los SQL desde el panel de Railway o via `psql`

### 4. Generar contraseñas reales para los usuarios seed

Los usuarios del seed tienen `placeholder_hash_change_me` como hash.
Ejecutar este script para generar los hashes reales:

```bash
node -e "
const bcrypt = require('bcryptjs');
const password = 'Dassa2026!';
bcrypt.hash(password, 10).then(h => {
  console.log('Hash para contraseña Dassa2026!:');
  console.log(h);
  console.log('\nSQL para actualizar:');
  console.log(\"UPDATE users SET password_hash = '\" + h + \"';\");
});
"
```

Luego ejecutar el SQL resultante en la base de datos.

### 5. Correr en desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### 6. Login

| Usuario | Email | Contraseña |
|---------|-------|------------|
| Santiago (Admin) | santiago@dassa.com.ar | Dassa2026! |
| Manuel (SGI) | manuel@dassa.com.ar | Dassa2026! |
| María (RRHH) | maria@dassa.com.ar | Dassa2026! |
| Fernando (HyS) | fernando@dassa.com.ar | Dassa2026! |
| Christian (Ops) | christian@dassa.com.ar | Dassa2026! |
| NIXA (Auditor) | nixa@nixa.com.ar | Dassa2026! |

---

## SUBIR A GITHUB

```bash
# 1. Inicializar git (si no está inicializado)
git init

# 2. Agregar todos los archivos
git add .

# 3. Primer commit
git commit -m "feat: DASSA SGI Phase 1 — base completa"

# 4. Conectar al repo de GitHub
# Opción A: reemplazar el repo actual (dassa-trinorma)
git remote add origin https://github.com/santiagoaguirreoliva/dassa-trinorma.git
git push --force origin main

# Opción B: nuevo repo
# Crear repo en github.com, luego:
git remote add origin https://github.com/santiagoaguirreoliva/dassa-sgi.git
git push -u origin main
```

---

## DEPLOY EN RAILWAY

1. Ir a railway.app → New Project → Deploy from GitHub
2. Seleccionar el repositorio
3. Agregar servicio PostgreSQL al proyecto
4. En Variables de entorno agregar:
   - `DATABASE_URL` → Railway lo completa automáticamente
   - `JWT_SECRET` → el que generaste
   - `NODE_ENV` → `production`
   - `CORS_ORIGIN` → la URL de tu app en Railway
5. El deploy arranca solo

**Importante:** Después del primer deploy, ejecutar el schema en la DB de Railway:
```bash
# Con railway CLI:
railway run psql $DATABASE_URL -f server/db/schema.sql
railway run psql $DATABASE_URL -f server/db/seed.sql
```

---

## ESTRUCTURA DEL PROYECTO

```
dassa-sgi/
├── server/
│   ├── index.js              # Express app
│   ├── db/
│   │   ├── db.js             # Pool PostgreSQL
│   │   ├── schema.sql        # 31 tablas completas
│   │   └── seed.sql          # Datos reales DASSA
│   ├── middleware/
│   │   └── auth.js           # JWT + roles
│   └── routes/
│       ├── auth.js           # Login, me, change-password
│       ├── dashboard.js      # Stats, tareas, calendario
│       ├── findings.js       # NC CRUD + acciones + comentarios
│       └── misc.js           # Users, risks, legal, tasks
├── src/
│   ├── App.tsx               # Router
│   ├── main.tsx
│   ├── index.css
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth + roles
│   ├── hooks/                # (próxima fase)
│   ├── lib/
│   │   └── api.ts            # Fetch wrapper tipado
│   ├── components/
│   │   ├── layout/           # AppLayout, Sidebar, Header
│   │   └── ui/               # KPICard, Badge, Avatar, etc.
│   └── pages/
│       ├── Login.tsx
│       ├── Dashboard.tsx     # Dashboard completo con gráficos
│       └── [otros módulos]   # Stubs listos para implementar
├── railway.json
├── nixpacks.toml
├── package.json
├── vite.config.ts
└── .env.example
```

---

## MÓDULOS IMPLEMENTADOS EN FASE 1

- ✅ Auth (login, JWT, 8 roles)
- ✅ Dashboard ejecutivo con KPIs reales
- ✅ Schema completo (31 tablas, triggers, auto-códigos)
- ✅ Seed data real (30 riesgos F-TRI-42, 10 req. legales, FODA)
- ✅ API REST: auth, dashboard, findings, users, risks, legal, tasks
- ✅ Sidebar con navegación completa
- ✅ Stubs para todos los módulos restantes
- ✅ Deploy Railway ready

## PRÓXIMA FASE

- Findings Kanban (6 columnas drag & drop)
- Comité Mixto + IA extrae tareas
- Capacitaciones + calendario + emails
