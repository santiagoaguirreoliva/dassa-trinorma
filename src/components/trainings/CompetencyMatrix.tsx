import { useQuery } from '@tanstack/react-query';
import { Loader2, Target } from 'lucide-react';
import { api } from '@/lib/api';

interface Req { label: string; covered: boolean; }
interface Row {
  id: string; name: string; role: string;
  required: Req[]; coverage: number | null;
}

export default function CompetencyMatrix() {
  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ['competency-matrix'],
    queryFn: () => api.get('/trainings/competency-matrix'),
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-9 h-9 animate-spin text-dassa-red mx-auto" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
          <Target size={13} /> Competencias requeridas por puesto (ISO 9001 §7.2) cruzadas con las capacitaciones a las que cada persona asistió.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Persona</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Puesto</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Cobertura</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Capacitaciones requeridas</th>
            </tr>
          </thead>
          <tbody>
            {data.map(e => (
              <tr key={e.id} className="border-b border-gray-100 align-top">
                <td className="px-4 py-3 font-semibold text-gray-800">{e.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{e.role || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {e.coverage == null ? (
                    <span className="text-gray-300 text-xs">—</span>
                  ) : (
                    <span className={`font-extrabold ${e.coverage >= 80 ? 'text-emerald-600' : e.coverage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {e.coverage}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {e.required.length === 0 && <span className="text-xs text-gray-300">Sin capacitaciones definidas</span>}
                    {e.required.map((r, i) => (
                      <span key={i}
                        title={r.covered ? 'Cubierta' : 'Pendiente'}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border
                          ${r.covered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {r.covered ? '✓ ' : '○ '}{r.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />Sin puestos con empleados asignados
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
