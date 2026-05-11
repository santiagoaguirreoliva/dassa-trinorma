import { useQuery } from '@tanstack/react-query';
import { Target, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

interface Objective { id:string; code:string; name:string; description:string; area:string; target_metric:string; target_value:string; admissible_value:string; status:string; num_indicators:number; }

export default function Objetivos() {
  const [year, setYear] = useState(2025);
  const { data, isLoading } = useQuery<{ok:boolean;objectives:Objective[]}>({
    queryKey: ['objetivos', year],
    queryFn: () => api.get(`/objetivos?year=${year}`),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;

  const total = data.objectives.length;
  const activos = data.objectives.filter(o=>o.status==='activo').length;
  const cumplidos = data.objectives.filter(o=>o.status==='cumplido').length;
  const noCumplidos = data.objectives.filter(o=>o.status==='no_cumplido').length;

  return (
    <PageContent>
      <Header title="🎯 Objetivos Corporativos" subtitle={`Año ${year} · ${total} objetivos`} icon={<Target size={20}/>}/>
      <div className="flex gap-2 mb-4">
        {[2024,2025,2026].map(y=>(
          <button key={y} onClick={()=>setYear(y)} className={`px-3 py-1 text-xs font-bold rounded ${year===y?'bg-dassa-red text-white':'bg-gray-100 text-gray-600'}`}>{y}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total" value={total} sub={`Año ${year}`}/>
        <KPICard label="Activos" value={activos} sub="en curso"/>
        <KPICard label="Cumplidos" value={cumplidos} sub="meta lograda"/>
        <KPICard label="No cumplidos" value={noCumplidos} sub="evaluar acciones" alert={noCumplidos>0}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data.objectives.map(o=>(
          <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <code className="text-[10px] font-bold text-dassa-celeste-deep">{o.code}</code>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${o.status==='cumplido'?'bg-emerald-100 text-emerald-700':o.status==='no_cumplido'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
                {o.status}
              </span>
            </div>
            <h4 className="font-bold text-sm text-gray-900 mb-1">{o.name}</h4>
            <p className="text-[11px] text-gray-600 mb-2">{o.description}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div><strong className="text-gray-500">META:</strong> {o.target_value}</div>
              <div><strong className="text-gray-500">Admisible:</strong> {o.admissible_value}</div>
              <div><strong className="text-gray-500">Área:</strong> {o.area}</div>
              <div><strong className="text-gray-500">Indicador:</strong> {o.target_metric}</div>
            </div>
          </div>
        ))}
      </div>
    </PageContent>
  );
}
