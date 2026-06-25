# Plan de Objetivos y Proyectos de Mejora · DASSA 2025-2026

> Derivado del FODA 2025-2026 (8 líneas estratégicas) y alineado a los 16 Objetivos 2026 y la Visión 2030.
> Generado 2026-06-25. Cubre 16/16 objetivos · 26 proyectos (10 P0 / 13 P1 / 3 P2). De aquí salen las change_requests 2026 y las context_strategies del SGI.

## Resumen

Plan consolidado 2026 de DASSA: 8 estrategias FODA (2 FO, 2 DO, 2 DA, 2 FA) destiladas en 26 proyectos de mejora deduplicados (CC-2026-01 a 26), todos accionables, con responsable por rol, plazo trimestral, KPI y prioridad pasa/no-pasa. La deduplicación fue el eje del trabajo: cinco estrategias proponían su propia versión del costeo/EBITDA por operación (unificado en CC-2026-07), tres pedían regularizar CAA/ADR (CC-2026-01), dos certificar OEA (CC-2026-02), cuatro sanear el SGI (CC-2026-03), dos medir NPS (CC-2026-12), tres reactivar el pipeline (CC-2026-10 transversal + CC-2026-14 vertical premium) y dos diversificar cartera (CC-2026-20); el pricing gobernado y el indexado se fusionaron en CC-2026-08. Secuencia lógica: el plan está encadenado por dependencias —CC-2026-01 (legal) habilita el producto premium y OEA; CC-2026-07 (costeo) es precondición del pricing, el NPS+margen y el tablero ancla; CC-2026-15 (escritura auditable al WMS) es prerrequisito de OEA. Prioridad: 10 proyectos P0 (los 9 que el auditor exige ver —legal, OEA, SGI, capacitaciones, contingencia hídrica, ciberseguridad, costeo, KPIs de planta y trazabilidad WMS— más la reactivación de cotizaciones dormidas CC-2026-10, P0 por impacto comercial inmediato), 13 P1 de alto impacto y 3 P2 deseables. Cobertura: 16/16 objetivos con al menos un proyecto; se detectaron tres objetivos huérfanos o casi en las estrategias originales (OBJ-03 Exportación, OBJ-08 Papel, OBJ-10 Accidentes) y se cerraron con tres proyectos agregados (CC-2026-24, 25, 26). Roadmap: Q1 carga lo legal/SGI/comercial de arranque; Q2 concentra el grueso operativo y técnico (6 de los 10 P0, más el arranque del expediente OEA) para llegar listos a la auditoría; Q3 ejecuta el hito OEA pasa/no-pasa (~julio), pricing, financiamiento, gobierno de IA y los objetivos ambientales/SySO; Q4 cierra diversificación y consolida el cuadro de mando para la Revisión por la Dirección y el plan 2027. Realista para una PyME de ~32 personas: aprovecha infraestructura ya pagada (espejo Postgres, tablero /costos, portales, agentes), evita gasto descontrolado de IA con la lección del incidente luz-bus, y concentra el esfuerzo en cerrar gaps de gestión existentes más que en construir desde cero. El plan completo, además, es el output que debe poblar context_strategies y generar las change_requests 2026 hoy faltantes (vía CC-2026-03)."

## Estrategias (8 · context_strategies)

### [FO] DASSA Premium DG/IMO — Llenar capacidad ociosa con carga de alto margen
- Responsable: CEO/Gerente General (Manuel)
- Estrategia ofensiva (Fortalezas x Oportunidades): apalanca la capacidad instalada subutilizada (+30%) del depósito fiscal y la trinorma ISO 9001/14001/45001 sobre el nicho de carga peligrosa (IMO/DG), farma y mercadería sensible que la competencia no opera con cumplimiento. Monetiza la capacidad ociosa con tarifa premium en vez de volumen commodity que erosiona margen, cierra el gap IMPO (run-rate ~2.184 vs meta 3.800 CNT) captando volumen de alto margen y es palanca directa del salto EBITDA +17%. Pre-requisito legal duro: ADR/CAA vigentes.
- Acciones: 
  - Renovar y dejar vigentes las habilitaciones CAA y certificación ADR como llave legal del producto DG/IMO
  - Diseñar y tarifar el producto Depósito Premium DG/IMO/Farma con segregación por clase, control de temperatura y trazabilidad documental sobre la trinorma
  - Reactivar el pipeline comercial con foco en forwarders/dadores de carga IMO/DG/farma de importación para empujar mix a 55%
  - Instrumentar la medición de EBITDA por operación para probar que el premium levanta el margen

### [FO] Premium Digital DASSA 4.0 — vender el diferencial tecnológico + TRINORMA/OEA a grandes marcas y farma-química
- Responsable: Responsable Comercial (Manuel/Santiago)
- Estrategia ofensiva (Fortalezas x Oportunidades): convierte los activos digitales ya construidos de Smart DASSA 4.0 (Tráfico Manager, Orden del Día con e-Tally/SuperTally, Cadena Madre de trazabilidad CC=numero_orden, Portal Mudancera y Portal Clientes) y el sello TRINORMA (único depósito trinorma del polo, auditado Bureau Veritas) en una propuesta de valor premium verificable dirigida a grandes marcas y clientes farma-química que exigen trazabilidad, seguridad y cumplimiento. Empaqueta el diferencial como dossier y demo vendibles, reactiva el pipeline con FICO/HubSpot bajo HITL y usa OEA como llave formal de entrada a esas cuentas.
- Acciones: 
  - Empaquetar el diferencial Smart DASSA 4.0 + TRINORMA en un dossier de venta premium apalancado en la landing Árbol de mensajes de marca
  - Cargar las oportunidades 2026 en HubSpot y poner a FICO/COMEX (interno, HITL) a nutrir y priorizar leads de grandes marcas y farma
  - Cerrar la certificación OEA y la regularización CAA/ADR como requisito formal de entrada a cuentas premium
  - Convertir la trazabilidad e-Tally/Portal en una demo cliente-facing navegable end-to-end para reuniones comerciales

### [DO] Margen Vivo 2026 — costeo por operación, pricing gobernado y KPIs de planta sobre Odoo + espejo Postgres
- Responsable: Analista de Datos/Procesos/IA (Santiago)
- Estrategia DO (mini-max): toma la oportunidad del go-live de Odoo (Obj 16, Q2) y la infraestructura ya construida (depofis_mirror + tablero /costos) para neutralizar la debilidad central: el EBITDA no es medible por operación ni cliente, el pricing se fija sin piso de margen y los KPIs de planta (forzoso, desconsolidación) no están cerrados. Construye costeo ABC por operación/cliente, un tablero de pricing gobernado con piso de margen, instrumenta y cierra los KPIs de planta y sanea la capa de gestión, para habilitar el salto EBITDA +17% con dato real y dejar un cuadro de mando vivo para la revisión por la dirección y la auditoría OEA.
- Acciones: 
  - Construir el modelo de costeo ABC por operación y por cliente cruzando Odoo/ctaccted con costos directos sobre el espejo Postgres
  - Implementar un tablero de pricing gobernado con piso de margen y semáforo de cotización
  - Instrumentar y cerrar los KPIs de planta: forzoso ≥97% y días de desconsolidación <3 con captura automática
  - Sanear la capa de gestión (current_value de los 16 objetivos, context_strategies, change_requests 2026) y conectar el tablero EBITDA a la revisión por la dirección

### [DO] Reactivación del Motor Comercial 4.0 — del pipeline dormido a la cartera diversificada
- Responsable: Responsable Comercial (Manuel/Santiago)
- Estrategia DO (Debilidades x Oportunidades): DASSA tiene un aparato comercial robusto pero apagado (541 cotizaciones, ~319 dormidas; CRM HubSpot sucio en migración a Odoo; agente FICO/COMEX subutilizado; conversión web 0/34; cero NPS; sobre-concentración en Liftvan). La oportunidad: importador PyME desatendido, OEA como diferenciador y rollout de Odoo CRM+Ventas+Facturación. Reactiva las cotizaciones dormidas con COMEX bajo HITL, higieniza el CRM en la migración cerrando el agujero de conversión, mide NPS desde los portales vivos, posiciona contenido/SEO al importador PyME y abre cartera más allá de Liftvan, todo auditable dentro del SGI.
- Acciones: 
  - Reactivar las ~319 cotizaciones dormidas con el job seguimientoComercial de COMEX bajo gate HITL, clasificando gana/pierde/recotiza
  - Deduplicar y normalizar el CRM antes de migrarlo a Odoo y formalizar el circuito captura→asignación HITL→deal cerrando la conversión 0/34
  - Embeber un módulo NPS en los portales para medir satisfacción real al cierre de operación
  - Producir contenido/SEO nicho importador PyME y captar cartera nueva fuera de Liftvan usando OEA como diferenciador

### [DA] Blindaje de Certificación pre-auditoría julio 2026 — Cero hallazgos mayores
- Responsable: Director General/Líder SGI (Santiago)
- Estrategia defensiva (Debilidades x Amenazas): la amenaza es la auditoría de recertificación/OEA prevista ~julio 2026, que puede arrojar no conformidades mayores y poner en riesgo la trinorma y el sello OEA. Las debilidades que la exponen: requisitos legales CAA/ADR vencidos, capacitaciones SySO/DG/IMO sin evidencia, legajos incompletos y SGI con vacíos (objetivos sin current_value, context_strategies vacía, change_requests todas de 2024). Minimiza estas debilidades para sobrevivir a la amenaza con criterio pasa/no-pasa: lo que el auditor pide ver es P0.
- Acciones: 
  - Llevar la matriz de requisitos legales a 10/10 vigentes priorizando CAA y ADR como hallazgo mayor seguro
  - Cerrar la evidencia de competencia: plan de capacitación SySO/DG/IMO con planillas de asistencia, temario y certificados cargados
  - Completar al 100% legajos y fichas de puesto (ART, examen médico, EPP firmado) por colaborador
  - Dejar el tablero SGI auditable: current_value de los 16 objetivos, context_strategies poblada y change_requests 2026 + acta de Revisión por la Dirección

### [DA] Resiliencia física, financiera y de cartera frente a shocks (DASSA Blindaje 2026)
- Responsable: CEO/Gerente General (Manuel)
- Estrategia defensiva (Debilidades x Amenazas) que blinda continuidad, margen y caja contra tres shocks: FÍSICO (predio en zona inundable sin plan de contingencia hídrica probado ni mantenimiento edilicio formalizado, agravado por la ampliación +30% de activos; hallazgo seguro ISO 14001/45001), FINANCIERO/MACRO (EBITDA no atribuible, tarifas en pesos que pierden contra inflación ~30% y dólar atrasado, DSO largo que consume capital de trabajo) y de CARTERA (Liftvan ~77%, Top-7 53% IMPO/73% EXPO, entrada de competidor de escala Exolgan/ITL-PSA). Ataca cada pilar con contingencia hídrica+mantenimiento, pricing indexado IPC/ICL+USD, financiamiento PyME subsidiado y diversificación activa de cartera.
- Acciones: 
  - Documentar y probar el plan de contingencia hídrica + formalizar el plan de mantenimiento edilicio sobre la base de activos ampliada
  - Formalizar la política de pricing indexado (IPC/ICL + tarifa USD al TC) en contratos y cotizaciones para defender el margen real
  - Conseguir líneas de financiamiento PyME a tasa subsidiada (MiPyME/SGR/BICE/leasing) para mitigaciones y capital de trabajo
  - Diversificar activamente la cartera para reducir la dependencia de Liftvan antes de que el entrante de escala seduzca a la cuenta ancla

### [FA] Blindaje de Cuenta Ancla y Talento (Foso Competitivo DASSA 4.0)
- Responsable: Responsable Comercial (Manuel/Santiago)
- Estrategia FA (Fortalezas x Amenazas) que usa trazabilidad punta a punta, trato personalizado y cultura trinorma para neutralizar dos amenazas: un competidor entrante que ataque la cuenta ancla y el Top-7, y la fuga de talento operativo clave. Construye un foso competitivo no replicable: si la mudancera ancla ve su carga en tiempo real, recibe trato 1-a-1 con SLA medido y dispara una alerta NPS antes de que un reclamo escale (caso Henn), el costo de cambio se vuelve prohibitivo; en paralelo posiciona a DASSA como empleador diferencial para retener el know-how. Marco CAME + Balanced Scorecard + ISO 9.1.2/9.3/7.2.
- Acciones: 
  - Crear el Tablero de Salud del Cliente Top-7 (Liftvan primero) y formalizar la revisión trimestral de servicio 1-a-1 con SLA cumplido
  - Implementar el sistema NPS de cierre de lazo anti-Henn con alerta de detractor y contacto en <24h
  - Blindar el know-how operativo con plan de retención de talento clave, mapa de sucesión y evidencia de capacitación digitalizada
  - Registrar y cascada de estrategias del SGI (context_strategies) con current_value cargado y Revisión por la Dirección trimestral

### [FA] Hardening tecnológico y gobierno de IA con escritura auditable al WMS (Política 4.0 · ISO 7.5 · OEA)
- Responsable: Responsable de Tecnología
- Estrategia FA (Fortalezas x Amenazas): usa las fortalezas tecnológicas reales (escritura INSERT/UPDATE auditada a DEPOFIS con ledger idempotente, doble espejo, bus y agentes en producción) para neutralizar superficie de ciberataque, errores/fraude por escritura no trazable, gasto descontrolado de agentes IA (incidente luz-bus-inbox-processor ~US$3.000/mes→US$12 tras gobierno) y discontinuidad de DEPOFIS durante la migración a Odoo. Convierte capacidades dispersas en un sistema de gobierno: ciberseguridad uniforme (estándar dassa-blindaje-apps), trazabilidad de escritura al WMS (us_add propio + audit + rollback) como requisito OEA, control de cambios formal + supervisión gradual de agentes, y continuidad del doble espejo con plan de cutover a Odoo.
- Acciones: 
  - Implementar identidad propia y trazabilidad en la escritura al WMS DEPOFIS (us_add propio + audit_log + camino de rollback)
  - Aplicar el gate de ciberseguridad pasa/no-pasa (estándar dassa-blindaje-apps) en todas las apps expuestas
  - Formalizar el control de cambios 2026 y el gobierno/supervisión de agentes IA (FICO bidireccional gradual con runbook y filtro de telemetría sin LLM)
  - Asegurar la continuidad del doble espejo y la convivencia controlada con la migración a Odoo (shadow-compare + plan de cutover, ISO 7.5)

## Proyectos de mejora 2026 (change_requests)

### CC-2026-01 · Regularización de requisitos legales 10/10 — sprint CAA + ADR primero  
**[P0 · Q1 2026]** · Objetivos: OBJ-2026-15, OBJ-2026-02 · Responsable: Director General/Líder SGI (Santiago) · Estrategia: Blindaje de Certificación pre-auditoría julio 2026  
Llevar la matriz de requisitos legales aplicables a 10/10 vigentes antes de la auditoría ~julio 2026, priorizando la renovación de los dos vencidos que son hallazgo mayor seguro: el Certificado Ambiental Anual (CAA, eje ISO 14001) y la habilitación/curso ADR de mercancías peligrosas (eje ISO 45001). Es el pre-requisito legal duro para operar carga IMO/DG (habilita CC-2026-02/03), resistir la auditoría OEA y levantar la no conformidad asociada. Incluye relevar vencimientos, asignar responsable, gestionar el trámite, cargar el certificado en el SGI y configurar alerta de renovación >60 días antes. Unifica los tres proyectos legales de las estrategias FO-Premium, FO-Digital y DA-Blindaje.  
_KPI:_ Requisitos legales vigentes 10/10 con certificado cargado en el SGI; CAA y ADR renovados con vencimiento posterior a la auditoría (0 vencidos); alerta de renovación configurada >60 días antes del próximo vencimiento.

### CC-2026-02 · Certificación OEA 2026 (expediente y auditoría pasa/no-pasa)  
**[P0 · Q3 2026]** · Objetivos: OBJ-2026-15 · Responsable: Director General/Líder SGI (Santiago) · Estrategia: Premium Digital DASSA 4.0  
Cerrar el expediente de Certificación OEA (Operador Económico Autorizado), llave formal de entrada a grandes marcas y farma-química y sello que hace creíble la propuesta premium. Apalanca el SGI Trinorma ya construido (dassa-sgi), el registro de requisitos legales (depende de CC-2026-01) y la trazabilidad punta a punta de escritura al WMS (depende de CC-2026-15). Unifica la certificación OEA de FO-Digital y DA-Blindaje y es el norte pasa/no-pasa de toda la línea defensiva 2026.  
_KPI:_ OEA certificada en 2026 (hito pasa/no-pasa); 100% de requisitos legales CAA/ADR vigentes con evidencia cargada antes de la auditoría; expediente OEA completo y trazabilidad de stock fiscal demostrable.

### CC-2026-03 · Saneamiento de la capa de gestión SGI y tablero EBITDA para Revisión por la Dirección/OEA  
**[P0 · Q1 2026]** · Objetivos: OBJ-2026-15, OBJ-2026-14, OBJ-2026-16 · Responsable: Directora SGI Consultora (Nixa) · Estrategia: Blindaje de Cuenta Ancla y Talento  
Cerrar el gap de gobierno del dato unificando los cuatro proyectos de saneamiento SGI (DO-MargenVivo, DA-Blindaje, FA-Ancla, FA-Hardening): cargar el current_value de los 16 objetivos 2026 (hoy vacío), poblar context_strategies con las 8 líneas FODA (hoy vacía), registrar las change_requests 2026 (todas son de 2024) y conectar el tablero EBITDA por operación a la Revisión por la Dirección trimestral. Deja el cuadro de mando integral vivo y auditable, indispensable para OEA (cláusula 9.1/9.3) y para que el salto EBITDA +17% sea seguible mes a mes.  
_KPI:_ 16/16 objetivos con current_value cargado y tendencia; context_strategies con las 8 estrategias FODA registradas; ≥1 change_request 2026 por estrategia; 4/4 Revisiones por la Dirección con acta y tablero EBITDA presentado.

### CC-2026-04 · Carga de evidencia de competencia: capacitaciones SySO/DG/IMO + planilla de asistencia  
**[P0 · Q2 2026]** · Objetivos: OBJ-2026-12, OBJ-2026-15 · Responsable: Responsable SySO · Estrategia: Blindaje de Certificación pre-auditoría julio 2026  
Cerrar el gap de cláusula 7.2 (competencia) de ISO 45001/9001: armar el plan anual de capacitación con foco SySO, Dangerous Goods e IMO, dictar/registrar las sesiones y cargar la evidencia auditable (planillas firmadas, temario, evaluaciones, certificados del instructor) en el SGI. Sostiene Obj 12 (capacitaciones SySO +20% de asistencia) y elimina la observación de capacitaciones sin evidencia. Es prerrequisito de la auditoría y refuerza la operación legal de carga DG (junto a CC-2026-01).  
_KPI:_ 100% de las capacitaciones SySO/DG/IMO del plan con evidencia cargada (asistencia firmada + temario + certificado); asistencia SySO +20% vs baseline; 0 capacitaciones sin registro al día de la auditoría.

### CC-2026-05 · Plan de Contingencia Hídrica + Mantenimiento Edilicio formalizado (predio zona inundable)  
**[P0 · Q2 2026]** · Objetivos: OBJ-2026-09, OBJ-2026-11, OBJ-2026-15 · Responsable: Supervisor de Depósito (Marcelo) · Estrategia: Resiliencia física, financiera y de cartera frente a shocks  
Cerrar la vulnerabilidad física estructural del predio: documentar y PROBAR un plan de contingencia ante anegamiento/inundación de efluentes (rutas de evacuación de mercadería fiscal en forzoso, capacidad de bombeo, niveles de alerta, roles, simulacro) y formalizar un plan de mantenimiento edilicio con cronograma sobre la base de activos ampliada +30% (cubiertas, pisos, desagües, instalaciones). Neutraliza el hallazgo de no conformidad mayor seguro en ISO 14001/45001 (preparación y respuesta ante emergencias) antes de la auditoría de julio 2026 y protege la continuidad operativa.  
_KPI:_ Plan de contingencia hídrica documentado, aprobado y con 1 simulacro ejecutado y registrado; plan de mantenimiento edilicio con 100% de tareas programadas y ≥90% cumplidas en el trimestre; 0 no conformidades mayores por preparación ante emergencias.

### CC-2026-06 · Ciberseguridad uniforme: gate de blindaje pasa/no-pasa en todas las apps expuestas  
**[P0 · Q2 2026]** · Objetivos: OBJ-2026-15, OBJ-2026-01 · Responsable: Responsable de Tecnología · Estrategia: Hardening tecnológico y gobierno de IA  
Homogeneizar el nivel de seguridad heterogéneo entre apps del servidor DASSA/Pymetech (Tráfico, Orden, Trinorma, portales mudancera/clientes, marketing-agency) aplicando el estándar oficial dassa-blindaje-apps como gate obligatorio antes de exponer o re-deployar: rate-limit server-side, RLS en todas las tablas, validación Zod, headers helmet+CSP+HSTS, CORS allowlist, secrets fuera del repo, cookies seguras, audit triggers, logging sin PII y heartbeat a Fortaleza. Correr AUDIT en cada app, remediar P0/P1 y emitir certificado. Neutraliza la amenaza de ciberataque sobre datos fiscales y de clientes, condición transversal para OEA.  
_KPI:_ 100% de apps expuestas con auditoría dassa-blindaje-apps ejecutada y certificado emitido; 0 hallazgos P0 abiertos; RLS activo en el 100% de tablas con PII/datos fiscales; heartbeat a Fortaleza vivo en todas las apps core.

### CC-2026-07 · Modelo de costeo ABC / EBITDA por operación y por cliente sobre Odoo + espejo Postgres  
**[P0 · Q2 2026]** · Objetivos: OBJ-2026-14, OBJ-2026-16, OBJ-2026-06 · Responsable: Analista de Datos/Procesos/IA (Santiago) · Estrategia: Margen Vivo 2026  
Construir el motor de margen que falta —proyecto pivote que aparecía en 5 estrategias—: una vista que para cada contenedor (operacion_id) y cada cliente cruce el ingreso facturado (Odoo/ctaccted) contra costos directos atribuibles (energía kWh/m², plazoleta/forzoso, horas-cuadrilla, demoras, servicios de terceros) usando el espejo depofis_mirror y el schema costos, sin tocar SQL Server productivo. Resuelve el gap EBITDA no medible por operación, alimenta el current_value de OBJ 02/04/14, distingue carga premium DG/farma de commodity y es precondición del pricing gobernado (CC-2026-08) y del NPS+margen (CC-2026-12).  
_KPI:_ ≥95% de las operaciones cerradas del trimestre con margen de contribución calculado (≤5% en 'sin costo atribuible'); ranking de los 20 clientes por EBITDA estimado publicado mensual; current_value de OBJ-02/04/14 actualizado automáticamente; EBITDA premium ≥30% superior al commodity comparable.

### CC-2026-08 · Tablero de pricing gobernado: piso de margen, semáforo de cotización e indexación IPC/ICL+USD  
**[P1 · Q3 2026]** · Objetivos: OBJ-2026-14, OBJ-2026-04 · Responsable: Responsable Comercial (Manuel/Santiago) · Estrategia: Margen Vivo 2026  
Transformar el output del costeo (CC-2026-07) en gobierno comercial y defensa de margen, fusionando el pricing gobernado de DO-MargenVivo con el pricing indexado de DA-Resiliencia. Antes de que Comercial o el Vendedor envíen una cotización, el tablero muestra el costo estimado y un semáforo verde/amarillo/rojo según el piso de contribución definido por dirección; además incorpora la política de indexación por IPC/ICL y tarifa USD al TC del día con cláusula de ajuste en contratos (Liftvan/Top-7) para que la tarifa en pesos no pierda contra inflación ~30% y dólar atrasado. Incluye registro de cada cotización fuera de piso como excepción aprobada.  
_KPI:_ 100% de cotizaciones nuevas pasan por el semáforo; ≥90% emitidas en verde (sobre piso); ≥80% de la facturación bajo cláusula de indexación IPC/ICL o USD-al-TC; margen de contribución de la cartera +2 puntos vs baseline Q1; 0 cotizaciones bajo piso sin excepción registrada.

### CC-2026-09 · Cierre e instrumentación de KPIs de planta: forzoso ≥97% y desconsolidación <3 días  
**[P0 · Q2 2026]** · Objetivos: OBJ-2026-05, OBJ-2026-06 · Responsable: Supervisor de Depósito (Marcelo) · Estrategia: Margen Vivo 2026  
Cerrar los dos KPIs operativos que son a la vez objetivo SGI y driver directo de costo, hoy sin medición sistemática (current_value vacío). Instrumentar la captura automática desde la app Orden/Tally y el espejo: % de traslados en forzoso completados en término y días de desconsolidación por contenedor, con tablero diario para Supervisión y Coordinación. Alimenta el costeo (CC-2026-07) con tiempo-cuadrilla real y permite actuar antes del cierre del mes; cada día extra de desconsolidación y cada forzoso fuera de término deteriora el margen.  
_KPI:_ Forzoso en término ≥97% medido automáticamente sobre el 100% de traslados; días de desconsolidación promedio <3 con dashboard diario; current_value de OBJ-05 y OBJ-06 cargado y actualizado semanalmente.

### CC-2026-10 · Despertar del pipeline: reactivación de las ~319 cotizaciones dormidas con COMEX bajo gate HITL  
**[P0 · Q1 2026]** · Objetivos: OBJ-2026-02, OBJ-2026-03, OBJ-2026-14 · Responsable: Responsable Comercial (Manuel/Santiago) · Estrategia: Reactivación del Motor Comercial 4.0  
Recuperar ingreso ya cotizado y no perdido: las ~319 cotizaciones dormidas del universo de 541 en sales_cortex.quote son demanda comprobada que nunca se cerró ni se descartó. Activa el job seguimientoComercial de COMEX ampliando la ventana al backlog histórico; cada seguimiento se propone como alerta HITL que el vendedor/supervisor aprueba antes de salir (regla dura: COMEX nunca toca al cliente final sin aprobación); cada cotización se clasifica en gana/pierde-con-motivo/recotiza. Cierra además los 35 leads abandonados de info@ ya cargados en inbound_lead. Es la cara reactivadora del pipeline dormido (FO-Premium/FO-Digital/DO-Comercial).  
_KPI:_ ≥80% de las 319 cotizaciones dormidas con disposición registrada (ganada/perdida con motivo/recotizada) al cierre de Q1; ≥15% de tasa de reactivación a operación facturada; 0 envíos externos sin aprobación HITL (auditable en agent_action_log).

### CC-2026-11 · CRM higienizado en la migración a Odoo: cerrar el agujero de conversión de leads (0/34)  
**[P1 · Q2 2026]** · Objetivos: OBJ-2026-16, OBJ-2026-01 · Responsable: Analista de Datos/Procesos/IA (Santiago) · Estrategia: Reactivación del Motor Comercial 4.0  
El CRM HubSpot está sucio y en migración a Odoo (Obj 16, Q2): 3.482 empresas, 6.382 contactos y 2.262 deals con duplicados, etapas inconsistentes y dueños cruzados, y la conversión histórica de prospectos web a deal es 0/34 (falla de proceso). Deduplica y normaliza la base ANTES de cargarla a Odoo (un CRM sucio migrado es un CRM sucio nuevo), formaliza el circuito captura→asignación HITL→deal de cada lead de info@ (ya capturado por monitorInfoProspectos), y deja un dashboard de conversión por vendedor en Odoo. Resuelve el gap de un CRM no confiable que impide medir el funnel. Da soporte de datos al dossier premium (CC-2026-16).  
_KPI:_ 100% de la base CRM deduplicada y normalizada migrada a Odoo en Q2; tasa de conversión lead→deal ≥25% (vs 0/34 baseline) medible en Odoo; 0 prospectos de info@ sin deal asignado al cierre de cada mes.

### CC-2026-12 · Voz del cliente: NPS de cierre de lazo por Portal (anti-Henn)  
**[P1 · Q2 2026]** · Objetivos: OBJ-2026-01 · Responsable: Director General/Líder SGI (Santiago) · Estrategia: Blindaje de Cuenta Ancla y Talento  
Cerrar la ceguera de satisfacción, unificando el NPS de DO-Comercial y el sistema anti-Henn de FA-Ancla: DASSA tiene portal de clientes vivo (Liftvan 2.518 cargas) y portal mudancera (18 cuentas) pero no mide satisfacción. Embeber una encuesta NPS gatillada al cierre de operación/desconsolidación en ambos portales, con disparo de alerta inmediata al Gerente de Operaciones ante todo detractor y protocolo de contacto en <24h con registro como no conformidad. Carga el current_value del Obj 01 (≥97%) con dato real y alimenta la Revisión por la Dirección (ISO 9.1.2/9.3).  
_KPI:_ NPS medido en ≥60% de las operaciones cerradas vía portal con satisfacción ≥97%/NPS ≥50; 100% de detractores contactados en <24h con reclamo resuelto/registrado como no conformidad antes de escalar.

### CC-2026-13 · Diseño y tarifación del producto Depósito Premium DG/IMO/Farma  
**[P1 · Q2 2026]** · Objetivos: OBJ-2026-14, OBJ-2026-04 · Responsable: CEO/Gerente General (Manuel) · Estrategia: DASSA Premium DG/IMO  
Definir el producto especializado que convierte la capacidad ociosa +30% en ingreso de alto margen: zona de segregación IMO por clase, control de temperatura para farma, protocolo de trazabilidad documental sobre la trinorma y una grilla de tarifa diferenciada con sobreprecio sobre la tarifa commodity. Documenta la estrategia FO en context_strategies (vía CC-2026-03) y abre los change_requests 2026 que habilitan el CAPEX/adecuación. Depende de la regularización legal (CC-2026-01) y habilita el pipeline premium (CC-2026-14).  
_KPI:_ Grilla de tarifa premium DG/IMO/Farma aprobada con sobreprecio ≥25% vs tarifa commodity; ≥2 change_requests 2026 abiertos (adecuación segregación IMO + control de temperatura).

### CC-2026-14 · Reactivación del pipeline comercial con foco IMPO premium DG/farma  
**[P1 · Q2 2026]** · Objetivos: OBJ-2026-02, OBJ-2026-04 · Responsable: Vendedor (Guillermo) · Estrategia: DASSA Premium DG/IMO  
Despertar el pipeline apuntando específicamente a forwarders y dadores de carga IMO/DG/farma de importación para llenar la capacidad ociosa y empujar el mix hacia 55% IMPO. Cierra el gap entre el run-rate IMPO ~2.184 CNT/año (ene-may ~910 CNT) y la meta de 3.800 CNT captando volumen incremental de alto margen en lugar de commodity. Incluye listado segmentado de prospects DG, propuesta con la grilla premium (CC-2026-13) y seguimiento semanal. Complementa al reactivador transversal CC-2026-10 con foco vertical premium.  
_KPI:_ ≥15 cuentas DG/IMO/farma de IMPO en pipeline activo y ≥6 cerradas en el año; volumen IMPO mensual saliendo de ~182 CNT/mes hacia ≥317 CNT/mes (ritmo 3.800/año); mix IMPO ≥50% en H2 con rumbo a 55%.

### CC-2026-15 · Trazabilidad e identidad propia en la escritura al WMS DEPOFIS (us_add propio + audit + rollback)  
**[P0 · Q2 2026]** · Objetivos: OBJ-2026-15, OBJ-2026-05, OBJ-2026-06 · Responsable: Analista de Datos/Procesos/IA (Santiago) · Estrategia: Hardening tecnológico y gobierno de IA  
Cerrar el riesgo crítico abierto en el go-live 2026-06-14: las escrituras INSERT/UPDATE a la SQL Server productiva de DEPOFIS van con el usuario compartido us_add='dassa', que borra la trazabilidad de quién originó cada alta y rompe el control de cambios. Negociar con DEPOFIS (Yamil/Gastón) un us_add propio tipo ORDEN_APP, envolver cada escritura en transacción serializable con registro en syncro.audit_log (origen, operador, payload, orden FoxPro por advisory lock 70071) y habilitar el rollback por convención Depofis. Es prerrequisito duro de OEA (CC-2026-02): la aduana exige trazabilidad punta a punta de toda escritura a stock fiscal.  
_KPI:_ 100% de las escrituras a depofis con us_add propio + fila en syncro.audit_log (origen+operador identificados); 0 altas con us_add='dassa' genérico; camino de rollback probado en ambiente real con ≥1 reversión exitosa documentada.

### CC-2026-16 · Dossier + Demo Premium Digital: e-Tally + Portal como prueba viva del diferencial  
**[P2 · Q2 2026]** · Objetivos: OBJ-2026-01, OBJ-2026-02 · Responsable: Responsable de Tecnología · Estrategia: Premium Digital DASSA 4.0  
Empaquetar el diferencial Smart DASSA 4.0 (e-Tally/SuperTally en /orden/p/, Cadena Madre de trazabilidad, Portal Mudancera/Clientes) y el sello TRINORMA en un dossier de venta premium apalancado en la landing Árbol de mensajes de marca, y convertir la trazabilidad técnica en una demo cliente-facing navegable end-to-end (operación de ejemplo que evidencia seguridad CCTV+Face ID, desconsolidación <3 días y satisfacción) lista para una reunión con prospecto premium. Fusiona el dossier y la demo de FO-Digital; es el activo que hace tangible la promesa de marca para cerrar grandes cuentas y farma.  
_KPI:_ Dossier premium + demo de trazabilidad publicados y usados en ≥80% de las reuniones comerciales con prospectos premium del trimestre; ≥1 caso/operación de exhibición navegable por segmento (grandes marcas y farma-química).

### CC-2026-17 · Legajos y datos de personal completos — fichas de puesto y registros RRHH al 100%  
**[P1 · Q2 2026]** · Objetivos: OBJ-2026-13, OBJ-2026-15 · Responsable: Administración General/RRHH (María) · Estrategia: Blindaje de Certificación pre-auditoría julio 2026  
Completar las fichas y datos de personal hoy incompletos: por cada colaborador, ficha de puesto vigente (rol, competencias requeridas, responsabilidades SySO), datos de RRHH (alta, ART, exámenes médicos periódicos, entrega de EPP firmada) y vínculo con su matriz de capacitación (CC-2026-04). Cubre cláusula 7.1.2/7.2 (personas y competencia), requisito tanto de ISO 45001 como del expediente OEA, que exige conocer y respaldar al personal de la operación.  
_KPI:_ 100% de legajos completos (ficha de puesto + ART + examen médico vigente + EPP firmado) sobre la dotación total; 0 legajos con datos faltantes en la muestra de auditoría.

### CC-2026-18 · DASSA Empleador Diferencial: retención de talento clave + bienestar y desarrollo  
**[P1 · Q3 2026]** · Objetivos: OBJ-2026-13, OBJ-2026-12 · Responsable: Administración General/RRHH (María) · Estrategia: Blindaje de Cuenta Ancla y Talento  
Blindar el know-how operativo (Coordinación, Supervisor de Depósito, Plazoletero) que sostiene la trazabilidad, posicionando a DASSA como empleador diferencial. Definir plan de desarrollo y bienestar por rol clave, mapa de sucesión (riesgo de pérdida si se va una persona) y régimen de bienestar. Se apoya en la evidencia de capacitación de CC-2026-04 y los legajos de CC-2026-17. Cubre el gap de bienestar/desarrollo sin instrumentar (Obj 13) y reduce el riesgo de fuga de talento, una de las amenazas de la estrategia FA.  
_KPI:_ Rotación voluntaria de roles operativos clave = 0 en 2026; plan de desarrollo y bienestar por rol clave publicado con mapa de sucesión; índice de clima/bienestar medido con baseline cargado.

### CC-2026-19 · Programa Cuenta Ancla: Tablero de Salud del Cliente Top-7 + Revisión Trimestral 1-a-1  
**[P1 · Q1 2026]** · Objetivos: OBJ-2026-01, OBJ-2026-06, OBJ-2026-14 · Responsable: Responsable Comercial (Manuel/Santiago) · Estrategia: Blindaje de Cuenta Ancla y Talento  
Convertir la trazabilidad y el trato personalizado en un foso medible contra el entrante de escala (Exolgan/ITL-PSA). Crear una vista interna de salud por cliente Top-7 (Liftvan primero) que cruce volumen CNT, días de desconsolidación reales, incidencias y uso del portal/tracking link, y formalizar una reunión trimestral de servicio con la mudancera ancla donde DASSA muestra su SLA cumplido. Se alimenta del costeo (CC-2026-07) para mostrar revenue/margen por cuenta ancla y eleva el costo de cambio del cliente.  
_KPI:_ Retención del 100% del volumen CNT del Top-7 vs baseline 2025 (cero fuga al entrante); 4/4 revisiones trimestrales 1-a-1 con acta firmada por Liftvan; días de desconsolidación de la cuenta ancla <3 sostenido todo el año.

### CC-2026-20 · Diversificación de cartera + contenido/SEO nicho importador PyME (anti-concentración Liftvan)  
**[P1 · Q4 2026]** · Objetivos: OBJ-2026-04, OBJ-2026-02, OBJ-2026-01 · Responsable: Vendedor (Guillermo) · Estrategia: Reactivación del Motor Comercial 4.0  
Atacar la sobre-concentración en Liftvan (~77%; Top-7 53% IMPO/73% EXPO) abriendo el segmento importador PyME desatendido, fusionando el contenido/SEO de DO-Comercial con la diversificación activa de DA-Resiliencia. Producir contenido/SEO de nicho (guías de importación, free time, desconsolidación <3 días, beneficios del depósito fiscal para PyME) con el pipeline de Marketing (Tincho + agente Luz, copy validado por brand-voice-checker), usando OEA como diferenciador de confianza, y captar cartera nueva fuera de Liftvan vía el Portal multi-tenant de costo marginal casi nulo, antes de que el entrante seduzca a las cuentas ancla por precio.  
_KPI:_ ≥12 piezas de contenido SEO nicho importador PyME publicadas; ≥10 clientes nuevos fuera de Liftvan onboarded vía Portal; participación de Liftvan ≤70% del tráfico (desde ~77%) y Top-7 ≤65% IMPO; índice de concentración (HHI) en descenso vs baseline Q1.

### CC-2026-21 · Acceso a Financiamiento PyME a tasa subsidiada para mitigaciones y capital de trabajo  
**[P1 · Q3 2026]** · Objetivos: OBJ-2026-14, OBJ-2026-07 · Responsable: CEO/Gerente General (Manuel) · Estrategia: Resiliencia física, financiera y de cartera frente a shocks  
Conseguir líneas PyME a tasa subsidiada (MiPyME/SGR/BICE/leasing) para financiar las mitigaciones de la estrategia defensiva (bombeo/contingencia hídrica y mantenimiento edilicio de CC-2026-05, eventual eficiencia energética) y aliviar el capital de trabajo que consume el DSO largo de la cadena de pago argentina, SIN descapitalizar la caja. Convierte inversiones defensivas en cuotas financiadas y crea un colchón de liquidez frente a la concentración en Liftvan.  
_KPI:_ ≥1 línea de financiamiento PyME aprobada y desembolsada cubriendo ≥70% del CAPEX de mitigaciones (hídrica/edilicia/energía); costo financiero ≤ tasa de referencia subsidiada vigente; días de caja disponibles ≥ baseline.

### CC-2026-22 · Control de cambios formal y gobierno/supervisión de agentes IA (FICO bidireccional gradual)  
**[P1 · Q3 2026]** · Objetivos: OBJ-2026-15, OBJ-2026-14 · Responsable: Director General/Líder SGI (Santiago) · Estrategia: Hardening tecnológico y gobierno de IA  
Reactivar y formalizar el control de cambios del SGI (change_requests todas de 2024, faltan las de 2026) y crear el régimen de supervisión de agentes IA. Toda promoción de agente a bidireccional —empezando por FICO— exige ficha de puesto del agente, runbook, zonas de autonomía (verde/amarillo/rojo), filtro de telemetría/heartbeats sin LLM (lección del incidente luz-bus-inbox-processor: ~US$3.000/mes→~US$12/mes), tasa de acierto medida y change_request aprobado antes del flip. Cierra el gap de control de cambios y evita gasto/comportamiento descontrolado de IA.  
_KPI:_ 100% de cambios tecnológicos 2026 con change_request registrado y aprobado antes de deploy; FICO promovido a bidireccional solo con runbook+ficha+autonomía documentados y tasa de acierto ≥90% en ensayo; costo IA del bus medido en agent_runs ≤ US$50/mes.

### CC-2026-23 · Continuidad de DEPOFIS y convivencia controlada con la migración a Odoo (doble espejo blindado)  
**[P1 · Q2 2026]** · Objetivos: OBJ-2026-16, OBJ-2026-15 · Responsable: Responsable de Tecnología · Estrategia: Hardening tecnológico y gobierno de IA  
Asegurar que la modernización del ERP a Odoo (Obj 16, meta 100% Q2) no interrumpa la operación ni la trazabilidad. Blindar la continuidad del doble espejo —depofis_mirror (Node, 53 tablas, espejo crudo que alimenta Tráfico/Orden/Tally) y depofis (Python, 21 tablas, capa curada para marketing/ventas)— documentando que NO son redundantes y definiendo el plan de cutover Depofis→Odoo con shadow-compare, criterios de paridad por conteos y rollback. Evita quedar sin lectura/escritura confiable a stock fiscal durante la transición y deja la información documentada (ISO 7.5).  
_KPI:_ Plan de continuidad/cutover Depofis→Odoo documentado y aprobado (ISO 7.5); shadow-compare con paridad ≥99% en maestros (clientes/users) antes de cada flip; 0 incidentes de pérdida de lectura/escritura a stock fiscal durante la migración; ambos espejos con statement_timeout y monitoreo de drift activos.

### CC-2026-24 · Operaciones de Exportación: cerrar la meta 3.120 CNT/año con tablero EXPO y captación  
**[P2 · Q3 2026]** · Objetivos: OBJ-2026-03 · Responsable: Responsable Comercial (Manuel/Santiago) · Estrategia: Reactivación del Motor Comercial 4.0  
Proyecto agregado para no dejar huérfano el OBJ-2026-03 (Exportación 3.120 CNT/año), que las estrategias solo tocaban de refilón. Instrumentar el seguimiento de volumen EXPO desde la app Orden/Tráfico (cruce con el costeo CC-2026-07), fijar la meta de captación EXPO en el plan comercial y vincularlo al sistema de viaje E y remisión a puerto ya operativo. Asegura que el volumen de exportación —concentrado en Global Rover (1 de cada 3 EXPO) y Top-7 73%— se mida y se defienda en paralelo a la diversificación (CC-2026-20).  
_KPI:_ Volumen EXPO mensual con tablero vivo y current_value de OBJ-03 cargado; ritmo ≥260 CNT/mes (3.120/año); ≥3 cuentas EXPO nuevas para reducir la dependencia de Global Rover.

### CC-2026-25 · Plan de eficiencia ambiental: energía -10% kWh/m², papel -25% y eliminación de agua de red (Aysa)  
**[P2 · Q3 2026]** · Objetivos: OBJ-2026-07, OBJ-2026-08, OBJ-2026-09 · Responsable: Supervisor de Depósito (Marcelo) · Estrategia: Resiliencia física, financiera y de cartera frente a shocks  
Proyecto agregado para cubrir explícitamente los objetivos ambientales ISO 14001 que el resto del plan solo rozaba: OBJ-2026-07 (energía -10% kWh/m²), OBJ-2026-08 (papel -25%) y OBJ-2026-09 (eliminar agua de red Aysa). Instrumentar la medición de consumo energético por m² (alimentando el costeo CC-2026-07), digitalizar circuitos para bajar papel (apalancado en e-Tally/portales ya existentes) y avanzar la solución alternativa de agua (perforación/reúso). Se financia con la línea PyME de CC-2026-21 y refuerza el desempeño ambiental ante la auditoría TRINORMA.  
_KPI:_ Consumo energético -10% kWh/m² vs baseline con medición mensual; consumo de papel -25% vs baseline; agua de red Aysa eliminada o plan de eliminación aprobado y en ejecución; current_value de OBJ-07/08/09 cargado.

### CC-2026-26 · Reducción de accidentes y días perdidos: programa SySO operativo (IF -15%, días perdidos ≤ baseline)  
**[P1 · Q3 2026]** · Objetivos: OBJ-2026-10, OBJ-2026-11 · Responsable: Responsable SySO · Estrategia: Resiliencia física, financiera y de cartera frente a shocks  
Proyecto agregado para cubrir los objetivos de seguridad ocupacional ISO 45001 OBJ-2026-10 (reducción de accidentes con IF -15%) y OBJ-2026-11 (días perdidos ≤ baseline), que las estrategias tocaban solo indirectamente vía capacitación. Instrumentar el registro de incidentes/accidentes, índices de frecuencia y gravedad, investigación de causa raíz y medidas preventivas, apalancado en el plan de capacitación SySO (CC-2026-04) y el plan de contingencia/mantenimiento (CC-2026-05). Carga el current_value de OBJ-10/11 y respalda la cláusula 9.1 de seguridad ante la auditoría.  
_KPI:_ Índice de frecuencia de accidentes -15% vs baseline; días perdidos ≤ baseline; 100% de incidentes/accidentes con investigación de causa raíz y medida preventiva registrada; current_value de OBJ-10/11 cargado y actualizado.

## Roadmap trimestral

**Q1:** CC-2026-01 (P0 legal CAA+ADR — llave de todo, primero) · CC-2026-03 (P0 saneamiento SGI: current_value + context_strategies + change_requests 2026) · CC-2026-10 (P0 reactivación cotizaciones dormidas con COMEX/HITL) · CC-2026-19 (P1 Tablero Salud Cuenta Ancla + revisión 1-a-1 Liftvan)

**Q2:** CC-2026-02 (P0 certificación OEA — arranca expediente, hito en Q3) · CC-2026-04 (P0 evidencia capacitaciones SySO/DG/IMO) · CC-2026-05 (P0 contingencia hídrica + mantenimiento edilicio) · CC-2026-06 (P0 ciberseguridad gate blindaje apps) · CC-2026-07 (P0 costeo ABC / EBITDA por operación) · CC-2026-09 (P0 KPIs planta forzoso ≥97% + desconsolidación <3) · CC-2026-15 (P0 trazabilidad escritura WMS us_add propio + audit) · CC-2026-11 (P1 CRM higienizado migración Odoo) · CC-2026-12 (P1 NPS portal anti-Henn) · CC-2026-13 (P1 producto Depósito Premium DG/IMO/Farma) · CC-2026-14 (P1 pipeline IMPO premium DG/farma) · CC-2026-16 (P2 dossier + demo Premium Digital) · CC-2026-17 (P1 legajos y fichas de puesto al 100%) · CC-2026-23 (P1 continuidad DEPOFIS + cutover Odoo, alineado al Q2 de Obj 16)

**Q3:** CC-2026-02 (P0 HITO certificación OEA — auditoría pasa/no-pasa ~julio) · CC-2026-08 (P1 pricing gobernado + indexación IPC/ICL+USD) · CC-2026-18 (P1 retención talento + bienestar) · CC-2026-21 (P1 financiamiento PyME subsidiado) · CC-2026-22 (P1 control de cambios + gobierno agentes IA / FICO bidireccional) · CC-2026-24 (P2 operaciones EXPO 3.120 CNT) · CC-2026-25 (P2 eficiencia ambiental energía/papel/agua) · CC-2026-26 (P1 reducción accidentes y días perdidos)

**Q4:** CC-2026-20 (P1 diversificación cartera + contenido/SEO importador PyME) · Cierre y consolidación anual: verificación 16/16 current_value cargados, Acta de Revisión por la Dirección Q4, balance de cobertura de objetivos y armado del plan 2027

## Cobertura de objetivos

- OBJ-2026-01 (Satisfacción ≥97%) — CUBIERTO: CC-2026-12 (NPS portal, fuente primaria), CC-2026-06, CC-2026-11, CC-2026-16, CC-2026-19, CC-2026-20
- OBJ-2026-02 (Importación 3.800 CNT/año) — CUBIERTO: CC-2026-14 (foco IMPO premium), CC-2026-10, CC-2026-01, CC-2026-16, CC-2026-20
- OBJ-2026-03 (Exportación 3.120 CNT/año) — CUBIERTO: CC-2026-24 (proyecto agregado dedicado), CC-2026-10. Era el más débil en las 8 estrategias (solo lo tocaba CC-2026-10 de refilón); se agregó CC-2026-24 para no dejarlo huérfano
- OBJ-2026-04 (Mix IMPO 55%) — CUBIERTO: CC-2026-14, CC-2026-08, CC-2026-13, CC-2026-20
- OBJ-2026-05 (Forzoso ≥97%) — CUBIERTO: CC-2026-09 (instrumentación primaria), CC-2026-15
- OBJ-2026-06 (Desconsolidación <3 días) — CUBIERTO: CC-2026-09 (primaria), CC-2026-07, CC-2026-15, CC-2026-19
- OBJ-2026-07 (Energía -10% kWh/m²) — CUBIERTO: CC-2026-25 (proyecto agregado dedicado), CC-2026-21. Las estrategias solo lo rozaban vía costeo/financiamiento; se agregó CC-2026-25
- OBJ-2026-08 (Papel -25%) — CUBIERTO: CC-2026-25 (proyecto agregado dedicado). NO estaba vinculado a ningún proyecto en las 8 estrategias originales; se agregó CC-2026-25
- OBJ-2026-09 (Eliminar agua de red Aysa) — CUBIERTO: CC-2026-05 (contingencia hídrica/desagües), CC-2026-25 (eliminación de consumo Aysa, dedicado)
- OBJ-2026-10 (Accidentes IF -15%) — CUBIERTO: CC-2026-26 (proyecto agregado dedicado). NO estaba vinculado a ningún proyecto en las 8 estrategias originales; se agregó CC-2026-26
- OBJ-2026-11 (Días perdidos ≤ baseline) — CUBIERTO: CC-2026-26 (dedicado), CC-2026-05
- OBJ-2026-12 (Capacitaciones SySO +20%) — CUBIERTO: CC-2026-04 (primaria), CC-2026-18
- OBJ-2026-13 (Bienestar y desarrollo del personal) — CUBIERTO: CC-2026-18 (primaria), CC-2026-17
- OBJ-2026-14 (Salto EBITDA +17%) — CUBIERTO: CC-2026-07 (motor de margen, primaria), CC-2026-08, CC-2026-03, CC-2026-10, CC-2026-13, CC-2026-19, CC-2026-21, CC-2026-22
- OBJ-2026-15 (Certificación OEA 2026) — CUBIERTO: CC-2026-02 (primaria), CC-2026-01, CC-2026-03, CC-2026-04, CC-2026-05, CC-2026-06, CC-2026-15, CC-2026-17, CC-2026-22, CC-2026-23
- OBJ-2026-16 (Modernización ERP Odoo 100% Q2) — CUBIERTO: CC-2026-23 (continuidad/cutover, primaria), CC-2026-07, CC-2026-11, CC-2026-03
- CONCLUSIÓN: 16/16 objetivos cubiertos. Tres quedaban huérfanos o casi en las 8 estrategias originales (OBJ-03 Exportación, OBJ-08 Papel, OBJ-10 Accidentes) y se cerraron con 3 proyectos agregados (CC-2026-24, CC-2026-25, CC-2026-26). El gap de gestión current_value sin cargar lo cierra transversalmente CC-2026-03
