// /mi-perfil — Vista 360 del operario (Master DASSA v2026)
// Hero + Resumen cumplimiento + KPIs + Capacitaciones (estado) + Amonestaciones + Certificaciones + Ficha + Tareas
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Briefcase, ArrowRight, Mail, Phone, MessageCircle, MapPin, Calendar,
  Target, GraduationCap, Award, AlertTriangle,
  UserCheck, Activity, CheckCircle2, Clock, AlertCircle,
  Sparkles, FileText, Bot, ShieldCheck, ChevronRight,
  ClipboardList, Crown, ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

interface Employee {
  id: string; full_name: string; email?: string; phone?: string; whatsapp?: string;
  address?: string; hire_date?: string;
  contract_type?: string; work_schedule?: string;
  supervisor_name?: string; supervisor_email?: string; supervisor_phone?: string;
  sector?: string; position?: string;
}
interface MyProfile {
  id: string; role_label: string; area: string; seniority?: string;
  mission?: string;
  responsibilities?: string[];
  authority?: string[];
  objectives?: string[];
  kpis?: string[];
  competencies?: string[];
  training_required?: string[];
  training_recommended?: string[];
  records_associated?: string[];
  risks_text?: string[];
  ai_principal?: string;
  ai_secondaries?: string[];
  iso_9001?: string; iso_14001?: string; iso_45001?: string;
  autonomy_level?: number;
  is_critical?: boolean;
  reports_to_role?: string;
  source?: string;
  is_primary: boolean;
  since?: string;
  notes?: string;
}
interface TrainingStatus {
  cap_code: string;
  requirement: 'obligatoria' | 'recomendada';
  training_title: string;
  training_category: string;
  recurrence_days: number | null;
  last_attended_at: string | null;
  next_programmed_at: string | null;
  status: 'completada' | 'vencida' | 'programada' | 'pendiente';
}
interface Warning {
  id: string;
  warning_type: 'llamado_atencion' | 'aviso_escrito' | 'amonestacion' | 'sancion' | 'observacion' | 'felicitacion';
  title: string;
  body: string | null;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  issued_at: string;
  acknowledged_at: string | null;
  issued_by_name: string | null;
  issued_by_user: string | null;
  evidence_url: string | null;
  notes: string | null;
}
interface Cert {
  id: string; cert_name: string; cert_type?: string; issued_by?: string;
  issue_date?: string; expiry_date?: string; status?: string;
}
interface Succession {
  coverage_level?: 'A' | 'B' | 'C' | 'D' | null;
  primary_replacement_text?: string | null;
  secondary_replacement_text?: string | null;
  notes?: string | null;
}
interface Compliance {
  total_requeridas: number;
  total_obligatorias: number;
  completadas: number;
  vencidas: number;
  programadas: number;
  pendientes: number;
  obligatorias_completadas: number;
  pct_obligatorias_ok: number;
}
interface MiPerfilData {
  ok: boolean;
  employee: Employee | null;
  profiles: MyProfile[];
  training_status: TrainingStatus[];
  warnings: Warning[];
  certifications: Cert[];
  succession: Succession | null;
  compliance: Compliance;
}

function parseKpi(raw: string): { name: string; meta?: string; frequency?: string } {
  try {
    const j = JSON.parse(raw);
    return { name: j.name || raw, meta: j.meta, frequency: j.frequency };
  } catch { return { name: raw }; }
}

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  completada: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Completada' },
  programada: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock,         label: 'Programada' },
  pendiente:  { bg: 'bg-gray-50 border-gray-200',     text: 'text-gray-600',  icon: AlertCircle, label: 'Sin programar' },
  vencida:    { bg: 'bg-red-50 border-red-200',       text: 'text-red-700',   icon: AlertTriangle, label: 'Vencida' },
};

const WARNING_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  llamado_atencion: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Llamado de atención' },
  aviso_escrito:    { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'Aviso escrito' },
  amonestacion:     { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Amonestación' },
  sancion:          { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Sanción' },
  observacion:      { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Observación' },
  felicitacion:     { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Felicitación' },
};

const AUTONOMY_LABEL: Record<number, string> = {
  1: 'Ejecución', 2: 'Ejecución autónoma', 3: 'Coordinación', 4: 'Gestión', 5: 'Dirección',
};

const COVERAGE_LABEL: Record<string, { label: string; color: string }> = {
  A: { label: 'A · Inmediata', color: 'bg-emerald-100 text-emerald-800' },
  B: { label: 'B · < 30 días', color: 'bg-amber-100 text-amber-800' },
  C: { label: 'C · < 90 días', color: 'bg-orange-100 text-orange-800' },
  D: { label: 'D · Sin reemplazo', color: 'bg-red-100 text-red-800' },
};

function daysUntil(d?: string | null) {
  if (!d) return null;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function MiPerfil() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<MiPerfilData>({
    queryKey: ['mi-perfil'],
    queryFn: () => api.get('/orgchart/mi-perfil'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/orgchart/warnings/${id}/acknowledge`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mi-perfil'] }),
  });

  if (isLoading || !data) return <PageContent><Spinner /></PageContent>;

  if (!data.employee) {
    return (
      <PageContent>
        <Header title="🌟 Mi Perfil" icon={<Briefcase size={20} />} />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>Tu usuario no está vinculado a un empleado.</strong>
            <p className="mt-1">Hablá con RRHH para que vinculen tu cuenta a tu ficha de empleado.</p>
          </div>
        </div>
      </PageContent>
    );
  }

  const emp = data.employee;
  const primary = data.profiles.find(p => p.is_primary);
  const cobertura = data.profiles.filter(p => !p.is_primary);
  const kpis = (primary?.kpis || []).map(parseKpi);
  const obligatorias = data.training_status.filter(t => t.requirement === 'obligatoria');
  const recomendadas = data.training_status.filter(t => t.requirement === 'recomendada');
  const certVencidas  = data.certifications.filter(c => { const d = daysUntil(c.expiry_date); return d !== null && d < 0; });
  const certPorVencer = data.certifications.filter(c => { const d = daysUntil(c.expiry_date); return d !== null && d >= 0 && d <= 60; });
  const warningsActivas = data.warnings.filter(w => w.warning_type !== 'felicitacion');
  const felicitaciones  = data.warnings.filter(w => w.warning_type === 'felicitacion');

  return (
    <PageContent>
      <Header
        title="🌟 Mi Perfil"
        subtitle={emp.full_name}
        icon={primary?.seniority === 'triunvirato' ? <Crown size={20} /> : <Briefcase size={20} />}
      />

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-gradient-to-br from-dassa-red/10 to-dassa-celeste/10 border border-dassa-red/20 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-dassa-red to-dassa-celeste-deep text-white flex items-center justify-center text-2xl font-extrabold shadow-lg shrink-0">
              {emp.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-gray-900">{emp.full_name}</h2>
              {primary ? (
                <>
                  <p className="text-sm text-gray-700">{primary.role_label}</p>
                  <p className="text-xs text-gray-500">{primary.area}{primary.reports_to_role && ` · reporta a ${primary.reports_to_role}`}</p>
                </>
              ) : emp.position ? (
                <p className="text-xs text-gray-600">{emp.position}{emp.sector && ` · ${emp.sector}`}</p>
              ) : null}
              <div className="flex flex-wrap gap-1 mt-2">
                {primary?.is_critical && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded inline-flex items-center gap-1">
                    <ShieldCheck size={10} /> Puesto crítico
                  </span>
                )}
                {primary?.autonomy_level != null && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    Banda {primary.autonomy_level} · {AUTONOMY_LABEL[primary.autonomy_level]}
                  </span>
                )}
                {cobertura.length > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    +{cobertura.length} cobertura
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-700 border-t border-gray-200/50 pt-3">
            {emp.email    && <div className="flex items-center gap-2 truncate"><Mail size={12} className="text-gray-400 shrink-0" /> {emp.email}</div>}
            {emp.phone    && <div className="flex items-center gap-2"><Phone size={12} className="text-gray-400 shrink-0" /> {emp.phone}</div>}
            {emp.whatsapp && <div className="flex items-center gap-2"><MessageCircle size={12} className="text-gray-400 shrink-0" /> {emp.whatsapp}</div>}
            {emp.address  && <div className="flex items-center gap-2 truncate"><MapPin size={12} className="text-gray-400 shrink-0" /> {emp.address}</div>}
            {emp.hire_date && <div className="flex items-center gap-2"><Calendar size={12} className="text-gray-400 shrink-0" /> Ingreso {emp.hire_date.slice(0,10)}</div>}
            {emp.contract_type && <div className="flex items-center gap-2"><FileText size={12} className="text-gray-400 shrink-0" /> {emp.contract_type}</div>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <UserCheck size={12} /> Supervisor
          </h3>
          {emp.supervisor_name ? (
            <>
              <p className="text-sm font-bold text-gray-900">{emp.supervisor_name}</p>
              <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                {emp.supervisor_email && <div className="flex items-center gap-1 truncate"><Mail size={11} /> {emp.supervisor_email}</div>}
                {emp.supervisor_phone && <div className="flex items-center gap-1"><Phone size={11} /> {emp.supervisor_phone}</div>}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-400">Sin supervisor asignado</p>
          )}
          {data.succession && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                <ArrowUpRight size={10} /> Reemplazo
              </h4>
              {data.succession.coverage_level && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${COVERAGE_LABEL[data.succession.coverage_level]?.color || 'bg-gray-100'}`}>
                  {COVERAGE_LABEL[data.succession.coverage_level]?.label || data.succession.coverage_level}
                </span>
              )}
              {data.succession.primary_replacement_text && (
                <div className="text-[11px] text-gray-700 mt-1">{data.succession.primary_replacement_text}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resumen de cumplimiento + accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-emerald-100 text-emerald-700 rounded-lg p-1.5"><CheckCircle2 size={14} /></div>
            <div className="text-[10px] uppercase font-bold text-gray-500">Cumplimiento</div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{data.compliance.pct_obligatorias_ok}%</div>
          <div className="text-[10px] text-gray-500">caps obligatorias completadas</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-red-100 text-red-700 rounded-lg p-1.5"><AlertTriangle size={14} /></div>
            <div className="text-[10px] uppercase font-bold text-gray-500">Vencidas</div>
          </div>
          <div className="text-2xl font-extrabold text-red-700">{data.compliance.vencidas}</div>
          <div className="text-[10px] text-gray-500">caps a regularizar</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-amber-100 text-amber-700 rounded-lg p-1.5"><Clock size={14} /></div>
            <div className="text-[10px] uppercase font-bold text-gray-500">Programadas</div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{data.compliance.programadas}</div>
          <div className="text-[10px] text-gray-500">caps por hacer</div>
        </div>
        <Link to="/mis-pendientes" className="bg-gradient-to-br from-dassa-red to-dassa-red-deep text-white rounded-xl p-4 hover:shadow-lg transition-shadow group">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-white/20 rounded-lg p-1.5"><ClipboardList size={14} /></div>
            <div className="text-[10px] uppercase font-bold text-white/80">Mis Tareas</div>
          </div>
          <div className="text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
            Ir a Pendientes <ChevronRight size={14} />
          </div>
          <div className="text-[10px] text-white/70">tareas asignadas</div>
        </Link>
      </div>

      {/* KPIs del puesto */}
      {kpis.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Activity size={12} /> KPIs de mi puesto
            <span className="ml-auto text-[10px] text-gray-400">{kpis.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {kpis.map((k, i) => (
              <div key={i} className="bg-gradient-to-br from-dassa-celeste/5 to-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="bg-dassa-celeste/10 text-dassa-celeste-deep rounded-lg p-1.5"><Target size={14} /></div>
                  <span className="text-[9px] uppercase font-bold text-gray-400">KPI {i + 1}</span>
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1.5">{k.name}</div>
                {k.meta && <div className="text-xs text-gray-700"><span className="font-bold">Meta:</span> {k.meta}</div>}
                {k.frequency && <div className="text-[11px] text-gray-500"><span className="font-bold">Frecuencia:</span> {k.frequency}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacitaciones obligatorias */}
      {obligatorias.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <GraduationCap size={12} /> Mis Capacitaciones Obligatorias
            <span className="ml-auto text-[10px] text-gray-400">{obligatorias.length}</span>
          </h3>
          <div className="space-y-1.5">
            {obligatorias.map((t, i) => {
              const s = STATUS_STYLE[t.status];
              const Icon = s.icon;
              return (
                <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${s.bg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className={s.text} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">
                        <code className="text-[10px] mr-1 text-gray-500">{t.cap_code}</code>
                        {t.training_title}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {t.last_attended_at && `Última: ${t.last_attended_at.slice(0,10)} · `}
                        {t.next_programmed_at && `Próxima: ${t.next_programmed_at.slice(0,10)}`}
                        {!t.last_attended_at && !t.next_programmed_at && 'Sin asistencia ni programación'}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text} shrink-0`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacitaciones recomendadas (colapsable visualmente) */}
      {recomendadas.length > 0 && (
        <details className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <summary className="cursor-pointer text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} /> Capacitaciones Recomendadas
            <span className="ml-auto text-[10px] text-gray-400">{recomendadas.length}</span>
          </summary>
          <div className="space-y-1.5 mt-3">
            {recomendadas.map((t, i) => {
              const s = STATUS_STYLE[t.status];
              const Icon = s.icon;
              return (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${s.bg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={12} className={s.text} />
                    <code className="text-[10px] text-gray-500">{t.cap_code}</code>
                    <span className="text-xs text-gray-800 truncate">{t.training_title}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${s.text} shrink-0`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Amonestaciones / Avisos escritos */}
      {warningsActivas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-600" /> Avisos y Amonestaciones
            <span className="ml-auto text-[10px] text-gray-400">{warningsActivas.length}</span>
          </h3>
          <div className="space-y-2">
            {warningsActivas.map(w => {
              const wst = WARNING_STYLE[w.warning_type];
              return (
                <div key={w.id} className={`border ${wst.bg} rounded-lg p-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${wst.text} px-2 py-0.5 rounded bg-white/60`}>
                          {wst.label}
                        </span>
                        <span className="text-[10px] text-gray-500">{w.issued_at.slice(0, 10)}</span>
                        {w.severity === 'critica' && (
                          <span className="text-[10px] font-bold uppercase bg-red-600 text-white px-1.5 py-0.5 rounded">Crítica</span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-gray-900">{w.title}</div>
                      {w.body && <div className="text-xs text-gray-700 mt-1 leading-relaxed">{w.body}</div>}
                      {w.issued_by_name && <div className="text-[10px] text-gray-500 mt-1">Emitido por: {w.issued_by_name}</div>}
                    </div>
                    {!w.acknowledged_at ? (
                      <button
                        onClick={() => acknowledgeMutation.mutate(w.id)}
                        disabled={acknowledgeMutation.isPending}
                        className="text-[10px] font-bold bg-dassa-red text-white px-3 py-1.5 rounded hover:bg-dassa-red-deep transition disabled:opacity-50"
                      >
                        Reconocer
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} /> Reconocido
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Felicitaciones */}
      {felicitaciones.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Sparkles size={12} /> Felicitaciones
          </h3>
          <div className="space-y-2">
            {felicitaciones.map(f => (
              <div key={f.id} className="p-2.5 bg-white rounded-lg border border-emerald-100">
                <div className="text-sm font-bold text-emerald-900">{f.title}</div>
                {f.body && <div className="text-xs text-gray-700 mt-1">{f.body}</div>}
                <div className="text-[10px] text-emerald-700 mt-1">{f.issued_at.slice(0,10)} {f.issued_by_name && `· por ${f.issued_by_name}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas habilitaciones */}
      {(certVencidas.length > 0 || certPorVencer.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            {certVencidas.length > 0 && (
              <div className="font-bold">⚠ Habilitaciones vencidas: {certVencidas.map(c => c.cert_name).join(', ')}</div>
            )}
            {certPorVencer.length > 0 && (
              <div className="mt-0.5">Próximas a vencer ({certPorVencer.length}): {certPorVencer.map(c => `${c.cert_name} (${daysUntil(c.expiry_date)}d)`).join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {/* Ficha principal + RR.AI + ISO */}
      {primary && (
        <div className="bg-white border border-dassa-red/30 rounded-xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Mi puesto principal</div>
              <h3 className="text-lg font-bold text-gray-900">{primary.role_label}</h3>
            </div>
            <Link to={`/puestos/${primary.id}`} className="text-xs text-dassa-celeste-deep font-bold hover:underline flex items-center gap-1">
              Ficha completa <ArrowRight size={12} />
            </Link>
          </div>
          {primary.mission && <p className="text-sm text-gray-700 mb-3">{primary.mission}</p>}

          {primary.ai_principal && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-3 flex items-center gap-2 text-xs">
              <Bot size={14} className="text-violet-700 shrink-0" />
              <span><span className="font-bold">Tu RR.AI principal:</span> {primary.ai_principal}</span>
              {primary.ai_secondaries && primary.ai_secondaries.length > 0 && (
                <span className="text-gray-600">+ {primary.ai_secondaries.join(', ')}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cobertura */}
      {cobertura.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <UserCheck size={12} /> Mis puestos de cobertura / polivalencia
            <span className="ml-auto text-[10px] text-gray-400">{cobertura.length}</span>
          </h3>
          <div className="space-y-2">
            {cobertura.map(p => (
              <Link key={p.id} to={`/puestos/${p.id}`} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-dassa-celeste/40 hover:bg-dassa-celeste/5 transition">
                <div>
                  <div className="text-sm font-bold text-gray-900">{p.role_label}</div>
                  <div className="text-[10px] text-gray-500">{p.area}</div>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Habilitaciones */}
      {data.certifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Award size={12} /> Habilitaciones / Certificaciones
            <span className="ml-auto text-[10px] text-gray-400">{data.certifications.length}</span>
          </h3>
          <div className="space-y-1.5">
            {data.certifications.map(c => {
              const days = daysUntil(c.expiry_date);
              const expired = days !== null && days < 0;
              const expSoon = days !== null && days >= 0 && days <= 60;
              return (
                <div key={c.id} className={`flex items-center justify-between p-2 rounded-lg border
                  ${expired ? 'border-red-300 bg-red-50' : expSoon ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900">{c.cert_name}</div>
                    <div className="text-[10px] text-gray-500">{c.cert_type || '—'}{c.issued_by && ` · ${c.issued_by}`}</div>
                  </div>
                  {c.expiry_date && (
                    <div className={`text-[10px] font-bold text-right
                      ${expired ? 'text-red-700' : expSoon ? 'text-amber-700' : 'text-gray-600'}`}>
                      {expired ? `Vencida hace ${-days!}d` : expSoon ? `Vence en ${days}d` : `Vigente`}
                      <div className="font-normal opacity-70">{c.expiry_date.slice(0,10)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximos features placeholder */}
      <div className="bg-gradient-to-br from-gray-50 to-white border border-dashed border-gray-300 rounded-xl p-4 text-center text-xs text-gray-500">
        <Sparkles size={14} className="inline mr-1" /> Próximamente: recibos de sueldo · registro de ingresos y salidas · evaluación de desempeño anual
      </div>
    </PageContent>
  );
}
