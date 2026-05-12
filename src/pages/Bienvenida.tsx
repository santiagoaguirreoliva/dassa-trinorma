// =============================================================================
// /bienvenida · Landing personalizada por rol
// TRINY = agente IA del sistema · NIXA = auditora externa persona real (rol)
// =============================================================================
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type AppRole } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  ClipboardList, AlertTriangle, GraduationCap, ShoppingCart, CheckSquare,
  Bot, Users as UsersIcon, Calendar as CalendarIcon, FileText, Briefcase,
  ChevronRight, CheckCircle2, Loader2, Sparkles, Shield, Target,
  TrendingUp, MessageCircle, Building2, Megaphone, Pin, Info,
  AlertCircle as AlertCircleIcon, Zap, Eye, Search, Lock, Truck,
  BookOpen, Scale, LineChart, FolderTree, Star,
} from 'lucide-react';

// ── Type defs ───────────────────────────────────────────────────────────────
interface PantallaCfg { icon: any; label: string; href: string; descripcion: string }
interface RoleProfile {
  greeting: string;
  roleLabel: string;
  rolePitch: string;
  heroEmoji: string;
  pantallas: PantallaCfg[];
  responsabilidades: string[];
  primerSemana: { dia: string; tarea: string; href?: string }[];
  expectativas: string[];
  consultaA: { tema: string; persona: string }[];
}

// ── Bloque universal "Lo más importante" — IGUAL para todos ────────────────
const IMPORTANT_FOR_EVERYONE = [
  {
    icon: CheckSquare, color: 'bg-[#BF1E2E]', href: '/mis-pendientes',
    title: 'Mis Pendientes',
    desc: 'El lugar #1. Todas tus tareas asignadas (de comité, NCs, proyectos, capacitaciones, auditorías) se nuclean acá. Si solo vas a abrir una pantalla por día, que sea esta.',
  },
  {
    icon: AlertTriangle, color: 'bg-orange-500', href: '/findings',
    title: 'NC y Desvíos',
    desc: 'El corazón de la norma. Cada no conformidad que detectes se reporta acá, con plan de acción, responsable y fecha. Sin NCs gestionadas, no hay certificación.',
  },
  {
    icon: GraduationCap, color: 'bg-blue-600', href: '/trainings',
    title: 'Capacitaciones',
    desc: 'Registrar evidencia de cada capacitación: asistencia, material, evaluación. Lo que no está acá, en auditoría no existe.',
  },
  {
    icon: ShoppingCart, color: 'bg-emerald-600', href: '/purchases',
    title: 'Compras',
    desc: 'Pedidos de compra con flujo de aprobación. Toda compra relevante al SGI pasa por acá para dejar trazabilidad.',
  },
  {
    icon: ClipboardList, color: 'bg-purple-600', href: '/mis-pendientes',
    title: 'Revisiones obligatorias',
    desc: 'Cada rol tiene revisiones periódicas (mensuales, trimestrales, anuales). Te aparecen en Mis Pendientes en su fecha.',
  },
  {
    icon: FileText, color: 'bg-slate-700', href: '/comunicaciones',
    title: 'Actas, recorridos y auditorías',
    desc: 'Documentación formal: actas de comité, recorridos de inspección, auditorías internas. Asociadas a tu perfil cuando te toca firmar o participar.',
  },
];

// ── PROFILES por rol ────────────────────────────────────────────────────────

const RRHH_PROFILE: RoleProfile = {
  greeting: 'María', heroEmoji: '👋', roleLabel: 'Recursos Humanos',
  rolePitch: 'Sos la responsable de que cada persona en DASSA esté formada, registrada y al día con la norma. Tu rol es central: sin RRHH funcionando bien, ningún SGI pasa una auditoría.',
  pantallas: [
    { icon: UsersIcon, label: 'Empleados', href: '/employees', descripcion: 'Legajos, altas, bajas, cambios de puesto.' },
    { icon: GraduationCap, label: 'Capacitaciones', href: '/trainings', descripcion: 'Programar, registrar evidencias, asistencias.' },
    { icon: AlertTriangle, label: 'NCs de RRHH', href: '/findings', descripcion: 'No conformidades de tu área y procesos de personas.' },
    { icon: FileText, label: 'Documentos', href: '/documents', descripcion: 'Manual del empleado, políticas, procedimientos RRHH.' },
    { icon: Briefcase, label: 'Mi Puesto', href: '/mi-puesto', descripcion: 'Tu ficha: responsabilidades, objetivos, KPIs.' },
    { icon: CalendarIcon, label: 'Calendario', href: '/calendar', descripcion: 'Eventos SGI, comité mixto, capacitaciones.' },
  ],
  responsabilidades: [
    'Mantener legajos del 100% de los empleados activos al día.',
    'Programar y registrar capacitaciones obligatorias por puesto.',
    'Atender NCs de RRHH (clima, formación, rotación) en menos de 7 días.',
    'Asistir al Comité Mixto bimestral y dejar acta en el sistema.',
    'Revisar y actualizar el Manual del Empleado anualmente.',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Logueo, explorá Mi Puesto y tu Dashboard.', href: '/mi-puesto' },
    { dia: 'Día 2', tarea: 'Abrí Mis Pendientes y revisá qué hay esperando.', href: '/mis-pendientes' },
    { dia: 'Día 3', tarea: 'Cargá la última capacitación realizada con evidencia.', href: '/trainings' },
    { dia: 'Día 4', tarea: 'Revisá Empleados: ¿algún legajo sin foto / contrato?', href: '/employees' },
    { dia: 'Día 5', tarea: 'Subí el Manual del Empleado vigente a Documentos.', href: '/documents' },
    { dia: 'Día 6', tarea: 'Andá al Calendario y agendá el próximo comité.', href: '/calendar' },
    { dia: 'Día 7', tarea: 'Revisión semanal: ¿NCs sin responsable? ¿Capacitaciones vencidas?', href: '/findings' },
  ],
  expectativas: [
    'Loguearte mínimo 3 veces por semana.',
    'Tus tareas no se atrasan más de 5 días.',
    'Capacitaciones registradas dentro de las 24h del evento.',
    'NCs RRHH con plan de acción en menos de 48h.',
    'Acta de comité subida el mismo día de la reunión.',
  ],
  consultaA: [
    { tema: 'Liderazgo SGI / norma ISO', persona: 'Manuel (SGI Leader)' },
    { tema: 'Operaciones / planta', persona: 'Christian' },
    { tema: 'Seguridad e Higiene', persona: 'Fernando Ponzi' },
    { tema: 'Auditora externa / norma', persona: 'NIXA' },
    { tema: 'Algo grave / técnico', persona: 'Santi' },
  ],
};

const SGI_LEADER_PROFILE: RoleProfile = {
  greeting: 'Manuel', heroEmoji: '🎯', roleLabel: 'SGI Leader · Líder del Sistema',
  rolePitch: 'Sos el responsable operativo del SGI. Tu trabajo es que las tres normas funcionen como una sola: ver el sistema completo, identificar dónde se traba y empujar para que avance. Sos el puente entre la planta, RRHH, seguridad y la dirección.',
  pantallas: [
    { icon: AlertTriangle, label: 'Hallazgos / NCs', href: '/findings', descripcion: 'Todas las NCs del SGI · vista global.' },
    { icon: ClipboardList, label: 'Sistema de Gestión', href: '/sistema-gestion', descripcion: 'Vista integral del SGC, SGA, SGSST.' },
    { icon: Target, label: 'Objetivos', href: '/objetivos', descripcion: 'Objetivos anuales por área y su progreso.' },
    { icon: LineChart, label: 'Ciclo 2026 · DAG', href: '/ciclo/2026', descripcion: 'Revisiones encadenadas del ciclo anual.' },
    { icon: Building2, label: 'Comité Mixto', href: '/committee', descripcion: 'Reuniones, actas, tareas asignadas.' },
    { icon: BookOpen, label: 'Procedimientos', href: '/procedimientos', descripcion: 'Procedimientos vigentes y vencidos.' },
    { icon: Shield, label: 'Matriz AMFE', href: '/riesgos-amfe', descripcion: 'Riesgos cruzados de las tres normas.' },
    { icon: FileText, label: 'Documentos', href: '/documents', descripcion: 'Árbol documental del SGI.' },
  ],
  responsabilidades: [
    'Liderar las reuniones mensuales de revisión del SGI.',
    'Aprobar planes de acción de NCs mayores (>15 días sin cerrar).',
    'Coordinar con NIXA las auditorías internas y de recertificación.',
    'Asegurar que objetivos anuales tengan medición trimestral.',
    'Validar procedimientos antes de que vayan a aprobación final.',
    'Mantener el árbol documental controlado y vigente.',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Revisá Mis Pendientes y armá tu plan de la semana.', href: '/mis-pendientes' },
    { dia: 'Día 2', tarea: 'Auditá Hallazgos: ¿hay NCs sin responsable o atrasadas?', href: '/findings' },
    { dia: 'Día 3', tarea: 'Revisión completa del Ciclo 2026 DAG.', href: '/ciclo/2026' },
    { dia: 'Día 4', tarea: 'Procedimientos: chequeá vencimientos próximos.', href: '/procedimientos' },
    { dia: 'Día 5', tarea: 'Reunión semanal con Santi para visión general.', href: '/comunicaciones' },
    { dia: 'Día 6', tarea: 'Revisá Comité Mixto: próxima fecha y agenda.', href: '/committee' },
    { dia: 'Día 7', tarea: 'Informe semanal al directorio (resumen ejecutivo).', href: '/sistema-gestion' },
  ],
  expectativas: [
    'Login diario en horario laboral.',
    'Cero NCs mayores sin responsable a 48h.',
    'Procedimientos críticos siempre vigentes.',
    'Reunión mensual del comité documentada en sistema el mismo día.',
    'Informe ejecutivo al directorio cada semana.',
  ],
  consultaA: [
    { tema: 'Decisión estratégica / norma', persona: 'Santiago + NIXA' },
    { tema: 'RRHH / personas', persona: 'María' },
    { tema: 'Operaciones planta', persona: 'Christian' },
    { tema: 'Seguridad e Higiene', persona: 'Fernando Ponzi' },
    { tema: 'Técnico del sistema', persona: 'Santi' },
  ],
};

const OPERACIONES_PROFILE: RoleProfile = {
  greeting: 'Christian', heroEmoji: '⚙️', roleLabel: 'Operaciones · Planta',
  rolePitch: 'Sos los ojos del SGI en el día a día. Si algo se desvía en planta — un proceso, un equipo, una práctica — vos sos el primero en detectarlo. Tu trabajo de cargar lo que ves convierte el sistema en algo vivo y no en un papel.',
  pantallas: [
    { icon: AlertTriangle, label: 'Hallazgos / NCs', href: '/findings', descripcion: 'Reportar desvíos que detectás en planta.' },
    { icon: ClipboardList, label: 'Mis Pendientes', href: '/mis-pendientes', descripcion: 'Tareas asignadas a vos.' },
    { icon: AlertCircleIcon, label: 'Incidentes', href: '/incidents', descripcion: 'Eventos no deseados ocurridos.' },
    { icon: Truck, label: 'Proveedores', href: '/suppliers', descripcion: 'Evaluación de proveedores.' },
    { icon: ShoppingCart, label: 'Compras', href: '/purchases', descripcion: 'Pedidos de compra de operaciones.' },
    { icon: BookOpen, label: 'Procedimientos', href: '/procedimientos', descripcion: 'Procedimientos operativos vigentes.' },
  ],
  responsabilidades: [
    'Reportar toda NC o desvío detectado en planta en menos de 24h.',
    'Actualizar el estado de las tareas operativas asignadas.',
    'Participar de los recorridos de inspección programados.',
    'Asistir al Comité Mixto y aportar visión de planta.',
    'Cargar incidentes el mismo día que ocurren.',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Login + Mi Puesto para ver tus responsabilidades.', href: '/mi-puesto' },
    { dia: 'Día 2', tarea: 'Revisá Mis Pendientes y empezá por la más urgente.', href: '/mis-pendientes' },
    { dia: 'Día 3', tarea: 'Practica cargar una NC de prueba.', href: '/findings' },
    { dia: 'Día 4', tarea: 'Mirá los Procedimientos de tu área para refrescar.', href: '/procedimientos' },
    { dia: 'Día 5', tarea: 'Revisá Capacitaciones tuyas pendientes.', href: '/trainings' },
    { dia: 'Día 6', tarea: 'Conocé el módulo de Incidentes (esperemos no usarlo).', href: '/incidents' },
    { dia: 'Día 7', tarea: 'Repaso de tus tareas semanales. ¿Algo atrasado?', href: '/mis-pendientes' },
  ],
  expectativas: [
    'Login al menos 3 veces por semana.',
    'NCs reportadas dentro de las 24h de detectadas.',
    'Tareas asignadas no se atrasan más de 5 días.',
    'Capacitaciones realizadas → confirmás asistencia en el sistema.',
    'Incidentes cargados el mismo día.',
  ],
  consultaA: [
    { tema: 'Sistema SGI / norma', persona: 'Manuel' },
    { tema: 'Seguridad e Higiene en planta', persona: 'Fernando Ponzi' },
    { tema: 'RRHH / personal', persona: 'María' },
    { tema: 'Compras y proveedores', persona: 'Manuel / Santi' },
    { tema: 'Algo grave / técnico', persona: 'Santi' },
  ],
};

const SH_PROFILE: RoleProfile = {
  greeting: 'Fernando', heroEmoji: '⛑️', roleLabel: 'Seguridad e Higiene',
  rolePitch: 'Sos la persona que se asegura de que nadie se lastime y que el ambiente de trabajo sea seguro. ISO 45001 vive en tus decisiones diarias. Vos cargás los riesgos, los incidentes, las capacitaciones y los recorridos — sin eso, el sistema 45001 no existe.',
  pantallas: [
    { icon: Shield, label: 'Matriz AMFE', href: '/riesgos-amfe', descripcion: 'Identificación y evaluación de riesgos.' },
    { icon: AlertCircleIcon, label: 'Incidentes', href: '/incidents', descripcion: 'Accidentes, casi-accidentes, condiciones inseguras.' },
    { icon: AlertTriangle, label: 'Hallazgos / NCs', href: '/findings', descripcion: 'NCs de SySO.' },
    { icon: GraduationCap, label: 'Capacitaciones', href: '/trainings', descripcion: 'Capacitaciones obligatorias de SySO.' },
    { icon: Scale, label: 'Req. Legales', href: '/legal', descripcion: 'Cumplimiento normativo SySO.' },
    { icon: Leaf_or_Briefcase(), label: 'Mi Puesto', href: '/mi-puesto', descripcion: 'Tu ficha y responsabilidades.' },
    { icon: ClipboardList, label: 'Mis Pendientes', href: '/mis-pendientes', descripcion: 'Tareas asignadas a vos.' },
  ],
  responsabilidades: [
    'Mantener la matriz AMFE actualizada (revisión trimestral mínima).',
    'Cargar incidentes el mismo día con investigación 5W2H.',
    'Programar capacitaciones obligatorias por puesto.',
    'Hacer recorridos mensuales de inspección y subir el acta.',
    'Monitorear vencimientos de habilitaciones SySO (ART, póliza, etc.).',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Login + revisión de Matriz AMFE actual.', href: '/riesgos-amfe' },
    { dia: 'Día 2', tarea: 'Mis Pendientes: planificá la semana.', href: '/mis-pendientes' },
    { dia: 'Día 3', tarea: 'Revisá Incidentes históricos del último mes.', href: '/incidents' },
    { dia: 'Día 4', tarea: 'Capacitaciones vencidas o próximas: programación.', href: '/trainings' },
    { dia: 'Día 5', tarea: 'Req. Legales: vencimientos próximos.', href: '/legal' },
    { dia: 'Día 6', tarea: 'Recorrido semanal de inspección.', href: '/incidents' },
    { dia: 'Día 7', tarea: 'Informe SySO al SGI Leader (Manuel).', href: '/comunicaciones' },
  ],
  expectativas: [
    'Login mínimo 4 veces por semana.',
    'Incidentes cargados el mismo día — sin excepciones.',
    'Matriz AMFE revisada al menos cada 3 meses.',
    'Capacitaciones obligatorias sin vencimientos > 30 días.',
    'Recorrido mensual de inspección con acta firmada.',
  ],
  consultaA: [
    { tema: 'Sistema SGI', persona: 'Manuel' },
    { tema: 'Operaciones planta', persona: 'Christian' },
    { tema: 'RRHH / capacitación', persona: 'María' },
    { tema: 'Auditora externa', persona: 'NIXA' },
    { tema: 'Algo grave', persona: 'Santi' },
  ],
};

const MASTER_ADMIN_PROFILE: RoleProfile = {
  greeting: 'Santi', heroEmoji: '🚀', roleLabel: 'Master Admin · Dueño',
  rolePitch: 'Sos el dueño del sistema y de DASSA. Tu vista no es operativa día a día sino estratégica: ¿el SGI avanza? ¿hay áreas trabadas? ¿alguien está sobrecargado? Tenés acceso a todo + el modo Espejo para ver lo que ve cada usuario.',
  pantallas: [
    { icon: LineChart, label: 'Dashboard ejecutivo', href: '/dashboard', descripcion: 'KPIs globales del sistema.' },
    { icon: UsersIcon, label: 'Usuarios', href: '/users', descripcion: 'Alta/baja/cambio de roles.' },
    { icon: Settings_(), label: 'Tenants Admin', href: '/tenants', descripcion: 'Configuración multi-tenant.' },
    { icon: Eye, label: 'Modo Espejo', href: '/bienvenida?espejo=1', descripcion: 'Ver la bienvenida de cualquier usuario.' },
    { icon: Bot, label: 'Agente TRINY', href: '/agent-settings', descripcion: 'Configurar el agente IA del sistema.' },
    { icon: ClipboardList, label: 'Mis Pendientes', href: '/mis-pendientes', descripcion: 'Tus tareas y supervisiones.' },
    { icon: FolderTree, label: 'Organigrama', href: '/organigrama', descripcion: 'Estructura DASSA.' },
    { icon: Megaphone, label: 'Comunicaciones', href: '/comunicaciones', descripcion: 'Comunicados oficiales emitidos.' },
  ],
  responsabilidades: [
    'Visión estratégica del SGI y dirección general.',
    'Aprobar cambios de roles y altas de usuarios.',
    'Supervisar a través del Modo Espejo lo que ve cada usuario.',
    'Tomar decisiones cuando algo escala a través de TRINY.',
    'Reunión semanal con Manuel para revisar avance del SGI.',
    'Garantizar presupuesto y recursos para la certificación.',
  ],
  primerSemana: [
    { dia: 'Lunes', tarea: 'Revisión semanal: Dashboard + Modo Espejo de 2 usuarios al azar.', href: '/dashboard' },
    { dia: 'Martes', tarea: 'Reunión 1:1 con Manuel (SGI Leader).', href: '/comunicaciones' },
    { dia: 'Miércoles', tarea: 'Auditá Hallazgos: ¿hay NCs estancadas?', href: '/findings' },
    { dia: 'Jueves', tarea: 'Comunicaciones: revisá qué se emitió esta semana.', href: '/comunicaciones' },
    { dia: 'Viernes', tarea: 'Cierre semana + agenda próximo Comité Mixto.', href: '/committee' },
  ],
  expectativas: [
    'Login diario (es tu fuente de verdad).',
    'Modo Espejo: pasá por cada usuario al menos 1 vez por semana.',
    'Aprobaciones críticas en menos de 24h.',
    'Reunión con Manuel semanal sin falta.',
    'Cero días sin novedades publicadas si hay cambios.',
  ],
  consultaA: [
    { tema: 'Liderazgo del SGI', persona: 'Manuel' },
    { tema: 'Auditora externa', persona: 'NIXA' },
    { tema: 'RRHH', persona: 'María' },
    { tema: 'Operaciones', persona: 'Christian' },
    { tema: 'Seguridad', persona: 'Fernando' },
  ],
};

const AUDITOR_EXTERNO_PROFILE: RoleProfile = {
  greeting: 'NIXA', heroEmoji: '🔍', roleLabel: 'Auditora Externa · Consultora',
  rolePitch: 'Sos quien acompaña a DASSA en la implementación, mantenimiento y recertificación del SGI. Tu vista es independiente: revisás que las cosas estén bien hechas, que la trazabilidad cierre, que los procedimientos se cumplan. Tenés acceso a todo el árbol documental + el Modo Espejo para ver cómo cada usuario opera el sistema.',
  pantallas: [
    { icon: Search, label: 'Inbox NIXA', href: '/inbox-nixa', descripcion: 'Tu bandeja de revisiones pendientes.' },
    { icon: Eye, label: 'Modo Espejo', href: '/bienvenida?espejo=1', descripcion: 'Ver la bienvenida de cualquier usuario.' },
    { icon: CalendarIcon, label: 'Calendario NIXA', href: '/calendario-nixa', descripcion: 'Tu agenda de auditorías y revisiones.' },
    { icon: ClipboardList, label: 'Auditor IA', href: '/auditor', descripcion: 'Herramienta para auditar el SGI con IA.' },
    { icon: FileText, label: 'Documentos', href: '/documents', descripcion: 'Árbol documental completo del SGI.' },
    { icon: BookOpen, label: 'Procedimientos', href: '/procedimientos', descripcion: 'Procedimientos vigentes y vencidos.' },
    { icon: AlertTriangle, label: 'Hallazgos / NCs', href: '/findings', descripcion: 'NCs detectadas en auditorías.' },
    { icon: LineChart, label: 'Ciclo 2026 DAG', href: '/ciclo/2026', descripcion: 'Estado del ciclo anual de revisiones.' },
  ],
  responsabilidades: [
    'Revisar el árbol documental completo y mantenerlo vigente con DASSA.',
    'Validar las NCs cargadas: ¿formato correcto?, ¿plan de acción suficiente?',
    'Programar y ejecutar auditorías internas según el Ciclo Anual.',
    'Acompañar la recertificación anual y las visitas externas.',
    'Capacitar al equipo en interpretación de la norma cuando haga falta.',
    'Firmar validaciones desde el sistema (firmas digitales auditables).',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Revisar tu Inbox NIXA: cosas pendientes de validar.', href: '/inbox-nixa' },
    { dia: 'Día 2', tarea: 'Auditá un Modo Espejo aleatorio (vé cómo lo usa Christian).', href: '/bienvenida?espejo=1' },
    { dia: 'Día 3', tarea: 'Procedimientos: vencimientos próximos.', href: '/procedimientos' },
    { dia: 'Día 4', tarea: 'Documentos: árbol completo, control de versiones.', href: '/documents' },
    { dia: 'Día 5', tarea: 'Reunión semanal con Manuel + Santi.', href: '/comunicaciones' },
    { dia: 'Día 6', tarea: 'Ciclo 2026: estado de revisiones encadenadas.', href: '/ciclo/2026' },
    { dia: 'Día 7', tarea: 'Informe semanal: ¿cómo va el SGI vs. recertificación?', href: '/auditor' },
  ],
  expectativas: [
    'Login regular en semanas con auditoría programada.',
    'Validaciones firmadas en menos de 5 días.',
    'Informe trimestral del estado del SGI.',
    'Modo Espejo: usalo para verificar adopción real del sistema.',
    'Documentos revisados sin atrasos > 30 días post-cambio.',
  ],
  consultaA: [
    { tema: 'Liderazgo operativo SGI', persona: 'Manuel' },
    { tema: 'Estratégico / dirección', persona: 'Santiago' },
    { tema: 'RRHH', persona: 'María' },
    { tema: 'Seguridad', persona: 'Fernando' },
    { tema: 'Operaciones planta', persona: 'Christian' },
  ],
};

const COMPRAS_PROFILE: RoleProfile = {
  greeting: 'Compras', heroEmoji: '🛒', roleLabel: 'Aprobador de Compras',
  rolePitch: 'Sos quien valida que cada compra del SGI sea trazable, esté justificada y no sea redundante. El sistema te muestra todos los pedidos esperando aprobación con su contexto.',
  pantallas: [
    { icon: ShoppingCart, label: 'Compras', href: '/purchases', descripcion: 'Cola de aprobaciones pendientes.' },
    { icon: Truck, label: 'Proveedores', href: '/suppliers', descripcion: 'Proveedores aprobados y evaluación.' },
    { icon: ClipboardList, label: 'Mis Pendientes', href: '/mis-pendientes', descripcion: 'Aprobaciones esperándote.' },
    { icon: FileText, label: 'Documentos', href: '/documents', descripcion: 'Procedimiento de compras.' },
  ],
  responsabilidades: [
    'Aprobar/rechazar pedidos de compra en menos de 48h.',
    'Mantener vigente la lista de proveedores aprobados.',
    'Evaluar proveedores anualmente.',
    'Trazabilidad: que cada compra tenga justificación SGI.',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Cola de aprobaciones pendientes.', href: '/purchases' },
    { dia: 'Día 2', tarea: 'Revisión de Proveedores.', href: '/suppliers' },
    { dia: 'Día 3', tarea: 'Procedimientos de compras vigentes.', href: '/procedimientos' },
  ],
  expectativas: [
    'Aprobaciones en menos de 48h.',
    'Login mínimo 2 veces por semana.',
    'Evaluación anual de proveedores completada.',
  ],
  consultaA: [
    { tema: 'Operaciones', persona: 'Christian' },
    { tema: 'SGI', persona: 'Manuel' },
    { tema: 'Algo grave', persona: 'Santi' },
  ],
};

const DIRECTOR_PROFILE: RoleProfile = {
  greeting: 'Dirección', heroEmoji: '📊', roleLabel: 'Director / Gerencia',
  rolePitch: 'Tu vista es ejecutiva. Necesitás saber rápido cómo va el SGI sin entrar al detalle operativo. Dashboard, métricas, hallazgos críticos. Si algo escala, te llega a través de TRINY.',
  pantallas: [
    { icon: LineChart, label: 'Dashboard', href: '/dashboard', descripcion: 'KPIs ejecutivos del SGI.' },
    { icon: ClipboardList, label: 'Sistema de Gestión', href: '/sistema-gestion', descripcion: 'Vista global del SGI.' },
    { icon: AlertTriangle, label: 'Hallazgos / NCs críticas', href: '/findings', descripcion: 'NCs que requieren tu atención.' },
    { icon: Target, label: 'Objetivos', href: '/objetivos', descripcion: 'Objetivos anuales por área.' },
    { icon: Building2, label: 'Comité Mixto', href: '/committee', descripcion: 'Reuniones de dirección.' },
  ],
  responsabilidades: [
    'Aprobar objetivos anuales del SGI.',
    'Participar del Comité Mixto bimestral.',
    'Revisar el Dashboard semanalmente.',
    'Tomar decisiones cuando algo crítico escala.',
  ],
  primerSemana: [
    { dia: 'Lunes', tarea: 'Dashboard ejecutivo.', href: '/dashboard' },
    { dia: 'Miércoles', tarea: 'Hallazgos críticos.', href: '/findings' },
    { dia: 'Viernes', tarea: 'Resumen semanal.', href: '/sistema-gestion' },
  ],
  expectativas: [
    'Login mínimo 2 veces por semana.',
    'Participación en Comité Mixto bimestral.',
    'Decisión sobre escalados en menos de 48h.',
  ],
  consultaA: [
    { tema: 'SGI operativo', persona: 'Manuel' },
    { tema: 'Estratégico', persona: 'Santiago' },
    { tema: 'Auditora externa', persona: 'NIXA' },
  ],
};

const GENERIC_PROFILE: RoleProfile = {
  greeting: '', heroEmoji: '👋', roleLabel: 'Equipo Trinorma',
  rolePitch: 'Bienvenido al sistema integrado de gestión de DASSA. Tu rol es parte del engranaje que hace funcionar las tres normas ISO.',
  pantallas: [
    { icon: ClipboardList, label: 'Mis Pendientes', href: '/mis-