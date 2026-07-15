# IMPORCAR · Base de conocimiento del bot (Backy)

> Carpeta única de verdad para configurar el agente que atiende los prospectos de la campaña
> **"Importá tu auto clásico con DASSA"** (Meta + Google → WhatsApp / Telegram @imporcar_bot / ManyChat).
>
> Última actualización: 2026-07-15 · Dueño: Santiago Aguirre (santiago@dassa.com.ar)

## Cómo usar esta carpeta

1. **`06-system-prompt-backy.md`** es el prompt listo para pegar en la plataforma del bot (ManyChat / motor de IA). Es un compilado de todo lo demás.
2. Los documentos 01 a 05 son la fuente: si algo cambia (plazo, precios, normativa), se corrige acá primero y se recompila el prompt.
3. **`07-preguntas-abiertas.md`** lista lo que falta definir. Nada de esa lista puede ser respondido por el bot hasta que Santiago lo cierre.

## Índice

| Doc | Contenido |
|---|---|
| `01-politica-comunicacion.md` | Identidad del bot, tono, qué puede y qué NO puede responder, política de valuación, escalación a humano |
| `02-base-conocimiento.md` | El servicio, marco legal 2025, requisitos, proceso, plazos, costos, dónde buscar autos |
| `03-faq.md` | Preguntas frecuentes con la respuesta oficial, palabra por palabra |
| `04-flujos-calificacion-alta.md` | Clasificación de leads, flujo de ALTA de operación, flujo de BÚSQUEDA (hunter), estimador de costos, handoff |
| `05-plantillas-respuestas.md` | Mensajes listos para copiar: saludo, estimación, rechazo cortés, subvaluación, fuera de tema |
| `06-system-prompt-backy.md` | Prompt compilado para el agente |
| `07-preguntas-abiertas.md` | Pendientes de definición de Santiago |

## Decisiones ya tomadas (2026-07-15, Santiago)

- **Plazo público**: 90 a 120 días. Nunca menos por chat.
- **Estimador de costos del bot**: `FOB declarado por el cliente + 35% del FOB (aranceles aduana) + USD 11.000 aprox. de gastos logísticos punta a punta`. Siempre etiquetado como estimación orientativa; la cotización formal es por escrito en 48 hs hábiles.
- **Derivación**: el bot junta TODOS los datos → registra el alta (planilla IMPORCAR / plataforma WAP) → "te contacta un asesor". No cierra ventas solo.
- **Identidad**: se presenta como asistente de **IMPORCAR, el servicio de importación de autos clásicos con el respaldo de DASSA**.

## Fuentes

- Documento maestro estratégico: [DASSA IMPORCAR (Google Doc)](https://docs.google.com/document/d/176i_n_6r-myFtYnXzzm8xfcv6YyxqDqtYeBcuntQ904/edit)
- Planilla operativa del bot: [IMPORCAR (Google Sheet)](https://docs.google.com/spreadsheets/d/1wmdy4ZJZE1mZCuUGF1i9CfSHlFBtbKyxNB4gfAWDX4A/edit) — pestañas `ALTA_CONFIRMACION` y `BUSQUEDA_CONFIRMACION`
- Normativa: Resolución 24/2025 y 300/2025 (Secretaría de Industria y Comercio) + RG ARCA 5796/2025 — trámite CIVAC por TAD/VUCEA
- Páginas de campaña: `imporcar.lovable.app/{presentacion,telegram,bot}` + `t.me/imporcar_bot` *(no auditadas en esta versión: acceso bloqueado desde el entorno; si contradicen algo de acá, avisar y se corrige)*
