import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Users, Search, UserCheck, UserX, Phone, Mail, MessageCircle,
  Bot, ExternalLink, Cpu, MapPin, Briefcase, Heart, Award, Trash2,
  GraduationCap, AlertTriangle, Link2, Copy, Check, RefreshCw, KeyRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Employee {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  sector?: string;
  position?: string;
  is_active: boolean;
  evaluator_name?: string;
  evaluator_id?: string;
  secondary_evaluator_id?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  cuil?: string;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  hire_date?: string;
  contract_type?: string;
  work_schedule?: string;
  notes?: string;
  marital_status?: string;
  portal_invite_token?: string;
  portal_activated_at?: string;
  portal_onboarded_at?: string;
  created_at: string;
}

// Botón + panel para generar el link de primer acceso al Portal del Empleado.
function PortalLinkButton({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ portal_invite_token: string; portal_activated_at: string | null; portal_onboarded_at: string | null; pin_set: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  async function gen(regenerate = false) {
    setBusy(true); setErr('');
    try { setData(await api.post(`/employees/${employeeId}/portal-invite`, { regenerate })); setOpen(true); }
    catch (e) { setErr((e as Error).message || 'Error'); }
    finally { setBusy(false); }
  }
  const link = data ? `${window.location.origin}/portal-empleado?t=${data.portal_invite_token}` : '';
  async function copy() { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }

  return (
    <>
      <button onClick={() => (data ? setOpen(true) : gen(false))} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dassa-celeste/15 text-dassa-celeste-deep text-xs font-bold hover:bg-dassa-celeste/25 disabled:opacity-50">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Link de acceso
      </button>
      {open && data && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2"><Link2 size={16} className="text-dassa-celeste-deep" /> Link de primer acceso</h3>
              <button onClick={() => setOpen(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-2">Envialo por WhatsApp o mail. Con este link la persona entra una vez, crea su PIN y completa sus datos.</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
              <input readOnly value={link} className="flex-1 bg-transparent text-[12px] text-gray-700 outline-none" />
              <button onClick={copy} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-dassa-red text-white text-xs font-bold">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copiado' : 'Copiar'}</button>
            </div>
            <div className="flex items-center gap-2 text-[12px] mb-3">
              <KeyRound size={14} className={data.pin_set ? 'text-emerald-600' : 'text-amber-500'} />
              {data.pin_set
                ? <span className="text-emerald-700 font-semibold">Ya creó su PIN{data.portal_onboarded_at ? ' · datos completos' : ' · datos pendientes'}</span>
                : <span className="text-amber-600 font-semibold">Pendiente de activación</span>}
            </div>
            <button onClick={() => { if (confirm('Regenerar invalida el link y el PIN actuales. ¿Continuar?')) gen(true); }} disabled={busy}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 disabled:opacity-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Regenerar link (resetea PIN)
            </button>
          </div>
        </div>
      )}
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </>
  );
}
interface EmployeeCertification {
  id: string; cert_type?: string; cert_name: string; issued_by?: string;
  issue_date?: string; expiry_date?: string; status?: string;
  file_url?: string; notes?: string;
}
interface EmployeePosition {
  id: string; profile_id: string; role_label: string; area?: string;
  seniority?: string; is_primary: boolean; since?: string; until?: string; notes?: string;
}
interface JobProfileLite {
  id: string; role_label: string; area?: string; seniority?: string;
}

// ─── Capa de Agentes IA — RR.AI ──────────────────────────────
// Los agentes de IA de DASSA se listan junto a la dotación humana:
// son los Recursos de IA (RR.AI), con ficha de puesto propia.
// Presentación pública del equipo: https://apps.dassa.com.ar/agentes/
interface Agent {
  key: string;
  name: string;
  role: string;
  avatar: string;
  accent: string;
  status: string;
  spirit: string;
  puesto: string;
  area: string;
  reporta: string;
  mision: string;
  rasgos: string[];
  responsabilidades: string[];
  soporte: string[];
}

const AGENTS_DASSA: Agent[] = [
  {
    key: 'triny',
    name: 'TRINY',
    role: 'Asistente del SGI Trinorma',
    avatar: '/agents/avatar-triny.svg',
    accent: '#2BB8BE',
    status: 'En operación',
    spirit: 'Un sistema de gestión no se aprueba una vez: se sostiene todos los días.',
    puesto: 'Asistente de Gestión Integrada (Agente IA)',
    area: 'Calidad — Sistema Integrado de Gestión',
    reporta: 'Responsable de Conformidad ISO · Dirección',
    mision: 'Mantener el SGI Trinorma vivo, actualizado y siempre listo para auditoría.',
    rasgos: ['Elegante', 'Amable', 'Exigente', 'Meticulosa', 'Especialista ISO', 'Calma profesional'],
    responsabilidades: [
      'Auditoría ISO continua durante todo el año',
      'Gestión de hallazgos y no conformidades hasta su cierre',
      'Control documental: versiones, vigencias y vencimientos',
      'Recordatorios y alertas de pendientes ISO',
      'Soporte y orden del inbox del SGI',
      'Acompañamiento en auditorías internas y externas',
    ],
    soporte: ['Equipo de Calidad', 'Conformidad ISO (Nixa)', 'Dirección', 'Sectores con tareas ISO'],
  },
  {
    key: 'sincro',
    name: 'SINCRO',
    role: 'El cerebro de la coordinación',
    avatar: '/agents/avatar-sincro.svg',
    accent: '#1B2C66',
    status: 'En operación',
    spirit: 'Las malas noticias viajan más rápido. Yo me ocupo de que lleguen a tiempo.',
    puesto: 'Supervisor de Operaciones (Agente IA)',
    area: 'Coordinación — Depósito — Logística',
    reporta: 'Jefatura de Coordinación y Operaciones',
    mision: 'Detectar antes que nadie los puntos de fuga, demoras y siniestros de la cadena logística.',
    rasgos: ['Eficiente', 'Rápido', 'Conciso', 'Anticipatorio', 'Frío bajo presión', 'Analítico'],
    responsabilidades: [
      'Supervisión operativa diaria en tiempo real',
      'Detección temprana de demoras y cuellos de botella',
      'Alertas priorizadas, claras y sin vueltas',
      'Análisis predictivo (machine learning) de la operación',
      'Seguimiento de la cadena de punta a punta',
      'Tablero operativo para coordinación y depósito',
    ],
    soporte: ['Equipo de Coordinación', 'Depósito', 'Tráfico', 'Jefaturas operativas'],
  },
  {
    key: 'cortex',
    name: 'COMEX',
    role: 'Estratega comercial & comex',
    avatar: '/agents/avatar-cortex.svg',
    accent: '#C8202C',
    status: 'En operación',
    spirit: 'Los números no opinan. Cierran o no cierran.',
    puesto: 'Analista Comercial y de Comex (Agente IA)',
    area: 'Comercial — Ventas — Comercio Exterior',
    reporta: 'Dirección Comercial',
    mision: 'Convertir los datos del comex en ventas y mantener el pipeline siempre vivo.',
    rasgos: ['Exigente', 'Inquebrantable', 'Analítico', 'Matemático', 'Vendedor nato', 'Directo'],
    responsabilidades: [
      'Análisis de pipeline, oportunidad por oportunidad',
      'Seguimiento de prospectos y leads fríos',
      'Lectura de la dinámica de comercio exterior argentino',
      'Scoring y priorización de oportunidades',
      'Alertas de cotizaciones sin respuesta o por vencer',
      'Informes y proyecciones comerciales',
    ],
    soporte: ['Equipo Comercial', 'Ventas Comex', 'Dirección Comercial'],
  },
  {
    key: 'luz',
    name: 'LUZ',
    role: 'Directora de Marketing & Contenidos',
    avatar: '/agents/avatar-luz.svg',
    accent: '#E0303E',
    status: 'En operación',
    spirit: 'Una marca no se grita: se construye, pieza por pieza, todos los días.',
    puesto: 'Directora de Marketing y Contenidos (Agente IA)',
    area: 'Marketing — Comunicación — Contenidos',
    reporta: 'Dirección General',
    mision: 'Que DASSA se comunique mejor que cualquier agencia externa, con criterio y datos.',
    rasgos: ['Estratega', 'Creativa', 'Ejecutiva', 'Exigente con la marca', 'Clara', 'Orientada a resultados'],
    responsabilidades: [
      'Dirección de la estrategia de marketing y comunicación',
      'Coordinación del equipo de subagentes de producción de contenido',
      'Calendario editorial y plan de campañas en LinkedIn e Instagram',
      'Diagnóstico de marca, competencia y redes',
      'Control de calidad de cada pieza contra la identidad DASSA',
      'Reporte de performance y aprendizajes a Dirección',
    ],
    soporte: ['Dirección General', 'Equipo Comercial', 'Cortex — Ventas Comex', 'Marca DASSA'],
  },
  {
    key: 'fort',
    name: 'FORT',
    role: 'Guardián de plataforma & seguridad',
    avatar: '/agents/avatar-fort.svg',
    accent: '#C8202C',
    status: 'En operación',
    spirit: 'Un sistema caído no avisa. Por eso yo no duermo.',
    puesto: 'Guardián de Confiabilidad y Seguridad (Agente IA)',
    area: 'Plataforma — Sistemas — Seguridad',
    reporta: 'Dirección General · Agente Ejecutivo',
    mision: 'Mantener cada sistema de DASSA en pie, seguro y vigilado las 24 horas.',
    rasgos: ['Vigilante', 'Sobrio', 'Incansable', 'Preciso', 'Conservador con el riesgo', 'Transparente'],
    responsabilidades: [
      'Monitoreo de salud de todo el ecosistema, las 24 horas',
      'Auto-remediación de caídas leves con guardarraíles estrictos',
      'Rondas de inspección preventiva: disco, certificados SSL, backups',
      'Custodia de la seguridad y de las credenciales del ecosistema',
      'Escalamiento a soporte IT externo con diagnóstico accionable',
      'Reportes de confiabilidad y postmortems de incidentes',
    ],
    soporte: ['Todos los agentes RR.AI', 'Apps del ecosistema', 'Soporte IT externo', 'Dirección'],
  },
];

function FichaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-2">
      <p className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
      <p className="text-[11px] font-semibold text-gray-800 leading-snug">{value}</p>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid md:grid-cols-[210px_1fr]">
        {/* Identidad */}
        <div
          className="p-5 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-gray-100"
          style={{ background: `linear-gradient(165deg,#ffffff 0%, ${agent.accent}14 100%)` }}
        >
          <img src={agent.avatar} alt={agent.name}
            className="w-24 h-24 rounded-full shadow-md"
            style={{ outline: `3px solid ${agent.accent}33` }} />
          <h3 className="mt-3 text-lg font-black tracking-tight text-gray-900">{agent.name}</h3>
          <p className="text-[10px] font-extrabold uppercase tracking-wide mt-0.5"
            style={{ color: agent.accent }}>{agent.role}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{agent.status}
          </span>
          <p className="mt-3 text-[11px] italic text-gray-500 leading-snug">«{agent.spirit}»</p>
        </div>

        {/* Ficha + responsabilidades */}
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-px bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
            <FichaCell label="Puesto" value={agent.puesto} />
            <FichaCell label="Área" value={agent.area} />
            <FichaCell label="Reporta a" value={agent.reporta} />
            <FichaCell label="Misión" value={agent.mision} />
          </div>

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400 mb-1.5">Rasgos de personalidad</p>
            <div className="flex flex-wrap gap-1.5">
              {agent.rasgos.map(r => (
                <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white">{r}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400 mb-1.5">Responsabilidades</p>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {agent.responsabilidades.map((r, i) => (
                <li key={i} className="text-[11px] text-gray-600 leading-snug flex gap-1.5">
                  <span className="font-extrabold text-dassa-red">{String(i + 1).padStart(2, '0')}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400 mb-1.5">Da soporte a</p>
            <div className="flex flex-wrap gap-1.5">
              {agent.soporte.map(s => (
                <span key={s} className="text-[10px] font-semibold px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// La nómina de agentes la sirve la app Madre (RR.AI · /api/agents, proxy a
// smart-dassa-apps). AGENTS_DASSA queda como respaldo si la Madre no responde.
function AgentsLayer() {
  const { data: agents = AGENTS_DASSA } = useQuery<Agent[]>({
    queryKey: ['rrai-agents'],
    queryFn: async () => {
      const r = await api.get<{ agentes: Agent[] }>('/agents');
      return Array.isArray(r.agentes) && r.agentes.length ? r.agentes : AGENTS_DASSA;
    },
    placeholderData: AGENTS_DASSA,
    refetchInterval: 300_000,
    retry: 1,
  });
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-dassa-celeste to-dassa-celeste-deep flex items-center justify-center text-white shrink-0">
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-extrabold text-gray-900 flex items-center gap-2 flex-wrap">
            Capa de Agentes IA
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-dassa-celeste-tint text-dassa-celeste-deep tracking-wide">RR.AI</span>
          </h2>
          <p className="text-[11px] text-gray-500">
            Los Recursos de Inteligencia Artificial de DASSA — listados junto a la dotación humana, con ficha de puesto propia.
          </p>
        </div>
        <a href="https://apps.dassa.com.ar/agentes/" target="_blank" rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-dassa-red hover:text-dassa-red-deep shrink-0">
          Presentación del equipo <ExternalLink size={12} />
        </a>
      </div>
      {agents.map(a => <AgentCard key={a.key} agent={a} />)}
    </div>
  );
}

// ─── New / Edit Employee Modal ───────────────────────────────
type ModalTab = 'general' | 'contacto' | 'laboral' | 'emergencia' | 'puestos' | 'certs';

const TABS: { k: ModalTab; label: string; icon: any }[] = [
  { k: 'general',    label: 'General',    icon: UserCheck },
  { k: 'contacto',   label: 'Contacto',   icon: Phone },
  { k: 'laboral',    label: 'Laboral',    icon: Briefcase },
  { k: 'emergencia', label: 'Emergencia', icon: Heart },
  { k: 'puestos',    label: 'Puestos',    icon: Users },
  { k: 'certs',      label: 'Habilitaciones', icon: GraduationCap },
];

const CONTRACT_TYPES = [
  { v: 'relacion_dependencia', l: 'Relación de dependencia' },
  { v: 'monotributo',          l: 'Monotributo' },
  { v: 'autonomo',             l: 'Autónomo' },
  { v: 'eventual',             l: 'Eventual' },
  { v: 'plazo_fijo',           l: 'Plazo fijo' },
  { v: 'pasantia',             l: 'Pasantía' },
];
const WORK_SCHEDULES = [
  { v: 'full_time',  l: 'Full-time' },
  { v: 'part_time',  l: 'Part-time' },
  { v: 'turnos',     l: 'Turnos rotativos' },
  { v: 'guardias',   l: 'Guardias' },
  { v: 'remoto',     l: 'Remoto' },
];

function EmployeeModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!employee;
  const [tab, setTab] = useState<ModalTab>('general');
  const [form, setForm] = useState({
    full_name: employee?.full_name ?? '',
    position: employee?.position ?? '',
    sector: employee?.sector ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    whatsapp: employee?.whatsapp ?? '',
    address: employee?.address ?? '',
    cuil: employee?.cuil ?? '',
    birth_date: employee?.birth_date?.slice(0,10) ?? '',
    hire_date: employee?.hire_date?.slice(0,10) ?? '',
    contract_type: employee?.contract_type ?? '',
    work_schedule: employee?.work_schedule ?? '',
    supervisor_id: employee?.supervisor_id ?? '',
    emergency_contact_name: employee?.emergency_contact_name ?? '',
    emergency_contact_phone: employee?.emergency_contact_phone ?? '',
    emergency_contact_relation: employee?.emergency_contact_relation ?? '',
    notes: employee?.notes ?? '',
    is_active: employee?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Lista de empleados activos (para selector de supervisor)
  const { data: peers = [] } = useQuery<Employee[]>({
    queryKey: ['employees-peers'],
    queryFn: () => api.get<Employee[]>('/employees?status=activo'),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/employees/${employee!.id}`, form)
      : api.post<Employee>('/employees', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['employee', employee!.id] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-[15px] font-extrabold text-gray-900">
              {isEdit ? `Ficha · ${employee!.full_name}` : 'Nuevo Empleado'}
            </h3>
            {isEdit && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {employee!.position || '—'} · {employee!.sector || '—'} · {employee!.is_active ? 'Activo' : 'Inactivo'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEdit && <PortalLinkButton employeeId={employee!.id} />}
            <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50 px-2 overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {TABS.map(t => {
              // Las tabs Puestos / Certs sólo tienen sentido si ya existe el empleado
              if (!isEdit && (t.k === 'puestos' || t.k === 'certs')) return null;
              const Icon = t.icon;
              return (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border-b-2
                    ${tab === t.k
                      ? 'border-dassa-red text-dassa-red-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto" style={{ minHeight: 400, maxHeight: '70vh' }}>
          {/* ── TAB GENERAL ── */}
          {tab === 'general' && (
            <>
              <div>
                <label className="label-field">Nombre completo <span className="text-red-500">*</span></label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Apellido y nombre" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Puesto (texto libre)</label>
                  <input value={form.position} onChange={e => set('position', e.target.value)}
                    placeholder="Ej: Operario de playa" className="input-field" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Para el puesto formal usá la tab "Puestos"</p>
                </div>
                <div>
                  <label className="label-field">Sector / Área</label>
                  <input value={form.sector} onChange={e => set('sector', e.target.value)}
                    placeholder="Ej: Depósito" className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">CUIL</label>
                  <input value={form.cuil} onChange={e => set('cuil', e.target.value)}
                    placeholder="20-12345678-9" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Fecha de nacimiento</label>
                  <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)}
                    className="input-field" />
                </div>
              </div>
              <div>
                <label className="label-field">Estado</label>
                <select value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}
                  className="input-field">
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="label-field">Notas internas</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} placeholder="Observaciones..." className="input-field" />
              </div>
            </>
          )}

          {/* ── TAB CONTACTO ── */}
          {tab === 'contacto' && (
            <>
              <div>
                <label className="label-field"><Mail size={11} className="inline mr-1" />Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="email@dassa.com.ar" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field"><Phone size={11} className="inline mr-1" />Teléfono</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+54 11 ..." className="input-field" inputMode="tel" />
                </div>
                <div>
                  <label className="label-field"><MessageCircle size={11} className="inline mr-1" />WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                    placeholder="+54 9 11 ..." className="input-field" inputMode="tel" />
                </div>
              </div>
              <div>
                <label className="label-field"><MapPin size={11} className="inline mr-1" />Dirección</label>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Calle, número, ciudad..." className="input-field" />
              </div>
            </>
          )}

          {/* ── TAB LABORAL ── */}
          {tab === 'laboral' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Fecha de ingreso</label>
                  <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)}
                    className="input-field" />
                  {form.hire_date && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Antigüedad: {Math.floor((Date.now() - new Date(form.hire_date).getTime()) / (365.25 * 86400000))} años
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-field">Modalidad de contrato</label>
                  <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)}
                    className="input-field">
                    <option value="">— Sin definir —</option>
                    {CONTRACT_TYPES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">Jornada</label>
                <select value={form.work_schedule} onChange={e => set('work_schedule', e.target.value)}
                  className="input-field">
                  <option value="">— Sin definir —</option>
                  {WORK_SCHEDULES.map(w => <option key={w.v} value={w.v}>{w.l}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Supervisor directo</label>
                <select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)}
                  className="input-field">
                  <option value="">— Sin asignar —</option>
                  {peers.filter(e => e.id !== employee?.id).map(e =>
                    <option key={e.id} value={e.id}>{e.full_name}{e.position ? ` · ${e.position}` : ''}</option>
                  )}
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">A quién le reporta jerárquicamente (no es lo mismo que el evaluador)</p>
              </div>
            </>
          )}

          {/* ── TAB EMERGENCIA ── */}
          {tab === 'emergencia' && (
            <>
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                Información sensible. Solo se muestra a admins. Usar en caso de accidente o emergencia médica.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Nombre de contacto</label>
                  <input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)}
                    placeholder="Ej: María Pérez" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Relación</label>
                  <input value={form.emergency_contact_relation} onChange={e => set('emergency_contact_relation', e.target.value)}
                    placeholder="Ej: cónyuge, padre, hermano" className="input-field" />
                </div>
              </div>
              <div>
                <label className="label-field">Teléfono de emergencia</label>
                <input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)}
                  placeholder="+54 9 11 ..." className="input-field" inputMode="tel" />
              </div>
            </>
          )}

          {/* ── TAB PUESTOS ── */}
          {tab === 'puestos' && isEdit && (
            <PositionsTab employeeId={employee!.id} />
          )}

          {/* ── TAB CERTS ── */}
          {tab === 'certs' && isEdit && (
            <CertificationsTab employeeId={employee!.id} />
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        {/* Footer — solo si la tab actual es editable por el form principal */}
        {['general','contacto','laboral','emergencia'].includes(tab) && (
          <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={() => !mutation.isPending && mutation.mutate()}
              disabled={!form.full_name.trim() || mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-tab: Puestos asignados ──────────────────────────────────
function PositionsTab({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ profile_id: '', is_primary: false, since: '', until: '', notes: '' });
  const [err, setErr] = useState('');

  const { data: positions = [], isLoading } = useQuery<EmployeePosition[]>({
    queryKey: ['employee', employeeId, 'positions'],
    queryFn: () => api.get<EmployeePosition[]>(`/employees/${employeeId}/positions`),
  });
  const { data: profiles = [] } = useQuery<JobProfileLite[]>({
    queryKey: ['job-profiles-lite'],
    queryFn: () => api.get<JobProfileLite[]>('/sgi-modules/job-profiles?active=true').catch(() => []),
    staleTime: 60_000,
  });

  const addMut = useMutation({
    mutationFn: () => api.post(`/employees/${employeeId}/positions`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', employeeId, 'positions'] });
      setForm({ profile_id: '', is_primary: false, since: '', until: '', notes: '' });
      setAdding(false);
      setErr('');
    },
    onError: (e: any) => setErr(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${employeeId}/positions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee', employeeId, 'positions'] }),
  });

  if (isLoading) return <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div>;

  return (
    <div className="space-y-2">
      {positions.length === 0 && !adding && (
        <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">Sin puestos asignados.</p>
      )}
      {positions.map(p => (
        <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <Briefcase size={16} className={p.is_primary ? 'text-dassa-red' : 'text-gray-400'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {p.is_primary && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-dassa-red/10 text-dassa-red-deep">Principal</span>}
              {p.seniority && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{p.seniority}</span>}
            </div>
            <div className="text-sm font-bold text-gray-900">{p.role_label}</div>
            <div className="text-[11px] text-gray-500">
              {p.area || '—'}
              {p.since && ` · desde ${p.since.slice(0,10)}`}
              {p.until && ` · hasta ${p.until.slice(0,10)}`}
            </div>
          </div>
          <button onClick={() => delMut.mutate(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Quitar">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <select value={form.profile_id} onChange={e => setForm({ ...form, profile_id: e.target.value })}
            className="input-field">
            <option value="">— Seleccionar puesto —</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.role_label}{p.area ? ` · ${p.area}` : ''}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.since} onChange={e => setForm({ ...form, since: e.target.value })}
              className="input-field" placeholder="Desde" />
            <input type="date" value={form.until} onChange={e => setForm({ ...form, until: e.target.value })}
              className="input-field" placeholder="Hasta (opcional)" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} />
            Puesto principal
          </label>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setErr(''); }} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancelar</button>
            <button onClick={() => form.profile_id && addMut.mutate()} disabled={!form.profile_id}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">Asignar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:border-blue-300 flex items-center justify-center gap-1">
          <Plus size={14} /> Asignar a un puesto
        </button>
      )}
    </div>
  );
}

// ─── Sub-tab: Certificaciones / habilitaciones ───────────────────
function CertificationsTab({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    cert_name: '', cert_type: '', issued_by: '',
    issue_date: '', expiry_date: '', status: 'vigente', notes: '',
  });
  const [err, setErr] = useState('');

  const { data: certs = [], isLoading } = useQuery<EmployeeCertification[]>({
    queryKey: ['employee', employeeId, 'certifications'],
    queryFn: () => api.get<EmployeeCertification[]>(`/employees/${employeeId}/certifications`),
  });

  const addMut = useMutation({
    mutationFn: () => api.post(`/employees/${employeeId}/certifications`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', employeeId, 'certifications'] });
      setForm({ cert_name: '', cert_type: '', issued_by: '', issue_date: '', expiry_date: '', status: 'vigente', notes: '' });
      setAdding(false);
      setErr('');
    },
    onError: (e: any) => setErr(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${employeeId}/certifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee', employeeId, 'certifications'] }),
  });

  if (isLoading) return <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div>;

  function daysUntil(date?: string) {
    if (!date) return null;
    return Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
  }

  return (
    <div className="space-y-2">
      {certs.length === 0 && !adding && (
        <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">Sin certificaciones / habilitaciones cargadas.</p>
      )}
      {certs.map(c => {
        const days = daysUntil(c.expiry_date);
        const expSoon = days != null && days >= 0 && days <= 30;
        const expired = days != null && days < 0;
        return (
          <div key={c.id} className={`bg-white border rounded-xl p-3 flex items-start gap-3
            ${expired ? 'border-red-300' : expSoon ? 'border-amber-300' : 'border-gray-200'}`}>
            <Award size={16} className={expired ? 'text-red-500' : expSoon ? 'text-amber-500' : 'text-emerald-500'} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900">{c.cert_name}</div>
              <div className="text-[11px] text-gray-500">
                {c.cert_type && <>{c.cert_type} · </>}
                {c.issued_by && <>Emitida por {c.issued_by}</>}
              </div>
              {c.expiry_date && (
                <div className={`text-[11px] font-bold mt-0.5 ${expired ? 'text-red-600' : expSoon ? 'text-amber-700' : 'text-gray-600'}`}>
                  Vence {c.expiry_date.slice(0,10)}
                  {expired && ' · VENCIDA'}
                  {expSoon && !expired && ` · vence en ${days}d`}
                </div>
              )}
              {c.notes && <div className="text-[11px] text-gray-500 mt-1 italic">{c.notes}</div>}
            </div>
            <button onClick={() => delMut.mutate(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar">
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <input value={form.cert_name} onChange={e => setForm({ ...form, cert_name: e.target.value })}
            placeholder="Nombre de la habilitación (ej: Carnet de autoelevadorista)" className="input-field" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.cert_type} onChange={e => setForm({ ...form, cert_type: e.target.value })}
              placeholder="Tipo (ej: SySO, técnica, manejo)" className="input-field" />
            <input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })}
              placeholder="Emitida por (org. emisor)" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-field">Emisión</label>
              <input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="label-field">Vencimiento</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                className="input-field" />
            </div>
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2} placeholder="Notas / nº de certificado..." className="input-field" />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setErr(''); }} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancelar</button>
            <button onClick={() => form.cert_name && addMut.mutate()} disabled={!form.cert_name}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">Agregar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:border-blue-300 flex items-center justify-center gap-1">
          <Plus size={14} /> Agregar habilitación
        </button>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Employees() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>();
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const qc = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees', search, filterSector, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterSector) params.set('sector', filterSector);
      if (filterStatus) params.set('status', filterStatus);
      const qs = params.toString();
      return api.get(`/employees${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const activos = employees.filter(e => e.is_active).length;
  const inactivos = employees.filter(e => !e.is_active).length;
  const sectores = [...new Set(employees.map(e => e.sector).filter(Boolean))] as string[];

  return (
    <>
      <Header
        title="RRHH — Empleados y Agentes"
        subtitle="Dotación humana (RRHH) y equipo de agentes de IA (RR.AI)"
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Empleado
            </button>
          )
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Dotación Humana" value={employees.length} sub="Empleados (RRHH)" icon={<Users size={16} />} />
              <KPICard label="Activos" value={activos} sub="En servicio" icon={<UserCheck size={16} />} />
              <KPICard label="Inactivos" value={inactivos} sub="Sin servicio" icon={<UserX size={16} />} />
              <KPICard label="Agentes IA" value={AGENTS_DASSA.length} sub="Recursos IA (RR.AI)" icon={<Cpu size={16} />} />
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los sectores</option>
                {sectores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
              {(search || filterSector || filterStatus) && (
                <button onClick={() => { setSearch(''); setFilterSector(''); setFilterStatus(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{employees.length} empleados</span>
            </div>

            {/* Tabla — dotación humana */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell">Nombre Completo</th>
                    <th className="th-cell hidden md:table-cell">Puesto</th>
                    <th className="th-cell hidden lg:table-cell">Sector</th>
                    <th className="th-cell hidden xl:table-cell">Contacto</th>
                    <th className="th-cell w-24">Estado</th>
                    {isAdmin && <th className="th-cell w-28">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={emp.full_name} size={28} />
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{emp.full_name}</p>
                            {emp.position && <p className="text-[10px] text-gray-400 md:hidden">{emp.position}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-[11px] text-gray-500">{emp.position || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-[11px] text-gray-500">{emp.sector || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {emp.email && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Mail size={9} />{emp.email}
                            </span>
                          )}
                          {emp.phone && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Phone size={9} />{emp.phone}
                            </span>
                          )}
                          {emp.whatsapp
                            ? <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                <MessageCircle size={9} />{emp.whatsapp}
                              </span>
                            : <span className="text-[10px] text-amber-500 flex items-center gap-1">
                                <MessageCircle size={9} />Sin WhatsApp
                              </span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold
                          ${emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {emp.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditing(emp); setShowModal(true); }}
                              className="text-[10px] font-bold text-dassa-red hover:text-dassa-red-deep px-2 py-1">
                              Editar
                            </button>
                            <button onClick={() => { if (window.confirm(`¿Eliminar a ${emp.full_name}?`)) deleteMut.mutate(emp.id); }}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin empleados registrados</p>
                </div>
              )}
            </div>

            {/* Capa de Agentes IA — RR.AI */}
            <AgentsLayer />
          </div>
        )}
      </PageContent>

      {showModal && <EmployeeModal employee={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
