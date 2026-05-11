import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Megaphone, Send, Eye, Link as LinkIcon, Loader2, CheckCircle2, MessageCircle, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

interface Comm { id:string; code:string; title:string; category:string; status:string; sender_name:string; sent_at:string; public_token:string; num_recipients:number; num_reads:number; num_confirmed:number; }

export default function Comunicaciones() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery<{ok:boolean;communications:Comm[]}>({
    queryKey: ['comunicaciones'],
    queryFn: () => api.get('/comunicaciones'),
    refetchInterval: 20_000,
  });

  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;
  const enviadas = data.communications.filter(c=>c.status==='enviada').length;
  const borradores = data.communications.filter(c=>c.status==='borrador').length;
  const lecturas = data.communications.reduce((s,c)=>s+(c.num_reads||0),0);
  const confirmadas = data.communications.reduce((s,c)=>s+(c.num_confirmed||0),0);

  return (
    <PageContent>
      <Header title="📢 Comunicaciones Formales" subtitle={`${data.communications.length} comunicaciones · F-TRI-06 vivo`} icon={<Megaphone size={20}/>}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Enviadas" value={enviadas}/>
        <KPICard label="Borradores" value={borradores}/>
        <KPICard label="Lecturas registradas" value={lecturas}/>
        <KPICard label="Confirmadas" value={confirmadas} sub={lecturas? `${Math.round(confirmadas/lecturas*100)}%`:'—'}/>
      </div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Historial</h3>
        <button onClick={()=>setShowNew(true)} className="px-3 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg hover:bg-dassa-red-deep">+ Nueva</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Código</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Título</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Estado</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Lecturas</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Link</th>
            </tr>
          </thead>
          <tbody>
            {data.communications.map(c=>(
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2"><code className="text-[10px] font-bold text-dassa-celeste-deep">{c.code}</code></td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-gray-900">{c.title}</div>
                  <div className="text-[10px] text-gray-500">{c.category} · {c.sender_name}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${c.status==='enviada'?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </td>
                <td className="px-3 py-2 text-[10px] text-gray-600">
                  {c.num_reads||0} lecturas · {c.num_confirmed||0} confirmadas / {c.num_recipients||0} destinatarios
                </td>
                <td className="px-3 py-2">
                  {c.status==='enviada' && (
                    <div className="flex flex-col gap-1">
                      <a href={`/c/${c.public_token}`} target="_blank" rel="noreferrer" className="text-[10px] text-dassa-celeste-deep font-bold hover:underline flex items-center gap-1">
                        <LinkIcon size={10}/> Abrir
                      </a>
                      <button onClick={()=>shareWhatsApp(c.id)} className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1">
                        <MessageCircle size={10}/> WhatsApp
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew && <NewCommModal onClose={()=>setShowNew(false)}/>}
    </PageContent>
  );
}

async function shareWhatsApp(id: string) {
  try {
    const r = await fetch(`/api/comunicaciones/${id}/whatsapp-share`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('dassa_token')}` }
    });
    const data = await r.json();
    if (!data.ok) { alert('Error: ' + data.error); return; }
    // Copiar texto al clipboard
    try {
      await navigator.clipboard.writeText(data.whatsapp_text);
    } catch {}
    // Abrir WhatsApp con el texto pre-cargado
    window.open(data.whatsapp_link, '_blank');
  } catch (e: any) { alert(e.message); }
}

function NewCommModal({ onClose }: { onClose:()=>void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title:'', body_md:'', category:'info', scope:'internal' });
  const create = useMutation({
    mutationFn: () => api.post('/comunicaciones', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['comunicaciones'] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-extrabold mb-4">Nueva Comunicación</h3>
        <input placeholder="Título" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="input-field w-full mb-2"/>
        <textarea placeholder="Cuerpo (markdown)" rows={6} value={form.body_md} onChange={e=>setForm({...form, body_md:e.target.value})} className="input-field w-full mb-2"/>
        <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="input-field w-full mb-2">
          <option value="info">Info general</option>
          <option value="politica">Política</option>
          <option value="cambio">Cambio</option>
          <option value="capacitacion">Capacitación</option>
          <option value="alerta">Alerta</option>
        </select>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
          <button onClick={()=>create.mutate()} disabled={!form.title || !form.body_md || create.isPending}
            className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
            {create.isPending && <Loader2 size={12} className="animate-spin"/>} Crear (borrador)
          </button>
        </div>
      </div>
    </div>
  );
}
