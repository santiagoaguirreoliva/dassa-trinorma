// /rondas/maquinaria — Histórico de checklists diarios por máquina.
// Grilla máquina × día con semáforo de estado y drill-down al detalle.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Truck, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Machine { id: string; code: string; name: string; active: boolean; }
interface Inspection {
  id: string;
  machine_id: string | null;
  scheduled_date: string;
  status: string;
  findings_count: number;
}

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export default function RondasMaquinaria() {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [items, setItems] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [endDate, setEndDate] = useState(new Date());

  const days = useMemo(() => {
    const arr: string[] = [];
    for (let i = 13; i >= 0; i--) arr.push(ymd(addDays(endDate, -i)));
    return arr;
  }, [endDate]);

  async function load() {
    setLoading(true); setErr('');
    try {
      const desde = days[0];
      const hasta = days[days.length - 1];
      const [ms, ins] = await Promise.all([
        api.get<Machine[]>('/inspections/machines?active=true'),
        api.get<Inspection[]>(`/inspections?family=maquinaria&desde=${desde}&hasta=${hasta}`),
      ]);
      setMachines(ms);
      setItems(ins);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endDate]);

  // index[machine][day] = inspección
  const index: Record<string, Record<string, Inspection>> = {};
  for (const it of items) {
    if (!it.machine_id) continue;
    (index[it.machine_id] ||= {})[it.scheduled_date] = it;
  }

  function cell(insp?: Inspection) {
    if (!insp) return { bg: 'bg-gray-100', label: '·' };
    if (insp.findings_count > 0) return { bg: 'bg-red-400', label: '!' };
    if (insp.status === 'completada') return { bg: 'bg-emerald-400', label: '✓' };
    if (['pendiente', 'en_curso', 'en_cofirma'].includes(insp.status))
      return { bg: 'bg-amber-300', label: '~' };
    if (insp.status === 'vencida') return { bg: 'bg-red-300', label: '✗' };
    return { bg: 'bg-gray-200', label: '?' };
  }

  return (
    <main className="min-h-[100dvh] bg-slate-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate('/rondas')} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-gray-900">Histórico de Maquinaria</div>
            <div className="text-[11px] text-gray-500">F-TRI-19 · 14 días</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setEndDate(addDays(endDate, -7))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={15} /></button>
            <button onClick={() => setEndDate(addDays(endDate, 7))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 py-4">
        {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{err}</div>}
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10">Máquina</th>
                  {days.map(d => (
                    <th key={d} className="px-1.5 py-2 font-bold text-gray-500 whitespace-nowrap text-center" style={{ minWidth: 36 }}>
                      {d.slice(8)}/{d.slice(5, 7)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map(m => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Truck size={13} className="text-orange-500" />
                        <div>
                          <div className="font-bold text-gray-900">{m.code}</div>
                          <div className="text-[10px] text-gray-500 truncate" style={{ maxWidth: 110 }}>{m.name}</div>
                        </div>
                      </div>
                    </td>
                    {days.map(d => {
                      const i = index[m.id]?.[d];
                      const c = cell(i);
                      return (
                        <td key={d} className="px-1 py-1.5 text-center">
                          <button
                            disabled={!i}
                            onClick={() => i && navigate(`/rondas/${i.id}`)}
                            className={`w-7 h-7 rounded-md text-white text-[10px] font-bold flex items-center justify-center mx-auto
                              ${c.bg} ${i ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default opacity-60'}`}
                            title={i ? `${i.status}${i.findings_count ? ` · ${i.findings_count} NC` : ''}` : 'sin checklist'}
                          >
                            {c.label}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!machines.length && (
                  <tr><td colSpan={days.length + 1} className="text-center text-gray-500 py-6">No hay máquinas activas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" /> Completada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> Pendiente / en curso</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Con hallazgo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Sin checklist</span>
        </div>
      </div>
    </main>
  );
}
