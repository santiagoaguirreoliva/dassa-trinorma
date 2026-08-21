import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';
import { SimplePie } from '@/components/charts';
import ObjetivoDetalle from '@/components/objetivos/ObjetivoDetalle';

interface Medicion { mes:string; valor:number|string|null; notes?:string; anio?:number }
interface Kpi { id:string; indicator_name:string; item_medido?:string; unit?:string; frequency?:string;
  target_value:number|string|null; target_text?:string; direction?:string; mediciones:Medicion[]|null }
interface Objective { id:string; code:string; name:string; description:string; area:string; target_metric:string;
  target_value:string; admissible_value:string; status:string; num_indicators:number;
  responsible_text?:string; acciones_asociadas?:string; recursos?:string; plazo_frecuencia?:string;
  cumplimiento_nota?:string; acciones_si_no_llega?:string;
  kpis:Kpi[]|null }

// Serie de mediciones del F-TRI-04. La planilla mide cada objetivo con SU
// frecuencia: doce meses sirven para los que se cuentan mes a mes, pero un
// objetivo semestral o anual con doce casilleros vacíos no informa nada — solo
// simula que faltan datos. Por eso la grilla se arma según "Plazo/Frec.".
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PERIODOS: Record<string, { label:string; meses:number[] }[]> = {
  mensual:    MESES.map((m,i) => ({ label:m, meses:[i+1] })),
  bimensual:  [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]].map((ms,i) => ({ label:`B${i+1}`, meses:ms })),
  trimestral: [[1,2,3],[4,5,6],[7,8,9],[10,11,12]].map((ms,i) => ({ label:`Q${i+1}`, meses:ms })),
  semestral:  [[1,2,3,4,5,6],[7,8,9,10,11,12]].map((ms,i) => ({ label:`S${i+1}`, meses:ms })),
  anual:      [{ label:'Año', meses:[1,2,3,4,5,6,7,8,9,10,11,12] }],
};

function Campo({ label, valor, ancho }: { label:string; valor?:string|null; ancho?:boolean }) {
  if (!valor || !String(valor).trim()) return null;
  return (
    <div className={ancho ? 'col-span-2' : undefined}>
      <strong className="text-gray-500">{label}:</strong> {valor}
    </div>
  );
}

function fmt(v:number) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }

function SerieMediciones({ kpi, metaAnual, year }: { kpi:Kpi; metaAnual?:string; year:number }) {
  const freq = (kpi.frequency || 'mensual').toLowerCase();
  const periodos = PERIODOS[freq] || PERIODOS.mensual;
  const meds = kpi.mediciones || [];
  const acumula = (kpi.unit || '').includes('CNT');
  const valorDe = (anio:number, meses:number[]) => {
    const vs = meds
      .filter(m => Number(m.mes.slice(0,4)) === anio && meses.includes(Number(m.mes.slice(5))))
      .map(m => Number(m.valor)).filter(v => Number.isFinite(v));
    if (!vs.length) return null;
    // Dentro de un período agrupado, contar suma y medir promedia.
    return acumula ? vs.reduce((a,b)=>a+b,0) : vs.reduce((a,b)=>a+b,0)/vs.length;
  };
  const actuales = periodos.map(p => valorDe(year, p.meses));
  const previos  = periodos.map(p => valorDe(year-1, p.meses));
  const hayDatos = actuales.some(v => v !== null) || previos.some(v => v !== null);

  if (!hayDatos) {
    return (
      <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-[10px] text-gray-400">
        Sin mediciones cargadas · se mide {freq} · lo carga {kpi.item_medido ? 'el responsable' : 'el responsable'}
      </div>
    );
  }

  const vs = actuales.filter(v => v !== null) as number[];
  const total = acumula ? vs.reduce((a,b)=>a+b,0) : (vs.length ? vs.reduce((a,b)=>a+b,0)/vs.length : null);
  const meta = Number(metaAnual);
  const pct = acumula && total !== null && Number.isFinite(meta) && meta > 0 ? Math.round(100*total/meta) : null;
  const transcurrido = Math.round(100 * vs.length / periodos.length);

  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-bold text-gray-400 uppercase">{year} · {freq}</span>
        {previos.some(v => v !== null) && <span className="text-[9px] text-gray-300">· abajo en gris: real {year-1}</span>}
      </div>
      <div className={`grid gap-0.5 ${periodos.length > 6 ? 'grid-cols-12' : periodos.length > 2 ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {periodos.map((p, i) => {
          const v = actuales[i], b = previos[i];
          return (
            <div key={p.label} className={`text-center rounded py-1 ${v !== null ? 'bg-dassa-celeste/15' : 'bg-gray-50'}`}>
              <div className="text-[8px] font-bold text-gray-400 uppercase">{p.label}</div>
              <div className={`text-[10px] font-extrabold ${v !== null ? 'text-gray-800' : 'text-gray-300'}`}>
                {v !== null ? fmt(v) : '—'}
              </div>
              {b !== null && <div className="text-[8px] text-gray-400" title={`Real ${year-1}`}>{fmt(b)}</div>}
            </div>
          );
        })}
      </div>
      {total !== null && (
        <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 uppercase">
            {acumula ? 'Acumulado del año' : 'Promedio del año'}
          </span>
          <span className="text-sm font-extrabold text-gray-900">
            {acumula ? Math.round(total) : fmt(total)}{!acumula && kpi.unit ? ` ${kpi.unit}` : ''}
          </span>
          {pct !== null && (
            <>
              <span className="text-[10px] text-gray-400">de {meta} ({pct}%)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pct >= transcurrido ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {pct >= transcurrido ? 'en ritmo' : `${transcurrido}% del período transcurrido`}
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
  const [detalleId, setDetalleId] = useState<string|null>(null);

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
          <div key={o.id} onClick={() => setDetalleId(o.id)}
            className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-dassa-celeste hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-2">
              <code className="text-[10px] font-bold text-dassa-celeste-deep">{o.code}</code>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${o.status==='cumplido'?'bg-emerald-100 text-emerald-700':o.status==='no_cumplido'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{o.status}</span>
            </div>
            <h4 className="font-bold text-sm text-gray-900 mb-1">{o.name}</h4>
            <p className="text-[11px] text-gray-600 mb-2">{o.description}</p>
            {/* Columnas del F-TRI-04. Las vacías no se muestran: una fila con "—"
                ocupa lo mismo que una con dato y no dice nada. */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <Campo label="META" valor={o.target_value} />
              <Campo label="Admisible" valor={o.admissible_value} />
              <Campo label="Indicador" valor={o.kpis?.[0]?.indicator_name || o.target_metric} />
              <Campo label="Ítem a medir" valor={o.kpis?.[0]?.item_medido} />
              <Campo label="Responsable" valor={o.responsible_text} />
              <Campo label="Plazo/Frec." valor={o.plazo_frecuencia} />
              <Campo label="Acciones" valor={o.acciones_asociadas} ancho />
              <Campo label="Recursos" valor={o.recursos} ancho />
              <Campo label="Cumplimiento" valor={o.cumplimiento_nota} ancho />
              <Campo label="Si no se llega" valor={o.acciones_si_no_llega} ancho />
            </div>
            {o.kpis?.[0] && <SerieMediciones kpi={o.kpis[0]} metaAnual={o.target_value} year={year} />}
          </div>
        ))}
      </div>
      {detalleId && <ObjetivoDetalle objectiveId={detalleId} onClose={() => setDetalleId(null)} />}
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
