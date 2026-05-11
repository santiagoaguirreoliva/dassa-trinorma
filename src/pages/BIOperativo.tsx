import { BarChart3, ExternalLink } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export default function BIOperativo() {
  const { user } = useAuth();
  const isAdmin = ['master_admin','director','sgi_leader'].includes(user?.role||'');

  return (
    <PageContent>
      <Header title="📊 BI Operativo · Metabase" subtitle="Dashboards de operaciones, seguridad y eficiencia" icon={<BarChart3 size={20}/>}/>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Acceso al servidor Metabase. Conectar a la DB <code className="bg-gray-100 px-1.5 py-0.5 rounded">dassa_sgi</code> en el primer login.
          {isAdmin && <span className="ml-2 text-dassa-celeste-deep font-bold">Sos admin · podés crear dashboards.</span>}
        </div>
        <a href="/metabase/" target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-dassa-celeste-deep text-white text-xs font-bold rounded-lg hover:bg-dassa-celeste">
          <ExternalLink size={12}/> Abrir en pestaña nueva
        </a>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
        <iframe src="/metabase/" className="w-full h-full" title="Metabase BI Operativo" frameBorder="0"/>
      </div>
    </PageContent>
  );
}
