# Trinorma Manager — Sistema de Gestión Integrado (SGI)

Sistema completo de gestión para la certificación ISO 9001 (Calidad), ISO 14001 (Gestión Ambiental) e ISO 45001 (Seguridad y Salud en el Trabajo) de DASSA.

## Características

- **Dashboard**: Visión general con KPIs
- **Sistema de Gestión**: Misión, visión, valores y políticas
- **Documentos ISO**: CRUD con auto-código (P-TRI-XX, I-TRI-XX)
- **Incidentes y Accidentes**: Registro con severidad y estados
- **Aspectos Ambientales**: Matriz F×S×D para significancia
- **Satisfacción del Cliente**: Cálculo automático de NPS
- **Gestión de Empleados**: Directorio con departamentos
- **Capacitaciones**: Planificación y seguimiento
- **Autenticación**: JWT con roles (admin, usuario, auditor)
- **Base de datos**: SQLite con 20 tablas

## Requisitos

- Node.js 16+
- npm o yarn

## Instalación y Ejecución

### Opción 1: Ejecución Rápida (Recomendado)

```bash
cd dassa-trinorma
npm install
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3000`

### Opción 2: Desarrollo

Para desarrollo con hot reload:

```bash
cd dassa-trinorma
npm install
npm run dev
```

El frontend estará en `http://localhost:5173`
El backend en `http://localhost:3000`

## Cuentas de Prueba

| Rol    | Email                          | Contraseña |
|--------|--------------------------------|------------|
| Admin  | santiago@dassa.com.ar          | Admin123!  |
| Usuario| operaciones@dassa.com.ar       | User123!   |
| Auditor| auditor@dassa.com.ar           | Audit123!  |

## Estructura del Proyecto

```
dassa-trinorma/
├── server/
│   ├── index.js              # Express app principal
│   ├── db.js                 # SQLite setup y seed
│   ├── middleware/
│   │   └── auth.js           # JWT auth
│   └── routes/               # API endpoints
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router y componentes
│   ├── lib/
│   │   ├── api.ts            # API client
│   │   └── auth.tsx          # Auth context
│   ├── components/           # UI components
│   └── pages/                # Page components
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── index.html
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Ingresar
- `POST /api/auth/register` - Registrar
- `GET /api/auth/me` - Datos del usuario

### Recursos
- `/api/sistema-gestion` - Sistema de Gestión
- `/api/documents` - Documentos ISO
- `/api/incidents` - Incidentes
- `/api/environmental` - Aspectos Ambientales
- `/api/satisfaction` - Satisfacción del Cliente
- `/api/employees` - Empleados
- `/api/trainings` - Capacitaciones

## Tecnologías

**Frontend:**
- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide Icons

**Backend:**
- Express.js
- SQLite (better-sqlite3)
- JWT
- bcryptjs

## Base de Datos

La base de datos SQLite (`trinorma.db`) se crea automáticamente en la primera ejecución con:
- 20 tablas
- Datos de prueba (usuarios, documentos, incidentes, aspectos, etc.)
- Relaciones y constraints

## Configuración

Variables de entorno (opcional):
- `PORT`: Puerto del servidor (default: 3000)
- `JWT_SECRET`: Clave secreta JWT (auto-generada si no se proporciona)

## Notas

- El frontend compilado se sirve desde Express como archivos estáticos
- Todos los datos están en SQLite local
- No requiere servicios externos
- Compatible con ~8 usuarios concurrentes
- Interfaz completamente en español (argentino)

## Licencia

DASSA — 2026
