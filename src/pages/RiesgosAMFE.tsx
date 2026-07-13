import { useQuery, useMutation } from '@tanstack/react-query';
import { AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';
import { SimpleBar, RiskLevelPie } from '@/components/charts';

interface Risk {
  id:string; code:string; activity:string; hazard:string;
  severity:number; probability:number; detection:number; npr:number; npr_level:string;
  process:string; recommended_action:string; causes:string;
  ro_type?:string; responsible_text?:string; eficacia_verificada?:string;
  residual_severity?:number; residual_probability?:number; residual_detection?:number;
  matrix_version?:string; matrix_date?:string;
}
const fmtDate = (d?:string) => d ? d.slice(0,10).split('-').reverse().join('/') : '';

export default function RiesgosAMFE() {
  const { user } = useAuth();
  const isAdmin = ['master_admin','director','sgi_leader'].includes(user?.role||'');
  const [proc, setProc] = useState<string>('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const { data, isLoading } = useQuery<{ok:boolean;risks:Risk[]}>({
    queryKey: ['riesgos-amfe', proc],
    queryFn: () => api.get(`/riesgos-amfe${proc?`?process=${proc}`:''}`),
  });

  const suggestMut = useMutation({
    mutationFn: () => api.post('/riesgos-amfe/sugerir-ia', {}),
    onSuccess: (r:any) => setSuggestions(r.suggestions || []),
  });

  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;
  const significativos = data.risks.filter(r=>r.npr_level==='significativo').length;
  const promNPR = data.risks.length ? Math.round(data.risks.reduce((s,r)=>s+(r.npr||0),0)/data.risks.length) : 0;
  const processes = Array.from(new Set(data.risks.map(r=>r.process).filter(Boolean)));
  const meta = data.risks[0];

  return (
    <PageContent>
      <Header title="⚠ Matriz de Riesgos AMFE" subtitle={`${data.risks.length} riesgos y oportunidades · NPR = G × O × D · ≥16 significativo`} icon={<AlertTriangle size={20}/>}/>
      {meta?.matrix_version && (
        <div className="mb-4 -mt-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-dassa-navy bg-dassa-navy/10 rounded-full px-3 py-1">
            F-TRI-08 · {meta.matrix_version} · actualizada {fmtDate(meta.matrix_date)}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Total riesgos" value={data.risks.length}/>
        <KPICard label="Significativos" value={significativos} sub="NPR ≥ 16" alert={significativos>0}/>
        <KPICard label="NPR promedio" value={promNPR}/>
        <KPICard label="Procesos" value={processes.length}/>
      </div>
      {/* CHARTS · análisis visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <RiskLevelPie
          title="🥧 Distribución por nivel de significancia"
          data={[
            { name: 'Significativos', value: data.risks.filter(r=>r.npr_level==='significativo').length, level: 'significativo' },
            { name: 'No significativos', value: data.risks.filter(r=>r.npr_level==='no_significativo').length, level: 'no_significativo' },
            { name: 'Sin evaluar', value: data.risks.filter(r=>!r.npr_level || r.npr_level==='sin_evaluar').length, level: 'sin_evaluar' },
          ].filter(d=>d.value>0)}
        />
        <SimpleBar
          title="📊 Riesgos por proceso"
          subtitle="Cantidad total y NPR promedio por proceso"
          data={processes.map(p => {
            const procRisks = data.risks.filter(r => r.process === p);
            return {
              name: p || 'sin proceso',
              value: procRisks.length,
              value2: Math.round(procRisks.reduce((s,r)=>s+(r.npr||0),0) / (procRisks.length||1)),
            };
          })}
          dataKey="value" dataKey2="value2" label="Cantidad" label2="NPR prom"
        />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <select value={proc} onChange={e=>setProc(e.target.value)} className="input-field text-xs">
          <option value="">Todos los procesos</option>
          {processes.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        {isAdmin && (
          <button onClick={()=>suggestMut.mutate()} disabled={suggestMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-dassa-celeste-deep text-white text-xs font-bold rounded-lg hover:bg-dassa-celeste disabled:opacity-50">
            {suggestMut.isPending? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
            Sugerir riesgos con IA
          </button>
        )}
      </div>

      {suggestions.length>0 && (
        <div className="bg-dassa-celeste-tint/30 border-2 border-dashed border-dassa-celeste/40 rounded-xl p-4 mb-4">
          <h4 className="text-xs font-bold text-dassa-celeste-deep mb-2">🪄 {suggestions.length} riesgos sugeridos por la IA</h4>
          <div className="space-y-2">
            {suggestions.map((s,i)=>(
              <div key={i} className="bg-white p-3 rounded border border-gray-200">
                <div className="font-bold text-xs">{s.process} · {s.activity}</div>
                <div className="text-[11px] text-gray-700">{s.hazard}</div>
                <div className="text-[10px] text-gray-500 mt-1">G={s.severity} O={s.probability} D={s.detection} → NPR={s.severity*s.probability*s.detection}</div>
                {s.recommended_action && <div className="text-[10px] mt-1"><strong>Acción:</strong> {s.recommended_action}</div>}
              </div>
            ))}
          </div>
          <button onClick={()=>setSuggestions([])} className="text-[10px] text-gray-500 mt-2">Cerrar sugerencias</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Código</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Riesgo / Oportunidad · Efecto</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase">Tipo</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase">G</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase">O</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase">D</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase">NPR</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase">NPR res.</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Proceso</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Responsable</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {data.risks.map(r=>(
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2"><code className="text-[10px] font-bold text-dassa-red-deep">{r.code}</code></td>
                <td className="px-3 py-2 max-w-xs">
                  <div className="font-semibold text-gray-900">{r.activity}</div>
                  <div className="text-[10px] text-gray-500">{r.hazard}</div>
                </td>
                <td className="text-center px-2 py-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${r.ro_type==='oportunidad'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>
                    {r.ro_type==='oportunidad'?'Oport.':'Riesgo'}
                  </span>
                </td>
                <td className="text-center px-2 py-2">{r.severity}</td>
                <td className="text-center px-2 py-2">{r.probability}</td>
                <td className="text-center px-2 py-2">{r.detection ?? '—'}</td>
                <td className={`text-center px-2 py-2 font-bold ${r.npr_level==='significativo'?'text-red-600':'text-gray-600'}`}>{r.npr ?? '—'}</td>
                <td className="text-center px-2 py-2 text-[10px] text-emerald-700 font-bold">
                  {r.residual_severity && r.residual_probability && r.residual_detection
                    ? r.residual_severity*r.residual_probability*r.residual_detection : '—'}
                </td>
                <td className="px-3 py-2 text-[10px] text-gray-600">{r.process||'—'}</td>
                <td className="px-3 py-2 text-[10px] text-gray-600 max-w-[140px]">{r.responsible_text||'—'}</td>
                <td className="px-3 py-2 text-[10px] text-gray-700 line-clamp-2 max-w-xs">{r.recommended_action||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContent>
  );
}
