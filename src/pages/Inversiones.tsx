// /inversiones — Plan de Inversiones (Sistema Integral de Gestión · Nivel 3)
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, Target, GitBranch } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard, Badge } from '@/components/ui';

interface Investment {
  id: string; project: string; area?: string; priority?: string;
  amount_usd?: number | null; amount_label?: string; status?: string;
  planned_date?: string; real_date?: string; roi_expected?: string; notes?: string;
}

const STATUS_VARIANT: Record<string, 'green'|'amber'|'blue'|'gray'> = {
  'Finalizado': 'green', 'En ejecución': 'blue', 'Desarrollo': 'blue',
  'En análisis': 'amber', 'Planificado': 'gray', 'Pendiente': 'gray',
};
const PRIO_VARIANT: Record<string, 'red'|'amber'|'gray'> = { 'Alta': 'red', 'Media': 'amber', 'Baja': 'gray' };
const usd = (n?: number | null) => n != null ? `US$ ${Number(n).toLocaleString('es-AR')}` : null;

export default function Inversiones() {
  const { data, isLoading } = useQuery({
    queryKey: ['inversiones'],
    queryFn: () => api.get<{ ok: boolean; investments: Investment[]; total_usd: number }>('/inversiones'),
  });
  if (isLoading) return <PageContent><Header title="💰 Plan de Inversiones" icon={<Wallet size={20} />} /><div className="flex justify-center py-10"><Spinner /></div></PageContent>;

  const inv = data?.investments || [];
  const total = data?.total_usd || 0;
  const enEjec = inv.filter(i => i.status === 'En ejecución').length;

  return (
    <PageContent>
      <Header title="💰 Plan de Inversiones" subtitle="Sistema Integral de Gestión · Nivel 3"
        icon={<Wallet size={20} />}
        actions={<div className="flex gap-2">
          <Link to="/objetivos" className="text-[11px] font-bold text-dassa-celeste-deep hover:underline inline-flex items-center gap-1"><Target size={13} /> Objetivos</Link>
          <Link to="/proyectos" className="text-[11px] font-bold text-dassa-celeste-deep hover:underline inline-flex items-center gap-1"><GitBranch size={13} /> Proyectos</Link>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Inversión total" value={usd(total) || '—'} sub="capex declarado" />
        <KPICard label="Proyectos" value={inv.length} />
        <KPICard label="En ejecución" value={enEjec} />
        <KPICard label="Con monto" value={inv.filter(i => i.amount_usd != null).length} sub={`${inv.filter(i => i.amount_usd == null).length} internos`} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Proyecto</th>
              <th className="px-3 py-2 text-left">Área</th>
              <th className="px-3 py-2 text-left">Prioridad</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">ROI esperado</th>
            </tr>
          </thead>
          <tbody>
            {inv.map(i => (
              <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-900">{i.project}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{i.area || '—'}</td>
                <td className="px-3 py-2">{i.priority ? <Badge variant={PRIO_VARIANT[i.priority] || 'gray'} label={i.priority} /> : '—'}</td>
                <td className="px-3 py-2 text-right font-bold text-gray-900">{usd(i.amount_usd) || <span className="text-gray-400 font-normal">{i.amount_label || '—'}</span>}</td>
                <td className="px-3 py-2">{i.status ? <Badge variant={STATUS_VARIANT[i.status] || 'gray'} label={i.status} /> : '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{i.roi_expected || '—'}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-3 py-2" colSpan={3}>TOTAL</td>
              <td className="px-3 py-2 text-right text-dassa-red">{usd(total)}</td>
              <td className="px-3 py-2" colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageContent>
  );
}
