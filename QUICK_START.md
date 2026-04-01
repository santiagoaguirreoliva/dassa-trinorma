# Inicio Rápido — Trinorma Manager

## En 3 pasos

### 1. Ir a la carpeta
```bash
cd /sessions/jolly-vigilant-pasteur/dassa-trinorma
```

### 2. Ejecutar el script (Linux/Mac)
```bash
./START.sh
```

### 2b. Alternativa (Windows o sin permisos)
```bash
npm install
npm run build
npm start
```

### 3. Abrir en navegador
```
http://localhost:3000
```

---

## Login

**Email:** `santiago@dassa.com.ar`  
**Contraseña:** `Admin123!`

---

## Usuarios de Prueba

| Rol    | Email | Contraseña |
|--------|-------|-----------|
| Admin | santiago@dassa.com.ar | Admin123! |
| Usuario | operaciones@dassa.com.ar | User123! |
| Auditor | auditor@dassa.com.ar | Audit123! |

---

## Menú Principal

Después de ingresar verás:

- **ESTRATEGIA** → Dashboard
- **SISTEMA DE GESTIÓN** → Misión, Visión, Valores, Políticas
- **SGI TRINORMA** → Documentos, Incidentes, Aspectos Ambientales, etc.
- **OPERACIONES** → Compras
- **CAPITAL HUMANO** → Empleados, Capacitaciones

---

## Funciones Principales

### Documentos
- Crear procedimientos, instrucciones, manuales
- Auto-código P-TRI-001, I-TRI-002, etc.
- Versioning automático
- Filtrar por tipo, norma, estado

### Incidentes
- Registrar incidentes y accidentes
- Seguimiento de estados
- Severidad: Leve → Muy Grave
- Auto-investigación y acciones correctivas

### Aspectos Ambientales
- Matriz F × S × D automática
- Cálculo de significancia
- Medidas de control

### Satisfacción
- Encuestas de clientes
- Cálculo automático de NPS
- Análisis de categorías (Promotor/Pasivo/Detractor)

### Empleados
- Directorio completo
- Departamentos y puestos
- Búsqueda rápida

### Capacitaciones
- Calendario de entrenamientos
- Seguimiento de asistencia
- Certificados

---

## Archivos Importantes

- **README.md** - Documentación general
- **API.md** - Guía de endpoints
- **DEPLOYMENT.md** - Cómo desplegar en producción
- **TECHNICAL_SUMMARY.txt** - Resumen técnico

---

## Problemas Comunes

### "Puerto 3000 en uso"
```bash
PORT=3001 npm start
```

### "Error sqlite3"
```bash
npm install --build-from-source
npm start
```

### "Base de datos corrupta"
```bash
rm trinorma.db trinorma.db-*
npm start
```

---

## Desarrollo

Con hot reload (cambios en vivo):

**Terminal 1:** `npm run dev` (puerto 5173)  
**Terminal 2:** `npm start` (puerto 3000)

---

## Atajos de Teclado

- `Ctrl+C` - Detener servidor
- `Ctrl+Shift+I` - DevTools del navegador
- `Ctrl+F5` - Refrescar (limpiar cache)

---

## Contacto

Santiago García  
santiago@dassa.com.ar

---

**¡Listo! La aplicación está completamente funcional y lista para usar.**
