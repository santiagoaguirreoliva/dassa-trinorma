import { useState, useEffect } from 'react';
import { CheckSquare, AlertTriangle, Clock, Filter, Loader2, Brain } from 'lucide-react';
import { api } from '@/lib/api';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  category: string;
  iso_norm: string;
  source_module: string;
  origin_type: string;
  created_at: string;
}

interface Report {
  summary: string;
  riesgo_score: number;
  pendientes_total: number;
  pendientes_vencidos: number;
  ncs_asignadas: number;
  recommendations: string;
  alertas: any[];
  created_at: string;
}

export default function MisPendientes() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'this_week' | 'high'>('all');
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [tasksR, reportR] = await Promise.all([
        api.get('/tasks/mine'),
        api.get('/auditor/my-latest-report').catch(() => ({ data: null })),
      ]);
      setTasks(tasksR.data);
      setReport(reportR.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markDone(id: string) {
    await api.patch(`/tasks/mine/${id}`, { status: 'completada', completed_at: new Date().toISOString() });
    setTasks(t => t.filter(x => x.id !== id));
  }

  async function generateMyReport() {
    setGenerating(true);
    try {
      const userId = (await api.get('/auth/me')).data.id;
      const r = await api.post(`/auditor/run-for-user/${userId}`);
      setReport({ ...r.data.report, ...r.data.context_metrics, created_at: new Date().toISOString() });
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setGenerating(false);
    }
  }

  const filteredTasks = tasks.filter(t => {
    const now = new Date();
    const due = t.due_date ? new Date(t.due_date) : null;
    if (filter === 'overdue') return due && due < now;
    if (filter === 'this_week') {
      const weekFromNow = new Date(now.getTime() + 7 * 86400000);
      return due && due <= weekFromNow;
    }
    if (filter === 'high') return t.priority === 'alta';
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-[11px] font-bold text-dassa-red uppercase tracking-widest">Mis tareas</p>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-dassa-red" />
          Mis pendientes
        </h1>
        <p className="text-gray-600 mt-1">Tus tareas, NCs y compromisos del SGI</p>
      </div>

      {/* Reporte del Auditor IA */}
      <div className="bg-gradient-to-br from-dassa-red/5 to-dassa-celeste/5 border border-dassa-red/20 p-5 mb-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-dassa-red" />
            <h3 className="font-bold text-lg">Tu auditoría individual</h3>
          </div>
          <button onClick={generateMyReport} disabled={generating}
            className="text-xs bg-dassa-red text-white px-3 py-2 hover:bg-dassa-red-deep flex items-center gap-1 font-bold disabled:opacity-50">
            {generating ? <><Loader2 className="w-3 h-3 animate-spin" /> Analizando...</> : 'Generar nuevo'}
          </button>
        </div>
        {report ? (
          <>
            <div className="flex gap-6 mb-3">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Score de riesgo</div>
                <div className={`text-3xl font-bold ${
                  report.riesgo_score >= 80 ? 'text-dassa-celeste-deep' :
                  report.riesgo_score >= 60 ? 'text-amber-600' :
                  'text-dassa-red'
                }`}>{report.riesgo_score}/100</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Pendientes</div>
                <div className="text-3xl font-bold text-gray-900">{report.pendientes_total}</div>
                <div className="text-xs text-dassa-red">{report.pendientes_vencidos} vencidos</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">NCs asignadas</div>
                <div className="text-3xl font-bold text-gray-900">{report.ncs_asignadas}</div>
              </div>
            </div>
            <div className="bg-white p-4 border-l-4 border-dassa-red mb-3">
              <p className="text-sm leading-relaxed">{report.summary}</p>
            </div>
            {report.recommendations && (
              <details className="text-sm">
                <summary className="cursor-pointer font-bold text-dassa-red">Ver recomendaciones</summary>
                <div className="mt-2 bg-white p-4 border whitespace-pre-wrap">{report.recommendations}</div>
              </details>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Generado por Auditor IA TRINORMA · {new Date(report.created_at).toLocaleString('es-AR')}
            </p>
          </>
        ) : (
          <p className="text-gray-600 text-sm">
            Aún no hay análisis de la IA para vos. Hacé click en "Generar nuevo" o esperá la auditoría automática del lunes.
          </p>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-400 mt-2" />
        {[
          { v: 'all', l: `Todas (${tasks.length})` },
          { v: 'overdue', l: 'Vencidas' },
          { v: 'this_week', l: 'Esta semana' },
          { v: 'high', l: 'Alta prioridad' },
        ].map(opt => (
          <button key={opt.v} onClick={() => setFilter(opt.v as any)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              filter === opt.v ? 'bg-dassa-red text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>{opt.l}</button>
        ))}
      </div>

      {/* Tabla de tasks */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-dassa-red" /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-dassa-celeste-tint border border-dassa-celeste p-8 text-center">
          <CheckSquare className="w-12 h-12 text-dassa-celeste-deep mx-auto mb-3" />
          <p className="font-bold">¡Sin pendientes en este filtro!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200">
          {filteredTasks.map(t => {
            const overdue = t.due_date && new Date(t.due_date) < new Date();
            return (
              <div key={t.id} className={`p-4 border-b last:border-b-0 hover:bg-gray-50 ${overdue ? 'border-l-4 border-l-dassa-red' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {overdue && <AlertTriangle className="w-4 h-4 text-dassa-red" />}
                      <h4 className="font-bold">{t.title}</h4>
                      {t.iso_norm && <span className="text-xs px-2 py-0.5 bg-dassa-celeste-tint text-dassa-celeste-deep">{t.iso_norm}</span>}
                      {t.priority === 'alta' && <span className="text-xs px-2 py-0.5 bg-dassa-red-tint text-dassa-red-deep font-bold">ALTA</span>}
                    </div>
                    {t.description && <p className="text-sm text-gray-600 mb-2">{t.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {t.due_date && (
                        <span className={overdue ? 'text-dassa-red font-bold' : ''}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(t.due_date).toLocaleDateString('es-AR')}
                          {overdue && ' (VENCIDA)'}
                        </span>
                      )}
                      {t.category && <span>📌 {t.category}</span>}
                      {t.source_module && t.source_module !== 'general' && <span>🔗 {t.source_module}</span>}
                    </div>
                  </div>
                  <button onClick={() => markDone(t.id)}
                    className="bg-dassa-celeste-deep text-white px-3 py-2 text-xs font-bold hover:bg-dassa-celeste flex items-center gap-1 whitespace-nowrap">
                    <CheckSquare className="w-3 h-3" /> Marcar hecho
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
