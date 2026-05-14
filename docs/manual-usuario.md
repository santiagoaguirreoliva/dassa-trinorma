# DASSA SGI Trinorma — Manual de Usuario

> Sistema de Gestión Integrado para DASSA — Calidad ISO 9001 · Ambiental 14001 · Seguridad y Salud 45001.

---

## 1. Acceder al sistema

- **URL**: `https://trinorma.dassa.com.ar`
- **Login**: usar el email DASSA. La primera vez vas a recibir una contraseña temporal por mail.
- **Reset de password**: en pantalla de login, "¿Olvidaste tu contraseña?" → te llega un link al mail por 24 h.

**Roles disponibles**: Master Admin · Director · Líder SGI · Operaciones · RRHH · Seguridad e Higiene · Auditor Externo.
Cada rol ve un menú distinto y tiene permisos distintos. Si te falta acceso a algo, pedíselo a un Master Admin.

---

## 2. Navegación

### En el celular (mobile, operativos en patio)
- **Barra inferior**: NCs · Compras · Tareas · Menú. Para todo lo demás, tocá **Menú** y elegí.
- Las acciones rápidas están como botones grandes; minimizamos formularios largos.

### En la PC (desktop, supervisores y administración)
- **Sidebar izquierda**: módulos agrupados por proceso (Sistema · Gestión · Personas · Ambiente · Reportes).
- **Top bar**: campana de alertas + tu perfil.

---

## 3. Módulos principales

### 📌 Mis Pendientes (`/mis-pendientes`)
Listado de **todas las tareas y reuniones donde figurás** como responsable o asistente. Prioridades: Urgente (rojo) · Alta · Media · Baja. Click en una tarea abre el panel lateral con detalles y acciones (completar, comentar, derivar).

### 🚨 No Conformidades / Hallazgos (`/hallazgos`)
- **Crear NC**: cualquier usuario puede reportar. Cargar título, descripción, tipo (NC real / desvío / oportunidad / mejora), área, fecha límite y responsable.
- **Análisis de causa**: 5 porqués · Ishikawa · narrativa.
- **Acciones correctivas**: derivadas de cada NC, con responsable y fecha.
- **Cierre**: requiere firma del SGI Leader.

### 🛒 Compras (`/compras`)
- **Solicitar**: cualquier usuario carga una solicitud (con foto, URL del producto, presupuesto estimado).
- **Autorizar**: Director o SGI Leader la aprueba o rechaza con motivo.
- **Ejecutar**: Administración carga factura, fecha y monto real.
- **Recibir**: el solicitante confirma la recepción.

### 📋 Reuniones de Comité (`/comite`)
Wizard de 3 pasos para acta de comité:
1. **Agenda** — temas a tratar.
2. **Asistentes** — registro de asistencia + firmas.
3. **Cierre** — minuta + tareas derivadas (entran automáticamente a `/mis-pendientes` de los responsables).

### 🎓 Capacitaciones (`/capacitaciones`)
- Programar curso · invitar participantes (internos + externos por DNI).
- Subir evidencia (PDF, fotos, F-TRI-36 firmado).
- El sistema cuenta participantes confirmados, asistencias y evidencias.

### 🌿 Aspectos Ambientales (`/ambiente`)
Matriz de aspectos e impactos con cálculo de significancia (S, F, A) → color automático.

### ⚠️ Riesgos AMFE (`/riesgos-amfe`)
Análisis Modal de Fallas y Efectos. Cálculo de NPR (Severidad × Ocurrencia × Detección) → escalas y prioridades.

### 📅 Calendario NIXA (`/calendario`)
Validaciones anuales obligatorias (legales, capacitaciones, simulacros). Firma digital por validador.

### 🤖 TRINY (`/triny`)
Agente IA conversacional para consultas rápidas:
- "¿Quién tiene NCs vencidas?"
- "Resumen del comité de mayo."
- "Crear hallazgo en sector Operaciones."

### 🔍 Auditor IA (`/auditor`)
Auditoría automatizada de cumplimiento. Solo Master Admin puede correr una auditoría completa (consume saldo de API).

---

## 4. Acciones comunes

| Tarea | Cómo |
|---|---|
| Reportar una NC | Hallazgos → "Nueva NC" |
| Buscar una tarea propia | Mis Pendientes → filtros por prioridad/estado |
| Firmar un pacto pendiente | Te aparece automáticamente en `/bienvenida` |
| Cambiar tu password | Mi Perfil → tab Seguridad |
| Exportar acta de comité | (próximamente — pedir manual al SGI Leader) |
| Recibir intimación por NC vencida | TRINY te manda mail automático todos los días a las 10 h |

---

## 5. Notificaciones

El sistema te manda mail en estos casos:
- Tareas nuevas asignadas a vos.
- Recordatorio de pendientes los lunes a las 8 h.
- Resumen semanal los viernes a las 16 h.
- Informe mensual el primer día del mes a las 9 h.
- Intimación diaria si tenés NCs vencidas (10 h).

Si querés desactivar alguna notificación, hablalo con el SGI Leader.

---

## 6. Soporte y problemas

| Caso | Contacto |
|---|---|
| No puedo loguear / olvidé password | Reset en login + esperar 24 h, o pedir a Master Admin |
| El sistema está caído | Avisar a Santiago Aguirre Oliva (santiago@dassa.com.ar) |
| Necesito un permiso extra | Master Admin (Santi) o tu SGI Leader |
| Error técnico (pantalla blanca, etc.) | Tomar screenshot + describir qué hacías → mail a santi |

---

**Versión del manual**: 1.0 · 2026-05-14
**Versión del sistema**: ver `/api/health` o pie de la página
