import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function CalendarioNixa() {
  const [year, setYear] = useState(2026);
  const { data, isLoading } = useQuery<any>({
    queryKey: ['calendar-nixa', year],
    queryFn: () => api.get(`/calendar/nixa/${year}`),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;
  const events = data.events || [];

  // Agrupar por mes
  const byMonth: any = {};
  events.forEach((e:any) => {
    if (!e.date) return;
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  });

  const validadas = events.filter((e:any)=>e.status==='validada').length;
  const pendientes = events.filter((e:any)=>e.status!=='validada' && e.type==='review').length;

  return (
    <PageContent>
      <Header title="📅 Calendario NIXA" subtitle={`Validaciones anuales · Año ${year}`} icon={<CalendarDays size={20}/>}/>
      <div className="flex gap-2 mb-4">
        {[2025,2026,2027].map(y=>(
          <button key={y} onClick={()=>setYear(y)} className={`px-3 py-1 text-xs font-bold rounded ${year===y?'bg-dassa-red text-white':'bg-gray-100 text-gray-600'}`}>{y}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total eventos" value={events.length}/>
        <KPICard label="Validados" value={validadas}/>
        <KPICard label="Pendientes" value={pendientes} alert={pendientes>0}/>
        <KPICard label="Legales" value={events.filter((e:any)=>e.type==='legal').length}/>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {MESES.map((mes, i) => {
          const monthEvents = byMonth[`${year}-${i}`] || [];
          return (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
              <h4 className="text-xs font-bold text-gray-700 mb-2">{mes} {year}</h4>
              {monthEvents.length===0 ? (
                <p className="text-[10px] text-gray-400">Sin eventos</p>
              ) : (
                <div className="space-y-1">
                  {monthEvents.slice(0,4).map((e:any)=>(
                    <div key={e.id} className="text-[10px] flex items-start gap-1.5 p-1 rounded" style={{ borderLeft: `3px solid ${e.color}` }}>
                      {e.status==='validada' && <CheckCircle2 size={10} className="text-emerald-500 mt-0.5"/>}
                      {e.status==='bloqueada' && <Clock size={10} className="text-gray-400 mt-0.5"/>}
                      {!e.status && <AlertCircle size={10} className="text-red-500 mt-0.5"/>}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-700 line-clamp-1">{e.title}</div>
                        <div className="text-gray-400">{new Date(e.date).getDate()}/{i+1}</div>
                      </div>
                    </div>
                  ))}
                  {monthEvents.length>4 && <div className="text-[9px] text-gray-400">+{monthEvents.length-4} más</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageContent>
  );
}
