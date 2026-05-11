import { useQuery } from '@tanstack/react-query';
import { GitMerge, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

interface Change { id:string; code:string; title:string; purpose:string; status:string; plazo_target:string; year:number; num_items:number; }
const STATUS_BG: Record<string,string> = { propuesto:'bg-amber-100 text-amber-700', aprobado:'bg-blue-100 text-blue-700', en_curso:'bg-violet-100 text-violet-700', completado:'bg-emerald-100 text-emerald-700', cancelado:'bg-red-100 text-red-700', postpuesto:'bg-gray-100 text-gray-600' };

export default function Cambios() {
  const { data, isLoading } = useQuery<{ok:boolean;changes:Change[]}>({
    queryKey: ['cambios'],
    queryFn: () => api.get('/cambios'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;
  const total = data.changes.length;
  const enCurso = data.changes.filter(c=>c.status==='en_curso').length;
  const completados = data.changes.filter(c=>c.status==='completado').length;

  return (
    <PageContent>
      <Header title="🔧 Gestión de Cambios" subtitle={`${total} proyectos · F-TRI-14`} icon={<GitMerge size={20}/>}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total" value={total} sub="histórico"/>
        <KPICard label="En curso" value={enCurso}/>
        <KPICard label="Completados" value={completados}/>
        <KPICard label="Propuestos" value={data.changes.filter(c=>c.status==='propuesto').length}/>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Código</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Título</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Estado</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Plazo</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Año</th>
            </tr>
          </thead>
          <tbody>
            {data.changes.map(c=>(
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2"><code className="text-[10px] font-bold text-dassa-celeste-deep">{c.code}</code></td>
                <td className="px-4 py-2"><div className="text-xs font-semibold text-gray-900">{c.title}</div><div className="text-[10px] text-gray-500">{c.purpose}</div></td>
                <td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${STATUS_BG[c.status]||'bg-gray-100'}`}>{c.status}</span></td>
                <td className="px-4 py-2 text-[10px] text-gray-600">{c.plazo_target||'—'}</td>
                <td className="px-4 py-2 text-[10px] text-gray-600">{c.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContent>
  );
}
