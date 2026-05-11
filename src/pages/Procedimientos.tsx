import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

interface Proc { id:string; code:string; title:string; module:string; description:string; norma:string; status:string; num_steps:number; }

export default function Procedimientos() {
  const { data, isLoading } = useQuery<{ok:boolean;procedures:Proc[]}>({
    queryKey: ['procedimientos'],
    queryFn: () => api.get('/procedimientos'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;

  return (
    <PageContent>
      <Header title="📘 Procedimientos del Sistema" subtitle={`${data.procedures.length} procedimientos · instructivos por módulo`} icon={<BookOpen size={20}/>}/>
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
    </PageContent>
  );
}
