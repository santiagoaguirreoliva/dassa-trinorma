import { useState, useEffect } from 'react';
import { Brain, Play, AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2, RefreshCw, Send } from 'lucide-react';
import { api } from '@/lib/api';

interface Run {
  id: string;
  type: string;
  started_at: string;
  finished_at: string;
  users_audited: number;
  reports_generated: number;
  emails_sent: number;
  alerts_generated: number;
  status: string;
  total_cost_usd: string;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
  resolved: boolean;
}

interface Insights {
  ncs_open: number;
  ncs_stale: number;
  trainings_pending: number;
  legal_30d: number;
  docs_old: number;
  tasks_overdue: number;
  top_overloaded: { name: string; count: number }[];
}

export default function Auditor() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [runsR, alertsR, insightsR] = await Promise.all([
        api.get('/auditor/runs'),
        api.get('/auditor/alerts?resolved=false'),
        api.get('/auditor/insights'),
      ]);
      setRuns(runsR.data);
      setAlerts(alertsR.data);
      setInsights(insightsR.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function runNow() {
    if (!confirm('¿Ejecutar auditoría completa ahora? Va a tardar unos minutos y consumir saldo de API.')) return;
    setRunning(true);
    try {
      await api.post('/auditor/run-now');
      alert('Auditoría iniciada. Se ejecuta en background. Recargá en 2-3 minutos para ver resultados.');
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setRunning(false);
    }
  }

  async function resolveAlert(id: string) {
    await api.post(`/auditor/alerts/${id}/resolve`);
    setAlerts(a => a.filter(x => x.id !== id));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[11px] font-bold text-dassa-red uppercase tracking-widest">Sub-agente</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-dassa-red" />
            Auditor IA TRINORMA
          </h1>
          <p className="text-gray-600 mt-1">
            Especialista ISO 9001 / 14001 / 45001 — corre cada lunes 8 AM
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="border border-gray-300 px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Recargar
          </button>
          <button onClick={runNow} disabled={running}
            className="bg-dassa-red text-white px-4 py-2 hover:bg-dassa-red-deep flex items-center gap-2 text-sm font-bold disabled:opacity-50">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Ejecutar ahora
          </button>
          <button onClick={() => setChatOpen(true)}
            className="bg-dassa-celeste-deep text-white px-4 py-2 hover:bg-dassa-celeste flex items-center gap-2 text-sm font-bold">
            <Send className="w-4 h-4" /> Consultar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-dassa-red" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <KPI label="NCs abiertas" value={insights.ncs_open} severity={insights.ncs_open > 10 ? 'critical' : 'info'} />
              <KPI label="NCs estancadas (>30d)" value={insights.ncs_stale} severity={insights.ncs_stale > 0 ? 'warning' : 'info'} />
              <KPI label="Capacitaciones pend." value={insights.trainings_pending} />
              <KPI label="Legal vence 30d" value={insights.legal_30d} severity={insights.legal_30d > 0 ? 'warning' : 'info'} />
              <KPI label="Docs sin revisar" value={insights.docs_old} severity={insights.docs_old > 5 ? 'warning' : 'info'} />
              <KPI label="Tareas vencidas" value={insights.tasks_overdue} severity={insights.tasks_overdue > 20 ? 'critical' : 'info'} />
            </div>
          )}

          {/* Top sobrecargados */}
          {insights && insights.top_overloaded.length > 0 && (
            <div className="bg-white border border-gray-200 p-5 mb-8">
              <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-dassa-red" /> Top usuarios con más pendientes</h3>
              <div className="space-y-2">
                {insights.top_overloaded.map(u => (
                  <div key={u.name} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="text-sm">{u.name}</span>
                    <span className="text-sm font-bold text-dassa-red">{u.count} tareas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas activas */}
          <div className="bg-white border border-gray-200 p-5 mb-8">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-dassa-red" />
              Alertas activas ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-dassa-celeste" /> Sin alertas pendientes. Buen trabajo.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={`p-3 border-l-4 flex justify-between items-start gap-4 ${
                    a.severity === 'critical' ? 'border-dassa-red bg-dassa-red-tint' :
                    a.severity === 'warning' ? 'border-amber-500 bg-amber-50' :
                    'border-dassa-celeste bg-dassa-celeste-tint'
                  }`}>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{a.title}</div>
                      <div className="text-sm text-gray-700">{a.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(a.created_at).toLocaleString('es-AR')}</div>
                    </div>
                    <button onClick={() => resolveAlert(a.id)} className="text-xs text-dassa-red hover:underline">Resolver</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de runs */}
          <div className="bg-white border border-gray-200 p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-dassa-red" /> Últimas auditorías</h3>
            {runs.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin auditorías ejecutadas. Hacé click en "Ejecutar ahora" para correr la primera.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Inicio</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-right py-2">Reportes</th>
                    <th className="text-right py-2">Emails</th>
                    <th className="text-right py-2">Alertas</th>
                    <th className="text-right py-2">Costo (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2">{r.type}</td>
                      <td className="py-2">{new Date(r.started_at).toLocaleString('es-AR')}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 text-xs font-bold uppercase ${
                          r.status === 'success' ? 'bg-dassa-celeste-tint text-dassa-celeste-deep' :
                          r.status === 'running' ? 'bg-amber-100 text-amber-700' :
                          'bg-dassa-red-tint text-dassa-red-deep'
                        }`}>{r.status}</span>
                      </td>
                      <td className="text-right py-2">{r.reports_generated || 0}</td>
                      <td className="text-right py-2">{r.emails_sent || 0}</td>
                      <td className="text-right py-2">{r.alerts_generated || 0}</td>
                      <td className="text-right py-2">${r.total_cost_usd || '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {chatOpen && <AuditorChatDialog onClose={() => setChatOpen(false)} />}
    </div>
  );
}

function KPI({ label, value, severity = 'info' }: { label: string; value: number; severity?: string }) {
  const colors: Record<string, string> = {
    info: 'border-l-dassa-celeste bg-white',
    warning: 'border-l-amber-500 bg-amber-50',
    critical: 'border-l-dassa-red bg-dassa-red-tint',
  };
  return (
    <div className={`border border-gray-200 border-l-4 p-4 ${colors[severity]}`}>
      <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function AuditorChatDialog({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Hola, soy el Auditor IA TRINORMA. ¿En qué te puedo ayudar? Puedo responder consultas sobre normas ISO, procesos del SGI DASSA, casos puntuales, etc.' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!input.trim() || sending) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setSending(true);
    try {
      const r = await api.post('/auditor/chat', { messages: newMessages });
      setMessages([...newMessages, { role: 'assistant', content: r.data.content }]);
    } catch (e: any) {
      setMessages([...newMessages, { role: 'assistant', content: '⚠ Error: ' + (e.response?.data?.error || e.message) }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white w-full md:max-w-2xl md:h-[600px] h-[85vh] flex flex-col">
        <div className="bg-dassa-red text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <div>
              <div className="font-bold">Auditor IA TRINORMA</div>
              <div className="text-xs opacity-80">Anthropic Claude · Especialista ISO + DASSA</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 ${m.role === 'user' ? 'bg-dassa-red text-white' : 'bg-gray-100 text-gray-900'}`}>
                <pre className="whitespace-pre-wrap font-sans text-sm">{m.content}</pre>
              </div>
            </div>
          ))}
          {sending && <div className="flex justify-start"><div className="bg-gray-100 p-3"><Loader2 className="w-4 h-4 animate-spin text-dassa-red" /></div></div>}
        </div>
        <div className="border-t p-3 flex gap-2">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Preguntá al auditor..."
            className="flex-1 border border-gray-300 px-3 py-2 focus:outline-none focus:border-dassa-red"
          />
          <button onClick={send} disabled={sending || !input.trim()}
            className="bg-dassa-red text-white px-4 py-2 hover:bg-dassa-red-deep disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
