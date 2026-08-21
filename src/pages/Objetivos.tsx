import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';
import { SimplePie } from '@/components/charts';

interface Medicion { mes:string; valor:number|string|null; notes?:string }
interface Kpi { id:string; indicator_name:string; item_medido?:string; unit?:string; frequency?:string;
  target_value:number|string|null; target_text?:string; direction?:string; mediciones:Medicion[]|null }
interface Objective { id:string; code:string; name:string; description:string; area:string; target_metric:string;
  target_value:string; admissible_value:string; status:string; num_indicators:number;
  responsible_text?:string; acciones_asociadas?:string; recursos?:string; plazo_frecuencia?:string;
  kpis:Kpi[]|null }

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Franja anual del F-TRI-04: los 12 meses + el acumulado del año contra la meta.
// Para metas anuales acumulables (contenedores) suma; para tasas y porcentajes
// promedia, porque sumar un 97% doce veces no significa nada.
function FranjaAnual({ kpi, metaAnual }: { kpi:Kpi; metaAnual?:string }) {
  const porMes = new Map((kpi.mediciones||[]).map(m => [m.mes.slice(5), Number(m.valor)]));
  const valores = [...porMes.values()].filter(v => Number.isFinite(v));
  const acumulable = (kpi.unit||'').includes('CNT');
  const acum = acumulable
    ? valores.reduce((a,b)=>a+b, 0)
    : (valores.length ? valores.reduce((a,b)=>a+b,0)/valores.length : null);
  const meta = Number(metaAnual);
  const pct = acumulable && acum !== null && Number.isFinite(meta) && meta>0 ? Math.round(100*acum/meta) : null;
  // A esta altura del año, ¿cuánto se debería llevar? Sirve para leer si el ritmo alcanza.
  const ritmo = valores.length ? Math.round(100*valores.length/12) : 0;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-100">
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {MESES.map((m,i) => {
          const v = porMes.get(String(i+1).padStart(2,'0'));
          const hay = Number.isFinite(v as number);
          return (
            <div key={m} className={`flex-1 min-w-[34px] text-center rounded py-1 ${hay ? 'bg-dassa-celeste/15' : 'bg-gray-50'}`}>
              <div className="text-[8px] font-bold text-gray-400 uppercase">{m}</div>
              <div className={`text-[10px] font-extrabold ${hay ? 'text-gray-800' : 'text-gray-300'}`}>
                {hay ? (Number.isInteger(v) ? v : (v as number).toFixed(1)) : '—'}
              </div>
            </div>
          );
        })}
      </div>
      {acum !== null && (
        <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 uppercase">
            {acumulable ? 'Acumulado del año' : 'Promedio del año'}
          </span>
          <span className="text-sm font-extrabold text-gray-900">
            {acumulable ? Math.round(acum) : acum.toFixed(1)}{kpi.unit && !acumulable ? ` ${kpi.unit}` : ''}
          </span>
          {pct !== null && (
            <>
              <span className="text-[10px] text-gray-400">de {meta} ({pct}%)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pct >= ritmo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {pct >= ritmo ? 'en ritmo' : `${ritmo}% del año transcurrido`}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Objetivos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isLeader = ['master_admin','director','sgi_leader'].includes(user?.role||'');
  const [year, setYear] = useState(2026);
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
      <Header title="🎯 Objetivos Corporativos" subtitle={`Año ${year} · ${total} objetivos`} doc="F-TRI-04" icon={<Target size={20}/>}/>
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
      <div className="mb-4">
        <SimplePie
          title="🎯 Objetivos por estado"
          data={[
            { name: 'Activos', value: activos, color: '#F59E0B' },
            { name: 'Cumplidos', value: cumplidos, color: '#10B981' },
            { name: 'No cumplidos', value: noCumplidos, color: '#EF4444' },
          ].filter(d=>d.value>0)}
        />
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
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div><strong className="text-gray-500">META:</strong> {o.target_value}</div>
              <div><strong className="text-gray-500">Admisible:</strong> {o.admissible_value || '—'}</div>
              <div><strong className="text-gray-500">Indicador:</strong> {o.kpis?.[0]?.indicator_name || o.target_metric}</div>
              <div><strong className="text-gray-500">Ítem a medir:</strong> {o.kpis?.[0]?.item_medido || '—'}</div>
              <div><strong className="text-gray-500">Responsable:</strong> {o.responsible_text || '—'}</div>
              <div><strong className="text-gray-500">Plazo/Frec.:</strong> {o.plazo_frecuencia || '—'}</div>
              <div className="col-span-2"><strong className="text-gray-500">Acciones:</strong> {o.acciones_asociadas || '—'}</div>
              <div className="col-span-2"><strong className="text-gray-500">Recursos:</strong> {o.recursos || '—'}</div>
            </div>
            {o.kpis?.[0] && <FranjaAnual kpi={o.kpis[0]} metaAnual={o.target_value} />}
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
