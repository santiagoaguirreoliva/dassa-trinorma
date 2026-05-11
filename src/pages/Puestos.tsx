import { useQuery } from '@tanstack/react-query';
import { Users, Search } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';
import { Link } from 'react-router-dom';

interface Profile { id:string; role_label:string; area:string; seniority:string; mission:string; employees:any[]; }

export default function Puestos() {
  const { data, isLoading } = useQuery<{ok:boolean;profiles:Profile[];nodes:any[]}>({
    queryKey: ['orgchart'],
    queryFn: () => api.get('/orgchart'),
  });
  const [q, setQ] = useState('');
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;

  const filtered = data.profiles.filter(p =>
    !q || p.role_label.toLowerCase().includes(q.toLowerCase()) ||
    p.area.toLowerCase().includes(q.toLowerCase())
  );

  const byArea: Record<string,Profile[]> = {};
  filtered.forEach(p=>{ (byArea[p.area]=byArea[p.area]||[]).push(p); });

  return (
    <PageContent>
      <Header title="💼 Puestos / Fichas" subtitle={`${data.profiles.length} puestos activos`}/>
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex items-center gap-2">
        <Search size={14} className="text-gray-400"/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." className="flex-1 text-xs focus:outline-none"/>
      </div>
      {Object.entries(byArea).map(([area, profiles]) => (
        <div key={area} className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{area}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profiles.map(p => (
              <Link key={p.id} to={`/puestos/${p.id}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-dassa-celeste hover:shadow-md transition">
                <h4 className="font-bold text-sm text-gray-900 mb-1">{p.role_label}</h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded">{p.seniority}</span>
                  <span className="text-[10px] text-gray-400">{p.employees.length} empleado(s)</span>
                </div>
                <p className="text-[11px] text-gray-600 line-clamp-3">{p.mission}</p>
                {p.employees.length>0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                    {p.employees.slice(0,3).map((e:any)=>(
                      <span key={e.id} className="text-[10px] bg-dassa-celeste-tint text-dassa-celeste-deep px-2 py-0.5 rounded">
                        {e.full_name}
                      </span>
                    ))}
                    {p.employees.length>3 && <span className="text-[10px] text-gray-400">+{p.employees.length-3}</span>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </PageContent>
  );
}
