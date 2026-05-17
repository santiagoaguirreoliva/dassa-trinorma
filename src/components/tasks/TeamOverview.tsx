import { useQuery } from '@tanstack/react-query';
import { Loader2, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface TeamRow {
  id: string;
  full_name: string;
  role: string;
  department: string | null;
  pending_count: number;
  overdue_count: number;
  high_priority_count: number;
}

export default function TeamOverview() {
  const { data: team = [], isLoading } = useQuery<TeamRow[]>({
    queryKey: ['team-overview'],
    queryFn: () => api.get('/tasks/team-overview'),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-9 h-9 animate-spin text-dassa-red mx-auto" /></div>;
  }

  const totals = team.reduce(
    (a, u) => ({
      pending: a.pending + u.pending_count,
      overdue: a.overdue + u.overdue_count,
      high: a.high + u.high_priority_count,
    }),
    { pending: 0, overdue: 0, high: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-100 text-amber-900 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Pendientes del equipo</div>
          <div className="text-3xl font-black mt-1">{totals.pending}</div>
        </div>
        <div className="bg-red-100 text-red-900 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Vencidas</div>
          <div className="text-3xl font-black mt-1">{totals.overdue}</div>
        </div>
        <div className="bg-violet-100 text-violet-900 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Prioridad alta / urgente</div>
          <div className="text-3xl font-black mt-1">{totals.high}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Persona</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Sector</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Pendientes</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Vencidas</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Alta / urg.</th>
            </tr>
          </thead>
          <tbody>
            {team.map(u => (
              <tr key={u.id} className={`border-b border-gray-100 ${u.overdue_count > 0 ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-800">{u.full_name}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{u.role?.replace(/_/g, ' ')}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{u.department || '—'}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-700">{u.pending_count}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold ${u.overdue_count > 0 ? 'text-red-600' : 'text-gray-300'}`}>{u.overdue_count}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold ${u.high_priority_count > 0 ? 'text-violet-600' : 'text-gray-300'}`}>{u.high_priority_count}</span>
                </td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />Sin datos del equipo
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
