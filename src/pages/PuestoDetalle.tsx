// /puestos/:id — Ficha completa del puesto (Master DASSA v2026)
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, AlertTriangle, FileText, Target, Star, GraduationCap,
  Briefcase, ListChecks, ChevronRight, Crown, Bot, Award, Gavel, Activity,
  TrendingUp, ShieldCheck, BookOpen, ArrowUpRight, Leaf, HardHat, Scale, UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

interface KpiJson { name: string; meta?: string; frequency?: string }

interface Succession {
  coverage_level?: 'A' | 'B' | 'C' | 'D' | null;
  primary_replacement_text?: string | null;
  secondary_replacement_text?: string | null;
  notes?: string | null;
}

interface Profile {
  id: string; role_label: string; area: string; seniority: string;
  mission: string | null;
  responsibilities: string[] | null;
  authority: string[] | null;
  records_associated: string[] | null;
  risks_text: string[] | null;
  key_results: string[] | null;
  competencies: string[] | null;
  training_required: string[] | null;
  training_recommended: string[] | null;
  objectives: string[] | null;
  kpis: string[] | null;
  ai_principal: string | null;
  ai_secondaries: string[] | null;
  iso_9001: string | null;
  iso_14001: string | null;
  iso_45001: string | null;
  legal_framework: string[] | null;
  formacion_minima: string | null;
  experiencia_minima: string | null;
  reemplazo_potencial: string | null;
  autonomy_level: number | null;
  is_critical: boolean | null;
  reports_to_role: string | null;
  org_node_id: string | null;
  node_name: string | null;
  node_area: string | null;
  source: string | null;
  employees: { id: string; full_name: string; position: string | null; since: string | null; is_primary: boolean }[];
  amfe_risks: { id: string; code: string; activity: string; npr: number; npr_level: string }[];
  procedures: { id: string; code: string; title: string; module: string }[];
  succession: Succession | null;
}

function parseKpi(raw: string): KpiJson {
  try {
    const j = JSON.parse(raw);
    return { name: j.name || raw, meta: j.meta, frequency: j.frequency };
  } catch {
    return { name: raw };
  }
}

const COVERAGE_LABEL: Record<string, { label: string; color: string }> = {
  A: { label: 'A · Inmediata', color: 'bg-emerald-100 text-emerald-800' },
  B: { label: 'B · < 30 días', color: 'bg-amber-100 text-amber-800' },
  C: { label: 'C · < 90 días', color: 'bg-orange-100 text-orange-800' },
  D: { label: 'D · Sin reemplazo', color: 'bg-red-100 text-red-800' },
};

const AUTONOMY_LABEL: Record<number, string> = {
  1: 'Ejecución',
  2: 'Ejecución Autónoma',
  3: 'Coordinación',
  4: 'Gestión',
  5: 'Dirección',
};

export default function PuestoDetalle() {
  const { id } = useParams();
  const { data, isLoading } = useQuery<{ ok: boolean; profile: Profile }>({
    queryKey: ['puesto', id],
    queryFn: () => api.get(`/orgchart/puesto/${id}`),
    enabled: !!id,
  });
  if (isLoading || !data?.profile) return <PageContent><Spinner /></PageContent>;
  const p = data.profile;

  const seniorityColor: Record<string, string> = {
    triunvirato: 'bg-dassa-red text-white',
    director:    'bg-violet-100 text-violet-800',
    gerente:     'bg-blue-100 text-blue-800',
    lider:       'bg-indigo-100 text-indigo-800',
    responsable: 'bg-emerald-100 text-emerald-800',
    semi:        'bg-amber-100 text-amber-800',
    junior:      'bg-gray-100 text-gray-700',
    externo:     'bg-gray-200 text-gray-700',
  };

  const kpisParsed = (p.kpis || []).map(parseKpi);

  return (
    <PageContent>
      <Link to="/puestos" className="text-xs text-gray-500 mb-2 inline-flex items-center gap-1 hover:text-dassa-celeste-deep">
        <ArrowLeft size={12} /> Volver a Puestos
      </Link>

      <Header
        title={p.role_label}
        subtitle={`${p.area} · ${p.seniority || '—'}${p.is_critical ? ' · PUESTO CRÍTICO' : ''}`}
        icon={p.seniority === 'triunvirato' ? <Crown size={20} /> : <Briefcase size={20} />}
      />

      {/* Cabecera: misión + metadata + empleados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
              ${seniorityColor[p.seniority] || 'bg-gray-100 text-gray-700'}`}>
              {p.seniority || 'sin nivel'}
            </span>
            {p.is_critical && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded inline-flex items-center gap-1">
                <ShieldCheck size={10} /> Puesto crítico
              </span>
            )}
            {p.autonomy_level != null && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                Banda {p.autonomy_level} · {AUTONOMY_LABEL[p.autonomy_level] || ''}
              </span>
            )}
            {p.source === 'master-dassa-v2026' && (
              <span className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded inline-flex items-center gap-1">
                Master DASSA v2026
              </span>
            )}
            {p.node_name && (
              <Link to="/organigrama" className="text-[10px] text-gray-500 hover:text-dassa-celeste-deep inline-flex items-center gap-1">
                Nodo: {p.node_name} <ChevronRight size={10} />
              </Link>
            )}
          </div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Misión</h3>
          <p className="text-sm text-gray-800 leading-relaxed mb-3">{p.mission || '—'}</p>
          {p.reports_to_role && (
            <div className="text-xs text-gray-600">
              <span className="font-bold text-gray-500 uppercase tracking-wider">Reporta a:</span> {p.reports_to_role}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Users size={12} /> Empleados asignados
            <span className="ml-auto text-[10px] text-gray-400">{p.employees?.length || 0}</span>
          </h3>
          {(p.employees || []).length === 0 ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg">⚠ Vacante</p>
          ) : (
            <div className="space-y-1.5">
              {p.employees.map(e => (
                <Link key={e.id} to={`/employees`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-dassa-celeste/5 border border-transparent hover:border-dassa-celeste/30">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                    ${e.is_primary ? 'bg-dassa-red text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {e.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{e.full_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {e.is_primary ? 'Titular' : 'Cobertura'}
                      {e.since && ` · desde ${e.since.slice(0, 10)}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPIs estructurados */}
      {kpisParsed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Activity size={12} /> KPIs del puesto
            <span className="ml-auto text-[10px] text-gray-400">{kpisParsed.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {kpisParsed.map((k, i) => (
              <div key={i} className="bg-gradient-to-br from-dassa-celeste/5 to-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="bg-dassa-celeste/10 text-dassa-celeste-deep rounded-lg p-1.5">
                    <Target size={14} />
                  </div>
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

      {/* Responsabilidades */}
      {p.responsibilities && p.responsibilities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <ListChecks size={12} /> Responsabilidades principales
            <span className="ml-auto text-[10px] text-gray-400">{p.responsibilities.length}</span>
          </h3>
          <ul className="space-y-1.5">
            {p.responsibilities.map((r, i) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2 leading-relaxed">
                <span className="text-dassa-celeste-deep font-bold flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Autoridad + Objetivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {p.authority && p.authority.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Gavel size={12} /> Autoridad
              <span className="ml-auto text-[10px] text-gray-400">{p.authority.length}</span>
            </h3>
            <ul className="space-y-1">
              {p.authority.map((a, i) => <li key={i} className="text-xs text-gray-700">• {a}</li>)}
            </ul>
          </div>
        )}
        {p.objectives && p.objectives.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <TrendingUp size={12} /> Objetivos del puesto
              <span className="ml-auto text-[10px] text-gray-400">{p.objectives.length}</span>
            </h3>
            <ul className="space-y-1">
              {p.objectives.map((o, i) => <li key={i} className="text-xs text-gray-700">• {o}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Capacitaciones: Obligatorias + Recomendadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <GraduationCap size={12} /> Capacitaciones Obligatorias
            <span className="ml-auto text-[10px] text-gray-400">{(p.training_required || []).length}</span>
          </h3>
          {(p.training_required || []).length === 0
            ? <p className="text-[11px] text-gray-400">—</p>
            : <div className="flex flex-wrap gap-1">
                {p.training_required!.map((t, i) => (
                  <span key={i} className="text-[10px] font-mono bg-dassa-red/10 text-dassa-red-deep px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <GraduationCap size={12} /> Capacitaciones Recomendadas
            <span className="ml-auto text-[10px] text-gray-400">{(p.training_recommended || []).length}</span>
          </h3>
          {(p.training_recommended || []).length === 0
            ? <p className="text-[11px] text-gray-400">—</p>
            : <div className="flex flex-wrap gap-1">
                {p.training_recommended!.map((t, i) => (
                  <span key={i} className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>}
        </div>
      </div>

      {/* Competencias */}
      {p.competencies && p.competencies.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Star size={12} /> Competencias / Herramientas
            <span className="ml-auto text-[10px] text-gray-400">{p.competencies.length}</span>
          </h3>
          <div className="flex flex-wrap gap-1">
            {p.competencies.map((c, i) => (
              <span key={i} className="text-[10px] bg-dassa-celeste/10 text-dassa-celeste-deep px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* RR.AI + Sucesión */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {(p.ai_principal || (p.ai_secondaries && p.ai_secondaries.length > 0)) && (
          <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-xl p-5">
            <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Bot size={12} /> RR.AI Asociados
            </h3>
            {p.ai_principal && (
              <div className="mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-violet-600">Principal:</span>{' '}
                <span className="text-sm font-bold text-violet-900">{p.ai_principal}</span>
              </div>
            )}
            {p.ai_secondaries && p.ai_secondaries.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-violet-600">Secundarios:</span>{' '}
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.ai_secondaries.map((a, i) => (
                    <span key={i} className="text-[11px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {p.succession && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <ArrowUpRight size={12} /> Sucesión y Reemplazos
            </h3>
            {p.succession.coverage_level && (
              <div className="mb-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${COVERAGE_LABEL[p.succession.coverage_level]?.color || 'bg-gray-100'}`}>
                  {COVERAGE_LABEL[p.succession.coverage_level]?.label || p.succession.coverage_level}
                </span>
              </div>
            )}
            {p.succession.primary_replacement_text && (
              <div className="text-xs mb-1">
                <span className="font-bold text-gray-500">Primario:</span> {p.succession.primary_replacement_text}
              </div>
            )}
            {p.succession.secondary_replacement_text && (
              <div className="text-xs mb-1">
                <span className="font-bold text-gray-500">Secundario:</span> {p.succession.secondary_replacement_text}
              </div>
            )}
            {p.succession.notes && (
              <div className="text-[11px] text-gray-500 italic mt-2">{p.succession.notes}</div>
            )}
          </div>
        )}
      </div>

      {/* Riesgos del puesto + Registros asociados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {p.risks_text && p.risks_text.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <AlertTriangle size={12} /> Riesgos del puesto
              <span className="ml-auto text-[10px] text-gray-400">{p.risks_text.length}</span>
            </h3>
            <ul className="space-y-1">
              {p.risks_text.map((r, i) => <li key={i} className="text-xs text-gray-700">• {r}</li>)}
            </ul>
          </div>
        )}
        {p.records_associated && p.records_associated.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <FileText size={12} /> Registros asociados
              <span className="ml-auto text-[10px] text-gray-400">{p.records_associated.length}</span>
            </h3>
            <ul className="space-y-1">
              {p.records_associated.map((r, i) => <li key={i} className="text-xs text-gray-700">• {r}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Relación con las 3 normas ISO */}
      {(p.iso_9001 || p.iso_14001 || p.iso_45001) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {p.iso_9001 && (
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Award size={12} className="text-blue-700" />
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">ISO 9001 · Calidad</h4>
              </div>
              <p className="text-[11px] text-gray-700 leading-relaxed">{p.iso_9001}</p>
            </div>
          )}
          {p.iso_14001 && (
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Leaf size={12} className="text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">ISO 14001 · Ambiente</h4>
              </div>
              <p className="text-[11px] text-gray-700 leading-relaxed">{p.iso_14001}</p>
            </div>
          )}
          {p.iso_45001 && (
            <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <HardHat size={12} className="text-orange-700" />
                <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider">ISO 45001 · SySO</h4>
              </div>
              <p className="text-[11px] text-gray-700 leading-relaxed">{p.iso_45001}</p>
            </div>
          )}
        </div>
      )}

      {/* Marco legal argentino */}
      {p.legal_framework && p.legal_framework.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Scale size={12} /> Marco legal y normativo aplicable
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {p.legal_framework.map((l, i) => <li key={i} className="text-xs text-slate-700">• {l}</li>)}
          </ul>
        </div>
      )}

      {/* Requisitos mínimos del puesto */}
      {(p.formacion_minima || p.experiencia_minima || p.reemplazo_potencial) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {p.formacion_minima && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GraduationCap size={12} /> Formación mínima
              </h4>
              <p className="text-[11px] text-gray-700 leading-relaxed">{p.formacion_minima}</p>
            </div>
          )}
          {p.experiencia_minima && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase size={12} /> Experiencia mínima
              </h4>
              <p className="text-[11px] text-gray-700 leading-relaxed">{p.experiencia_minima}</p>
            </div>
          )}
          {p.reemplazo_potencial && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck size={12} /> Reemplazo potencial
              </h4>
              <p className="text-[11px] text-gray-700 leading-relaxed">{p.reemplazo_potencial}</p>
            </div>
          )}
        </div>
      )}

      {/* AMFE + Procedimientos (legacy) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <AlertTriangle size={12} /> Riesgos vinculados (AMFE)
          </h3>
          {(p.amfe_risks || []).length === 0
            ? <p className="text-[11px] text-gray-400">Sin riesgos vinculados</p>
            : (p.amfe_risks!.map(r => (
                <div key={r.id} className="text-xs py-1 border-b border-gray-100 last:border-0">
                  <code className="text-[10px] font-bold text-dassa-red-deep">{r.code}</code> {r.activity}
                  <span className="ml-2 text-[10px] text-gray-500">NPR={r.npr} · {r.npr_level}</span>
                </div>
              )))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <BookOpen size={12} /> Procedimientos
          </h3>
          {(p.procedures || []).length === 0
            ? <p className="text-[11px] text-gray-400">Sin procedimientos vinculados</p>
            : (p.procedures!.map(pr => (
                <div key={pr.id} className="text-xs py-1 border-b border-gray-100 last:border-0">
                  <code className="text-[10px] font-bold text-dassa-celeste-deep">{pr.code}</code> {pr.title}
                </div>
              )))}
        </div>
      </div>
    </PageContent>
  );
}
