import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, Star, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

export default function MiPuesto() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['mi-puesto'],
    queryFn: () => api.get('/orgchart/mi-puesto'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;

  return (
    <PageContent>
      <Header title="📋 Mi Puesto" subtitle={`${data.profiles?.length || 0} puesto(s) asignado(s)`} icon={<Briefcase size={20}/>}/>
      {!data.profiles?.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          ⚠ No tenés ningún puesto asignado todavía. Hablá con RRHH.
        </div>
      )}
      {(data.profiles||[]).map((p:any)=>(
        <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">{p.role_label}</h3>
            {p.is_primary && <span className="text-[10px] bg-dassa-red-tint text-dassa-red-deep px-2 py-0.5 rounded font-bold">PRINCIPAL</span>}
          </div>
          <p className="text-sm text-gray-700 mb-4">{p.mission}</p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Key Results</div>
              <ul className="space-y-0.5">
                {(p.key_results||[]).map((k:string,i:number)=>(<li key={i} className="text-xs text-gray-700">• {k}</li>))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Capacitaciones esperadas</div>
              <ul className="space-y-0.5">
                {(p.training_required||[]).map((t:string,i:number)=>(<li key={i} className="text-xs text-gray-700">• {t}</li>))}
              </ul>
            </div>
          </div>
          <Link to={`/puestos/${p.id}`} className="inline-flex items-center gap-1 text-xs text-dassa-celeste-deep font-bold hover:underline">
            Ver ficha completa <ArrowRight size={12}/>
          </Link>
        </div>
      ))}
    </PageContent>
  );
}
