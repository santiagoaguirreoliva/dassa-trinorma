// /rondas — Dashboard del módulo Ronda de Inspecciones.
// Optimizado mobile vertical: rondines míos, pendientes, vencidos y KPIs.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClipboardCheck, AlertTriangle, CheckCircle2, Calendar, Truck,
  ChevronRight, Loader2, Settings, Bot, BarChart3,
} from 'lucide-react';

interface Assignee { user_id: string; name: string; role: string; signed: boolean; }
interface Inspection {
  id: string;
  code: string | null;
  family: 'rondin' | 'maquinaria';
  status: 'pendiente' | 'en_curso' | 'en_cofirma' | 'completada' | 'vencida' | 'anulada';
  template_code: string;
  template_name: string;
  requires_cosign: boolean;
  scheduled_date: string;
  due_date: string;
  period_label: string | null;
  machine_code: string | null;
  machine_name: string | null;
  operator_name: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  cosigned_by: string | null;
  assignees: Assignee[];
  findings_count: number;
}
interface Stats {
  total: number; pendientes: number; en_proceso: number; completadas: number;
  vencidas: number; rondines: number; maquinaria: number; hallazgos: number;
}

const STATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  en_curso: 'bg-blue-100 text-blue-800 border-blue-200',
  en_cofirma: 'bg-violet-100 text-violet-800 border-violet-200',
  completada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  vencida: 'bg-red-100 text-red-800 border-red-200',
  anulada: 'bg-gray-100 text-gray-500 border-gray-200',
};
const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  en_cofirma: 'Esperando co-firma',
  completada: 'Completada',
  vencida: 'Vencida',
  anulada: 'Anulada',
};

function fmt(d: string) {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return d;
}

export default function Rondas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'mine' | 'todos' | 'vencidos'>('mine');
  const [list, setList] = useState<Inspection[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const isAdmin = user?.role === 'master_admin' || user?.role === 'director' || user?.role === 'sgi_leader';

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const params: string[] = [];
      if (tab === 'mine') params.push('mine=true');
      if (tab === 'vencidos') params.push('overdue=true');
      const [items, s] = await Promise.all([
        api.get<Inspection[]>(`/inspections${params.length ? '?' + params.join('&') : ''}`),
        api.get<Stats>('/inspections/stats'),
      ]);
      setList(items);
      setStats(s);
    } catch (e: any) {
      setErr(e.message || 'Error al cargar rondines');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const cumplimiento = stats && stats.total
    ? Math.round((stats.completadas / stats.total) * 100)
    : null;

  return (
    <main className="min-h-[100dvh] bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-gray-900 leading-tight">Rondas de Inspección</h1>
              <p className="text-[11px] text-gray-500">Trinorma · supervisión y maquinaria</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/rondas/maquinaria')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-1"
              title="Histórico maquinaria"
            >
              <Truck size={13} /> <span className="hidden sm:inline">Maquinaria</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/rondas/config')}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                title="Configuración"
              >
                <Settings size={13} /> <span className="hidden sm:inline">Config</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2.5">
          <Kpi icon={<Calendar size={14} className="text-amber-600" />} label="Pendientes"
               value={stats?.pendientes ?? '—'} color="amber" />
          <Kpi icon={<AlertTriangle size={14} className="text-red-600" />} label="Vencidas"
               value={stats?.vencidas ?? '—'} color="red" />
          <Kpi icon={<CheckCircle2 size={14} className="text-emerald-600" />} label="Cumplimiento"
               value={cumplimiento != null ? `${cumplimiento}%` : '—'} color="emerald" />
        </div>

        {stats && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hallazgos del período</div>
              <div className="text-xl font-extrabold text-gray-900 mt-0.5">{stats.hallazgos}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total instancias</div>
              <div className="text-xl font-extrabold text-gray-900 mt-0.5">{stats.total}</div>
            </div>
            <Bot size={28} className="text-blue-400" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1">
          {[
            { k: 'mine', label: 'Mis rondines' },
            { k: 'todos', label: 'Todos' },
            { k: 'vencidos', label: 'Vencidos' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors
                ${tab === t.k ? 'bg-dassa-celeste/20 text-dassa-ink' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : err ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{err}</div>
        ) : list.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600">
              {tab === 'mine' ? 'No tenés rondines asignados.' : 'No hay rondines para mostrar.'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Las inspecciones se generan automáticamente según su frecuencia.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(it => (
              <button
                key={it.id}
                onClick={() => navigate(`/rondas/${it.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 hover:border-dassa-celeste hover:shadow-sm transition-all p-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${it.family === 'maquinaria' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                    {it.family === 'maquinaria' ? <Truck size={16} /> : <ClipboardCheck size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400">{it.template_code}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[it.status] || ''}`}>
                        {STATUS_LABEL[it.status] || it.status}
                      </span>
                      {it.findings_count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                          {it.findings_count} NC
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate mt-0.5">
                      {it.template_name}
                      {it.machine_code && <span className="text-gray-500 font-normal"> · {it.machine_code}</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {it.period_label || ''}
                      {it.due_date && <> · Vence {fmt(it.due_date)}</>}
                    </div>
                    {it.assignees?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {it.assignees.map(a => (
                          <span key={a.user_id}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded
                              ${a.signed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                            title={`${a.role}${a.signed ? ' · firmado' : ''}`}
                          >
                            {a.signed && '✓ '}{a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => navigate('/rondas/analytics')}
              className="w-full py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-center gap-2 hover:border-blue-300"
            >
              <BarChart3 size={13} /> Ver indicadores
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string; }) {
  const bg = { amber: 'bg-amber-50', red: 'bg-red-50', emerald: 'bg-emerald-50' }[color] || 'bg-gray-50';
  return (
    <div className={`${bg} rounded-xl p-3 border border-white`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-extrabold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
