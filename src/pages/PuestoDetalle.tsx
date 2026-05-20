// /puestos/:id — Ficha completa del puesto
// Misión + responsabilidades + secundarias + competencias + capacitaciones
// + empleados asignados (primary + cobertura) + riesgos + procedimientos.
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, AlertTriangle, FileText, Target, Star, GraduationCap,
  Briefcase, ListChecks, ChevronRight, Crown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

interface Profile {
  id: string; role_label: string; area: string; seniority: string;
  mission: string | null;
  responsibilities: string[] | null;
  key_results: string[] | null;
  competencies: string[] | null;
  training_required: string[] | null;
  org_node_id: string | null;
  node_name: string | null;
  node_area: string | null;
  employees: { id: string; full_name: string; position: string | null; since: string | null; is_primary: boolean }[];
  risks: { id: string; code: string; activity: string; npr: number; npr_level: string }[];
  procedures: { id: string; code: string; title: string; module: string }[];
}

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

  return (
    <PageContent>
      <Link to="/puestos" className="text-xs text-gray-500 mb-2 inline-flex items-center gap-1 hover:text-dassa-celeste-deep">
        <ArrowLeft size={12} /> Volver a Puestos
      </Link>

      <Header
        title={p.role_label}
        subtitle={`${p.area} · ${p.seniority || '—'}`}
        icon={p.seniority === 'triunvirato' ? <Crown size={20} /> : <Briefcase size={20} />}
      />

      {/* Cabecera con metadata + empleados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
              ${seniorityColor[p.seniority] || 'bg-gray-100 text-gray-700'}`}>
              {p.seniority || 'sin nivel'}
            </span>
            {p.node_name && (
              <Link to="/organigrama" className="text-[10px] text-gray-500 hover:text-dassa-celeste-deep inline-flex items-center gap-1">
                Nodo: {p.node_name} <ChevronRight size={10} />
              </Link>
            )}
          </div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Misión</h3>
          <p className="text-sm text-gray-800 leading-relaxed">{p.mission || '—'}</p>
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

      {/* Responsabilidades principales */}
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

      {/* Bloque inferior: secundarias / competencias / capacitaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Target size={12} /> Responsabilidades secundarias
          </h3>
          {(p.key_results || []).length === 0
            ? <p className="text-[11px] text-gray-400">—</p>
            : <ul className="space-y-1">{p.key_results!.map((k, i) => <li key={i} className="text-xs text-gray-700">• {k}</li>)}</ul>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Star size={12} /> Competencias / Herramientas
          </h3>
          {(p.competencies || []).length === 0
            ? <p className="text-[11px] text-gray-400">—</p>
            : <div className="flex flex-wrap gap-1">
                {p.competencies!.map((c, i) => (
                  <span key={i} className="text-[10px] bg-dassa-celeste/10 text-dassa-celeste-deep px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <GraduationCap size={12} /> Capacitaciones
          </h3>
          {(p.training_required || []).length === 0
            ? <p className="text-[11px] text-gray-400">—</p>
            : <ul className="space-y-1">{p.training_required!.map((t, i) => <li key={i} className="text-xs text-gray-700">• {t}</li>)}</ul>}
        </div>
      </div>

      {/* Riesgos + Procedimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <AlertTriangle size={12} /> Riesgos asociados (AMFE)
          </h3>
          {(p.risks || []).length === 0
            ? <p className="text-[11px] text-gray-400">Sin riesgos vinculados</p>
            : (p.risks!.map(r => (
                <div key={r.id} className="text-xs py-1 border-b border-gray-100 last:border-0">
                  <code className="text-[10px] font-bold text-dassa-red-deep">{r.code}</code> {r.activity}
                  <span className="ml-2 text-[10px] text-gray-500">NPR={r.npr} · {r.npr_level}</span>
                </div>
              )))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <FileText size={12} /> Procedimientos
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
