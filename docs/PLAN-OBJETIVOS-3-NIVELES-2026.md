# Plan — Trinorma como Sistema Integral de Gestión (3 niveles)

> Documento de PLANIFICACIÓN (no implementado aún). Acordado con Santi 2026-06-25.
> Reorganiza la app en 3 niveles: **Objetivos estratégicos → Proyectos estratégicos → Plan de inversiones**.
> Objetivo de esta fase: dejar la lista **unificada y mejorada** de objetivos + KPIs + conectores de datos,
> antes de codear nada.

## Decisiones de rumbo (Santi, 2026-06-25)
1. **Objetivos:** construir una lista unificada nueva fusionando los 16 (2026) + 11 (2025) existentes con los 10 propuestos; reusar las 91 mediciones existentes vía conectores.
2. **Niveles nuevos:** construir Proyectos estratégicos **y** Plan de inversiones.
3. **Automatización:** arrancar por los KPIs con fuente digital viva; el resto carga manual asistida.
4. **TRINY:** cron mensual junta métricas + sincroniza `current_value`; TRINY (LLM) redacta el resumen narrativo por mes cerrado.

## Estado actual (BD viva, 2026-06-25)
- `objectives`: 11 (2025) + 16 (2026), todos activos. `current_value` vacío en todos (no se sincroniza desde measurements).
- `objective_indicators`: 16 (modelo usado 1 objetivo → 1 indicador). `objective_measurements`: **91** (ene-2025 → may-2026).
- Cobertura: 🟢 vivos IMPO/EXPO/Mix (hasta may-2026) · 🟡 congelados Forzoso/Desconsolidación/Energía/Accidentes/DíasPerdidos (ago-2025) · 🔴 sin datos Satisfacción/Papel/Agua/Capacitaciones/Bienestar/EBITDA/OEA/ERP.

Leyenda conectores — **Estado**: 🟢 vivo · 🟡 congelado (existió, parar ago-2025) · 🔵 construible (hay fuente, falta cablear) · 🔴 manual (sin fuente digital aún).

---

# NIVEL 1 — OBJETIVOS ESTRATÉGICOS (lista unificada propuesta · 10)

## OBJ-01 · Crecimiento Comercial
Incrementar el volumen de operaciones y desarrollar nuevos clientes.

| KPI | Origen | Conector (fuente automática) | Estado |
|---|---|---|---|
| Operaciones IMPO (CNT/mes) | OBJ-2026-02 | `depofis_mirror` / app Orden | 🟢 |
| Operaciones EXPO (CNT/mes) | OBJ-2026-03 | `depofis_mirror` / app Orden | 🟢 |
| Mix IMPO (%) | OBJ-2026-04 | derivado IMPO/EXPO | 🟢 |
| Nuevos clientes | nuevo | Depofis (1ª operación) / CRM Odoo | 🔵 |
| Retención de clientes | nuevo | Depofis (recurrencia) | 🔵 |
| NPS | nuevo (←CC-2026-12) | Portal Clientes/Mudancera | 🔵 |

## OBJ-02 · Rentabilidad
Mejorar la rentabilidad mediante gestión eficiente de costos, precios y productividad.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| EBITDA | OBJ-2026-14 | tablero `/costos` + Odoo | 🔵 (CC-07) |
| Margen EBITDA (%) | OBJ-2026-14 | `/costos` + Odoo | 🔵 (CC-07) |
| Facturación | nuevo | Odoo / ctaccted (espejo) | 🔵 |
| Rentabilidad por operación | nuevo | costeo ABC (CC-07) | 🔵 |
| Rentabilidad por cliente | nuevo | costeo ABC (CC-07) | 🔵 |

## OBJ-03 · Excelencia Operativa
Optimizar eficiencia, productividad y trazabilidad de las operaciones.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| Forzoso en término (%) | OBJ-2026-05 | app Orden/Tally + espejo | 🟡 (CC-09) |
| Días de desconsolidación | OBJ-2026-06 | app Orden/Tally + espejo | 🟡 (CC-09) |
| Tiempo ciclo IMPO | nuevo | app Orden (timestamps) | 🔵 |
| Tiempo ciclo EXPO | nuevo | app Orden (timestamps) | 🔵 |
| Productividad (cuadrilla) | nuevo | Orden/Tally (horas) | 🔵 |
| Incidentes / errores operativos | nuevo | Orden (anomalías) / manual | 🔴 |

## OBJ-04 · Clientes
Mejorar satisfacción y fidelización.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| NPS | nuevo (←CC-12) | Portales | 🔵 |
| Reclamos | nuevo | Trinorma (findings/NC) / portales | 🔵 |
| Tiempo de respuesta | nuevo | portales / mail | 🔴 |
| SLA cumplido | nuevo | Orden + acuerdos | 🔵 |
| Clientes recuperados | nuevo | CRM/COMEX (CC-10) | 🔵 |
| Satisfacción promedio (%) | OBJ-2026-01 | encuesta/NPS | 🔵 |

## OBJ-05 · Personas y SST (ISO 45001)
Ambiente de trabajo seguro, saludable y con personal capacitado.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| Accidentes c/ tiempo perdido · Días perdidos | OBJ-2026-10/11 | registro SySO (Trinorma) | 🟡→🔴 |
| Accidentes s/ tiempo perdido · Incidentes · Casi accidentes · Observaciones preventivas · Uso EPP | nuevo | registro SySO (Trinorma, módulo) | 🔴 |
| Ausentismo · Enfermedades laborales · Aptos médicos vigentes · Simulacros | nuevo | RRHH / Trinorma (certs) | 🔴/🔵 |
| Horas capacitación · % personal capacitado · Competencias por puesto · Polivalencia | OBJ-2026-12 + nuevo | Trinorma `trainings`/`training_participants`/fichas | 🔵 |
| Clima laboral · Rotación · Evaluaciones de desempeño | OBJ-2026-13 + nuevo | RRHH / Trinorma | 🔴 |

## OBJ-06 · Medio Ambiente (ISO 14001, separado de SST)
Reducir el impacto ambiental y promover uso eficiente de recursos.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| Energía (kWh) | OBJ-2026-07 | medidor/factura (manual o integración) | 🟡→🔴 |
| Agua (m³) | OBJ-2026-09 | factura Aysa | 🔴 |
| Papel (kg) | OBJ-2026-08 | manual | 🔴 |
| Combustible | nuevo | manual | 🔴 |
| Residuos reciclados/peligrosos/comunes | nuevo | registro ambiental | 🔴 |
| Emisiones CO₂ · Árboles plantados · Derrames · Incidentes ambientales | nuevo | registro ambiental | 🔴 |
| Requisitos legales · Aspectos ambientales controlados | nuevo | Trinorma (`legal_requirements`, aspectos) | 🔵 |

## OBJ-07 · Transformación Digital (nuevo)
Digitalizar integralmente la gestión con apps propias e IA.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| % procesos digitalizados | nuevo | inventario de procesos (manual) | 🔴 |
| Usuarios activos | nuevo | SSO Smart DASSA / apps | 🔵 |
| Apps implementadas · Automatizaciones | nuevo | inventario ecosistema | 🔴 |
| Uso IA · Tiempo ahorrado | nuevo | `agent_runs` / tablero costos | 🔵 |
| Documentos digitalizados | nuevo | Trinorma `documents` | 🔵 |

## OBJ-08 · Modernización Administrativa — Odoo (nuevo)
Modernizar la administración con el ERP Odoo.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| % implementación Odoo · Módulos · Usuarios migrados · Procesos migrados · Integraciones · Eliminación de planillas Excel | OBJ-2026-16 + nuevo | seguimiento proyecto Odoo (manual / Odoo) | 🔴/🔵 |

## OBJ-09 · Sistema Integrado de Gestión
Mantener un SGI eficaz y en mejora continua.

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| Objetivos cumplidos | nuevo | la propia Trinorma (`objectives`) | 🟢 |
| Auditorías · No conformidades · Acciones correctivas | nuevo | Trinorma (`audits`, `findings`/`nc`) | 🟢 |
| Requisitos legales | nuevo | Trinorma (`legal_requirements`) | 🔵 |
| Estado documental | nuevo | Trinorma (`documents`) | 🟢 |
| Estado OEA | OBJ-2026-15 | seguimiento trámite (manual) | 🔴 |

## OBJ-10 · Digitalización del SGI (nuevo)
Migrar el SGI de Google Drive a la plataforma nativa DASSA (Trinorma).

| KPI | Origen | Conector | Estado |
|---|---|---|---|
| % documentos migrados · Procedimientos migrados · Formularios digitales · Registros digitales | nuevo | Trinorma (`documents`/`procedures`) vs índice Drive | 🔵 |
| Indicadores online | nuevo | `objective_indicators` con conector | 🟢 |
| Eliminación de archivos Drive · Usuarios activos Trinorma | nuevo | Drive API / SSO | 🔵 |

> **Objetivos 2025 huérfanos a reubicar:** OBJ-2025-06 "Programa Completá tus Estudios" → KPI de OBJ-05 (Capacitación/Personas).

---

# NIVEL 2 — PROYECTOS ESTRATÉGICOS (entidad nueva)
Impulsan los objetivos; NO son objetivos. Distintos de `change_requests` (acciones de mejora del SGI).
Campos propuestos: nombre · área (Tecnología/Operación/Comercial/Personas/Ambiente) · estado · % avance · objetivo(s) que impulsa · responsable · link.

- **Tecnología:** ERP Odoo · DASSA Trinorma App · Portal Clientes · Portal Proveedores · RR.AI · FICO · TRINY · SINCRO · Dashboard Ejecutivo · Cashflow Online · Metabase · MOVERS · OEA Digital
- **Operación:** Reach Stacker · Autoelevadores · Robot NEO · Red Hidrantes · CCTV IA · Control Accesos · QR Operativos
- **Comercial:** Nuevo sitio web · Marketing 2026 · CRM · SEO · Encuestas NPS
- **Personas:** Universidad DASSA · Matriz de competencias · Polivalencia · Plan Carrera
- **Ambiente:** Paneles solares · Gestión de residuos · Contingencia hídrica · Forestación

# NIVEL 3 — PLAN DE INVERSIONES (entidad nueva)
Campos: proyecto · responsable · área · prioridad · monto (USD) · estado · fecha prevista · fecha real · ROI esperado.
Semilla (Santi): Reach Stacker (Operaciones, 520.000, En análisis) · Robot NEO (Tecnología, 20.000, Pendiente) · Paneles Solares (Ambiente, 50.000, Planificado) · Red Hidrantes (SST, 50.000, En ejecución) · Odoo (Administración, 10.000, Desarrollo) · Trinorma App (Tecnología, Interno, Desarrollo).

---

# AUTOMATIZACIÓN (Fase 1 = lo ya vivo)
1. **Conectores 🟢 primero:** IMPO/EXPO/Mix desde `depofis_mirror`/Orden → `objective_measurements` mensual.
2. **Sincronizar `current_value`** del objetivo con la última medición (hueco actual).
3. Costeo/EBITDA (🔵) cuando avance CC-2026-07.
4. Resto 🔴/🔵 → formulario de carga manual asistida en Trinorma con recordatorio mensual.

Modelo de conector (propuesto): `objective_indicators.metadata` con `{ source: 'depofis_mirror'|'orden'|'costos'|'trinorma'|'manual', query_key, unit, transform }` → un job lee el conector y escribe la medición del mes cerrado.

# TRINY — seguimiento + resumen mensual (Cron + narra)
- **Cron mensual (mes cerrado):** (a) corre los conectores 🟢/🔵 → inserta `objective_measurements`; (b) sincroniza `current_value` + semáforo (cumple/no cumple vs target); (c) arma el dataset del mes por objetivo.
- **TRINY (LLM, solo texto):** redacta el resumen narrativo por objetivo (tendencia, cumplimiento, alertas, acción sugerida) → guarda como "Informe mensual de objetivos" + lo eningresa a la Revisión por la Dirección.
- Patrón barato (ver skills `agente-vs-script` / `ciclo-estudio-agente`): los números los hace el cron; el LLM solo narra.

---

# PRÓXIMOS PASOS (a aprobar)
1. Validar/ajustar esta lista unificada de 10 objetivos + KPIs + conectores.
2. Definir el modelo de datos: `objectives` (N indicadores), `strategic_projects` (nuevo), `investments` (nuevo), `objective_indicators.metadata.source` (conector).
3. Fase 1 de implementación: migrar a los 10 objetivos + re-vincular las 91 mediciones + cablear conectores 🟢 + sync `current_value`.
4. Construir niveles 2 y 3 (Proyectos + Inversiones) con sus vistas.
5. Cron + TRINY narrador mensual.
