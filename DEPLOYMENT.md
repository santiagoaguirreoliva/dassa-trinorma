# Guía de Despliegue — Trinorma Manager

## Inicio Rápido (Recomendado)

### Linux/Mac
```bash
cd /sessions/jolly-vigilant-pasteur/dassa-trinorma
chmod +x START.sh
./START.sh
```

### Windows (PowerShell)
```powershell
cd dassa-trinorma
npm install
npm run build
npm start
```

## Pasos Manuales

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Compilar Frontend
```bash
npm run build
```
Esto genera la carpeta `dist/` con el frontend compilado.

### 3. Iniciar Servidor
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Verificación de Instalación

1. Abre tu navegador en `http://localhost:3000`
2. Debería ver la página de login
3. Prueba con:
   - Email: `santiago@dassa.com.ar`
   - Contraseña: `Admin123!`

## Solución de Problemas

### Error: "sqlite3 not found"
SQLite3 necesita compilarse. Asegúrate de tener:
- Python 2.7+ instalado
- Build tools del sistema (gcc/clang en Mac/Linux, Visual Studio Build Tools en Windows)

Reintentar:
```bash
npm install --build-from-source
```

### Puerto 3000 está en uso
Cambiar el puerto:
```bash
PORT=3001 npm start
```

### Base de datos corrupta
Eliminar y recrear:
```bash
rm trinorma.db trinorma.db-shm trinorma.db-wal
npm start
```

## Desarrollo

Para desarrollo con hot reload:
```bash
npm run dev
```

Abre dos terminales:
- Terminal 1: `npm run dev` (frontend en `http://localhost:5173`)
- Terminal 2: `npm start` (backend en `http://localhost:3000`)

## Estructura de Archivos

```
dassa-trinorma/
├── dist/                    # Frontend compilado (generado con npm run build)
├── server/                  # Backend Express
│   ├── index.js            # Servidor principal
│   ├── db.js               # SQLite + seed
│   └── routes/             # Endpoints API
├── src/                    # Frontend React
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Router
│   ├── components/        # Componentes reutilizables
│   ├── lib/               # Auth y API client
│   └── pages/             # Páginas de la aplicación
├── trinorma.db            # Base de datos SQLite (creada automáticamente)
├── package.json           # Dependencias
├── tsconfig.json          # Configuración TypeScript
├── vite.config.ts         # Configuración Vite
└── tailwind.config.js     # Configuración Tailwind
```

## Configuración de Producción

Para desplegar en producción:

1. **Compilar optimizado:**
   ```bash
   npm run build
   ```

2. **Iniciar servidor:**
   ```bash
   PORT=3000 NODE_ENV=production npm start
   ```

3. **Usar un process manager (pm2):**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name "trinorma"
   pm2 startup
   pm2 save
   ```

## Respaldo de Datos

La base de datos es PostgreSQL (definida en `DATABASE_URL`). Para respaldo manual:

```bash
# Dump completo
pg_dump "$DATABASE_URL" > backups/dassa-sgi-$(date +%F).sql

# Restore
psql "$DATABASE_URL" < backups/dassa-sgi-YYYY-MM-DD.sql
```

En Railway, los backups automáticos están incluidos en el plan Pro (snapshots diarios con retención 7 días). Verificar desde el panel del proyecto Postgres.

### Rollback

1. Detener PM2: `pm2 stop dassa-sgi`
2. Volver al commit anterior: `git checkout <SHA-anterior>`
3. Reinstalar deps: `npm ci`
4. Rebuild: `npm run build`
5. Restaurar dump si hubo cambios de schema: `psql "$DATABASE_URL" < backups/dassa-sgi-<fecha-previa>.sql`
6. Reiniciar: `pm2 restart dassa-sgi`

## Usuarios Predeterminados

| Rol    | Email                      | Contraseña |
|--------|----------------------------|------------|
| Admin  | santiago@dassa.com.ar      | Admin123!  |
| Usuario| operaciones@dassa.com.ar   | User123!   |
| Auditor| auditor@dassa.com.ar       | Audit123!  |

Para agregar nuevos usuarios en producción:
1. Ingresar como admin
2. No hay interfaz de admin en v1 — modificar DB directamente o agregar endpoint

## Monitoreo

El servidor logea en consola. Para producción, usar:
```bash
npm install -g winston
# O redirigir logs a archivo:
npm start > app.log 2>&1 &
```

## Actualización

Para actualizar dependencias:
```bash
npm update
npm run build
npm start
```

## Soporte

Para problemas, contactar a Santiago García:
- Email: santiago@dassa.com.ar
- Teléfono: (interno DASSA)

## Notas Importantes

- **Sin conexión a internet**: La aplicación funciona completamente offline
- **Capacidad**: Diseñada para ~8 usuarios concurrentes
- **Respaldos**: Hacer respaldo de `trinorma.db` regularmente
- **Actualizaciones**: Compilar nuevamente después de actualizar código
