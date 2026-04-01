# API Documentation — Trinorma Manager

## Base URL
```
http://localhost:3000/api
```

## Autenticación
Todos los endpoints (excepto `/auth/login` y `/auth/register`) requieren:
```
Authorization: Bearer <token>
```

El token se obtiene al iniciar sesión y expira en 24 horas.

---

## Autenticación (`/auth`)

### POST `/auth/login`
Iniciar sesión
```json
Request:
{
  "email": "santiago@dassa.com.ar",
  "password": "Admin123!"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "santiago@dassa.com.ar",
    "name": "Santiago García",
    "role": "admin"
  }
}
```

### POST `/auth/register`
Crear nueva cuenta
```json
Request:
{
  "email": "nuevo@dassa.com.ar",
  "password": "Password123!",
  "name": "Nuevo Usuario"
}

Response:
{
  "token": "...",
  "user": { ... }
}
```

### GET `/auth/me`
Obtener datos del usuario actual
```
Headers: Authorization: Bearer <token>

Response:
{
  "id": 1,
  "email": "santiago@dassa.com.ar",
  "name": "Santiago García",
  "role": "admin"
}
```

---

## Sistema de Gestión (`/sistema-gestion`)

### GET `/sistema-gestion`
Obtener todas las secciones
```json
Response:
{
  "mision": "Garantizar la excelencia...",
  "vision": "Ser el depósito fiscal líder...",
  "valores": "Integridad, Seguridad...",
  "politica_calidad": "...",
  "politica_gestion": "..."
}
```

### GET `/sistema-gestion/:section`
Obtener una sección específica
```
Secciones: mision, vision, valores, politica_calidad, politica_gestion

Response:
{
  "id": 1,
  "section": "mision",
  "content": "Garantizar la excelencia...",
  "updated_at": "2026-03-31T12:00:00",
  "updated_by": 1
}
```

### PUT `/sistema-gestion/:section`
Actualizar una sección
```json
Request:
{
  "content": "Nuevo contenido de la misión"
}

Response: (object actualizado)
```

---

## Documentos ISO (`/documents`)

### GET `/documents`
Listar documentos con filtros opcionales
```
Parámetros query:
  - search: "procedimiento" (busca en título y código)
  - type: "procedimiento|instruccion|registro|manual"
  - norma: "ISO 9001|ISO 14001|ISO 45001|MIXTO"
  - status: "vigente|borrador|en_revision|obsoleto"

Response:
[
  {
    "id": 1,
    "code": "P-TRI-001",
    "title": "Procedimiento de Gestión de Depósito Fiscal",
    "type": "procedimiento",
    "norma": "ISO 9001",
    "version": 2,
    "status": "vigente",
    "review_date": "2026-04-15",
    "created_at": "2026-01-01T10:00:00"
  },
  ...
]
```

### POST `/documents`
Crear nuevo documento
```json
Request:
{
  "title": "Nuevo Procedimiento",
  "type": "procedimiento",
  "norma": "ISO 9001",
  "status": "borrador",
  "review_date": "2026-04-15"
}

Response: (documento creado con código auto-generado)
```

### PUT `/documents/:id`
Actualizar documento
```json
Request:
{
  "title": "Título Actualizado",
  "status": "vigente",
  "version": 3
}
```

### DELETE `/documents/:id`
Eliminar documento

---

## Incidentes (`/incidents`)

### GET `/incidents`
Listar incidentes
```
Parámetros query:
  - search: búsqueda en descripción y área
  - type: "incidente|accidente"
  - status: "abierto|en_investigacion|cerrado"
  - severity: "leve|moderado|grave|muy_grave"
```

### POST `/incidents`
Registrar nuevo incidente
```json
Request:
{
  "type": "incidente",
  "date": "2026-03-31",
  "area": "Operaciones",
  "severity": "leve",
  "status": "abierto",
  "description": "Derrame de agua en zona de almacenaje",
  "corrective_action": "Limpiar y revisar..."
}

Response:
{
  "id": 5,
  "code": "INC-003",
  "type": "incidente",
  "date": "2026-03-31",
  ...
}
```

### PUT `/incidents/:id`
Actualizar incidente

### DELETE `/incidents/:id`
Eliminar incidente

---

## Aspectos Ambientales (`/environmental`)

### GET `/environmental`
Listar aspectos ambientales

### POST `/environmental`
Crear nuevo aspecto
```json
Request:
{
  "aspect": "Emisiones al aire",
  "activity": "Operación de equipos",
  "impact": "Contaminación del aire",
  "frequency": 3,
  "severity": 2,
  "detection": 3,
  "control_measure": "Filtros instalados"
}

Response:
{
  "id": 1,
  "aspect": "Emisiones al aire",
  "significance": 18,
  "is_significant": false
}
```

Nota: Significancia = Frecuencia × Severidad × Detección
Si > 36 = significativo

### PUT `/environmental/:id`
Actualizar aspecto

### DELETE `/environmental/:id`
Eliminar aspecto

---

## Satisfacción del Cliente (`/satisfaction`)

### GET `/satisfaction`
Obtener encuestas y KPIs
```json
Response:
{
  "surveys": [
    {
      "id": 1,
      "customer_name": "Transportes López S.A.",
      "date": "2026-03-01",
      "rating": 9,
      "comments": "Excelente servicio",
      "category": "Servicio"
    }
  ],
  "nps": 75,
  "total_surveys": 5,
  "average_rating": 8.6
}
```

### POST `/satisfaction`
Crear encuesta
```json
Request:
{
  "customer_name": "Nuevo Cliente",
  "date": "2026-03-31",
  "rating": 8,
  "comments": "Buen servicio",
  "category": "Servicio"
}
```

### PUT `/satisfaction/:id`
Actualizar encuesta

### DELETE `/satisfaction/:id`
Eliminar encuesta

---

## Empleados (`/employees`)

### GET `/employees`
Listar empleados
```
Parámetros query:
  - search: búsqueda en nombre, apellido, número
  - department: filtrar por departamento
  - status: "activo|inactivo"
```

### POST `/employees`
Crear empleado
```json
Request:
{
  "employee_number": "E001",
  "first_name": "Carlos",
  "last_name": "Rodríguez",
  "position": "Jefe de Operaciones",
  "department": "Operaciones",
  "email": "carlos.rodriguez@dassa.com.ar",
  "status": "activo"
}
```

### PUT `/employees/:id`
Actualizar empleado

### DELETE `/employees/:id`
Eliminar empleado

---

## Capacitaciones (`/trainings`)

### GET `/trainings`
Listar capacitaciones
```
Parámetros query:
  - status: "planificada|en_curso|completada|cancelada"
  - type: "induccion|capacitacion|simulacro|auditoria"
  - department: filtrar por departamento
```

### POST `/trainings`
Crear capacitación
```json
Request:
{
  "title": "Seguridad en Operaciones",
  "type": "capacitacion",
  "date": "2026-04-10",
  "duration_hours": 2,
  "instructor": "Daniela Fernández",
  "status": "planificada",
  "department": "Operaciones",
  "max_participants": 15
}
```

### PUT `/trainings/:id`
Actualizar capacitación

### DELETE `/trainings/:id`
Eliminar capacitación

### POST `/trainings/:id/employees`
Agregar empleado a capacitación
```json
Request:
{
  "employee_id": 3,
  "attendance": true,
  "score": 85
}
```

### PUT `/trainings/:id/employees/:empId`
Actualizar asistencia/calificación

### DELETE `/trainings/:id/employees/:empId`
Remover empleado de capacitación

---

## Códigos de Error

| Código | Mensaje | Significado |
|--------|---------|-------------|
| 400    | Bad Request | Datos inválidos o incompletos |
| 401    | Unauthorized | Token no proporcionado o inválido |
| 403    | Forbidden | Acceso denegado |
| 404    | Not Found | Recurso no existe |
| 500    | Internal Server Error | Error del servidor |

---

## Formato de Respuestas

### Éxito (2xx)
```json
{
  "id": 1,
  "campo": "valor"
}
```

### Error
```json
{
  "error": "Descripción del error"
}
```

---

## Roles y Permisos

| Rol    | GET | POST | PUT | DELETE |
|--------|-----|------|-----|--------|
| admin  | ✓   | ✓    | ✓   | ✓      |
| usuario| ✓   | ✓    | ✓   | ✓      |
| auditor| ✓   | ✗    | ✗   | ✗      |

---

## Ejemplos con cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"santiago@dassa.com.ar","password":"Admin123!"}'
```

### Obtener documentos
```bash
curl -X GET http://localhost:3000/api/documents \
  -H "Authorization: Bearer <token>"
```

### Crear documento
```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title":"Nuevo Procedimiento",
    "type":"procedimiento",
    "norma":"ISO 9001"
  }'
```
