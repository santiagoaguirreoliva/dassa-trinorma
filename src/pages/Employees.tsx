import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Users, Search, UserCheck, UserX, Phone, Mail, MessageCircle,
  Bot, ExternalLink, Cpu,
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
  created_at: string;
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
    name: 'CORTEX',
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

function AgentsLayer() {
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
      {AGENTS_DASSA.map(a => <AgentCard key={a.key} agent={a} />)}
    </div>
  );
}

// ─── New / Edit Employee Modal ───────────────────────────────
function EmployeeModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!employee;
  const [form, setForm] = useState({
    full_name: employee?.full_name ?? '',
    position: employee?.position ?? '',
    sector: employee?.sector ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    whatsapp: employee?.whatsapp ?? '',
    is_active: employee?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/employees/${employee!.id}`, form)
      : api.post('/employees', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Nombre completo <span className="text-red-500">*</span></label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Apellido y nombre" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Puesto</label>
              <input value={form.position} onChange={e => set('position', e.target.value)}
                placeholder="Ej: Operario de playa" className="input-field" />
            </div>
            <div>
              <label className="label-field">Sector</label>
              <input value={form.sector} onChange={e => set('sector', e.target.value)}
                placeholder="Ej: Depósito" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="email@dassa.com.ar" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+54 11 ..." className="input-field" inputMode="tel" />
            </div>
            <div>
              <label className="label-field">WhatsApp</label>
              <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                placeholder="+54 9 11 ..." className="input-field" inputMode="tel" />
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
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.full_name.trim() || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
          </button>
        </div>
      </div>
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
