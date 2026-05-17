import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { api } from '@/lib/api';

const ORIGIN_LABEL: Record<string, string> = {
  desvio_operativo: 'Desvío op.', auditoria_interna: 'Aud. interna',
  auditoria_externa: 'Aud. externa', reclamo_cliente: 'Reclamo',
  accidente: 'Accidente', inspeccion: 'Inspección', comite: 'Comité',
};
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function FindingsAnalytics() {
  const { data } = useQuery<any>({
    queryKey: ['findings-analytics'],
    queryFn: () => api.get('/findings/analytics'),
  });
  if (!data) return null;

  const trend = (data.trend ?? []).map((t: any) => ({
    mes: MES_CORTO[parseInt(t.mes.slice(5, 7), 10) - 1] ?? t.mes,
    creadas: t.creadas, cerradas: t.cerradas,
  }));

  const total = (data.pareto ?? []).reduce((s: number, p: any) => s + p.n, 0) || 1;
  let acc = 0;
  const pareto = (data.pareto ?? []).map((p: any) => {
    acc += p.n;
    return { origen: ORIGIN_LABEL[p.origin] ?? p.origin, n: p.n, acum: Math.round((acc / total) * 100) };
  });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tendencia mensual · últimos 12 meses</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="creadas" name="Creadas" fill="#C8202C" radius={[3, 3, 0, 0]} />
            <Line dataKey="cerradas" name="Cerradas" stroke="#1a8a52" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pareto de NC por origen</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={pareto}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="origen" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={48} />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="n" name="NC" fill="#0F1A4A" radius={[3, 3, 0, 0]} />
            <Line yAxisId="r" dataKey="acum" name="% acumulado" stroke="#C8202C" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
