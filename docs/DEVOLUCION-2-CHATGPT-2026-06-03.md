# DASSA · 2da Devolución para ChatGPT · 2026-06-03

## 🎯 Resumen

Hola ChatGPT. Tu devolución anterior (`DASSA_FICHAS_PUESTO_MASTER_v2026`, 24 secciones, 8091 líneas) fue **excelente y ya está 100% cargada en la base de datos productiva del sistema Trinorma** (BD `dassa_sgi`, app `trinorma.dassa.com.ar`).

Sin embargo, al cruzar tu devolución con los requisitos de auditoría ISO 9001/14001/45001 y con el marco legal argentino (Ley 19587/72 + Decreto 351/79 + Res. SRT 905/15), **detectamos 8 gaps** que necesitamos que cierres en una segunda devolución.

Te pasamos:
1. **El estado actual exacto de la BD** (qué quedó cargado por ficha).
2. **Los 8 gaps específicos por ficha**.
3. **Los formatos esperados de devolución** (campo por campo).

---

## 📊 Estado actual en BD (Master DASSA v2026 aplicado)

- **25 fichas activas** (incluye 2 nuevas: Analista de Datos/Procesos/IA + Responsable Comercial)
- **86 capacitaciones codificadas** CAP-001..CAP-189 (Master + 1 custom CAP-070)
- **86 códigos únicos** distribuidos por familia (Transversal/SySO/Operativa/Maquinistas/Comex/Admin/Comercial/Liderazgo/SGI/Tech-IA)
- **12 puestos críticos** marcados
- **24 matrices de sucesión** con nivel A/B/C/D
- **35 personas asignadas** (incluye Nixa Méndez como Consultora Externa SGI y Toti como Mantenimiento Externo — datos completos pendientes)
- **6 sesiones multi-cap** anuales 2026 con 44 items
- **7 agentes RR.AI** (TRINY/SINCRO/FICO deployados o en desarrollo + EJECUTIVO/AG_COMERCIAL/AG_RRHH/AG_TECH planeados)

---

## 🚨 Los 8 gaps que necesitamos cerrar

### Gap #1 — Matriz O/R/OP/NA × 86 caps × 25 puestos (COMPLETA)

Lo que entregaste fue: lista por puesto de sus O (Obligatorias) y R (Recomendadas). Lo que **falta**: matriz explícita 25 × 86 = **2150 combinaciones** con cada una clasificada O/R/OP/NA.

**Por qué es importante:** auditoría externa pregunta «¿por qué Maquinista NO tiene CAP-120 Ventas Consultivas?» — el sistema debería poder responder «NA · no aplica a perfil operativo de planta». Sin esto queda implícito y el auditor lo marca como observación.

**Formato esperado de devolución:** tabla con 4 columnas → Puesto | Código CAP | Categoría (O / R / OP / NA) | Justificación breve (1 línea citando cláusula ISO cuando aplica).

**Sugerencia:** podés agrupar por puesto y devolver solo los códigos que NO son NA (los NA quedan implícitos por exclusión). Pero los OP (opcionales) sí deben explicitarse.

---

### Gap #2 — Relación con ISO 9001/14001/45001 por ficha (20 fichas faltantes)

Solo 5 fichas tienen redactada la relación con las 3 normas. **Faltan 20**.

**Fichas pendientes en BD:**

- **Directora SGI (Consultora Externa)** (Dirección) — falta: 9001, 14001, 45001
- **Representante Legal y Técnica** (Dirección) — falta: 9001, 14001, 45001
- **Gerente de Operaciones** (Operaciones) — falta: 9001, 14001, 45001
- **Mantenimiento (Externo)** (Operaciones) — falta: 9001, 14001, 45001
- **Administrativo de Exportación** (Coordinación) — falta: 9001, 14001, 45001
- **Administrativo de Importación** (Coordinación) — falta: 9001, 14001, 45001
- **Administrativo de Tráfico** (Coordinación) — falta: 9001, 14001, 45001
- **Personal de Puerto** (Coordinación IMPO) — falta: 9001, 14001, 45001
- **Administración General / RRHH** (Administración) — falta: 9001, 14001, 45001
- **Facturación · Cobranzas · Asistente Dirección** (Administración) — falta: 9001, 14001, 45001
- **Responsable Comercial** (Comercial) — falta: 9001, 14001, 45001
- **Analista de Datos, Procesos e Inteligencia Artificial** (Tecnología) — falta: 9001, 14001, 45001
- **Responsable de Tecnología** (Tecnología) — falta: 9001, 14001, 45001
- **Apuntador / Controlador de Cargas** (Depósito) — falta: 9001, 14001, 45001
- **Balancero** (Depósito) — falta: 9001, 14001, 45001
- **Maestranza** (Depósito) — falta: 9001, 14001, 45001
- **Maquinista** (Depósito) — falta: 9001, 14001, 45001
- **Maquinista Containera** (Depósito) — falta: 9001, 14001, 45001
- **Operario de Carga y Descarga** (Depósito) — falta: 9001, 14001, 45001
- **Plazoletero** (Depósito) — falta: 9001, 14001, 45001
- **Supervisor de Depósito** (Depósito) — falta: 9001, 14001, 45001


**Formato esperado:** por cada puesto, 3 párrafos cortos (uno por norma) con la relación específica del puesto a esa norma. Si es posible, **citar la cláusula** (ej. «ISO 9001 §7.2 Competencia — define los criterios de competencia para el puesto», «ISO 45001 §6.1 Identificación de peligros — el puesto detecta y reporta peligros operativos diarios»).

---

### Gap #3 — Cláusulas ISO específicas citadas en cada relación

Tu devolución usa lenguaje genérico («Promueve la seguridad y la mejora continua»). Para auditoría formal **deberíamos citar la cláusula explícita** de cada norma.

**Cláusulas más relevantes a citar:**

- **ISO 9001:2015**: §5 Liderazgo · §5.1.2 Enfoque al cliente · §6.1 Riesgos y oportunidades · §6.2 Objetivos de calidad · §7.1.6 Conocimientos · §7.2 Competencia · §7.3 Toma de conciencia · §8.4 Compras · §9.1 Seguimiento y medición · §10.2 No conformidad y acción correctiva
- **ISO 14001:2015**: §6.1.2 Aspectos ambientales · §6.1.3 Requisitos legales · §7.2 Competencia · §7.3 Toma de conciencia · §8.1 Planificación y control operacional · §8.2 Preparación y respuesta ante emergencias · §10.2 No conformidad y acción correctiva
- **ISO 45001:2018**: §5.4 Consulta y participación de los trabajadores · §6.1.2 Identificación de peligros · §6.1.3 Determinación de requisitos legales · §7.2 Competencia · §7.3 Toma de conciencia · §8.1.2 Eliminar peligros y reducir riesgos para la SST · §8.1.3 Gestión del cambio · §8.2 Preparación y respuesta ante emergencias

**Devolución esperada:** misma redacción de Relación ISO pero terminando cada párrafo con «(ISO XXXXX §X.X.X)».

---

### Gap #4 — Brechas vs marco legal argentino (Ley 19587/72 + Decreto 351/79 + Res. SRT 905/15)

En tu sección «Brechas Detectadas» pusiste solo los headers (ISO 9001 / 14001 / 45001 / RRHH / Tecnología) **sin contenido**. Necesitamos un análisis específico:

**¿Qué capacitaciones del catálogo CAP-XXX falta o son insuficientes para cumplir?**

- **Ley 19587/72** (Higiene y Seguridad en el Trabajo)
- **Decreto 351/79** (reglamento Ley 19587)
- **Resolución SRT 905/2015** (Servicios de Higiene y Seguridad)
- **Resolución SRT 1068/2014** (RAR — Relevamiento Anual de Riesgos)
- **Resolución SRT 463/2009** (Examen Médico Preocupacional)
- **Decreto 658/96** (listado de enfermedades profesionales)
- **Ley 24557** (Riesgos del Trabajo) — capacitación obligatoria por puesto
- **Ley 25212** (Pacto Federal del Trabajo)
- Marco MERCOSUR para depósito fiscal (Decreto 1001/82 + Resoluciones AFIP)

**Formato esperado:** tabla con columnas → Norma legal | Cláusula | Capacitación CAP-XXX que cumple | Brecha (¿qué falta?) | Urgencia.

Si detectás capacitaciones que **deberíamos agregar al catálogo CAP-XXX** porque no existen, listalas en una sección final con: Título · Familia · Norma legal que cubre · Audiencia (puestos) · Periodicidad · Fundamento legal.

---

### Gap #5 — Frecuencia explícita en TODOS los KPIs

Muchos KPIs tienen Meta pero les falta **Frecuencia** (mensual/trimestral/semestral/anual).

**KPIs sin frecuencia en BD:**


- **Directora SGI (Consultora Externa)**:
  - Cumplimiento Programa Auditorías · Meta: `100%` · Frecuencia: ⚠ vacía
  - No Conformidades Cerradas · Meta: `95%` · Frecuencia: ⚠ vacía
  - Documentación Actualizada · Meta: `100%` · Frecuencia: ⚠ vacía
- **Representante Legal y Técnica**:
  - Habilitaciones Vigentes · Meta: `100%` · Frecuencia: ⚠ vacía
  - Incumplimientos Legales · Meta: `0` · Frecuencia: ⚠ vacía
  - Tiempo de Respuesta Organismos · Meta: `\< 5 días` · Frecuencia: ⚠ vacía
- **Gerente de Operaciones**:
  - Operaciones sin Reclamos · Meta: `≥ 98%` · Frecuencia: ⚠ vacía
  - Cumplimiento de Turnos · Meta: `≥ 95%` · Frecuencia: ⚠ vacía
  - Productividad Operativa · Meta: `Objetivo mensual` · Frecuencia: ⚠ vacía
- **Mantenimiento (Externo)**:
  - Mantenimientos Ejecutados · Meta: `100%` · Frecuencia: ⚠ vacía
  - Tiempo de Respuesta · Meta: `\< 48 hs` · Frecuencia: ⚠ vacía
  - Reincidencia de Fallas · Meta: `\< 5%` · Frecuencia: ⚠ vacía
- **Administrativo de Exportación**:
  - Operaciones Documentadas sin Error · Meta: `≥ 99%` · Frecuencia: ⚠ vacía
  - Tiempo de Respuesta al Cliente · Meta: `\< 2 horas` · Frecuencia: ⚠ vacía
  - Cumplimiento de Turnos Expo · Meta: `≥ 95%` · Frecuencia: ⚠ vacía
- **Administrativo de Importación**:
  - Operaciones Documentadas sin Error · Meta: `≥ 99%` · Frecuencia: ⚠ vacía
  - Tiempo de Respuesta al Cliente · Meta: `\< 2 horas` · Frecuencia: ⚠ vacía
  - Cumplimiento de Turnos Impo · Meta: `≥ 95%` · Frecuencia: ⚠ vacía
- **Administrativo de Tráfico**:
  - Coordinaciones Exitosas · Meta: `≥ 98%` · Frecuencia: ⚠ vacía
  - Tiempo de Asignación de Transporte · Meta: `Objetivo interno` · Frecuencia: ⚠ vacía
  - Incidentes de Tráfico · Meta: `0` · Frecuencia: ⚠ vacía
- **Personal de Puerto**:
  - Gestiones Completadas · Meta: `≥ 98%` · Frecuencia: ⚠ vacía
  - Errores Documentales · Meta: `0` · Frecuencia: ⚠ vacía
  - Tiempo de Gestión · Meta: `Objetivo interno` · Frecuencia: ⚠ vacía
- **Facturación · Cobranzas · Asistente Dirección**:
  - Facturas Emitidas en Término · Meta: `100%` · Frecuencia: ⚠ vacía
  - Errores de Facturación · Meta: `0` · Frecuencia: ⚠ vacía
  - Cobranza en Plazo · Meta: `≥ 95%` · Frecuencia: ⚠ vacía
- **Responsable de Tecnología**:
  - Disponibilidad de Sistemas · Meta: `99%` · Frecuencia: ⚠ vacía
  - Incidentes Resueltos · Meta: `95%` · Frecuencia: ⚠ vacía
  - Proyectos Tecnológicos Implementados · Meta: `Objetivo anual` · Frecuencia: ⚠ vacía
- **Balancero**:
  - Diferencias de Inventario · Meta: `0` · Frecuencia: ⚠ vacía
  - Pesajes Correctos · Meta: `100%` · Frecuencia: ⚠ vacía
  - Registros Completos · Meta: `100%` · Frecuencia: ⚠ vacía
- **Maestranza**:
  - Cumplimiento Plan de Limpieza · Meta: `100%` · Frecuencia: ⚠ vacía
  - Observaciones de Orden y Limpieza · Meta: `0 críticas` · Frecuencia: ⚠ vacía
  - Cumplimiento de Frecuencia · Meta: `100%` · Frecuencia: ⚠ vacía
- **Maquinista**:
  - Accidentes Operativos · Meta: `0` · Frecuencia: ⚠ vacía
  - Checklist Completados · Meta: `100%` · Frecuencia: ⚠ vacía
  - Movimientos Ejecutados · Meta: `Objetivo mensual` · Frecuencia: ⚠ vacía
- **Maquinista Containera**:
  - Accidentes Operativos · Meta: `0` · Frecuencia: ⚠ vacía
  - Checklist Completados · Meta: `100%` · Frecuencia: ⚠ vacía
  - Movimientos de Contenedores · Meta: `Objetivo mensual` · Frecuencia: ⚠ vacía
- **Operario de Carga y Descarga**:
  - Daños de Mercadería · Meta: `0` · Frecuencia: ⚠ vacía
  - Cumplimiento de Procedimientos · Meta: `100%` · Frecuencia: ⚠ vacía
  - Productividad Operativa · Meta: `Objetivo mensual` · Frecuencia: ⚠ vacía
- **Supervisor de Depósito**:
  - Operaciones sin Reclamos · Meta: `≥ 98%` · Frecuencia: ⚠ vacía
  - Productividad Operativa · Meta: `Objetivo mensual` · Frecuencia: ⚠ vacía
  - Cumplimiento de Procedimientos · Meta: `100%` · Frecuencia: ⚠ vacía


**Total KPIs sin frecuencia: 48**

**Formato esperado:** por cada KPI listado, agregar la frecuencia que corresponda (mensual/trimestral/semestral/anual) **con justificación breve** (1 línea: «Mensual porque la operación se mide mes calendario en el cierre comercial»).

---

### Gap #6 — Objetivos del Puesto faltantes

Fichas que NO tienen sección «Objetivos del Puesto» en BD:


- **Directora SGI (Consultora Externa)** (Dirección)
- **Representante Legal y Técnica** (Dirección)
- **Administrativo de Exportación** (Coordinación)
- **Administrativo de Importación** (Coordinación)
- **Administrativo de Tráfico** (Coordinación)
- **Personal de Puerto** (Coordinación IMPO)
- **Administración General / RRHH** (Administración)
- **Responsable SySO** (Seguridad e Higiene)


**Formato esperado:** por cada puesto faltante, 3-5 objetivos cualitativos (no KPIs — los KPIs ya están). Ejemplo para Maquinista: «Operar equipos con cero incidentes», «Optimizar tiempos de carga/descarga», «Reportar fallas tempranamente».

---

### Gap #7 — Autoridad / Registros Asociados / Riesgos del Puesto en operativos

Tu devolución llenó estas secciones bien en directivos/gerenciales, pero las dejó vacías en operativos y administrativos.

**Fichas con estos 3 campos vacíos:**


- **Directora SGI (Consultora Externa)** — faltan: Autoridad, Registros, Riesgos del puesto
- **Representante Legal y Técnica** — faltan: Autoridad, Registros, Riesgos del puesto
- **Gerente de Operaciones** — faltan: Autoridad
- **Mantenimiento (Externo)** — faltan: Autoridad
- **Administrativo de Exportación** — faltan: Autoridad, Registros, Riesgos del puesto
- **Administrativo de Importación** — faltan: Autoridad, Registros, Riesgos del puesto
- **Administrativo de Tráfico** — faltan: Autoridad, Registros, Riesgos del puesto
- **Personal de Puerto** — faltan: Autoridad, Registros, Riesgos del puesto
- **Administración General / RRHH** — faltan: Autoridad, Registros, Riesgos del puesto
- **Facturación · Cobranzas · Asistente Dirección** — faltan: Autoridad
- **Responsable Comercial** — faltan: Autoridad, Registros, Riesgos del puesto
- **Responsable SySO** — faltan: Autoridad, Registros, Riesgos del puesto
- **Analista de Datos, Procesos e Inteligencia Artificial** — faltan: Autoridad, Registros, Riesgos del puesto
- **Responsable de Tecnología** — faltan: Autoridad
- **Apuntador / Controlador de Cargas** — faltan: Autoridad, Registros, Riesgos del puesto
- **Balancero** — faltan: Autoridad
- **Maestranza** — faltan: Autoridad
- **Maquinista** — faltan: Autoridad
- **Maquinista Containera** — faltan: Autoridad
- **Operario de Carga y Descarga** — faltan: Autoridad
- **Plazoletero** — faltan: Autoridad, Registros
- **Supervisor de Depósito** — faltan: Autoridad


**Formato esperado por cada uno:**

- **Autoridad** (3-7 bullets): qué puede aprobar/decidir/firmar este puesto sin escalar (ej. Apuntador: «Autorizar ingreso de cargas previamente coordinadas», «Registrar y firmar guías de remitos»).
- **Registros Asociados** (4-8 bullets): qué planillas, fotos, firmas, mails o sistemas genera (ej. Maquinista: «Checklist diario de máquina», «Reportes de incidentes», «Bitácora de movimientos»).
- **Riesgos del Puesto** (3-6 bullets): riesgos operativos cotidianos del puesto (NO la matriz AMFE, sino los riesgos que el ocupante enfrenta día a día). Ej. Operario: «Esfuerzos físicos por manipulación de cargas», «Golpes por caída de objetos», «Exposición a sustancias químicas».

---

### Gap #8 — Plazoletero + Mantenimiento Externo · fichas completas

En tu devolución no hiciste ficha de **Plazoletero** ni **Mantenimiento Externo** en la sección 06 (solo aparecen en matrices). Las completamos manualmente con lo que pudimos rescatar de otras secciones del documento, pero necesitamos las fichas formales completas:

- **Plazoletero**: titular Franco Di Dio · área Depósito · seniority junior. Faltan: Misión completa · Responsabilidades completas (mínimo 6) · Autoridad · Competencias técnicas + blandas · Capacitación Obligatoria + Recomendada · 3 KPIs · Objetivos · Registros · Riesgos · RR.AI Asociado · Relación con las 3 normas ISO.

- **Mantenimiento Externo**: proveedor «Toti» · área Operaciones · seniority externo. Faltan los mismos campos.

**Formato esperado:** ficha completa estilo el resto de las 23 (las mismas secciones que armaste para Maquinista o Balancero).

---

## 📋 ESTADO ACTUAL EXACTO POR FICHA (para referencia)

Para que tu segunda pasada no rompa lo que ya está bien, te paso el estado actual de cada ficha en BD:


### 1/25 · Directora SGI (Consultora Externa) · Dirección

- **Seniority**: director
- **Crítico**: sí · **Banda autonomía**: 4
- **RR.AI principal**: TRINY · Secundarios: Ejecutivo

**Misión actual**: Diseñar, mantener, auditar y mejorar el Sistema Integrado de Gestión de DASSA asegurando conformidad con ISO 9001, ISO 14001 e ISO 45001\.

**Caps Obligatorias (8)**: CAP-160, CAP-161, CAP-162, CAP-163, CAP-164, CAP-165, CAP-166, CAP-167

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Cumplimiento Programa Auditorías · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - No Conformidades Cerradas · Meta: `95%` · Frecuencia: `⚠ FALTA`
  - Documentación Actualizada · Meta: `100%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 2/25 · Director General / Líder SGI · Dirección

- **Seniority**: triunvirato
- **Crítico**: sí · **Banda autonomía**: 5
- **RR.AI principal**: Ejecutivo · Secundarios: TRINY, SINCRO, FICO

**Misión actual**: Liderar estratégicamente el desarrollo de DASSA asegurando la sustentabilidad del negocio, la eficacia del Sistema Integrado de Gestión, la mejora continua de los procesos, la transformación digital de la organización y el cumplimiento de los objetivos estratégicos definidos por la Dirección.

Actua…

**Caps Obligatorias (16)**: CAP-001, CAP-002, CAP-003, CAP-004, CAP-005, CAP-007, CAP-009, CAP-140, CAP-143, CAP-160, CAP-161, CAP-164, CAP-180, CAP-184, CAP-185, CAP-189

**Caps Recomendadas (5)**: CAP-181, CAP-182, CAP-183, CAP-186, CAP-187

**KPIs (3)**:
  - Cumplimiento Objetivos Estratégicos · Meta: `≥ 85 %` · Frecuencia: `Trimestral`
  - Cumplimiento Programa SGI · Meta: `≥ 90 %` · Frecuencia: `Mensual`
  - Proyectos de Mejora Implementados · Meta: `≥ 12 anuales` · Frecuencia: `Mensual`


---

### 3/25 · Representante Legal y Técnica · Dirección

- **Seniority**: triunvirato
- **Crítico**: no · **Banda autonomía**: 4
- **RR.AI principal**: TRINY · Secundarios: Ejecutivo

**Misión actual**: Garantizar la representación técnica y legal de DASSA ante organismos competentes, asegurando el cumplimiento de requisitos regulatorios, habilitaciones y autorizaciones necesarias para la operación.

**Caps Obligatorias (7)**: CAP-001, CAP-002, CAP-003, CAP-160, CAP-161, CAP-165, CAP-166

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Habilitaciones Vigentes · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Incumplimientos Legales · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Tiempo de Respuesta Organismos · Meta: `\< 5 días` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 4/25 · CEO / Gerente General · Gerencia

- **Seniority**: triunvirato
- **Crítico**: sí · **Banda autonomía**: 5
- **RR.AI principal**: Ejecutivo · Secundarios: FICO, TRINY, SINCRO

**Misión actual**: Dirigir la gestión integral de DASSA, asegurando la rentabilidad del negocio, la continuidad operativa, el crecimiento comercial, la satisfacción del cliente, el cumplimiento legal y la correcta ejecución de la estrategia empresarial definida por la Dirección.

**Caps Obligatorias (13)**: CAP-001, CAP-002, CAP-003, CAP-004, CAP-005, CAP-007, CAP-009, CAP-120, CAP-121, CAP-124, CAP-140, CAP-144, CAP-161

**Caps Recomendadas (7)**: CAP-123, CAP-125, CAP-126, CAP-127, CAP-180, CAP-184, CAP-185

**KPIs (3)**:
  - Facturación Total · Meta: `Presupuesto anual definido por Dirección` · Frecuencia: `Mensual`
  - EBITDA Operativo · Meta: `Objetivo anual definido por Dirección` · Frecuencia: `Mensual`
  - Satisfacción General de Clientes · Meta: `≥ 90 %` · Frecuencia: `Trimestral`


---

### 5/25 · Gerente de Operaciones · Operaciones

- **Seniority**: gerente
- **Crítico**: sí · **Banda autonomía**: 4
- **RR.AI principal**: SINCRO · Secundarios: TRINY, Ejecutivo

**Misión actual**: Planificar, coordinar y controlar las operaciones de DASSA garantizando eficiencia, productividad, calidad de servicio, seguridad y cumplimiento de los requisitos legales y del cliente.

**Caps Obligatorias (14)**: CAP-001, CAP-002, CAP-003, CAP-004, CAP-020, CAP-040, CAP-041, CAP-042, CAP-044, CAP-048, CAP-049, CAP-140, CAP-141, CAP-145

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Operaciones sin Reclamos · Meta: `≥ 98%` · Frecuencia: `⚠ FALTA`
  - Cumplimiento de Turnos · Meta: `≥ 95%` · Frecuencia: `⚠ FALTA`
  - Productividad Operativa · Meta: `Objetivo mensual` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 6/25 · Mantenimiento (Externo) · Operaciones

- **Seniority**: externo
- **Crítico**: no · **Banda autonomía**: 1
- **RR.AI principal**: SINCRO · Secundarios: Agente Tecnología

**Misión actual**: Ejecutar actividades de mantenimiento preventivo, correctivo y predictivo sobre instalaciones, equipos e infraestructura de DASSA, garantizando disponibilidad, seguridad y continuidad operativa.

**Caps Obligatorias (7)**: CAP-020, CAP-022, CAP-023, CAP-024, CAP-025, CAP-026, CAP-027

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Mantenimientos Ejecutados · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Tiempo de Respuesta · Meta: `\< 48 hs` · Frecuencia: `⚠ FALTA`
  - Reincidencia de Fallas · Meta: `\< 5%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 7/25 · Administrativo de Exportación · Coordinación

- **Seniority**: semi
- **Crítico**: sí · **Banda autonomía**: 3
- **RR.AI principal**: SINCRO · Secundarios: FICO

**Misión actual**: Coordinar y administrar las operaciones de exportación garantizando el cumplimiento documental, operativo y aduanero, asegurando una comunicación efectiva con clientes, despachantes, transportistas y organismos intervinientes.

**Caps Obligatorias (9)**: CAP-001, CAP-004, CAP-009, CAP-080, CAP-081, CAP-082, CAP-084, CAP-085, CAP-087

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Operaciones Documentadas sin Error · Meta: `≥ 99%` · Frecuencia: `⚠ FALTA`
  - Tiempo de Respuesta al Cliente · Meta: `\< 2 horas` · Frecuencia: `⚠ FALTA`
  - Cumplimiento de Turnos Expo · Meta: `≥ 95%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 8/25 · Administrativo de Importación · Coordinación

- **Seniority**: semi
- **Crítico**: sí · **Banda autonomía**: 3
- **RR.AI principal**: SINCRO · Secundarios: FICO

**Misión actual**: Coordinar y administrar las operaciones de importación asegurando la correcta gestión documental, operativa y aduanera, garantizando eficiencia, trazabilidad y satisfacción del cliente.

**Caps Obligatorias (9)**: CAP-001, CAP-004, CAP-009, CAP-080, CAP-081, CAP-082, CAP-084, CAP-085, CAP-087

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Operaciones Documentadas sin Error · Meta: `≥ 99%` · Frecuencia: `⚠ FALTA`
  - Tiempo de Respuesta al Cliente · Meta: `\< 2 horas` · Frecuencia: `⚠ FALTA`
  - Cumplimiento de Turnos Impo · Meta: `≥ 95%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 9/25 · Administrativo de Tráfico · Coordinación

- **Seniority**: semi
- **Crítico**: no · **Banda autonomía**: 3
- **RR.AI principal**: SINCRO

**Misión actual**: Planificar y coordinar los recursos de transporte asociados a las operaciones de DASSA, asegurando disponibilidad, cumplimiento de plazos y utilización eficiente de recursos.

**Caps Obligatorias (7)**: CAP-001, CAP-004, CAP-009, CAP-084, CAP-085, CAP-086, CAP-087

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Coordinaciones Exitosas · Meta: `≥ 98%` · Frecuencia: `⚠ FALTA`
  - Tiempo de Asignación de Transporte · Meta: `Objetivo interno` · Frecuencia: `⚠ FALTA`
  - Incidentes de Tráfico · Meta: `0` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 10/25 · Personal de Puerto · Coordinación IMPO

- **Seniority**: junior
- **Crítico**: no · **Banda autonomía**: 3
- **RR.AI principal**: SINCRO

**Misión actual**: Representar operativamente a DASSA en terminales portuarias y organismos vinculados, gestionando documentación, coordinaciones y trámites necesarios para garantizar la correcta ejecución de las operaciones.

**Caps Obligatorias (7)**: CAP-001, CAP-004, CAP-020, CAP-040, CAP-042, CAP-044, CAP-086

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Gestiones Completadas · Meta: `≥ 98%` · Frecuencia: `⚠ FALTA`
  - Errores Documentales · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Tiempo de Gestión · Meta: `Objetivo interno` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 11/25 · Administración General / RRHH · Administración

- **Seniority**: responsable
- **Crítico**: no · **Banda autonomía**: 4
- **RR.AI principal**: FICO · Secundarios: TRINY

**Misión actual**: Gestionar la administración general de DASSA y los recursos humanos asegurando la correcta administración de personal, el cumplimiento legal laboral, la gestión documental y el desarrollo de las personas.

**Caps Obligatorias (7)**: CAP-001, CAP-009, CAP-102, CAP-103, CAP-105, CAP-140, CAP-142

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Capacitaciones Ejecutadas · Meta: `≥ 90%` · Frecuencia: `mensual`
  - Documentación Laboral Vigente · Meta: `100%` · Frecuencia: `mensual`
  - Ausentismo · Meta: `Objetivo anual` · Frecuencia: `mensual`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto

---

### 12/25 · Facturación · Cobranzas · Asistente Dirección · Administración

- **Seniority**: semi
- **Crítico**: no · **Banda autonomía**: 2
- **RR.AI principal**: FICO · Secundarios: Ejecutivo

**Misión actual**: Gestionar los procesos de facturación y cobranzas garantizando exactitud, oportunidad y trazabilidad de la información económica vinculada a los servicios prestados por DASSA.

**Caps Obligatorias (6)**: CAP-001, CAP-009, CAP-100, CAP-101, CAP-103, CAP-104

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Facturas Emitidas en Término · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Errores de Facturación · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Cobranza en Plazo · Meta: `≥ 95%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 13/25 · Responsable Comercial · Comercial

- **Seniority**: gerente
- **Crítico**: sí · **Banda autonomía**: 4
- **RR.AI principal**: FICO · Secundarios: Ejecutivo

**Misión actual**: Diseñar, coordinar y supervisar la estrategia comercial de DASSA, asegurando el crecimiento rentable, la captación de nuevos clientes, la fidelización de cuentas actuales, el desarrollo de servicios complementarios y el posicionamiento institucional de la empresa en el mercado logístico y de comerci…

**Caps Obligatorias (13)**: CAP-001, CAP-009, CAP-120, CAP-121, CAP-122, CAP-123, CAP-124, CAP-125, CAP-126, CAP-127, CAP-140, CAP-141, CAP-144

**Caps Recomendadas (7)**: CAP-080, CAP-081, CAP-082, CAP-142, CAP-180, CAP-184, CAP-185

**KPIs (3)**:
  - Clientes Nuevos Activos · Meta: `Objetivo mensual` · Frecuencia: `mensual`
  - Facturación Comercial · Meta: `Presupuesto comercial mensual` · Frecuencia: `mensual`
  - Tasa de Conversión Comercial · Meta: `≥ 25%` · Frecuencia: `mensual`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto

---

### 14/25 · Vendedor · Comercial

- **Seniority**: semi
- **Crítico**: no · **Banda autonomía**: 2
- **RR.AI principal**: FICO · Secundarios: Ejecutivo, SINCRO, Analista IA

**Misión actual**: Diseñar, coordinar y supervisar la estrategia comercial de DASSA, asegurando el crecimiento rentable, la captación de nuevos clientes, la fidelización de cuentas actuales, el desarrollo de servicios complementarios y el posicionamiento institucional de la empresa en el mercado logístico y de comerci…

**Caps Obligatorias (13)**: CAP-001, CAP-009, CAP-120, CAP-121, CAP-122, CAP-123, CAP-124, CAP-125, CAP-126, CAP-127, CAP-140, CAP-141, CAP-144

**Caps Recomendadas (7)**: CAP-080, CAP-081, CAP-082, CAP-142, CAP-180, CAP-184, CAP-185

**KPIs (3)**:
  - Clientes Nuevos Activos · Meta: `Objetivo mensual definido por Dirección` · Frecuencia: `Mensual`
  - Facturación Comercial · Meta: `Presupuesto comercial mensual` · Frecuencia: `Mensual`
  - Tasa de Conversión Comercial · Meta: `≥ 25 %` · Frecuencia: `Mensual`


---

### 15/25 · Responsable SySO · Seguridad e Higiene

- **Seniority**: responsable
- **Crítico**: sí · **Banda autonomía**: 4
- **RR.AI principal**: TRINY · Secundarios: Ejecutivo

**Misión actual**: Promover y asegurar condiciones de trabajo seguras y saludables, prevenir lesiones y enfermedades laborales, garantizar el cumplimiento de los requisitos legales aplicables y fortalecer la cultura preventiva dentro de DASSA.

**Caps Obligatorias (15)**: CAP-001, CAP-020, CAP-021, CAP-022, CAP-023, CAP-024, CAP-025, CAP-026, CAP-027, CAP-028, CAP-160, CAP-161, CAP-162, CAP-163, CAP-164

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Accidentes Laborales · Meta: `0 accidentes incapacitantes` · Frecuencia: `mensual`
  - Cumplimiento Plan de Capacitación · Meta: `100%` · Frecuencia: `mensual`
  - Inspecciones Ejecutadas · Meta: `100%` · Frecuencia: `mensual`

**Gaps detectados**:
  - ⚠ FALTA Objetivos del Puesto
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto

---

### 16/25 · Analista de Datos, Procesos e Inteligencia Artificial · Tecnología

- **Seniority**: responsable
- **Crítico**: sí · **Banda autonomía**: 4
- **RR.AI principal**: —

**Misión actual**: Diseñar, desarrollar e implementar herramientas tecnológicas, automatizaciones, inteligencia artificial, sistemas de información y optimización de procesos en DASSA. Integrar Recursos Humanos y Recursos de Inteligencia Artificial (RR.AI) en la operación cotidiana.

**Caps Obligatorias (12)**: CAP-009, CAP-180, CAP-181, CAP-182, CAP-183, CAP-184, CAP-185, CAP-186, CAP-188, CAP-189, CAP-164, CAP-167

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Automatizaciones Implementadas · Meta: `≥ 12 anuales` · Frecuencia: `mensual`
  - Horas Hombre Ahorradas · Meta: `Objetivo anual` · Frecuencia: `mensual`
  - Procesos Digitalizados · Meta: `Objetivo anual` · Frecuencia: `trimestral`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto

---

### 17/25 · Responsable de Tecnología · Tecnología

- **Seniority**: responsable
- **Crítico**: sí · **Banda autonomía**: 4
- **RR.AI principal**: Agente Tecnología · Secundarios: Analista IA, Ejecutivo

**Misión actual**: Garantizar la disponibilidad, seguridad, mantenimiento y evolución de la infraestructura tecnológica de DASSA, asegurando la continuidad operativa de los sistemas y servicios digitales.

**Caps Obligatorias (11)**: CAP-009, CAP-180, CAP-181, CAP-182, CAP-183, CAP-184, CAP-185, CAP-186, CAP-187, CAP-188, CAP-189

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Disponibilidad de Sistemas · Meta: `99%` · Frecuencia: `⚠ FALTA`
  - Incidentes Resueltos · Meta: `95%` · Frecuencia: `⚠ FALTA`
  - Proyectos Tecnológicos Implementados · Meta: `Objetivo anual` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 18/25 · Apuntador / Controlador de Cargas · Depósito

- **Seniority**: semi
- **Crítico**: no · **Banda autonomía**: 2
- **RR.AI principal**: SINCRO · Secundarios: TRINY

**Misión actual**: Controlar la trazabilidad física, documental y fotográfica de las cargas que ingresan y egresan del depósito, asegurando la exactitud de los registros operativos.

**Caps Obligatorias (8)**: CAP-001, CAP-020, CAP-040, CAP-042, CAP-043, CAP-044, CAP-046, CAP-049

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Registros Correctos · Meta: `100%` · Frecuencia: `mensual`
  - Errores de Apunte · Meta: `0` · Frecuencia: `mensual`
  - Fotos y Evidencias Cargadas · Meta: `100%` · Frecuencia: `mensual`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados
  - ⚠ FALTA Riesgos del Puesto

---

### 19/25 · Balancero · Depósito

- **Seniority**: lider
- **Crítico**: no · **Banda autonomía**: 2
- **RR.AI principal**: SINCRO

**Misión actual**: Garantizar la correcta registración, pesaje, control y trazabilidad de las cargas que ingresan, permanecen o egresan del depósito, asegurando exactitud de la información operativa.

**Caps Obligatorias (5)**: CAP-001, CAP-020, CAP-040, CAP-042, CAP-048

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Diferencias de Inventario · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Pesajes Correctos · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Registros Completos · Meta: `100%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 20/25 · Maestranza · Depósito

- **Seniority**: junior
- **Crítico**: no · **Banda autonomía**: 1
- **RR.AI principal**: SINCRO

**Misión actual**: Mantener las instalaciones de DASSA en condiciones adecuadas de orden, limpieza e higiene, contribuyendo a la seguridad, imagen institucional y eficiencia operativa.

**Caps Obligatorias (4)**: CAP-001, CAP-020, CAP-021, CAP-040

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Cumplimiento Plan de Limpieza · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Observaciones de Orden y Limpieza · Meta: `0 críticas` · Frecuencia: `⚠ FALTA`
  - Cumplimiento de Frecuencia · Meta: `100%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 21/25 · Maquinista · Depósito

- **Seniority**: semi
- **Crítico**: no · **Banda autonomía**: 2
- **RR.AI principal**: SINCRO

**Misión actual**: Operar autoelevadores y equipos de movimiento interno de cargas de forma segura, eficiente y productiva, garantizando la integridad de las personas, mercaderías, equipos e instalaciones.

**Caps Obligatorias (6)**: CAP-001, CAP-020, CAP-040, CAP-060, CAP-061, CAP-062

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Accidentes Operativos · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Checklist Completados · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Movimientos Ejecutados · Meta: `Objetivo mensual` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 22/25 · Maquinista Containera · Depósito

- **Seniority**: semi
- **Crítico**: sí · **Banda autonomía**: 2
- **RR.AI principal**: SINCRO

**Misión actual**: Operar la containera (Reach Stacker) de forma segura y eficiente para la manipulación, traslado, apilado y posicionamiento de contenedores dentro del predio, garantizando la seguridad de las personas y la integridad de los equipos y contenedores.

**Caps Obligatorias (8)**: CAP-001, CAP-020, CAP-040, CAP-063, CAP-064, CAP-065, CAP-066, CAP-067

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Accidentes Operativos · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Checklist Completados · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Movimientos de Contenedores · Meta: `Objetivo mensual` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 23/25 · Operario de Carga y Descarga · Depósito

- **Seniority**: junior
- **Crítico**: no · **Banda autonomía**: 1
- **RR.AI principal**: SINCRO

**Misión actual**: Ejecutar tareas de carga, descarga, consolidación, desconsolidación, acondicionamiento y movimiento manual de mercaderías garantizando seguridad, calidad y productividad.

**Caps Obligatorias (6)**: CAP-001, CAP-020, CAP-021, CAP-040, CAP-041, CAP-042

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Daños de Mercadería · Meta: `0` · Frecuencia: `⚠ FALTA`
  - Cumplimiento de Procedimientos · Meta: `100%` · Frecuencia: `⚠ FALTA`
  - Productividad Operativa · Meta: `Objetivo mensual` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---

### 24/25 · Plazoletero · Depósito

- **Seniority**: junior
- **Crítico**: no · **Banda autonomía**: 2
- **RR.AI principal**: SINCRO

**Misión actual**: Mantener la trazabilidad física, documental y de ubicación de los contenedores y cargas en plazoleta, asegurando la correcta organización del depósito y la disponibilidad operativa.

**Caps Obligatorias (6)**: CAP-001, CAP-020, CAP-040, CAP-042, CAP-047, CAP-048

**Caps Recomendadas (1)**: CAP-043

**KPIs (3)**:
  - Ubicaciones Correctas · Meta: `100%` · Frecuencia: `mensual`
  - Errores de Ubicación · Meta: `0` · Frecuencia: `mensual`
  - Actualización de Registros · Meta: `100%` · Frecuencia: `mensual`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ FALTA Registros Asociados

---

### 25/25 · Supervisor de Depósito · Depósito

- **Seniority**: lider
- **Crítico**: sí · **Banda autonomía**: 3
- **RR.AI principal**: SINCRO · Secundarios: TRINY

**Misión actual**: Planificar, coordinar y supervisar las operaciones diarias del depósito garantizando seguridad, productividad, calidad, trazabilidad y cumplimiento de los procedimientos establecidos.

**Caps Obligatorias (12)**: CAP-001, CAP-004, CAP-005, CAP-020, CAP-040, CAP-041, CAP-042, CAP-044, CAP-048, CAP-049, CAP-140, CAP-141

**Caps Recomendadas (0)**: _(vacío)_

**KPIs (3)**:
  - Operaciones sin Reclamos · Meta: `≥ 98%` · Frecuencia: `⚠ FALTA`
  - Productividad Operativa · Meta: `Objetivo mensual` · Frecuencia: `⚠ FALTA`
  - Cumplimiento de Procedimientos · Meta: `100%` · Frecuencia: `⚠ FALTA`

**Gaps detectados**:
  - ⚠ FALTA Relación ISO 9001 + 14001 + 45001
  - ⚠ FALTA Autoridad
  - ⚠ KPIs sin frecuencia explícita: 3/3

---


## 📚 Catálogo CAP-XXX completo en BD (86 capacitaciones)

Para la matriz O/R/OP/NA, te paso el catálogo actual:

| Código | Título |
|---|---|

| `CAP-001` | Sensibilización ISO - Normas, Objetivos y Política SGI |
| `CAP-002` | Matriz de Riesgos y Peligros |
| `CAP-003` | Matriz de Aspectos e Impactos Ambientales |
| `CAP-004` | Procedimiento de Emergencia ante Accidente Interno |
| `CAP-005` | Emergencias: Evacuación, Extinción y Roles de Brigadistas |
| `CAP-006` | Uso y Manejo de Matafuegos y Extintores |
| `CAP-007` | Primeros Auxilios y Reanimación Cardiopulmonar (RCP) |
| `CAP-008` | Accidente in Itinere y Plan de Acción ante Accidentes |
| `CAP-009` | Herramientas Tecnológicas - DASSA TECH y GEMINI PRO |
| `CAP-010` | Salud Integral: HIV/SIDA, Adicciones y Seguridad Vial |
| `CAP-020` | Elementos de Protección Personal (EPP) |
| `CAP-021` | Ergonomía y Riesgos Biomecánicos |
| `CAP-022` | Riesgo Eléctrico |
| `CAP-023` | Gestión de Sustancias Químicas y SGA |
| `CAP-024` | Gestión de Derrames - Simulacro |
| `CAP-025` | Trabajo en Altura |
| `CAP-026` | Bloqueo y Etiquetado - LOTO/LOTOTO |
| `CAP-027` | Investigación de Accidentes |
| `CAP-028` | Brigadista Avanzado |
| `CAP-040` | Operar Más y Mejor |
| `CAP-041` | Buenas Prácticas de Depósito Fiscal |
| `CAP-042` | Trazabilidad Operativa |
| `CAP-043` | Fotografía Operativa |
| `CAP-044` | Control de Daños |
| `CAP-045` | Estiba y Trinca |
| `CAP-046` | Gestión Documental Operativa |
| `CAP-047` | Gestión de Contenedores |
| `CAP-048` | Control de Stock y Ubicaciones |
| `CAP-049` | Calidad Operativa DASSA |
| `CAP-060` | Seguridad en Conducción de Autoelevadores (Gremio) |
| `CAP-061` | Inspección Preoperacional de Equipos |
| `CAP-062` | Manipulación Segura de Cargas |
| `CAP-063` | Operación Segura de Reach Stacker |
| `CAP-064` | Operación Segura de Containera |
| `CAP-065` | Seguridad en Izaje |
| `CAP-066` | Gestión de Riesgo de Vuelco |
| `CAP-067` | Coordinación de Maniobras |
| `CAP-070` | Documentación y Cumplimiento Legal |
| `CAP-080` | Comercio Exterior Aplicado |
| `CAP-082` | Customer Service Logístico |
| `CAP-083` | Gestión de Reclamos |
| `CAP-084` | Gestión de Turnos |
| `CAP-085` | Trazabilidad Documental |
| `CAP-086` | Coordinación de Transporte |
| `CAP-087` | Gestión de Clientes Operativos |
| `CAP-100` | Facturación |
| `CAP-101` | Cobranzas |
| `CAP-102` | Administración de Personal |
| `CAP-103` | Gestión Documental |
| `CAP-104` | Cash Flow |
| `CAP-105` | Indicadores de Gestión |
| `CAP-106` | Gestión de Proveedores |
| `CAP-120` | Ventas Consultivas B2B |
| `CAP-121` | Negociación Estratégica |
| `CAP-122` | CRM Comercial |
| `CAP-123` | Customer Experience |
| `CAP-124` | Desarrollo de Negocios |
| `CAP-125` | Inteligencia Comercial |
| `CAP-126` | Pricing y Rentabilidad |
| `CAP-127` | Marketing Logístico |
| `CAP-140` | Liderazgo DASSA |
| `CAP-141` | Gestión de Equipos |
| `CAP-142` | Comunicación Efectiva |
| `CAP-143` | Gestión del Cambio |
| `CAP-144` | Gestión por Indicadores |
| `CAP-145` | Resolución de Problemas |
| `CAP-146` | Gestión de Reuniones |
| `CAP-147` | Toma de Decisiones |
| `CAP-160` | Auditor Interno ISO |
| `CAP-161` | Gestión de Riesgos |
| `CAP-162` | Investigación de No Conformidades |
| `CAP-163` | Acciones Correctivas |
| `CAP-164` | Gestión de Indicadores |
| `CAP-165` | Contexto de la Organización |
| `CAP-166` | Partes Interesadas |
| `CAP-167` | Mejora Continua |
| `CAP-180` | Inteligencia Artificial Aplicada |
| `CAP-181` | Prompt Engineering |
| `CAP-182` | Claude Code |
| `CAP-183` | SQL y Bases de Datos |
| `CAP-184` | Business Intelligence |
| `CAP-185` | Automatización de Procesos |
| `CAP-186` | Ciberseguridad |
| `CAP-187` | Protección de Datos |
| `CAP-188` | Apps DASSA |
| `CAP-189` | RR.AI |


---

## 🎯 Devolución esperada — formato y orden

**1. Matriz O/R/OP/NA × 86 × 25** — tabla larga (formato Markdown, NO csv para evitar dependencias).

**2. Para cada una de las 20 fichas con ISO faltante**: 3 párrafos cortos (uno por norma) con cláusula citada.

**3. Brechas vs marco legal argentino**: tabla con norma + cláusula + CAP existente + brecha + urgencia. **Adicional**: lista de capacitaciones NUEVAS que deberíamos agregar al catálogo CAP-XXX (con código sugerido en hueco libre).

**4. Frecuencia para los 48 KPIs sin frecuencia** — pareado puesto + KPI + frecuencia + justificación 1 línea.

**5. Objetivos del Puesto** para las fichas listadas en Gap #6.

**6. Autoridad/Registros/Riesgos** para las fichas listadas en Gap #7.

**7. Plazoletero + Mantenimiento Externo** — fichas completas formato sección 06.

**Idioma**: español argentino formal (sin emojis dentro de las redacciones finales, sin «tú»).

**Salida**: 7 secciones bien delimitadas (puede ser un nuevo Google Doc o un .md). Cuando lo termines, **Santi me lo va a pasar** y yo aplico los UPDATE en BD + corrección a Mi Perfil 360.

¡Gracias!

— Claude Code asistiendo a Santi Aguirre Oliva · DASSA Tech · 2026-06-03
