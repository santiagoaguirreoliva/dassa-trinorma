import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Inbox, AlertCircle, Clock, Lock, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

const LABELS: Record<string,string> = {
  foda:'FODA', job_profiles:'Fichas de Puesto', procedures:'Procedimientos',
  risks:'AMFE Riesgos', legal_requirements:'Requisitos Legales', environmental_aspects:'Aspectos Ambientales',
  objectives:'Objetivos', change_requests:'Gestión de Cambios', audit_internal:'Auditoría Interna',
  management_review:'Revisión por la Dirección',
};

export default function NixaInbox() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['nixa-inbox'],
    queryFn: () => api.get('/nixa-inbox'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;

  const items = data.items || [];
  const enRevision = items.filter((i:any)=>i.status==='en_revision');
  const programadas = items.filter((i:any)=>i.status==='programada');
  const bloqueadas = items.filter((i:any)=>i.status==='bloqueada');

  return (
    <PageContent>
      <Header title="🔍 Inbox · Validaciones pendientes" subtitle="Para NIXA y Dirección · revisiones que esperan validación" icon={<Inbox size={20}/>}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Para validar AHORA" value={data.summary?.para_validar||0} sub="status=en_revision" alert/>
        <KPICard label="Programadas" value={data.summary?.programadas||0} sub="esperan inicio"/>
        <KPICard label="Bloqueadas" value={data.summary?.bloqueadas||0} sub="esperan deps"/>
        <KPICard label="Validadas (histórico)" value={data.summary?.validadas_total||0}/>
      </div>
      {enRevision.length>0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-1"><AlertCircle size={12}/> Para validar AHORA</h3>
          {enRevision.map((i:any)=>(
            <Link key={i.id} to="/ciclo/2026" className="block bg-red-50 border-l-4 border-red-500 p-3 rounded mb-2 hover:bg-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-red-900">{LABELS[i.entity_type] ?? i.entity_type}</div>
                  <div className="text-[11px] text-red-700">Ciclo {i.cycle_year} · {i.bloqueo}</div>
                </div>
                <ArrowRight size={14} className="text-red-500"/>
              </div>
            </Link>
          ))}
        </div>
      )}
      {programadas.length>0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-amber-600 uppercase mb-2 flex items-center gap-1"><Clock size={12}/> Programadas</h3>
          {programadas.map((i:any)=>(
            <div key={i.id} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-2">
              <div className="font-bold text-sm text-amber-900">{LABELS[i.entity_type] ?? i.entity_type}</div>
              <div className="text-[11px] text-amber-700">Ciclo {i.cycle_year} · lista para iniciar</div>
            </div>
          ))}
        </div>
      )}
      {bloqueadas.length>0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Lock size={12}/> Bloqueadas (esperan dependencias)</h3>
          {bloqueadas.map((i:any)=>(
            <div key={i.id} className="bg-gray-50 border-l-4 border-gray-300 p-3 rounded mb-2 opacity-75">
              <div className="font-bold text-sm text-gray-700">{LABELS[i.entity_type] ?? i.entity_type}</div>
              <div className="text-[11px] text-gray-500">Ciclo {i.cycle_year}</div>
            </div>
          ))}
        </div>
      )}
      {items.length===0 && (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle2Icon/>
          <p className="mt-3 text-sm">No hay validaciones pendientes 🎉</p>
        </div>
      )}
    </PageContent>
  );
}
function CheckCircle2Icon() { return <div className="inline-block">✅</div>; }
