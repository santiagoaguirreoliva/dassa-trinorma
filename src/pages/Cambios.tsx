import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitMerge, Plus, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';
import { SimpleBar, SimplePie } from '@/components/charts';
import ExportExcelButton from '@/components/ExportExcelButton';
import SearchInput from '@/components/SearchInput';
import { matchesQuery } from '@/lib/textSearch';

interface Change { id:string; code:string; title:string; purpose:string; status:string; plazo_target:string; recursos:string|null; verificacion:string|null; year:number; num_items:number; }
const STATUS_BG: Record<string,string> = { propuesto:'bg-amber-100 text-amber-700', aprobado:'bg-blue-100 text-blue-700', en_curso:'bg-violet-100 text-violet-700', completado:'bg-emerald-100 text-emerald-700', cancelado:'bg-red-100 text-red-700', postpuesto:'bg-gray-100 text-gray-600' };
const ESTADOS = ['propuesto','aprobado','en_curso','completado','cancelado','postpuesto'];
const fmtPlazo = (d?: string|null) => d ? d.slice(0,10).split('-').reverse().join('/') : '—';

export default function Cambios() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isLeader = ['master_admin','director','sgi_leader'].includes(user?.role||'');
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Change|null>(null);
  const { data, isLoading } = useQuery<{ok:boolean;changes:Change[]}>({
    queryKey: ['cambios'], queryFn: () => api.get('/cambios'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;
  return (
    <PageContent>
      <Header title="🔧 Gestión de Cambios" subtitle={`${data.changes.length} proyectos`} doc="F-TRI-14" icon={<GitMerge size={20}/>}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Total" value={data.changes.length}/>
        <KPICard label="En curso" value={data.changes.filter(c=>c.status==='en_curso').length}/>
        <KPICard label="Completados" value={data.changes.filter(c=>c.status==='completado').length}/>
        <KPICard label="Propuestos" value={data.changes.filter(c=>c.status==='propuesto').length}/>
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <SimplePie
          title="🍕 Cambios por estado"
          data={Array.from(new Set(data.changes.map(c=>c.status))).map(s=>({
            name: s, value: data.changes.filter(c=>c.status===s).length
          }))}
        />
        <SimpleBar
          title="📊 Cambios por año"
          data={Array.from(new Set(data.changes.map(c=>c.year))).sort().map(y=>({
            name: String(y), value: data.changes.filter(c=>c.year===y).length
          }))}
        />
      </div>
      <div className="flex justify-end items-center gap-2 mb-3">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar cambio…" />
        <ExportExcelButton<Change> filename="F-TRI-14-gestion-de-cambios" sheetName="Cambios" rows={data.changes.filter(c => matchesQuery(q, c.code, c.title, c.purpose, c.status, c.recursos, c.verificacion))} columns={[
          { header: 'Código', value: c => c.code },
          { header: 'Título', value: c => c.title },
          { header: 'Propósito', value: c => c.purpose || '' },
          { header: 'Estado', value: c => c.status },
          { header: 'Plazo', value: c => c.plazo_target ? c.plazo_target.slice(0,10).split('-').reverse().join('/') : '' },
          { header: 'Recursos', value: c => c.recursos || '' },
          { header: 'Verificación', value: c => c.verificacion || '' },
          { header: 'Año', value: c => c.year },
        ]}/>
        {isLeader && <button onClick={()=>setShowNew(true)} className="flex items-center gap-1 px-3 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg"><Plus size={12}/> Nuevo cambio</button>}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Código</th>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Título</th>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Estado</th>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Plazo</th>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Recursos</th>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Verificación</th>
            <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Año</th>
          </tr></thead>
          <tbody>
            {data.changes.filter(c => matchesQuery(q, c.code, c.title, c.purpose, c.status, c.recursos, c.verificacion)).map(c=>(
              <tr key={c.id} className={`border-b hover:bg-gray-50 ${isLeader?'cursor-pointer':''}`} onClick={()=>isLeader&&setEditing(c)}>
                <td className="px-4 py-2"><code className="text-[10px] font-bold text-dassa-celeste-deep">{c.code}</code></td>
                <td className="px-4 py-2"><div className="text-xs font-semibold text-gray-900">{c.title}</div><div className="text-[10px] text-gray-500">{c.purpose}</div></td>
                <td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${STATUS_BG[c.status]||'bg-gray-100'}`}>{c.status}</span></td>
                <td className="px-4 py-2 text-[10px] text-gray-600 whitespace-nowrap">{fmtPlazo(c.plazo_target)}</td>
                <td className="px-4 py-2 text-[10px] text-gray-600 max-w-[220px]">{c.recursos||'—'}</td>
                <td className="px-4 py-2 text-[10px] text-gray-600 max-w-[220px]">{c.verificacion||'—'}</td>
                <td className="px-4 py-2 text-[10px] text-gray-600">{c.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew && <NewCambioModal onClose={()=>setShowNew(false)} onCreated={()=>qc.invalidateQueries({queryKey:['cambios']})}/>}
      {editing && <EditCambioModal change={editing} onClose={()=>setEditing(null)} onSaved={()=>qc.invalidateQueries({queryKey:['cambios']})}/>}
    </PageContent>
  );
}

function EditCambioModal({ change, onClose, onSaved }: { change: Change; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    status: change.status,
    plazo_target: change.plazo_target ? change.plazo_target.slice(0,10) : '',
    recursos: change.recursos || '',
    verificacion: change.verificacion || '',
  });
  const mut = useMutation({
    mutationFn: () => api.patch(`/cambios/${change.id}`, { ...f, plazo_target: f.plazo_target || null }),
    onSuccess: () => { onSaved(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1"><h3 className="text-lg font-extrabold">{change.code}</h3><button onClick={onClose}><X size={18}/></button></div>
        <p className="text-xs text-gray-500 mb-4">{change.title}</p>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
        <select value={f.status} onChange={e=>setF({...f, status:e.target.value})} className="input-field w-full mb-2">
          {ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Plazo</label>
        <input type="date" value={f.plazo_target} onChange={e=>setF({...f, plazo_target:e.target.value})} className="input-field w-full mb-2"/>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Recursos</label>
        <textarea rows={2} value={f.recursos} onChange={e=>setF({...f, recursos:e.target.value})} className="input-field w-full mb-2"/>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Verificación</label>
        <textarea rows={2} value={f.verificacion} onChange={e=>setF({...f, verificacion:e.target.value})} className="input-field w-full mb-2"/>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
          <button onClick={()=>mut.mutate()} disabled={mut.isPending} className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg disabled:opacity-50">{mut.isPending&&<Loader2 size={12} className="animate-spin inline mr-1"/>}Guardar</button>
        </div>
      </div>
    </div>
  );
}

function NewCambioModal({ onClose, onCreated }: any) {
  const [f, setF] = useState({ title:'', purpose:'', impact_description:'', year:new Date().getFullYear(), plazo_target:'', recursos:'', verificacion:'' });
  const mut = useMutation({
    mutationFn: () => api.post('/cambios', f),
    onSuccess: () => { onCreated(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-extrabold">Nuevo Cambio</h3><button onClick={onClose}><X size={18}/></button></div>
        <input placeholder="Título" value={f.title} onChange={e=>setF({...f, title:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Propósito" rows={2} value={f.purpose} onChange={e=>setF({...f, purpose:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Impacto esperado" rows={2} value={f.impact_description} onChange={e=>setF({...f, impact_description:e.target.value})} className="input-field w-full mb-2"/>
        <input type="date" value={f.plazo_target} onChange={e=>setF({...f, plazo_target:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Recursos necesarios" rows={2} value={f.recursos} onChange={e=>setF({...f, recursos:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Verificación (método / evidencia)" rows={2} value={f.verificacion} onChange={e=>setF({...f, verificacion:e.target.value})} className="input-field w-full mb-2"/>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
          <button onClick={()=>mut.mutate()} disabled={!f.title||mut.isPending} className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg disabled:opacity-50">{mut.isPending&&<Loader2 size={12} className="animate-spin inline mr-1"/>}Crear</button>
        </div>
      </div>
    </div>
  );
}
