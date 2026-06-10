# Estado de Trinorma — Revisión integral 2026-06-10

> Revisión exhaustiva (3 agentes: código/módulos · datos por tabla · readiness ISO/OEA).
> **Veredicto:** la **app está bien** (≈28/32 módulos completos, infra sólida, `npm run check` verde, online).
> Lo que falta NO es código: es **cargar/validar datos** que hoy bloquean la auditoría TRINORMA + OEA.
> **Madurez SGI: ~2.8–3.25/5** (meta 5.0). Auditoría externa estimada con NIXA: ~julio 2026.

---

## 1. Módulos — madurez de la app
**Completos (✅):** Bienvenida, Dashboard, Findings/NC, Mis Pendientes, **Comité (F1+F2+F3 hechos hoy)**, Capacitaciones, Usuarios, AMFE, Rondas (F0–F6), Cambios, Procedimientos, Objetivos, Ambiental, Compras, Incidentes, Proveedores, Req. Legales, Empleados, Organigrama, Puestos/Fichas, Mi Perfil 360, Contactos externos, Triny, Auditor, **Contexto/FODA (validación hecha hoy)**.
**Parciales/placeholder (🟡):** BI Operativo (Metabase sin tableros), Calendario global, Satisfacción, Sistema de Gestión (vista integradora), Agent Settings.
**Deuda de código menor:** TODOs en `bienvenida.js` (bug firma pacto — diagnosticado, pausado), `committee.js` (co-firma), `auditor-context.cjs`. Rondas: falta calibrar geofence + ítems SSHH (Fer) + flota real + HMAC propio.

## 2. 🔴 Bloqueantes de auditoría (lo que importa) — por prioridad

| # | Bloqueante | Cifra real | Quién | Esfuerzo |
|---|---|---|---|---|
| 1 | **Requisitos legales VENCIDOS** | CAA Ambiental (venc 31-mar, −71d) + ADR Transporte DG (venc 01-may, −40d); **10/10 sin verificar nunca** | Legal/Manuel | renovar (externo) |
| 2 | **Objetivos 2026 sin medición** | 0/27 con `current_value` | Dirección + bridge DEPOFIS | medio |
| 3 | **Personal sin datos base** | 75% sin email, 100% sin WhatsApp ni `hire_date` (P0) | **María** | carga |
| 4 | **FODA 2026 sin validar** | 29 ítems pendientes (flujo Validar/Rechazar ya está) | **NIXA** | sesión |
| 5 | **Procedimientos en borrador** | 14/14 sin aprobar + sin fecha de revisión | SGI + responsables | revisión |
| 6 | **NC abiertas vencidas** | ~10 abiertas, 3 vencidas con fecha (006/017/018) + varias sin `due_date` | responsables NC | gestión |
| 7 | **Capacitaciones sin ejecución** | 1/91 completadas, 5 vencidas, **0 participantes y 0 evidencias** registrados | María/Fer | carga |
| 8 | **Ciclo 2026 (DAG) frenado** | 10 revisiones, 8 bloqueadas, 0 completadas | SGI + NIXA | secuencial |
| 9 | **Datos SySO faltantes** | `incidents`=0, `job_profile_risks`=0 (AMFE por puesto) | Fer (SySO) | carga |

## 3. Qué se cierra con NIXA (auditora externa)
- **Validar el FODA 2026** (29 ítems) — botones Validar/Rechazar ya en `/context`.
- Verificar/firmar **requisitos legales** (los 2 vencidos + los 10 sin check).
- **Auditoría interna** (precede a la externa) + **acta de revisión por la dirección**.
- Cerrar el **ciclo 2026** una vez destrabadas las revisiones.

## 4. Plan para ponerla al día (3 frentes)

**A · Lo técnico (lo puede hacer Claude, rápido):**
- Derivar `current_value` de objetivos desde las mediciones cargadas (IMPO/EXPO/mix 2026) y marcar el resto como "pendiente de fuente".
- Derivar **acciones de mejora (change_requests)** desde las debilidades/amenazas del FODA → destraba la revisión "Cambios" del ciclo 2026.
- Listar NC sin `due_date` para que les pongan fecha; checklist por responsable.

**B · Carga humana (con acompañamiento):**
- **María**: contactos del personal (email/WhatsApp) + `hire_date` + participantes/evidencias de capacitación. *(Bloquea #3 y #7 — y habilita comunicaciones/boletines.)*
- **Legal/Manuel**: renovar CAA + ADR y cargar evidencia. *(El más grave: riesgo operativo real.)*
- **Fer (SySO)**: incidentes históricos + AMFE por puesto.

**C · Validación/cierre con NIXA:** sesión de FODA + legales + auditoría interna + acta dirección.

## 5. Foco recomendado (orden)
1. **Renovar habilitaciones vencidas (CAA, ADR)** — único riesgo operativo/legal real.
2. **Validar FODA con NIXA** — ya está la herramienta; destraba el ciclo y las acciones.
3. **Objetivos con medición** + **acciones de mejora** desde FODA (Claude puede arrancar).
4. **María**: contactos + capacitaciones (desbloquea media organización).
5. **Aprobar los 14 procedimientos** + poner fecha a las NC vencidas.

---
*Fuentes: 3 auditorías read-only (módulos/código · datos BD `dassa_sgi` · readiness ISO/OEA), 2026-06-10. La app no necesita más desarrollo para certificar; necesita poblar y validar.*
