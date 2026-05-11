import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

interface Proc { id:string; code:string; title:string; module:string; description:string; norma:string; status:string; num_steps:number; }

export default function Procedimientos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isLeader = ['master_admin','director','sgi_leader'].includes(user?.role||'');
  const [showNew, setShowNew] = useState(false);
  const { data, isLoading } = useQuery<{ok:boolean;procedures:Proc[]}>({
    queryKey: ['procedimientos'], queryFn: () => api.get('/procedimientos'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;
  return (
    <PageContent>
      <Header title="📘 Procedimientos del Sistema" subtitle={`${data.procedures.length} procedimientos · instructivos por módulo`} icon={<BookOpen size={20}/>}/>
      <div className="flex justify-end mb-3">
        {isLeader && <button onClick={()=>setShowNew(true)} className="flex items-center gap-1 px-3 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg"><Plus size={12}/> Nuevo procedimiento</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.procedures.map(p=>(
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-dassa-celeste transition">
            <div className="flex items-start justify-between mb-2">
              <code className="text-[10px] font-bold text-dassa-red-deep">{p.code}</code>
              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{p.status}</span>
            </div>
            <h4 className="font-bold text-sm text-gray-900 mb-1">{p.title}</h4>
            <p className="text-[11px] text-gray-600 mb-2">{p.description}</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">📦 {p.module}</span>
              <span className="bg-dassa-celeste-tint text-dassa-celeste-deep px-2 py-0.5 rounded font-bold">ISO {p.norma}</span>
            </div>
          </div>
        ))}
      </div>
      {showNew && <NewProcModal onClose={()=>setShowNew(false)} onCreated={()=>qc.invalidateQueries({queryKey:['procedimientos']})}/>}
    </PageContent>
  );
}

function NewProcModal({ onClose, onCreated }: any) {
  const [f, setF] = useState({ title:'', module:'findings', description:'', instructions_md:'', norma:'9001' });
  const mut = useMutation({
    mutationFn: () => api.post('/procedimientos', f),
    onSuccess: () => { onCreated(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-extrabold">Nuevo procedimiento</h3><button onClick={onClose}><X size={18}/></button></div>
        <input placeholder="Título" value={f.title} onChange={e=>setF({...f, title:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Descripción" rows={2} value={f.description} onChange={e=>setF({...f, description:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Instrucciones (markdown)" rows={4} value={f.instructions_md} onChange={e=>setF({...f, instructions_md:e.target.value})} className="input-field w-full mb-2"/>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={f.module} onChange={e=>setF({...f, module:e.target.value})} className="input-field">
            {['findings','risks','purchases','trainings','incidents','committee','environmental','employees','satisfaction','change_requests','communications','reviews'].map(m=><option key={m}>{m}</option>)}
          </select>
          <select value={f.norma} onChange={e=>setF({...f, norma:e.target.value})} className="input-field">
            {['9001','14001','45001','todas'].map(n=><option key={n}>ISO {n}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
          <button onClick={()=>mut.mutate()} disabled={!f.title||mut.isPending} className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg disabled:opacity-50">{mut.isPending&&<Loader2 size={12} className="animate-spin inline mr-1"/>}Crear</button>
        </div>
      </div>
    </div>
  );
}
