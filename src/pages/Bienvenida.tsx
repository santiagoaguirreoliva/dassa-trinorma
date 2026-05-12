// =============================================================================
// /bienvenida · Landing personalizada por rol
// =============================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type AppRole } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  ClipboardList, AlertTriangle, GraduationCap, ShoppingCart, CheckSquare,
  Bot, Users as UsersIcon, Calendar as CalendarIcon, FileText, Briefcase,
  ChevronRight, CheckCircle2, Loader2, Sparkles, Shield, Target,
  TrendingUp, MessageCircle, Building2, Megaphone, Pin, Info, AlertCircle as AlertCircleIcon, Zap,
} from 'lucide-react';

// ── Config por rol ──────────────────────────────────────────────────────────
interface RoleProfile {
  greeting: string;
  roleLabel: string;
  rolePitch: string;
  pantallas: { icon: any; label: string; href: string; descripcion: string }[];
  responsabilidades: string[];
  primerSemana: { dia: string; tarea: string; href?: string }[];
  expectativas: string[];
  consultaA: { tema: string; persona: string }[];
}

const RRHH_PROFILE: RoleProfile = {
  greeting: 'María',
  roleLabel: 'Recursos Humanos',
  rolePitch:
    'Sos la responsable de que cada persona en DASSA esté formada, registrada y al día con la norma. Tu rol es central: sin RRHH funcionando bien, ningún SGI pasa una auditoría.',
  pantallas: [
    { icon: UsersIcon, label: 'Empleados', href: '/employees', descripcion: 'Legajos, altas, bajas, cambios de puesto.' },
    { icon: GraduationCap, label: 'Capacitaciones', href: '/trainings', descripcion: 'Programar, registrar evidencias, asistencias.' },
    { icon: AlertTriangle, label: 'NCs de RRHH', href: '/findings', descripcion: 'No conformidades de tu área y de procesos de personas.' },
    { icon: FileText, label: 'Documentos', href: '/documents', descripcion: 'Manual del empleado, políticas, procedimientos RRHH.' },
    { icon: Briefcase, label: 'Mi Puesto', href: '/mi-puesto', descripcion: 'Tu ficha: responsabilidades, objetivos, KPIs.' },
    { icon: CalendarIcon, label: 'Calendario NIXA', href: '/calendario-nixa', descripcion: 'Eventos del SGI, comité, capacitaciones.' },
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
    { dia: 'Día 6', tarea: 'Andá al Calendario NIXA y agendá el próximo comité.', href: '/calendario-nixa' },
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
    { tema: 'Liderazgo SGI / norma ISO', persona: 'Manuel (sgi_leader)' },
    { tema: 'Operaciones / planta', persona: 'Christian' },
    { tema: 'Seguridad e Higiene', persona: 'Fernando Ponzi' },
    { tema: 'Algo grave / técnico', persona: 'Santi' },
  ],
};

const GENERIC_PROFILE: RoleProfile = {
  greeting: '',
  roleLabel: 'Equipo Trinorma',
  rolePitch:
    'Bienvenido al sistema integrado de gestión de DASSA. Tu rol es parte del engranaje que hace funcionar las tres normas ISO.',
  pantallas: [
    { icon: ClipboardList, label: 'Mis Pendientes', href: '/mis-pendientes', descripcion: 'Todo lo asignado a vos en un solo lugar.' },
    { icon: AlertTriangle, label: 'NCs y Desvíos', href: '/findings', descripcion: 'Reportar y dar seguimiento a no conformidades.' },
    { icon: GraduationCap, label: 'Capacitaciones', href: '/trainings', descripcion: 'Tus capacitaciones obligatorias.' },
    { icon: Briefcase, label: 'Mi Puesto', href: '/mi-puesto', descripcion: 'Tu ficha de puesto.' },
  ],
  responsabilidades: [
    'Atender tus tareas pendientes en plazo.',
    'Reportar NCs y desvíos cuando los detectes.',
    'Completar las capacitaciones asignadas.',
  ],
  primerSemana: [
    { dia: 'Día 1', tarea: 'Login y exploración de Mi Puesto.', href: '/mi-puesto' },
    { dia: 'Día 2', tarea: 'Revisar Mis Pendientes.', href: '/mis-pendientes' },
    { dia: 'Día 3', tarea: 'Conocer el módulo de NCs.', href: '/findings' },
  ],
  expectativas: [
    'Loguearte regularmente.',
    'Cumplir con tareas asignadas.',
    'Reportar problemas detectados.',
  ],
  consultaA: [
    { tema: 'Sistema SGI', persona: 'Manuel' },
    { tema: 'Algo grave', persona: 'Santi' },
  ],
};

function getProfileForRole(role: AppRole | undefined, fullName: string): RoleProfile {
  if (role === 'rrhh') {
    return { ...RRHH_PROFILE, greeting: fullName.split(' ')[0] || 'María' };
  }
  return { ...GENERIC_PROFILE, greeting: fullName.split(' ')[0] || 'Equipo' };
}

// ── Componente principal ────────────────────────────────────────────────────
export default function Bienvenida() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pactChecked, setPactChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    // Marcar como visto + chequear status previo
    api.post('/bienvenida/seen', {}).catch(() => {});
    api.get<{ accepted: boolean }>('/bienvenida/status').then(r => setAlreadyAccepted(r.accepted)).catch(() => {});
    api.get<any[]>('/bienvenida/news').then(setNews).catch(() => {});
  }, []);

  if (!user) return null;
  const profile = getProfileForRole(user.role, user.full_name);

  async function acceptPact() {
    setAccepting(true);
    try {
      await api.post('/bienvenida/accept-pact', {});
      navigate('/mis-pendientes');
    } catch (e: any) {
      alert('Error al aceptar: ' + (e.message || 'desconocido'));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <header className="relative bg-gradient-to-br from-[#BF1E2E] to-[#8b1521] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="uppercase tracking-widest text-xs font-bold text-yellow-300">
              Bienvenida personalizada
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
            Hola {profile.greeting} 👋
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 mb-6 max-w-2xl">
            Te doy la bienvenida a <strong>TRINORMA</strong>, el Sistema de Gestión Integrado de DASSA.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Tu rol: {profile.roleLabel}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-12 space-y-16">

        {/* ── NOVEDADES ─────────────────────────────────────────────────── */}
        {news.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-amber-100 rounded-lg p-2"><Megaphone className="w-6 h-6 text-amber-700" /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Novedades del sistema</h2>
                <p className="text-gray-600 text-sm">Lo que cambió o se sumó recientemente</p>
              </div>
            </div>
            <div className="space-y-3">
              {news.map((n: any) => {
                const cfg: any = {
                  urgente:  { bg: 'bg-red-50 border-red-300',     icon: AlertCircleIcon, color: 'text-red-700' },
                  aviso:    { bg: 'bg-amber-50 border-amber-300', icon: Info,            color: 'text-amber-700' },
                  update:   { bg: 'bg-blue-50 border-blue-300',   icon: Zap,             color: 'text-blue-700' },
                  novedad:  { bg: 'bg-emerald-50 border-emerald-300', icon: Sparkles,    color: 'text-emerald-700' },
                };
                const c = cfg[n.category] || cfg.novedad;
                const Icon = c.icon;
                return (
                  <div key={n.id} className={`${c.bg} border-l-4 rounded-r-xl p-4 flex gap-3 items-start`}>
                    <Icon className={`w-5 h-5 ${c.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {n.pinned && <Pin className="w-3.5 h-3.5 text-gray-400" />}
                        <h3 className="font-bold text-gray-900">{n.title}</h3>
                        <span className="text-xs text-gray-500 ml-auto">{new Date(n.published_at).toLocaleDateString('es-AR')}</span>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {n.body_md.replace(/\*\*(.+?)\*\*/g, '$1')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── PITCH DE ROL ────────────────────────────────────────────── */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">¿Por qué TRINORMA y por qué vos?</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              TRINORMA reemplaza planillas, mails y carpetas. Centraliza la gestión de las
              tres normas ISO de DASSA: <strong>9001 (Calidad)</strong>, <strong>14001 (Ambiente)</strong> y{' '}
              <strong>45001 (Seguridad y Salud)</strong>. Acá vive todo lo que vamos a mostrar
              en auditoría externa.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              {profile.rolePitch}
            </p>
          </div>
        </section>

        {/* ── LO MÁS IMPORTANTE (UNIVERSAL) ──────────────────────────── */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Lo más importante del sistema (para todos)
            </h2>
            <p className="text-gray-600">
              Sea cual sea tu rol, estas cinco cosas son la columna vertebral de TRINORMA.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: CheckSquare,
                title: 'Mis Pendientes',
                color: 'bg-[#BF1E2E]',
                desc: 'El lugar #1. Todas tus tareas asignadas (de comité, NCs, proyectos, capacitaciones, auditorías) se nuclean acá. Si solo vas a abrir una pantalla por día, que sea esta.',
                href: '/mis-pendientes',
              },
              {
                icon: AlertTriangle,
                title: 'NC y Desvíos',
                color: 'bg-orange-500',
                desc: 'El corazón de la norma. Cada no conformidad que detectes se reporta acá, con plan de acción, responsable y fecha. Sin NCs gestionadas, no hay certificación.',
                href: '/findings',
              },
              {
                icon: GraduationCap,
                title: 'Capacitaciones',
                color: 'bg-blue-600',
                desc: 'Registrar evidencia de cada capacitación: lista de asistencia, material, evaluación. Lo que no está acá, en auditoría no existe.',
                href: '/trainings',
              },
              {
                icon: ShoppingCart,
                title: 'Compras',
                color: 'bg-emerald-600',
                desc: 'Pedidos de compra con flujo de aprobación. Toda compra relevante al SGI pasa por acá para dejar trazabilidad.',
                href: '/purchases',
              },
              {
                icon: ClipboardList,
                title: 'Revisiones obligatorias',
                color: 'bg-purple-600',
                desc: 'Cada rol tiene revisiones periódicas (mensuales, trimestrales, anuales). Te van a aparecer en Mis Pendientes en su fecha.',
                href: '/mis-pendientes',
              },
              {
                icon: FileText,
                title: 'Actas, recorridos y auditorías',
                color: 'bg-slate-700',
                desc: 'Documentación formal: actas de comité, recorridos de inspección, auditorías internas. Asociadas a tu perfil cuando te toca firmar/participar.',
                href: '/comunicaciones',
              },
            ].map((it, i) => {
              const Icon = it.icon;
              return (
                <div
                  key={i}
                  onClick={() => navigate(it.href)}
                  className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-[#BF1E2E] hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`${it.color} rounded-lg p-3 shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900">{it.title}</h3>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#BF1E2E] transition" />
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{it.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── TU ROL ESPECÍFICO ────────────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Tu tablero · {profile.roleLabel}
            </h2>
            <p className="text-gray-600">
              Estas son las pantallas que vas a usar día a día en tu rol.
            </p>
          </div>

          {/* Mapa visual de pantallas */}
          <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-2xl p-6 sm:p-8 mb-6">
            <div className="text-center mb-6">
              <Target className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
              <h3 className="text-white font-bold text-xl">Mapa de tus pantallas</h3>
              <p className="text-white/60 text-sm">Tocá cualquiera para ir directo.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.pantallas.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div
                    key={i}
                    onClick={() => navigate(p.href)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 cursor-pointer transition group"
                  >
                    <Icon className="w-6 h-6 text-yellow-300 mb-2" />
                    <div className="font-bold text-white text-sm mb-1">{p.label}</div>
                    <div className="text-white/70 text-xs leading-snug">{p.descripcion}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Responsabilidades */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#BF1E2E]" /> Tus responsabilidades concretas
            </h3>
            <ul className="space-y-2">
              {profile.responsabilidades.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── AGENTE IA ────────────────────────────────────────────────── */}
        <section>
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="w-8 h-8 text-yellow-300" />
              <h2 className="text-2xl font-bold">El agente NIXA</h2>
            </div>
            <p className="text-white/90 text-lg mb-4 leading-relaxed">
              TRINORMA tiene un asistente de IA llamado <strong>NIXA</strong> que trabaja en
              segundo plano:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/10 rounded-lg p-4">
                <Sparkles className="w-5 h-5 text-yellow-300 mb-2" />
                <div className="font-bold mb-1">Te avisa pendientes</div>
                <div className="text-sm text-white/80">Te llegan notificaciones de tareas próximas a vencer y NCs sin atender.</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <MessageCircle className="w-5 h-5 text-yellow-300 mb-2" />
                <div className="font-bold mb-1">Te ayuda a cargar bien</div>
                <div className="text-sm text-white/80">Al crear una NC o capacitación, NIXA valida que esté completa según ISO.</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <Shield className="w-5 h-5 text-yellow-300 mb-2" />
                <div className="font-bold mb-1">Audita en tiempo real</div>
                <div className="text-sm text-white/80">Revisa el sistema para que cuando venga la auditoría externa, todo esté como tiene que estar.</div>
              </div>
            </div>
            <p className="text-white/80 text-sm mt-4">
              Lo accedés desde <strong>Inbox NIXA</strong> en el menú lateral.
            </p>
          </div>
        </section>

        {/* ── PRIMERA SEMANA ────────────────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tu primera semana en TRINORMA</h2>
            <p className="text-gray-600">Un mini plan para que no te sientas perdida.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {profile.primerSemana.map((d, i) => (
              <div
                key={i}
                onClick={() => d.href && navigate(d.href)}
                className={`flex items-center gap-4 p-4 ${d.href ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                  i < profile.primerSemana.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="bg-[#BF1E2E] text-white rounded-lg w-16 text-center py-2 font-bold text-sm shrink-0">
                  {d.dia}
                </div>
                <div className="flex-1 text-gray-700">{d.tarea}</div>
                {d.href && <ChevronRight className="w-5 h-5 text-gray-400" />}
              </div>
            ))}
          </div>
        </section>

        {/* ── EXPECTATIVAS + DIRECTORIO ──────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#BF1E2E]" /> Qué esperamos de vos
            </h3>
            <ul className="space-y-2">
              {profile.expectativas.map((e, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                  <Target className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#BF1E2E]" /> Si necesitás ayuda
            </h3>
            <ul className="space-y-3">
              {profile.consultaA.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="bg-[#BF1E2E]/10 text-[#BF1E2E] rounded-lg p-2 shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">{c.tema}</div>
                    <div className="text-gray-600">→ {c.persona}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PACTO ────────────────────────────────────────────────────── */}
        <section>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-amber-700" />
              <h2 className="text-2xl font-bold text-amber-900">Pacto Trinorma</h2>
            </div>
            <p className="text-amber-900/80 mb-6 leading-relaxed">
              Para que TRINORMA funcione y la gestión sea un éxito, te pido que aceptes estos
              compromisos. Tu aceptación queda registrada con fecha y hora — vamos a usarlo
              como evidencia en auditorías ISO.
            </p>
            <div className="bg-white rounded-xl p-5 mb-6 space-y-2.5">
              <h4 className="font-bold text-gray-900 mb-3">Me comprometo a:</h4>
              {[
                'Usar TRINORMA como única fuente de verdad. No paralelizar planillas Excel ni grupos de WhatsApp.',
                'Cargar mis tareas y evidencias en tiempo y forma.',
                'Atender mis pendientes con regularidad y no acumular atrasos.',
                'Reportar NCs y desvíos apenas los detecte, sin filtrar nada.',
                'Tratar la información del sistema con la confidencialidad que corresponde.',
                'Avisar a Santiago si encuentro un error o algo que no funciona.',
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </div>
              ))}
            </div>

            {alreadyAccepted ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-emerald-900">Ya aceptaste el pacto. Gracias.</div>
                <div className="text-sm text-emerald-700">Podés cerrar esta pantalla y volver al sistema.</div>
              </div>
            ) : (
              <>
                <label className="flex items-start gap-3 mb-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pactChecked}
                    onChange={e => setPactChecked(e.target.checked)}
                    className="w-5 h-5 accent-amber-600 mt-0.5"
                  />
                  <span className="text-amber-900 font-medium">
                    Leí y entiendo. Me comprometo a cumplir el pacto.
                  </span>
                </label>
                <button
                  disabled={!pactChecked || accepting}
                  onClick={acceptPact}
                  className="w-full bg-[#BF1E2E] hover:bg-[#a01825] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-lg"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Aceptando...
                    </>
                  ) : (
                    <>
                      Empezar por Mis Pendientes
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </section>

        {/* Footer mini */}
        <div className="text-center text-sm text-gray-500 py-8">
          DASSA TRINORMA · v2.1 · Si encontrás algo raro, escribime: santiago@dassa.com.ar
        </div>
      </main>
    </div>
  );
}
