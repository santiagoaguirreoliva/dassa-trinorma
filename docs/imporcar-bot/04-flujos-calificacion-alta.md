# 04 · Flujos, calificación de leads y alta de operaciones

## 1. Clasificación de leads

En cada conversación el bot ubica al prospecto en una de 4 categorías y sigue el flujo correspondiente:

| Tipo | Señal | Flujo |
|---|---|---|
| **A. Candidato real** | Ya tiene el auto identificado (link, VIN, o marca/modelo/año concreto) y quiere avanzar | → Flujo ALTA (§2) |
| **B. Interesado sin auto** | Quiere un clásico pero no lo tiene elegido; tiene presupuesto | → Flujo BÚSQUEDA / hunter (§3) |
| **C. Curioso** | Pregunta requisitos, costos, proceso; no define nada | → Responder FAQ + estimador (§4) + invitar a dejar datos |
| **D. No califica / fuera de alcance** | Auto <30 años, FOB ≤12k, usados comunes, o tema ajeno | → Rechazo cortés (plantillas) o escalación si es caso borde |

Regla de oro: **toda conversación intenta terminar con nombre + teléfono registrados**, aunque sea un curioso ("¿querés que un asesor te contacte cuando tengas el auto elegido?").

## 2. Flujo ALTA de operación (candidato real)

Objetivo: registrar la operación completa para que el equipo cotice en 48 hs hábiles.

Datos a capturar, de a uno por mensaje (espejo de la pestaña `ALTA_CONFIRMACION` de la planilla IMPORCAR):

1. **Nombre y apellido**
2. **Teléfono / WhatsApp** (con característica)
3. **Condición ante ARCA**: monotributo / responsable inscripto / consumidor final / relación de dependencia / no sabe
4. **¿Es importador habilitado?** (sí / no — si no sabe, "no")
5. **Modalidad**: clásico (30+ años) — confirmar que el auto califica
6. **Marca**
7. **Modelo**
8. **Año** (validar: 2026 − año ≥ 30; si no cumple → flujo D)
9. **VIN / número de chasis** (si lo tiene; si no, "pendiente")
10. **País de origen** (USA / Europa / Japón / otro)
11. **Valor FOB estimado en USD** (validar: > 12.000; si no → flujo D)
12. **Link de la publicación** (si existe)

Al completar:
1. Mostrar **resumen** de los datos y pedir confirmación.
2. Dar la **estimación orientativa** (§4) con el FOB informado.
3. Registrar el alta (planilla IMPORCAR / plataforma WAP, según integración vigente).
4. Cerrar: *"¡Listo, [nombre]! Ya registré tu operación. Un asesor de IMPORCAR te contacta por WhatsApp dentro de las próximas 24–48 hs hábiles con la cotización formal por escrito."*

## 3. Flujo BÚSQUEDA (hunter)

Para el que no tiene auto elegido. Datos (espejo de la pestaña `BUSQUEDA_CONFIRMACION`):

1. **Nombre y apellido**
2. **Teléfono / WhatsApp**
3. **Condición ante ARCA**
4. **Presupuesto total aproximado en USD** — si es menor a ~USD 27.000 totales (FOB 12k + 35% + 11k logística), avisar con honestidad que el régimen arranca en ese orden de valores
5. **Marca / modelo buscado** (o estilo: muscle, europeo, pickup clásica, etc.)
6. **Ciudad de residencia**

Cierre: registrar búsqueda + *"Nuestro equipo hunter revisa el mercado en USA y un asesor te contacta con opciones."*

## 4. Estimador de costos (única fórmula autorizada)

```
Total estimado ≈ FOB + (FOB × 0,35) + USD 11.000
```

- Pedir el FOB si no lo dio. Redondear el resultado ("en torno a USD 65.000").
- SIEMPRE etiquetar: *"estimación orientativa para que tengas el orden de magnitud"*.
- SIEMPRE cerrar con: *"la cotización formal es detallada, por escrito, en 48 hs hábiles — y ese número es final, sin costos ocultos."*
- Si el FOB informado es ≤ USD 12.000 → explicar que no alcanza el mínimo del régimen (flujo D).

## 5. Handoff a humano

- Todo lead A o B termina registrado y con la promesa de contacto humano en 24–48 hs hábiles.
- El registro va a la planilla IMPORCAR (pestañas ALTA/BÚSQUEDA) o a la plataforma WAP vía integración; el asesor toma el lead desde ahí con el link `wa.me` del cliente.
- Casos de escalación inmediata (subvaluación insistente, reclamos, casos borde, prensa): registrar nombre + teléfono + motivo y marcar como **prioridad humana**, sin completar el alta normal.

## 6. Validaciones automáticas del bot

| Check | Regla | Si falla |
|---|---|---|
| Antigüedad | año ≤ 1996 (regla viva: año actual − 30) | No califica → plantilla "no califica" |
| FOB mínimo | > USD 12.000 | No califica → plantilla "no califica" |
| Estado | original o restaurado a original | Modificados/réplicas → caso borde, escalar |
| Título | limpio; salvage/rebuilt | Caso borde, escalar |
| Teléfono | con característica de país/área | Repreguntar formato |
