// /objetivos — Tablero de Objetivos Estratégicos (Sistema Integral de Gestión · Nivel 1)
// 10 objetivos unificados, cada uno con N KPIs. Habilitación progresiva: enabled / en preparación,
// con conector y estado de conexión por KPI. Expandible para ver/activar cada indicador.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Target, ChevronDown, ChevronRight, Zap, Snowflake, Wrench, Hand,
  Power, Database, GitBranch, Wallet, CheckCircle2, Circle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard, Badge } from '@/components/ui';

interface Objective {
  id: string; code: string; name: string; description?: string; area?: string;
  responsible_name?: string; responsible_text?: string; enabled: boolean;
  num_indicators: number; num_enabled: number; num_with_data: number;
}
interface Measurement { period: string; value: number }
interface Indicator {
  id: string; indicator_name: string; unit?: string; target_text?: string;
  baseline_value?: string; frequency?: string; enabled: boolean;
  connector_source?: string; connection_status?: string; kpi_order?: number;
  measurements?: Measurement[]; last_measurement?: Measurement | null;
}

const CONN: Record<string, { label: string; variant: 'green'|'amber'|'blue'|'gray'; icon: any }> = {
  vivo:        { label: 'Vivo',        variant: 'green', icon: Zap },
  congelado:   { label: 'Congelado',   variant: 'amber', icon: Snowflake },
  construible: { label: 'Construible', variant: 'blue',  icon: Wrench },
  manual:      { label: 'Manual',      variant: 'gray',  icon: Hand },
};
const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CONN_CLS: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700', gray: 'bg-slate-100 text-slate-600',
};
function ConnBadge({ status }: { status?: string }) {
  const c = CONN[status || 'manual'] || CONN.manual;
  const Ic = c.icon;
  return <span className={`inline-flex items-center gap-0.5 rounded-full font-semibold text-[10px] px-1.5 py-0.5 ${CONN_CLS[c.variant]}`}><Ic size={9} />{c.label}</span>;
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-dassa-celeste-deep' : 'bg-gray-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

function ObjetivoCard({ obj, canEdit }: { obj: Objective; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['objetivo-detalle', obj.id],
    queryFn: () => api.get<{ ok: boolean; indicators: Indicator[] }>(`/objetivos/${obj.id}`),
    enabled: open,
  });
  const toggleObj = useMutation({
    mutationFn: () => api.patch(`/objetivos/${obj.id}`, { enabled: !obj.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objetivos-estrategicos'] }),
  });
  const toggleKpi = useMutation({
    mutationFn: (v: { indId: string; enabled: boolean }) =>
      api.patch(`/objetivos/${obj.id}/indicators/${v.indId}`, { enabled: v.enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['objetivo-detalle', obj.id] }); qc.invalidateQueries({ queryKey: ['objetivos-estrategicos'] }); },
  });

  const indicators = data?.indicators || [];
  return (
    <div className={`rounded-2xl border bg-white transition-shadow ${obj.enabled ? 'border-dassa-celeste/40' : 'border-gray-200'}`}>
      <div className="p-4 flex items-start gap-3">
        <button onClick={() => setOpen(o => !o)} className="mt-0.5 text-gray-400 hover:text-dassa-red shrink-0">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold text-gray-400 font-mono">{obj.code}</span>
            {obj.area && <Badge variant="gray" label={obj.area} />}
            {obj.enabled
              ? <Badge variant="green" label="Habilitado" />
              : <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-0.5 rounded">En preparación</span>}
          </div>
          <h3 className="text-sm font-extrabold text-gray-900 leading-tight">{obj.name}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1"><Target size={11} /> {obj.num_indicators} KPIs</span>
            <span className="inline-flex items-center gap-1 text-dassa-celeste-deep"><Power size={11} /> {obj.num_enabled} activos</span>
            <span className="inline-flex items-center gap-1 text-emerald-600"><Database size={11} /> {obj.num_with_data} con datos</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Toggle on={obj.enabled} onClick={() => toggleObj.mutate()} disabled={toggleObj.isPending} />
            <span className="text-[9px] text-gray-400">{obj.enabled ? 'on' : 'off'}</span>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 rounded-b-2xl">
          {obj.description && <p className="text-xs text-gray-600 mb-3">{obj.description}</p>}
          {isLoading ? <div className="py-4 flex justify-center"><Spinner /></div> : (
            <div className="space-y-1.5">
              {indicators.map(ind => {
                const m = ind.last_measurement;
                return (
                  <div key={ind.id} className={`flex items-center gap-3 rounded-lg border p-2.5 ${ind.enabled ? 'bg-white border-dassa-celeste/30' : 'bg-white border-gray-100'}`}>
                    <div className="w-7 h-7 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                      {ind.enabled ? <CheckCircle2 size={14} className="text-dassa-celeste-deep" /> : <Circle size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-800 truncate">{ind.indicator_name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                        {ind.target_text && <span>meta {ind.target_text}</span>}
                        {ind.unit && <span className="text-gray-400">· {ind.unit}</span>}
                        {canEdit && ind.connector_source && <span className="text-gray-400 truncate">· {ind.connector_source}</span>}
                      </div>
                    </div>
                    {m ? (
                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-gray-900 leading-none">{Number(m.value).toLocaleString('es-AR')}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{MES[parseInt(m.period.slice(5,7),10)-1]} {m.period.slice(2,4)}</div>
                      </div>
                    ) : <span className="text-[10px] text-gray-300 shrink-0">sin dato</span>}
                    {canEdit && <ConnBadge status={ind.connection_status} />}
                    {canEdit && <Toggle on={ind.enabled} onClick={() => toggleKpi.mutate({ indId: ind.id, enabled: !ind.enabled })} disabled={toggleKpi.isPending} />}
                  </div>
                );
              })}
              {!indicators.length && <p className="text-xs text-gray-400 py-2">Sin KPIs cargados.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ObjetivosEstrategicos() {
  const { user } = useAuth();
  const canEdit = ['master_admin', 'director', 'sgi_leader'].includes(user?.role || '');
  const { data, isLoading } = useQuery({
    queryKey: ['objetivos-estrategicos'],
    queryFn: () => api.get<{ ok: boolean; objectives: Objective[] }>('/objetivos?tier=estrategico&year=2026'),
  });

  if (isLoading) return <PageContent><Header title="🎯 Objetivos Estratégicos" icon={<Target size={20} />} /><div className="flex justify-center py-10"><Spinner /></div></PageContent>;

  const objs = data?.objectives || [];
  const totKpis = objs.reduce((s, o) => s + Number(o.num_indicators), 0);
  const totEnabled = objs.reduce((s, o) => s + Number(o.num_enabled), 0);
  const totData = objs.reduce((s, o) => s + Number(o.num_with_data), 0);
  const objEnabled = objs.filter(o => o.enabled).length;

  return (
    <PageContent>
      <Header title="🎯 Objetivos Estratégicos" subtitle="Sistema Integral de Gestión · Nivel 1"
        icon={<Target size={20} />}
        actions={<div className="flex gap-2">
          <Link to="/proyectos" className="text-[11px] font-bold text-dassa-celeste-deep hover:underline inline-flex items-center gap-1"><GitBranch size={13} /> Proyectos</Link>
          <Link to="/inversiones" className="text-[11px] font-bold text-dassa-celeste-deep hover:underline inline-flex items-center gap-1"><Wallet size={13} /> Inversiones</Link>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Objetivos" value={objs.length} sub={`${objEnabled} habilitados`} />
        <KPICard label="KPIs definidos" value={totKpis} sub={`${totEnabled} activos`} />
        <KPICard label="KPIs con datos" value={totData} sub="medición real" />
        <KPICard label="Habilitación" value={`${totKpis ? Math.round(totEnabled / totKpis * 100) : 0}%`} sub="activación progresiva" />
      </div>

      <div className="space-y-2.5">
        {objs.map(o => <ObjetivoCard key={o.id} obj={o} canEdit={canEdit} />)}
      </div>
    </PageContent>
  );
}
