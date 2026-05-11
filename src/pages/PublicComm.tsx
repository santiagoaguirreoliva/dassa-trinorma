import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { CheckCircle2, Megaphone, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function PublicComm() {
  const { token } = useParams();
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['public-comm', token],
    queryFn: () => fetch(`/api/comunicaciones/public/c/${token}`).then(r => r.json()),
    enabled: !!token,
  });

  const confirmMut = useMutation({
    mutationFn: () => fetch(`/api/comunicaciones/public/c/${token}/confirm`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ confirmed_by_name: name, feedback })
    }).then(r => r.json()),
    onSuccess: () => setConfirmed(true),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-dassa-red"/></div>;
  if (error || !data?.communication) return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center"><h1 className="text-xl font-bold text-gray-900">Link inválido</h1><p className="text-sm text-gray-500 mt-2">Esta comunicación no está disponible o ya fue archivada.</p></div>
    </div>
  );
  const c = data.communication;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-dassa-celeste-tint p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="bg-dassa-red text-white p-6 rounded-t-2xl">
            <div className="flex items-center gap-2 text-sm font-bold opacity-90 mb-2"><Megaphone size={16}/> DASSA SGI · TRINORMA</div>
            <h1 className="text-2xl font-extrabold">{c.title}</h1>
            <div className="text-xs opacity-80 mt-2">{c.code} · {c.category} · {c.sender_name}</div>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{c.body_md}</div>
          </div>
          {!confirmed && (
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <h3 className="text-sm font-bold text-gray-900 mb-3">✅ Confirmar lectura</h3>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo" className="input-field w-full mb-2 text-sm"/>
              <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} rows={2} placeholder="Feedback / comentario (opcional)" className="input-field w-full mb-3 text-sm resize-none"/>
              <button onClick={()=>confirmMut.mutate()} disabled={!name || confirmMut.isPending}
                className="w-full px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {confirmMut.isPending? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                Confirmé que la leí
              </button>
            </div>
          )}
          {confirmed && (
            <div className="p-8 text-center border-t border-gray-200 bg-emerald-50 rounded-b-2xl">
              <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-2"/>
              <h3 className="text-lg font-bold text-emerald-900">¡Gracias, {name}!</h3>
              <p className="text-sm text-emerald-700 mt-1">Tu confirmación de lectura quedó registrada.</p>
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-4">DASSA SA · Sistema de Gestión Integrado TRINORMA</p>
      </div>
    </div>
  );
}
