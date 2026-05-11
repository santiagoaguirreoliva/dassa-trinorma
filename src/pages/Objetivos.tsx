import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

interface Objective { id:string; code:string; name:string; description:string; area:string; target_metric:string; target_value:string; admissible_value:string; status:string; num_indicators:number; }

export default function Objetivos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isLeader = ['master_admin','director','sgi_leader'].includes(user?.role||'');
  const [year, setYear] = useState(2025);
  const [showNew, setShowNew] = useState(false);

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {[2024,2025,2026].map(y=>(
            <button key={y} onClick={()=>setYear(y)} className={`px-3 py-1 text-xs font-bold rounded ${year===y?'bg-dassa-red text-white':'bg-gray-100 text-gray-600'}`}>{y}</button>
          ))}
        </div>
        {isLeader && (
          <button onClick={()=>setShowNew(true)} className="flex items-center gap-1 px-3 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg hover:bg-dassa-red-deep">
            <Plus size={12}/> Nuevo objetivo
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total" value={total} sub={`Año ${year}`}/>
        <KPICard label="Activos" value={activos}/>
        <KPICard label="Cumplidos" value={cumplidos}/>
        <KPICard label="No cumplidos" value={noCumplidos} alert={noCumplidos>0}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data.objectives.map(o=>(
          <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <code className="text-[10px] font-bold text-dassa-celeste-deep">{o.code}</code>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${o.status==='cumplido'?'bg-emerald-100 text-emerald-700':o.status==='no_cumplido'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{o.status}</span>
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
      {showNew && <NewObjetivoModal year={year} onClose={()=>setShowNew(false)} onCreated={()=>qc.invalidateQueries({ queryKey:['objetivos', year] })}/>}
    </PageContent>
  );
}

function NewObjetivoModal({ year, onClose, onCreated }: any) {
  const [f, setF] = useState({ name:'', description:'', year, area:'Operaciones', target_metric:'', target_value:'', admissible_value:'' });
  const mut = useMutation({
    mutationFn: () => api.post('/objetivos', f),
    onSuccess: () => { onCreated(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold">Nuevo objetivo · {year}</h3>
          <button onClick={onClose}><X size={18}/></button>
        </div>
        <input placeholder="Nombre del objetivo" value={f.name} onChange={e=>setF({...f, name:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Descripción" rows={2} value={f.description} onChange={e=>setF({...f, description:e.target.value})} className="input-field w-full mb-2"/>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input placeholder="Indicador (ej. CTNS/mes)" value={f.target_metric} onChange={e=>setF({...f, target_metric:e.target.value})} className="input-field"/>
          <select value={f.area} onChange={e=>setF({...f, area:e.target.value})} className="input-field">
            {['Operaciones','Comercial','RRHH','SySO','Sistemas','Dirección'].map(a=><option key={a}>{a}</option>)}
          </select>
          <input placeholder="Meta (ej. >220)" value={f.target_value} onChange={e=>setF({...f, target_value:e.target.value})} className="input-field"/>
          <input placeholder="Admisible (ej. >130)" value={f.admissible_value} onChange={e=>setF({...f, admissible_value:e.target.value})} className="input-field"/>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
          <button onClick={()=>mut.mutate()} disabled={!f.name||mut.isPending} className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
            {mut.isPending && <Loader2 size={12} className="animate-spin"/>} Crear
          </button>
        </div>
      </div>
    </div>
  );
}
