# Revisión de Fichas de Puesto · DASSA / Trinorma

**Fecha**: 2026-06-03
**Sistema**: dassa-sgi (apps.dassa.com.ar/sgi) · BD `dassa_sgi` · tabla `job_profiles`
**URL en la app**: https://trinorma.dassa.com.ar/puestos
**Total de fichas activas**: 25
**Normas que aplican**: ISO 9001 (Calidad) + ISO 14001 (Medio Ambiente) + ISO 45001 (Seguridad y Salud Ocupacional) — modelo **TRINORMA**

---

## 🎯 Objetivo de este documento

Compartir con **ChatGPT (instancia con contexto histórico de DASSA)** las **25 fichas de puesto** del SGI Trinorma de DASSA tal como están hoy cargadas en el sistema, junto con las **dudas concretas por ficha** y los **vacíos detectados**, para que ChatGPT ayude a **robustecerlas** antes de la próxima revisión por la dirección.

ChatGPT debería:
1. Proponer **misión** donde esté vacía o mejorarla donde sea débil.
2. Proponer **KPIs medibles** (3-5 por puesto) alineados a la operación de DASSA.
3. Proponer **objetivos y key results 2026** por puesto (alineados a las normas y a los objetivos comerciales 2026).
4. Proponer **training requerido** específico (ISO + técnico + soft) por nivel del puesto.
5. Sugerir mejoras a las **responsabilidades** existentes (faltantes, redundancias, claridad).
6. Apuntar inconsistencias entre puestos (ej. quién reporta a quién).
7. Cuando hay **múltiples personas** en un mismo puesto, sugerir si conviene **diferenciar el puesto** (ej. Maquinista junior / semi / senior).

---

## 🏢 Contexto DASSA

- **DASSA** = Depósito Avellaneda Sur S.A. — opera desde 2015 (10 años), parte del grupo DGM Florida (30+ años).
- **Actividad principal**: depósito fiscal aduanero, logística internacional, importación/exportación, mudanzas internacionales (a través de partners forwarders/mudanceras).
- **Plantel**: 30 internos + 2 externos (Nixa consultora ISO + Toti mantenimiento externo). Estructura por áreas: Dirección, Gerencia, Operaciones, Coordinación (Tráfico/IMPO/EXPO), Coordinación de Puerto, Administración (RRHH + Facturación), Comercial, Seguridad e Higiene, Tecnología, Depósito (apuntadores, balancero, maquinistas, plazoletero, supervisor, etc.).
- **Triunvirato directivo**: Manuel De La Arena (CEO) · Santiago Aguirre Oliva (Director General + Líder SGI) · Francisco Urtubey (Representante Legal y Técnica).
- **Auditora externa SGI**: NIXA Consultora (`nixa.8908@gmail.com`).
- **Responsable SySO**: Fernando Ponzi.
- **Sistemas**: el SGI vive en `trinorma.dassa.com.ar` (app dassa-sgi). Asociado: Triny (agente IA del SGI).

---

## 📋 Convenciones del documento

- **(P)** después de un nombre = persona primaria en el puesto.
- ⚠️ = vacío crítico que requiere acción.
- _(vacío)_ = el campo está null en BD.
- Cada ficha trae al final un bloque **"Consultas para ChatGPT"** con preguntas específicas para que las trabaje.
- El **orden** es jerárquico/funcional (Dirección → Gerencia → Operaciones → Coordinación → Administración → Comercial → SySO → Tecnología → Depósito).

---

## ⚠️ Vacantes detectadas

- **Dirección · Directora SGI (Consultora Externa)** — sin persona asignada.
- **Operaciones · Mantenimiento (Externo)** — sin persona asignada.


## 📊 Resumen de vacíos por campo

| Campo | Fichas con vacío |
|---|---|
| Misión | 0/25 |
| KPIs | 25/25 |
| Objetivos | 25/25 |
| Key Results | 8/25 |
| Competencias | 4/25 |
| Training requerido | 25/25 |
| Reports to | 25/25 |
| Sin persona asignada | 2/25 |


## 🗂️ Tabla resumen — 25 fichas

| # | Área | Puesto | Personas | KPIs | Train | Obs |
|---|---|---|---|---|---|---|
| 1 | Dirección | Directora SGI (Consultora Externa) | (SIN ASIGNAR) | 0 | 0 | ⚠️ vacante · sin KPIs · sin training |
| 2 | Dirección | Director General / Líder SGI | Santiago Aguirre Oliva (P) | 0 | 0 | sin KPIs · sin training |
| 3 | Dirección | Representante Legal y Técnica | Francisco Urtubey (P) | 0 | 0 | sin KPIs · sin training |
| 4 | Gerencia | CEO / Gerente General | Manuel De La Arena (P) | 0 | 0 | sin KPIs · sin training |
| 5 | Operaciones | Gerente de Operaciones | Christian Medina (P) | 0 | 0 | sin KPIs · sin training |
| 6 | Operaciones | Mantenimiento (Externo) | (SIN ASIGNAR) | 0 | 0 | ⚠️ vacante · sin KPIs · sin training |
| 7 | Coordinación | Administrativo de Exportación | Marcos Coria (P) | 0 | 0 | sin KPIs · sin training |
| 8 | Coordinación | Administrativo de Importación | Alan Santibañez (P) | 0 | 0 | sin KPIs · sin training |
| 9 | Coordinación | Administrativo de Tráfico | Luna Villar (P) | 0 | 0 | sin KPIs · sin training |
| 10 | Coordinación IMPO | Personal de Puerto | Carlos Vera (P) · Pepo | 0 | 0 | sin KPIs · sin training |
| 11 | Administración | Administración General / RRHH | María del Carmen Delgado (P) | 0 | 0 | sin KPIs · sin training |
| 12 | Administración | Facturación · Cobranzas · Asistente Dirección | Maira Herrera (P) | 0 | 0 | sin KPIs · sin training |
| 13 | Comercial | Vendedor | Guillermo Jorge (P) · Alexis Dalpra · Enzo Nieto | 0 | 0 | sin KPIs · sin training |
| 14 | Seguridad e Higiene | Responsable SySO | Fernando Ponzi (P) | 0 | 0 | sin KPIs · sin training |
| 15 | Tecnología | Responsable de Tecnología | Facundo Lastra (P) | 0 | 0 | sin KPIs · sin training |
| 16 | Depósito | Apuntador — Controlador de Cargas (Exportación) | Claudio Estigarribia (P) | 0 | 0 | sin KPIs · sin training |
| 17 | Depósito | Apuntador — Controlador de Cargas (Importación) | Federico Estigarribia (P) | 0 | 0 | sin KPIs · sin training |
| 18 | Depósito | Apuntador — Controlador de Cargas (Varios) | Franco Pérez (P) · Nicolás Nuñez | 0 | 0 | sin KPIs · sin training |
| 19 | Depósito | Balancero | Cristian Andreini (P) | 0 | 0 | sin KPIs · sin training |
| 20 | Depósito | Maestranza | Lidia Miño (P) | 0 | 0 | sin KPIs · sin training |
| 21 | Depósito | Maquinista | Emmanuel Fernández (P) · Fabián Fuentes · Rodolfo Espíndola | 0 | 0 | sin KPIs · sin training |
| 22 | Depósito | Maquinista Containera | Matías Díaz (P) | 0 | 0 | sin KPIs · sin training |
| 23 | Depósito | Operario de Carga y Descarga | Maximiliano Sandoval (P) · Mario Goroso | 0 | 0 | sin KPIs · sin training |
| 24 | Depósito | Plazoletero | Franco Di Dio (P) | 0 | 0 | sin KPIs · sin training |
| 25 | Depósito | Supervisor de Depósito | Marcelo Stizza (P) | 0 | 0 | sin KPIs · sin training |

---

# 📑 Fichas detalladas

## 1/25 · Dirección · Directora SGI (Consultora Externa)

- **Persona(s) asignada(s)**: (SIN ASIGNAR)
- **Seniority**: director
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Dirigir e implementar el Sistema de Gestión Integrado (SGI) de DASSA, asegurando el cumplimiento de las normas ISO 9001:2015, 14001:2015 y 45001:2018.

### Responsabilidades (8)
- Cumplir y velar por la política de calidad, ambiente y SySO.
- Mantener y controlar la documentación conforme a las normas ISO vigentes.
- Desarrollar el programa anual de formación del SGI.
- Planificar y asistir a la revisión por la dirección.
- Realizar seguimiento a objetivos e indicadores del SGI.
- Gestionar evaluación de proveedores y encuestas de satisfacción.
- Colaborar con la Dirección en análisis de riesgos, contexto y partes interesadas.
- Promover la mejora continua y el cumplimiento del SGI.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (2)
- Google Drive
- ISO 9001 / 14001 / 45001 vigentes

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- ⚠️ **Puesto sin persona asignada** — ¿es vacante real o falta cargar?
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?
- Este puesto no tiene persona asignada. ¿Es vacante real, externa, o falta cargar?

---

## 2/25 · Dirección · Director General / Líder SGI

- **Persona(s) asignada(s)**: Santiago Aguirre Oliva (P)
- **Seniority**: triunvirato
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Generar y liderar las iniciativas de mejora continua y desarrollo empresarial en toda la organización.

### Responsabilidades (9)
- Identificar oportunidades de mejora en todos los aspectos de las operaciones de DASSA.
- Diseñar estrategias y planes de acción para la optimización de procesos.
- Liderar la implementación de iniciativas de mejora en toda la organización.
- Supervisar y coordinar equipos multidisciplinarios para ejecutar proyectos de mejora.
- Medir y evaluar el impacto de las mejoras mediante KPIs y análisis de datos.
- Fomentar una cultura de mejora continua en DASSA.
- Liderar la transformación tecnológica (Smart DASSA).
- Definir, promover y cumplir la política de calidad, medio ambiente y SySO.
- Realizar la revisión por la dirección y aprobar la información documentada del SGI.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (5)
- Liderazgo estratégico
- Mejora continua
- Análisis de datos y KPIs
- Gestión del cambio
- Comunicación ejecutiva

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 3/25 · Dirección · Representante Legal y Técnica

- **Persona(s) asignada(s)**: Francisco Urtubey (P)
- **Seniority**: triunvirato
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Gestionar los asuntos legales, de compliance y representación institucional de DASSA ante organismos reguladores, Aduana y terceros.

### Responsabilidades (5)
- Relaciones con Aduanas y Autoridades Gubernamentales.
- Comunicación con Organismos Reguladores.
- Asuntos Legales y Compliance.
- Representación frente a agentes interventores del sector.
- Manejo de documentación societaria: Estatutos, Libros, Actas, Contratos.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Monitoreo de la Imagen Institucional.
- Supervisión activa de la relación con Aduana del punto.
- Interceder ante desvíos operativos de implicancia aduanera.
- Interceder ante crisis con personal aduanero.

### Competencias (4)
- Conocimiento regulatorio y aduanero
- Gestión de relaciones públicas e interpersonales
- Pensamiento estratégico
- Manejo de crisis

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 4/25 · Gerencia · CEO / Gerente General

- **Persona(s) asignada(s)**: Manuel De La Arena (P)
- **Seniority**: triunvirato
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Gestionar la empresa en su totalidad. Eje desde donde desciende toda la cadena operativa, comercial y administrativa. Ejecutar estrategias de crecimiento sostenible y rentabilidad de DASSA.

### Responsabilidades (8)
- Gestionar la asignación de recursos e inversiones de manera efectiva.
- Toma de decisiones comerciales, económicas y financieras.
- Gestión de compras.
- Supervisión de departamentos: Comercial, Administración y Operativo.
- Fomentar buen clima laboral.
- Fomentar mejoras, cambios e innovación.
- Establecer metas y objetivos claros para todas las áreas.
- Definir y aprobar la política integrada del SGI.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Relaciones estratégicas con clientes clave, proveedores y socios.
- Análisis de costos, Cash Flow y Estado de Resultados.
- Análisis de ventas (vendedores, clientes, conceptos).
- Responsabilidad Social Empresaria.

### Competencias (6)
- Liderazgo y gestión de equipos
- Conocimientos impositivos y contables
- Planificación estratégica
- Gestión financiera
- Comunicación efectiva
- Título universitario

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 5/25 · Operaciones · Gerente de Operaciones

- **Persona(s) asignada(s)**: Christian Medina (P)
- **Seniority**: gerente
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Liderar el departamento de operaciones garantizando la eficiencia y calidad de los servicios dentro del depósito fiscal, así como la coordinación de importaciones, exportaciones y logística nacional.

### Responsabilidades (10)
- Planificación y supervisión de las tareas diarias.
- Desarrollar y ejecutar estrategias operativas alineadas con los objetivos corporativos.
- Toma de decisiones estratégicas para garantizar la eficiencia operativa.
- Gestionar y supervisar el equipo de operaciones.
- Garantizar la satisfacción del cliente mediante servicios de alta calidad.
- Controlar y reducir costos operativos.
- Reportar el desempeño operativo con KPIs.
- Identificar y gestionar riesgos operativos.
- Fomentar comunicación transparente con clientes.
- Colaborar con otros departamentos para integrar las operaciones logísticas.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Fomentar el trabajo en equipo
- Planificar la organización por sector
- Resolución de desvíos
- Interactuar con Aduana

### Competencias (6)
- Título universitario en Logística / Comex / Adm / Industrial
- Liderazgo y gestión de equipos
- Planificación y organización
- Normativa de Comex y depósitos fiscales
- Sistemas de calidad e ISO
- Trabajar bajo presión

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 6/25 · Operaciones · Mantenimiento (Externo)

- **Persona(s) asignada(s)**: (SIN ASIGNAR)
- **Seniority**: externo
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Reparaciones básicas en los equipos y sistemas del edificio.

### Responsabilidades (7)
- Controlar instalaciones y funcionamiento de elementos esenciales.
- Realización de pequeñas reparaciones.
- Comprobación de paneles de control y cableado eléctrico.
- Instalar dispositivos y equipos.
- Tareas de mantenimiento de jardines o caminos.
- Comprobar funciones de los sistemas de seguridad.
- Interrelación con compras para pedidos y presupuestos.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (6)
- Electricidad
- Plomería
- Albañilería
- Aire Acondicionado (excluyente)
- Diagramas técnicos
- Curso CCTV

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- ⚠️ **Puesto sin persona asignada** — ¿es vacante real o falta cargar?
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Reparaciones básicas en los equipos y sistemas del edificio.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?
- Este puesto no tiene persona asignada. ¿Es vacante real, externa, o falta cargar?

---

## 7/25 · Coordinación · Administrativo de Exportación

- **Persona(s) asignada(s)**: Marcos Coria (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Coordinación y seguimiento de todas las cargas de Exportación — Customer Service.

### Responsabilidades (6)
- Inicio de operación con el cliente — Customer Service.
- Seguimiento de consolidado marítimo y terrestre.
- Remisión de contenedor a puerto y liberación de camiones.
- Manejo de reservas y retiro de contenedores con marítimas.
- Salida en sistema AFIP de contenedores y camiones.
- Planificación de consolidado.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Resolución de desvíos
- Estado de cargas recibidas
- Turnos en terminales
- Envío de fotos y salidas aduaneras al cliente

### Competencias (4)
- Documentación de Comex
- Malvinas / SINTIA
- Depofis
- Inglés técnico Comex

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 8/25 · Coordinación · Administrativo de Importación

- **Persona(s) asignada(s)**: Alan Santibañez (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Coordinación y seguimiento de todas las cargas de Importación — Customer Service.

### Responsabilidades (7)
- Inicio de operación con el cliente — Customer Service.
- Coordinación de traslados desde terminales a depósito fiscal.
- Control de documentación.
- Pedido de turno en terminales.
- Seguimiento de buque — Arribos.
- Pedido de precintos satelitales.
- Envío de información del estado a clientes.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Pagos en terminales
- Confección de traslados
- Salidas Malvinas
- Planilla de tráfico interno

### Competencias (5)
- Inglés técnico Comex
- Páginas web y herramientas informáticas
- Depofis
- Documentación de Comex
- Malvinas / SINTIA

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 9/25 · Coordinación · Administrativo de Tráfico

- **Persona(s) asignada(s)**: Luna Villar (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Gestionar con las Agencias Marítimas el pago y retiro de Documentación Aduanera.

### Responsabilidades (5)
- Gestión con Agencias Marítimas del pago y retiro de Documentación Aduanera.
- Gestión en Agencias Marítimas.
- Gestión de Agente de Transporte.
- Confección de Manifiestos.
- Confección de Bill of Lading.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Pago en agencias
- Retiro de documentación
- Soporte a Coordinadores de Mudanzas
- Soporte ante desvíos

### Competencias (6)
- Malvinas / SINTIA
- Gestión de Agente de Transporte
- Comex y reglamentos
- Inglés técnico (no excluyente)
- Documentación aduanera
- Relaciones interpersonales

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 10/25 · Coordinación IMPO · Personal de Puerto

- **Persona(s) asignada(s)**: Carlos Vera (P) · Pepo
- **Seniority**: junior
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Gestión de retiro de contenedores de las terminales portuarias.

### Responsabilidades (3)
- Realizar trámite aduanero en puerto para el retiro de contenedores.
- Gestionar con el Transporte el ingreso y egreso en terminales portuarias.
- Gestionar Salidas Malvinas en terminal.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (3)
- Pago de gastos en terminal
- Impresión de documentación
- Gestión con empresa de satelitales

### Competencias (0)
_(vacío)_

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Sin competencias** — definir competencias técnicas + blandas requeridas.
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Gestión de retiro de contenedores de las terminales portuarias.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 11/25 · Administración · Administración General / RRHH

- **Persona(s) asignada(s)**: María del Carmen Delgado (P)
- **Seniority**: responsable
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Administrar los recursos humanos, físicos y los valores de la empresa.

### Responsabilidades (15)
- Administrar al personal: Altas, bajas, reglamentos y sanciones.
- Relevamiento de ingresos y egresos, licencias médicas y otras gestiones.
- Pago a proveedores.
- Soporte al estudio contable para sueldos e impuestos.
- Pago de impuestos y tasas.
- Pago de sueldos.
- Análisis y control de facturas de compra.
- Administrar los recursos físicos.
- Logística y compras para la operación.
- Armado de Estado de Resultados.
- Conciliación de cuentas contables.
- Actualización Cash Flow.
- Contabilidad general.
- Conciliaciones bancarias.
- Asistencia gerencial, legal y a directores.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Sistema de cheques
- Gestionar servicios para operaciones
- Coordinar capacitaciones
- Compra y control de ropa al personal (EPP)

### Competencias (4)
- Análisis y negociación
- Contabilidad e impuestos
- Excel / Sheets · Depofis
- Liderazgo

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Administrar los recursos humanos, físicos y los valores de la empresa.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 12/25 · Administración · Facturación · Cobranzas · Asistente Dirección

- **Persona(s) asignada(s)**: Maira Herrera (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Supervisar y llevar a cabo el proceso completo de facturación, garantizando la exactitud y el flujo de cobranzas de la empresa.

### Responsabilidades (9)
- Supervisar y ejecutar el proceso completo de facturación.
- Identificar y abordar problemas relacionados con tarifas o errores de facturación.
- Armado y actualización de tarifarios comerciales.
- Soporte a clientes en consultas de facturación.
- Elaboración de presupuestos.
- Procesar y registrar transacciones financieras.
- Generar y enviar recibos.
- Cuentas por cobrar al día.
- Asientos de DDJJ IVA e IIBB.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Re-facturación de pagos en terminal
- Control de habilitaciones
- Registro de facturas de proveedores
- Rendición de facturas en portal

### Competencias (5)
- Prolijidad y puntualidad
- Excel / Sheets
- Matemáticas y contabilidad básica
- Depofis · Portal de pagos
- Comunicación y empatía

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 13/25 · Comercial · Vendedor

- **Persona(s) asignada(s)**: Guillermo Jorge (P) · Alexis Dalpra · Enzo Nieto
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Generar nuevos negocios y maximizar las ventas para la compañía.

### Responsabilidades (9)
- Identificar y atraer nuevos clientes a través de estrategias de mercado proactivas.
- Detectar y desarrollar nuevas oportunidades de negocios.
- Crear y mantener relaciones sólidas con clientes potenciales y existentes.
- Brindar soluciones logísticas al cliente.
- Ofrecer asesoramiento garantizando la satisfacción del cliente.
- Diseñar y presentar soluciones logísticas adaptadas.
- Desarrollar tarifarios, presupuestos y cotizaciones precisas.
- Asegurar la actualización continua de la información del cliente en Depofis.
- Contribuir al crecimiento y retención de clientes.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (2)
- Asistir en cobranzas
- Alinear ventas con políticas financieras y operativas

### Competencias (7)
- Conocimiento operativo y comercial
- Comex y aduanas
- LinkedIn y prospección
- Negociación y cierre
- Ventas B2B
- Infraestructura DASSA
- CRM · Depofis · Power BI · Looker

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Generar nuevos negocios y maximizar las ventas para la compañía.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 14/25 · Seguridad e Higiene · Responsable SySO

- **Persona(s) asignada(s)**: Fernando Ponzi (P)
- **Seniority**: responsable
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Planificar, implementar y controlar el sistema de Seguridad y Salud Ocupacional de DASSA, previniendo accidentes y asegurando el cumplimiento de la normativa vigente (Ley 19.587 / Decreto 351/79).

### Responsabilidades (8)
- Elaborar y ejecutar el Programa Anual de Higiene y Seguridad.
- Inspecciones periódicas de instalaciones y equipos.
- Investigar y registrar accidentes e incidentes.
- Capacitar al personal en prevención de riesgos y uso de EPP.
- Gestionar la relación con la ART y organismos de control.
- Elaborar estadísticas de siniestralidad y reportes periódicos.
- Coordinar el Comité Mixto de Higiene y Seguridad.
- Cumplimiento de requisitos legales en SySO.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (3)
- Control y provisión de EPP
- Señalética y orden
- Coordinación con SGI (ISO 45001:2018)

### Competencias (4)
- Título de Técnico/Lic. en H&S (habilitado SRT)
- Ley 19.587, Decreto 351/79
- ISO 45001:2018
- Experiencia en depósitos / logística

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 15/25 · Tecnología · Responsable de Tecnología

- **Persona(s) asignada(s)**: Facundo Lastra (P)
- **Seniority**: responsable
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Gestionar y desarrollar la infraestructura tecnológica de DASSA, implementando soluciones de BI, ETL y automatización en el marco del proyecto Smart DASSA.

### Responsabilidades (5)
- Desarrollo y mantenimiento de dashboards e informes de BI.
- Implementación de procesos ETL.
- Soporte técnico a sistemas operativos (Depofis, Malvinas).
- Implementación del ecosistema Smart DASSA.
- Gestión de la infraestructura de datos y servidores.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (3)
- Documentación técnica
- Soporte a usuarios internos
- Evaluación de nuevas tecnologías

### Competencias (4)
- Python · SQL · ETL
- BI (Power BI, Metabase)
- PostgreSQL / SQL Server
- Linux / cloud

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 16/25 · Depósito · Apuntador — Controlador de Cargas (Exportación)

- **Persona(s) asignada(s)**: Claudio Estigarribia (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Realizar el control de bultos y carga por cada operación y movimiento de mercaderías de Exportación.

### Responsabilidades (5)
- Apunte de datos de cargas, descargas, desconsolidados y consolidados.
- Adjuntar fotos de la operación.
- Llevar control de bultos, personal, maquinaria, tiempo y ubicación.
- Preparar sector de trabajo y recursos.
- Velar por el orden y la limpieza.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (3)
- Apuntador analógico + tablet DASSA
- Depofis básico
- Logística, almacén y documentación aduanera

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 17/25 · Depósito · Apuntador — Controlador de Cargas (Importación)

- **Persona(s) asignada(s)**: Federico Estigarribia (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Realizar el control de bultos y carga por cada operación y movimiento de mercaderías de Importación.

### Responsabilidades (8)
- Apunte de datos de cargas, descargas, desconsolidados y consolidados.
- Adjuntar fotos de la operación realizada y detalles (MC, embalaje, IMO).
- Llevar control de bultos, personal, maquinaria, tiempo y ubicación.
- Preparar el sector de trabajo y recursos.
- Velar por el orden y la limpieza.
- Trabajar en conjunto con sus pares.
- Manejo de herramientas para verificaciones y acondicionamiento.
- Cumplir con reglamento de depósito y buenas prácticas.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (4)
- Control de stock
- Movimientos de carga en almacén
- Clasificación de mercaderías
- Espacio disponible para desconsolidados

### Competencias (4)
- Apuntador analógico + tablet DASSA
- Depofis básico
- Logística, almacén y documentación aduanera
- Procedimientos DASSA

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 18/25 · Depósito · Apuntador — Controlador de Cargas (Varios)

- **Persona(s) asignada(s)**: Franco Pérez (P) · Nicolás Nuñez
- **Seniority**: junior
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Realizar el control de bultos y carga por cada operación y movimiento de mercaderías en general, y ejecutar las tareas de carga y descarga del depósito.

### Responsabilidades (7)
- Apunte de datos de cargas, descargas, desconsolidados y consolidados.
- Adjuntar fotos de la operación.
- Llevar control de bultos, personal, maquinaria, tiempo y ubicación.
- Preparar sector de trabajo y recursos.
- Velar por el orden y la limpieza.
- Realizar seguimiento y derivar actividades de personal de carga y descarga.
- Control y asignación de herramientas en pañol.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (3)
- Control de stock
- Movimientos de carga en almacén
- Clasificación de mercaderías

### Competencias (2)
- Apuntador analógico + tablet DASSA
- Depofis básico

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 19/25 · Depósito · Balancero

- **Persona(s) asignada(s)**: Cristian Andreini (P)
- **Seniority**: lider
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Controlar la administración y flujo de ingreso/egreso de camiones y contenedores.

### Responsabilidades (8)
- Controlar ingreso y egreso de camiones, tomando pesada y cargándola en el sistema.
- Controlar la documentación verificando aprobación.
- Preparar documentación a rendir a Aduana.
- Mantener el orden de la plazoleta.
- Optimizar el espacio y acomodar camiones.
- Controlar ingreso y salida de contenedores.
- Sacar turnos para devolución de contenedores y solicitar libre deuda.
- Supervisar al Plazoletero.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (2)
- Optimizar recursos
- Conocer la Orden del Día

### Competencias (0)
_(vacío)_

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Sin competencias** — definir competencias técnicas + blandas requeridas.
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 20/25 · Depósito · Maestranza

- **Persona(s) asignada(s)**: Lidia Miño (P)
- **Seniority**: junior
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Mantener limpios y ordenados el depósito y las instalaciones de DASSA.

### Responsabilidades (5)
- Mantener siempre los espacios comunes limpios y ordenados.
- Estar a disposición del personal de la empresa.
- Orden y limpieza del tinglado.
- Mantener autos con fundas.
- Rondas semanales por sector.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (0)
_(vacío)_

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Sin competencias** — definir competencias técnicas + blandas requeridas.
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Mantener limpios y ordenados el depósito y las instalaciones de DASSA.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 21/25 · Depósito · Maquinista

- **Persona(s) asignada(s)**: Emmanuel Fernández (P) · Fabián Fuentes · Rodolfo Espíndola
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Realizar las cargas y descargas de todo el flujo operativo.

### Responsabilidades (6)
- Licencia de conducir vigente (requisito excluyente).
- Realizar cargas y descargas con responsabilidad, cuidando la mercadería.
- Revisar el estado de la unidad asignada y prever desperfectos visibles.
- Informar el estado de la mercadería al momento de carga o descarga.
- Reportarse al personal de carga y descarga.
- Tener conocimiento de la Orden del Día.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (3)
- Licencia de conducir vigente
- Manejo de autoelevador y/o containera
- Conocimiento de procedimientos DASSA

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Realizar las cargas y descargas de todo el flujo operativo.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 22/25 · Depósito · Maquinista Containera

- **Persona(s) asignada(s)**: Matías Díaz (P)
- **Seniority**: semi
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Sub-especialización del maquinista para operación específica de contenedores.

### Responsabilidades (3)
- Operar containeras para movimiento de contenedores.
- Cuidar mercadería e integridad de contenedores.
- Cumplir con la Orden del Día.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (3)
- Licencia de conducir vigente
- Manejo de containera (requisito excluyente)
- Conocimiento de procedimientos DASSA

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Sub-especialización del maquinista para operación específica de contenedores.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 23/25 · Depósito · Operario de Carga y Descarga

- **Persona(s) asignada(s)**: Maximiliano Sandoval (P) · Mario Goroso
- **Seniority**: junior
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Ejecutar las tareas físicas de carga, descarga y movimiento de mercaderías en el depósito.

### Responsabilidades (4)
- Realizar tareas de carga y descarga conforme a las indicaciones.
- Manipular mercaderías con cuidado.
- Mantener orden y limpieza del sector.
- Cumplir con uso de EPP y normativas de seguridad.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (0)
_(vacío)_

### Competencias (3)
- Manejo de cargas físicas
- Trabajo en equipo
- Cumplimiento de procedimientos

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin key results** — definir KRs (resultados medibles concretos).
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 24/25 · Depósito · Plazoletero

- **Persona(s) asignada(s)**: Franco Di Dio (P)
- **Seniority**: junior
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Realizar control de los contenedores y del flujo de camiones.

### Responsabilidades (6)
- Mantener el orden de la plazoleta dentro de las prioridades operativas.
- Optimizar el espacio de plazoleta y acomodar los camiones.
- Trabajar en conjunto con depósito para movimientos de contenedores.
- Controlar el ingreso y salida verificando el camión asignado.
- Mantener comunicación constante con el Balancero.
- Controlar el retiro de precintos según autorización de Aduana.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (3)
- Optimizar recursos distribuyendo tareas de maquinistas
- Conocer la Orden del Día
- Movimientos de carga en plazoleta

### Competencias (0)
_(vacío)_

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Sin competencias** — definir competencias técnicas + blandas requeridas.
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- La misión actual ("Realizar control de los contenedores y del flujo de camiones.") es breve. ¿Conviene robustecerla? Proponer versión final.
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---

## 25/25 · Depósito · Supervisor de Depósito

- **Persona(s) asignada(s)**: Marcelo Stizza (P)
- **Seniority**: lider
- **Reporta a**: (no definido)
- **Fuente del puesto**: md-f-tri-34-v2024

### Misión
Coordinar, supervisar y optimizar las operaciones físicas diarias del depósito, asegurando el correcto manejo, almacenamiento y distribución. Ejecuta la operativa que Coordinación dispone.

### Responsabilidades (7)
- Coordinar y supervisar actividades diarias: recepción, almacenamiento, control de inventarios y despacho.
- Asegurar que las operaciones se realicen conforme a procedimientos y normativas de seguridad.
- Supervisar y apoyar a apuntadores, maquinistas y operarios.
- Asignar tareas y responsabilidades de manera equitativa y eficiente.
- Identificar oportunidades de mejora en los procesos del depósito.
- Colaborar con Coordinación para cumplir las órdenes del día.
- Supervisar al proveedor externo de mantenimiento (Toti) cuando aplica.

### KPIs (0)
_(vacío — falta definir KPIs medibles)_

### Objetivos (0)
_(vacío)_

### Key Results (5)
- Planificar y coordinar actividades
- Identificar y resolver problemas proactivamente
- Mantener registros de personal
- Establecer metas y plazos
- Analizar KPIs

### Competencias (6)
- Apuntador analógico + tablet DASSA
- Depofis básico
- Logística y almacén
- Documentación aduanera
- Procedimientos DASSA
- Liderazgo y motivación

### Training requerido (0)
_(vacío — falta definir capacitaciones obligatorias)_

### Vacíos / observaciones
- **Sin KPIs** — definir indicadores medibles del puesto.
- **Sin objetivos** — definir objetivos anuales o trimestrales del puesto.
- **Sin training requerido** — capacitaciones obligatorias del puesto (ISO, técnicas, soft skills).
- **Reporta a (jefe directo) no definido** — establecer cadena de mando.

### Consultas para ChatGPT (sobre este puesto)
- Proponer **3-5 KPIs medibles** del puesto, con fórmula, frecuencia y meta sugerida.
- Proponer **3 objetivos 2026** del puesto, alineados a los objetivos generales de DASSA para 2026.
- Proponer **capacitaciones obligatorias** del puesto: ISO + técnicas + soft skills, con periodicidad.
- ¿Las **responsabilidades** listadas son completas para este puesto? ¿Falta alguna o sobra alguna?
- ¿Las **competencias** son suficientes? ¿Falta agregar alguna técnica o blanda?
- ¿A quién debería **reportar** este puesto en la estructura DASSA?

---


## 🧭 Cierre — qué espera Santi de ChatGPT

1. **Devolver un .md / tabla con las mismas 25 fichas robustecidas**, manteniendo el orden y los campos.
2. **Marcar claramente los cambios propuestos** vs. el original (diff lógico).
3. **Justificar** brevemente cada cambio: por qué se agrega tal KPI, por qué tal capacitación, etc.
4. **Coherencia entre fichas**: que los KPIs y objetivos converjan al plan estratégico DASSA 2026.
5. **Alineación a las 3 normas ISO**: cada puesto debería tener referencia explícita al menos a una de las 3.
6. **Lenguaje natural argentino formal** (sin tropicalismos, sin "tú", sin emojis dentro de los textos finales).

Una vez que ChatGPT devuelva la versión robustecida, Santiago la valida y Claude Code la sube a la BD via `UPDATE job_profiles SET mission=..., kpis=..., objectives=..., training_required=... WHERE id=...`.

---

**Fin del documento.**
