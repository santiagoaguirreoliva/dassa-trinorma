# SUPERPLAN · Trinorma rumbo a la auditoría Bureau Veritas (24–26 ago 2026)

**Escrito:** 2026-08-10 · **App:** `dassa-sgi` (prod, `trinorma.dassa.com.ar`, PM2 `dassa-sgi`, puerto 4001)
**Origen:** auditoría interna del 05/08/2026 (Vanina Cánepa) + 4 correos de Nixa Méndez + plan formal de Bureau Veritas (Sebastián Ezpeleta).

---

## 0 · El reloj

| Hito | Fecha | Días desde hoy |
|---|---|---|
| Auditoría interna (hecha) | 05/08/2026 | −5 |
| **Auditoría externa BV — día 1** | **24/08/2026** | **+14** |
| Auditoría externa BV — día 3 | 26/08/2026 | +16 |
| Informe off-site del auditor | 29/08/2026 | +19 |

Auditor líder: **Sebastián Ariel Ezpeleta (A1)**. Referencias BV: AR 5418795 (ISO 14001 + 45001, SV2) · AR 5419885 (ISO 9001, SV1).
Alcance auditado: almacenaje, clasificación y custodia en el depósito fiscal + gestión administrativa de transporte carretero DASSA ↔ Puerto de Buenos Aires. **No aplica 8.3** (Diseño y Desarrollo).

**Regla que ordena todo el plan:** cada cambio en la app tiene que poder mostrarse en la franja horaria en que el auditor lo pide. Lo que no llegue al 24/08 no entra.

---

## 1 · Qué mira el auditor y en qué pantalla se lo mostramos

Mapeo directo del plan de BV contra los módulos de la app. Esta tabla es la que hay que poder recorrer en vivo.

| Día · hora | Lo que audita | Pantalla que lo respalda | Estado hoy |
|---|---|---|---|
| **24/08 8:30** | Contexto, partes interesadas, riesgos y oportunidades, adenda Cambio Climático | `/context` (FODA 211 ítems) · `/riesgos-amfe` (F-TRI-08 Rev.2, 66 ítems) | ⚠️ Partes interesadas se sacaron de `/context`; **Cambio Climático sin tratar** |
| **24/08 10:00** | Manual de gestión, info documentada, liderazgo, política, alcance, **auditorías internas**, **gestión de NC y AC**, planificación de cambios, uso del logo | `/sistema-gestion` · `/documents` (33) · `/findings` (27) · `/cambios` (40) | ⚠️ **Sin módulo de auditorías internas** · NC/hallazgos mezclados |
| **24/08 13:00** | Servicio de almacenaje · mantenimiento y calibración | `/bi-operativo` · `/rondas` (90 inspecciones) | 🟡 Calibración de balanza observada por Nixa |
| **24/08 15:00** | Aspectos ambientales significativos + análisis de ciclo de vida · peligros y evaluación de riesgos | `/environmental` (88 aspectos, F×G×P) · `/riesgos-amfe` | ✅ Recién corregido (migr 071) · ⚠️ falta ciclo de vida |
| **25/08 8:00** | Gestión administrativa de transporte | `/suppliers` categoría transporte (4) | 🔴 **Transportistas tercerizados sin homologar** |
| **25/08 10:00** | Emergencias, simulacros, capacitaciones · **incidentes ambientales y accidentes laborales, informes a ART, análisis e investigación** | `/incidents` · `/trainings` (124) | 🔴 **`/incidents` VACÍO — 0 registros** |
| **25/08 13:00** | Requisitos del cliente, reclamos, quejas, satisfacción | `/satisfaction` (4 encuestas) · `/findings` | 🔴 **0 respuestas de encuesta** |
| **25/08 15:00** | Compras, evaluación y selección de proveedores, control de subcontratistas, criterios de ambiente y SST en compras | `/purchases` (147) · `/suppliers` (53) | 🟡 Evaluación OK · **criterios ambientales/SST ausentes** |
| **26/08 8:00** | Competencias, formación, perfiles de puesto, organigrama, consulta y participación | `/puestos` · `/organigrama` · `/employees` (32) · `/committee` (15) | ✅ Sano |
| **26/08 10:00** | Requisitos legales MA y SST + evaluación de cumplimiento | `/legal` | 🟡 A verificar |
| **26/08 11:00 y 13:00** | Seguimiento, medición, análisis y evaluación | `/objetivos` · `/bi-operativo` | 🔴 **Objetivos con dos generaciones conviviendo** |
| **26/08 15:00** | **Revisión por la dirección**, objetivos, indicadores, programa integrado | `/revision-direccion` · `/objetivos` | 🔴 Ver bloque F2 |

---

## 2 · Hallazgos verificados hoy contra la base productiva

Todo lo de abajo está comprobado con consultas a `dassa_sgi`, no supuesto.

### ✅ A · El registro de incidentes estaba roto de fábrica — RESUELTO 10/08
`incidents` tenía **0 filas** y Nixa reclamó: *"No lo vi cargado en la app"*. El accidente **sí estaba cargado, como `NC-2026-012` "Accidente Laboral"**, en el módulo equivocado.

La causa de fondo era peor: `gen_incident_code()` usaba `CASE incident_type` en vez de `CASE NEW.incident_type`, así que **todo INSERT en `incidents` fallaba** — desde la app y desde SQL. Sumado a eso, el formulario mandaba `type` y la API espera `incident_type`. El módulo nunca pudo grabar una fila; por eso los accidentes terminaban como no conformidades.

Corregido en las migraciones 073/074 y en el commit `e58b158`, junto con los campos de investigación que pide el marco legal (causa inmediata, causa raíz, testigos, ART, días perdidos).

**Pendiente de datos:** mover `NC-2026-012` al registro de incidentes con el análisis completo. Falta confirmar persona afectada, fecha y hora del hecho, si se denunció a la ART y días perdidos.

### 🔴 B · Objetivos: dos generaciones superpuestas
- `OBJ-01…OBJ-10` (tier estratégico): tienen 205 indicadores y 153 mediciones reales. **Solo 4 están `enabled`.** OBJ-03 tiene 38 indicadores y 34 mediciones cargadas y está apagado.
- `OBJ-2026-01…OBJ-2026-16`: **16 objetivos sin un solo indicador ni medición**, todos apagados.

Un auditor que abra Objetivos ve 26 objetivos para 2026, la mayoría vacíos. ISO 9001 6.2 exige qué, quién, cuándo, con qué recursos y cómo se evalúa. Este es el riesgo de NC más alto del sistema.

### 🔴 C · No conformidades y avisos no se pueden separar ni convertir
`findings.report_kind` ya distingue `nc` / `hallazgo` (23 NC + 3 hallazgos + 1 histórico), y el formulario público ya nace con uno u otro. Lo que falta:
1. **No se puede cambiar** de NC a hallazgo ni al revés desde la app.
2. `incidents` es una tabla **separada** de `findings`, sin ningún vínculo: un accidente nunca puede derivar en una no conformidad formal.

### 🔴 D-bis · Un proveedor suspendido figura como apto (pedido de Nixa por chat)
En la evaluación F-TRI-17 de DALE GAS conviven dos verdades en la misma pantalla: el total da **12/20 → SUSPENDIDO**, y el histórico del mismo año lo muestra como **"APTO PARA COMPRA"**. Nixa lo resumió como *"revisar consideración de proveedores como homologados"*.

Hay que definir qué manda: el resultado de la última evaluación o la marca de homologación. Hoy la homologación no se recalcula cuando la evaluación da suspendido, y el auditor mira esto el 25/08 a las 15:00.

También pidió **dar de alta a Top Service** (control de plagas y desinfección), que no está entre los 53.

### 🟡 D · Proveedores y transportistas tercerizados
- 53 proveedores, **los 53 marcados como críticos**. Si todos son críticos, no hay criterio de criticidad — el auditor lo va a preguntar el 25/08 a las 15:00.
- 41 homologados con fecha y vencimiento, 0 vencidos, 3 activos sin homologar.
- `supplier_documents` = **0** y `supplier_acknowledgements` = **0**: no hay ni un seguro, ni una ART, ni un acuse de la política integrada cargado. La landing pública de proveedores con acuse digital existe y **nunca se usó**.
- Nixa (23/06) pidió para transportistas tercerizados: divulgar la Política Integrada (T-TRI-01 rev 03), aprobar el **F-TRI-52 Requisitos para transportistas tercerizados** y dictar **8 capacitaciones** (SGI, seguridad vial, inspección preoperacional, carga y estiba, SST, gestión ambiental, emergencias, procedimientos DASSA). Hoy solo hay 4 proveedores de transporte cargados.

### 🟡 E · Encuestas de satisfacción sin una sola respuesta
4 campañas creadas, `survey_responses` = 0. El 25/08 a las 13:00 se audita satisfacción del cliente.

### 🟢 F · Ruido en el sistema
Módulos con entrada de menú y contenido nulo o marginal: `/contactos-externos` (3), `/inversiones` (6), agentes IA (5 tablas en 0), comunicaciones (7 tablas en 0, el menú apunta a otra app). El menú tiene **9 grupos y ~40 entradas** para 9 usuarios.

### ⚙️ G · Deuda técnica detectada de paso
- **Dos migraciones numeradas 071** (`071_environmental_fsd_ftri44.sql` y `071_npr_significativo_150.sql`). Hay que renumerar antes de que el runner las tome en orden alfabético equivocado.
- `CLAUDE.md` con 8 líneas sin commitear.
- Las estadísticas de Postgres están desactualizadas (`n_live_tup` daba 0 en tablas con 106 filas): falta un `ANALYZE`.

---

## 3 · El plan por bloques

Ordenados por lo que el auditor va a mirar y por dependencia real, no por comodidad de implementación.

### F0 · Base de evidencia — antes del 13/08
> Sin esto, lo demás decora un sistema que en la auditoría queda mudo.

1. **Cargar el accidente de Marcelo** en `/incidents` con el análisis completo que pide Nixa: hecho, causa inmediata, causa raíz, acción correctiva, reporte a ART, días perdidos, testigos. Investigación conforme marco legal (Ley 19.587 / Res. SRT).
2. **Registrar la auditoría interna del 05/08** como origen: los hallazgos que dejó Vanina Cánepa deben existir en `/findings` con `origin = 'auditoria_interna'` (hoy hay 4, verificar contra el informe cuando lo mande Nixa).
3. **Cargar los 11 pendientes operativos de plazoleta** del correo del 05/08 como hallazgos con responsable y fecha: cestos rotulados, carteles de fuera de uso, matafuego en el piso, montacargas, aparatos de izar, balanza báscula, recinto de residuos, kits antiderrame, luminarias IMPO, matafuego del escáner, hidrantes y sprinklers (estos dos van a `/cambios` porque Nixa pidió tratarlos como gestión de cambios).

**Criterio de éxito:** el 24/08 se puede abrir `/incidents` y `/findings` y mostrar cada punto que Nixa escribió, con responsable y fecha.

### F1 · Desvíos: no conformidades, avisos e incidentes — ✅ DEPLOYADO 10/08 (`e58b158`)
> El pedido central de Santi. Migraciones 073 y 074 aplicadas en producción.

1. **Vocabulario visible y único** en `/findings`: solapa *No conformidades* (acción correctiva formal, análisis de causa, verificación de eficacia 30/60) y solapa *Avisos e identificaciones* (aviso, observación, oportunidad de mejora — sin obligación de acción correctiva).
2. **Conversión en los dos sentidos**, con traza: pasar un aviso a no conformidad y viceversa, registrando quién convirtió, cuándo y por qué, en `finding_status_history`. Convertir a NC exige completar lo que la NC requiere; convertir a aviso pide motivo.
3. **Puente incidente → no conformidad**: desde un accidente o incidente ambiental, generar la NC asociada con un clic, quedando ambos vinculados. Es literalmente lo que el auditor busca el 25/08 a las 10:00.
4. Un solo lugar de entrada: el formulario público `/reporte-nc` ya distingue el tipo; unificar el rótulo con el de la app para que el operario y el auditor lean lo mismo.

**Criterio de éxito:** tomar un caso cargado como incidente, pasarlo a no conformidad delante del auditor y que quede el rastro de la conversión. — *Verificado con E2E el 10/08: ciclo completo NC → aviso → NC → incidente → NC del desvío, con los contadores del dashboard estables y 3 peticiones concurrentes (1 alta, 2 rechazos).*

De paso aparecieron y se corrigieron tres defectos que nadie había visto: el trigger que impedía grabar incidentes, el drift `type`/`incident_type` que rompía el alta y el filtro, y el dashboard contando como no conformidades los hallazgos archivados y los avisos.

### F2 · Objetivos — antes del 17/08
1. **Decidir la generación única de 2026.** Recomendación: quedarse con `OBJ-01…OBJ-10` (los que tienen indicadores y mediciones) y archivar los 16 `OBJ-2026-XX` vacíos, con snapshot de rollback.
2. **Encender lo que ya está medido**: OBJ-03 tiene 34 mediciones y está apagado; revisar los 6 objetivos deshabilitados uno por uno.
3. **Completar 6.2 en cada objetivo vivo**: responsable nominal, plazo, recursos, método de seguimiento y criterio de cumplimiento. Los criterios de actuación ante incumplimiento ya se agregaron (`b546a28`, migr 072) — hay que verlos renderizados.
4. Dejar `/objetivos` listo para proyectarse el 26/08 a las 15:00 junto con `/revision-direccion`.

**Criterio de éxito:** ningún objetivo 2026 visible sin indicador, responsable y plazo.

### F3 · Proveedores, homologación y transportistas — antes del 19/08
0. **Coherencia homologado vs evaluación** (pedido directo de Nixa): que un proveedor con puntaje de suspensión no pueda figurar como apto para compra. Revisar los 41 homologados contra el resultado de su última F-TRI-17. Alta de **Top Service** (control de plagas y desinfección).
1. **Criterio de criticidad explícito** y reclasificación: hoy los 53 son críticos. Definir la regla (impacto en el servicio, en ambiente o en SST) y aplicarla.
2. **Documentación por proveedor** (`supplier_documents` está en 0): póliza, ART, habilitaciones, con vencimiento y alerta. Es lo que el auditor pide como control de subcontratistas.
3. **F-TRI-52 para transportistas tercerizados**: circuito de homologación con los requisitos de Nixa + acuse de la Política Integrada T-TRI-01 rev 03 usando el mecanismo de acuse que ya existe y está sin usar.
4. **Las 8 capacitaciones de transportistas** cargadas en `/trainings` con su registro de asistencia.
5. **Criterios de ambiente y SST en compras** — el auditor los pide explícitamente el 25/08 a las 15:00 y hoy no existen en `/purchases`.

### F4 · Limpieza y navegabilidad — antes del 20/08
1. **Podar el menú**: de 9 grupos y ~40 entradas a la estructura que se recorre en auditoría. Ocultar (no borrar) lo que está vacío: contactos externos, agentes IA, comunicaciones.
2. **Reordenar por norma**, que es como pregunta el auditor: Dirección · Calidad 9001 · Ambiente 14001 · Seguridad 45001 · Operativo.
3. Unificar la doble entrada `/risks` + `/riesgos-amfe` (comparten la misma tabla, pendiente heredado del 13/07).
4. Renumerar la migración 071 duplicada, commitear `CLAUDE.md`, correr `ANALYZE`.

**Criterio de éxito:** un auditor que nunca vio la app llega a cualquier cláusula en dos clics.

### F5 · Respaldo documental para Bureau Veritas — 21 y 22/08
1. **Carpeta de evidencia por franja horaria** del plan de BV: para cada bloque, qué pantalla se abre y qué se imprime.
2. **Adenda de Cambio Climático** (ISO 9001/14001/45001, obligatoria desde 2024): el auditor la pide el 24/08 a las 8:30 y hoy no está tratada en `/context`.
3. **Ciclo de vida** en aspectos ambientales (24/08 15:00).
4. Verificar que las 27 pantallas muestren la leyenda "F-TRI-XX · Rev.N · fecha" actualizada tras cada cambio de este plan — **cada módulo que se toque cambia su fecha en `doc-revisions.json`**.
5. Ensayo general: recorrer las 13 franjas del plan como si fuera el auditor.

---

## 4 · Decisiones tomadas (2026-08-10)

1. **Objetivos 2026** → *revisar objetivo por objetivo con Santi*. Nada se archiva por lote: en F2 se listan los 26 con sus indicadores y mediciones y se decide uno por uno. Ninguna baja masiva sin su OK.
2. **Limpieza** → *ocultar del menú, no borrar*. Los datos y el código quedan; solo desaparecen de la navegación, reversible en un commit. Nada se elimina a 14 días de la auditoría.
3. **Orden de ataque** → arrancamos por **F1 · Desvíos (NC vs avisos)**, no por F0.

### Todavía sin definir
- **Criticidad de proveedores**: cuál es la regla real para que un proveedor sea crítico (hoy los 53 lo son). Necesario antes de F3.
- **Capacitaciones de transportistas**: ¿ya se dictaron y hay que cargarlas, o hay que planificarlas?

---

## 5 · Lo que falta para cerrar el plan

- Los mensajes con las modificaciones exactas que Santi mencionó (los del chat, todavía no incorporados).
- El **informe formal de la auditoría interna del 05/08** de Vanina Cánepa — al 10/08 no llegó por correo. Sin él, F0.2 se carga con lo que recordemos, no con la letra del auditor.

---

## 6 · Reglas de trabajo

- App en producción: cada bloque entra por el ciclo de **cambio seguro** (entender → planificar y aprobar → cambio quirúrgico → verificar y cerrar).
- Todo cambio de datos masivo lleva snapshot de rollback en `/tmp` antes de ejecutarse.
- `npm run check` (typecheck + lint) antes de cada commit.
- Al tocar un módulo se actualiza su fecha en `src/lib/doc-revisions.json`.
