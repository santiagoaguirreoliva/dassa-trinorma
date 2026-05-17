import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function TaskMetrics() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['tasks-analytics'],
    queryFn: () => api.get('/tasks/analytics'),
  });

  if (isLoading || !data) {
    return <div className="text-center py-12"><Loader2 className="w-9 h-9 animate-spin text-dassa-red mx-auto" /></div>;
  }

  const trend = (data.trend ?? []).map((t: any) => ({
    semana: t.semana.slice(5),  // MM-DD
    creadas: t.creadas, completadas: t.completadas,
  }));
  const cumpl = data.cumplimiento || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Cumplimiento de plazos"
             value={cumpl.pct_a_tiempo != null ? `${cumpl.pct_a_tiempo}%` : '—'}
             tone={cumpl.pct_a_tiempo == null ? 'gray' : cumpl.pct_a_tiempo >= 80 ? 'emerald' : 'red'} />
        <Kpi label="Completadas a tiempo" value={cumpl.a_tiempo ?? 0} tone="emerald" />
        <Kpi label="Completadas tarde" value={cumpl.tarde ?? 0} tone={cumpl.tarde > 0 ? 'red' : 'gray'} />
        <Kpi label="Tiempo prom. de cierre"
             value={data.dias_prom != null ? `${data.dias_prom} d` : '—'} tone="blue" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Creadas vs completadas · últimas 8 semanas</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="creadas" name="Creadas" fill="#0F1A4A" radius={[3, 3, 0, 0]} />
            <Line dataKey="completadas" name="Completadas" stroke="#1a8a52" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const tones: Record<string, string> = {
    red: 'text-red-600', emerald: 'text-emerald-600', blue: 'text-blue-700', gray: 'text-gray-500',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold mt-0.5 ${tones[tone] || 'text-gray-700'}`}>{value}</p>
    </div>
  );
}
