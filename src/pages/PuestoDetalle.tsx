import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, AlertTriangle, FileText, Target, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

export default function PuestoDetalle() {
  const { id } = useParams();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['puesto', id],
    queryFn: () => api.get(`/orgchart/puesto/${id}`),
    enabled: !!id,
  });
  if (isLoading || !data?.profile) return <PageContent><Spinner/></PageContent>;
  const p = data.profile;

  return (
    <PageContent>
      <Link to="/puestos" className="text-xs text-gray-500 mb-2 inline-flex items-center gap-1 hover:text-dassa-celeste-deep">
        <ArrowLeft size={12}/> Volver a puestos
      </Link>
      <Header title={p.role_label} subtitle={`${p.area} · ${p.seniority}`}/>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Misión</h3>
          <p className="text-sm text-gray-700">{p.mission || '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Users size={12}/> Empleados</h3>
          {(p.employees||[]).map((e:any)=>(
            <div key={e.id} className="text-xs py-1 border-b border-gray-100">
              <strong>{e.full_name}</strong>
              <div className="text-[10px] text-gray-400">{e.position} · desde {e.since}</div>
            </div>
          ))}
          {!p.employees?.length && <p className="text-[11px] text-gray-400">Sin empleados asignados</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><Target size={12}/> Key Results</h3>
          <ul className="space-y-1">
            {(p.key_results||[]).map((k:string,i:number)=>(
              <li key={i} className="text-xs text-gray-700">• {k}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><Star size={12}/> Competencias</h3>
          <div className="flex flex-wrap gap-1">
            {(p.competencies||[]).map((c:string,i:number)=>(
              <span key={i} className="text-[10px] bg-dassa-celeste-tint text-dassa-celeste-deep px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><FileText size={12}/> Capacitaciones requeridas</h3>
          <ul className="space-y-1">
            {(p.training_required||[]).map((t:string,i:number)=>(
              <li key={i} className="text-xs text-gray-700">• {t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><AlertTriangle size={12}/> Riesgos asociados</h3>
          {(p.risks||[]).length===0 && <p className="text-[11px] text-gray-400">Sin riesgos vinculados a este puesto</p>}
          {(p.risks||[]).map((r:any)=>(
            <div key={r.id} className="text-xs py-1 border-b border-gray-100">
              <code className="text-[10px] font-bold text-dassa-red-deep">{r.code}</code> {r.activity}
              <span className="ml-2 text-[10px] text-gray-500">NPR={r.npr} · {r.npr_level}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><FileText size={12}/> Procedimientos</h3>
          {(p.procedures||[]).length===0 && <p className="text-[11px] text-gray-400">Sin procedimientos vinculados</p>}
          {(p.procedures||[]).map((proc:any)=>(
            <div key={proc.id} className="text-xs py-1 border-b border-gray-100">
              <code className="text-[10px] font-bold text-dassa-celeste-deep">{proc.code}</code> {proc.title}
            </div>
          ))}
        </div>
      </div>
    </PageContent>
  );
}
