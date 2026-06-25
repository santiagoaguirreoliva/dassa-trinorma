// /proyectos — Proyectos Estratégicos (Sistema Integral de Gestión · Nivel 2)
// Impulsan los objetivos; ≠ change_requests (acciones de mejora del SGI).
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitBranch, Target, Wallet, Cpu, Forklift, Megaphone, Users, Leaf, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard, Badge } from '@/components/ui';

interface Project {
  id: string; code?: string; name: string; area?: string; objective_codes?: string;
  status?: string; progress_pct?: number | null; responsible?: string; notes?: string;
}

const AREA_ICON: Record<string, any> = {
  'Tecnología': Cpu, 'Operación': Forklift, 'Comercial': Megaphone, 'Personas': Users, 'Ambiente': Leaf,
};
const STATUS_VARIANT: Record<string, 'green'|'amber'|'blue'|'gray'> = {
  'Finalizado': 'green', 'En ejecución': 'blue', 'Desarrollo': 'blue',
  'En análisis': 'amber', 'Pausado': 'amber', 'Planificado': 'gray', 'Pendiente': 'gray',
};

export default function Proyectos() {
  const { data, isLoading } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => api.get<{ ok: boolean; projects: Project[] }>('/proyectos'),
  });
  if (isLoading) return <PageContent><Header title="🧩 Proyectos Estratégicos" icon={<GitBranch size={20} />} /><div className="flex justify-center py-10"><Spinner /></div></PageContent>;

  const projects = data?.projects || [];
  const areas = Array.from(new Set(projects.map(p => p.area || 'Otros')));
  const enCurso = projects.filter(p => ['En ejecución', 'Desarrollo'].includes(p.status || '')).length;
  const finalizados = projects.filter(p => p.status === 'Finalizado').length;

  return (
    <PageContent>
      <Header title="🧩 Proyectos Estratégicos" subtitle="Sistema Integral de Gestión · Nivel 2"
        icon={<GitBranch size={20} />}
        actions={<div className="flex gap-2">
          <Link to="/objetivos" className="text-[11px] font-bold text-dassa-celeste-deep hover:underline inline-flex items-center gap-1"><Target size={13} /> Objetivos</Link>
          <Link to="/inversiones" className="text-[11px] font-bold text-dassa-celeste-deep hover:underline inline-flex items-center gap-1"><Wallet size={13} /> Inversiones</Link>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Proyectos" value={projects.length} sub={`${areas.length} áreas`} />
        <KPICard label="En curso" value={enCurso} sub="ejecución / desarrollo" />
        <KPICard label="Finalizados" value={finalizados} />
        <KPICard label="Áreas" value={areas.length} sub="Tec · Op · Com · Per · Amb" />
      </div>

      {areas.map(area => {
        const Ic = AREA_ICON[area] || Layers;
        const list = projects.filter(p => (p.area || 'Otros') === area);
        return (
          <div key={area} className="mb-5">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Ic size={15} className="text-dassa-red" /> {area}
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{list.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {list.map(p => (
                <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900 leading-tight">{p.name}</span>
                    <Badge variant={STATUS_VARIANT[p.status || ''] || 'gray'} label={p.status || '—'} />
                  </div>
                  {p.objective_codes && <div className="text-[10px] text-gray-400 mb-2">impulsa {p.objective_codes}</div>}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>Avance</span><span>{p.progress_pct != null ? `${p.progress_pct}%` : '—'}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-dassa-celeste-deep rounded-full" style={{ width: `${p.progress_pct || 0}%` }} />
                    </div>
                  </div>
                  {p.responsible && <div className="text-[10px] text-gray-500 mt-2">👤 {p.responsible}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </PageContent>
  );
}
