// =============================================================================
// /committee/:id · Acta Viva del Comité Mixto
// Toma de notas en vivo: puntos discretos con autosave + pendientes anteriores
// con cambio de status + alta de tareas con responsable y vencimiento.
// =============================================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  ArrowLeft, Plus, Trash2, Check, Loader2, CheckCircle2, Cloud,
  ClipboardList, ListChecks, Megaphone, AlertTriangle, GraduationCap,
  LineChart, Search, FileText, CalendarDays, UserPlus, ChevronDown, ChevronRight,
  Mail, Send,
} from 'lucide-react';

interface User { id: string; full_name: string; role: string; }
interface Meeting {
  id: string; meeting_date: string; status: string; location?: string;
  meeting_number?: number; attendees?: string[]; signatures?: any[];
  summary_sent_at?: string | null;
}
interface AgendaItem { id: string; tipo: string; texto: string; resuelto: boolean; orden: number; }
interface Assignee { id: string; name: string; role?: string; }
interface Task {
  id: string; task_number?: string; title: string; status: string;
  priority?: string; due_date?: string | null; committee_id?: string | null;
  assignees: Assignee[];
}
interface CtxFinding { code: string; title: string; status: string; finding_type?: string; due_date?: string | null; area?: string; }
interface CtxTraining { title: string; status: string; scheduled_date?: string | null; category?: string; is_mandatory?: boolean; }
interface CtxObjective { code: string; name: string; area: string; target_value?: string; unit?: string; ind_target?: number | null; last_measurement?: { period: string; value: number } | null; }
interface Context { findings: CtxFinding[]; trainings: CtxTraining[]; trainings_overdue: number; objectives: CtxObjective[]; }

const TIPOS: Record<string, { label: string; cls: string; icon: any }> = {
  pendiente:    { label: 'Pendiente anterior', cls: 'bg-amber-100 text-amber-800 border-amber-300',     icon: ListChecks },
  nuevo:        { label: 'Tema nuevo',          cls: 'bg-blue-100 text-blue-800 border-blue-300',        icon: Megaphone },
  nc:           { label: 'NC / Desvío',         cls: 'bg-red-100 text-red-800 border-red-300',           icon: AlertTriangle },
  capacitacion: { label: 'Capacitación',        cls: 'bg-indigo-100 text-indigo-800 border-indigo-300',  icon: GraduationCap },
  medicion:     { label: 'Medición / Objetivo', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',icon: LineChart },
  auditoria:    { label: 'Auditoría',           cls: 'bg-violet-100 text-violet-800 border-violet-300',  icon: Search },
  otro:         { label: 'Otro',                cls: 'bg-gray-100 text-gray-700 border-gray-300',        icon: FileText },
};
const STATUS_OPTS = ['pendiente', 'en_curso', 'completada', 'cancelada'];
const STATUS_CLS: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-300',
  en_curso: 'bg-blue-50 text-blue-700 border-blue-300',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-300 line-through',
};

export default function CommitteeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [prev, setPrev] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [ctxOpen, setCtxOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const flagSaved = useCallback(() => {
    setSave('saved');
    setTimeout(() => setSave(s => (s === 'saved' ? 'idle' : s)), 1500);
  }, []);

  const reload = useCallback(async () => {
    if (!id) return;
    const [full, ag, pp, us, cx] = await Promise.all([
      api.get<{ meeting: Meeting; tasks: Task[] }>(`/committee/${id}/full`).catch(() => null),
      api.get<AgendaItem[]>(`/committee/${id}/agenda`).catch(() => []),
      api.get<Task[]>(`/committee/${id}/pending-from-previous`).catch(() => []),
      api.get<User[]>('/users').catch(() => []),
      api.get<Context>(`/committee/${id}/context`).catch(() => null),
    ]);
    if (full) { setMeeting(full.meeting); setTasks(full.tasks || []); }
    setItems(ag || []);
    // "anteriores" = tareas vivas que NO nacieron en esta misma reunión
    setPrev((pp || []).filter(t => t.committee_id !== id));
    setUsers(us || []);
    setCtx(cx);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // ---- Acta: puntos ----
  async function addItem(tipo: string, texto = '') {
    const it = await api.post<AgendaItem>(`/committee/${id}/agenda`, { tipo, texto });
    setItems(prevItems => [...prevItems, it]);
    flagSaved();
  }
  function editItemLocal(itemId: string, patch: Partial<AgendaItem>) {
    setItems(prevItems => prevItems.map(it => (it.id === itemId ? { ...it, ...patch } : it)));
  }
  function saveItemDebounced(itemId: string, patch: Partial<AgendaItem>) {
    editItemLocal(itemId, patch);
    setSave('saving');
    clearTimeout(timers.current[itemId]);
    timers.current[itemId] = setTimeout(async () => {
      await api.patch(`/committee/${id}/agenda/${itemId}`, patch).catch(() => {});
      flagSaved();
    }, 700);
  }
  async function toggleResuelto(it: AgendaItem) {
    editItemLocal(it.id, { resuelto: !it.resuelto });
    setSave('saving');
    await api.patch(`/committee/${id}/agenda/${it.id}`, { resuelto: !it.resuelto }).catch(() => {});
    flagSaved();
  }
  async function delItem(itemId: string) {
    setItems(prevItems => prevItems.filter(it => it.id !== itemId));
    await api.delete(`/committee/${id}/agenda/${itemId}`).catch(() => {});
  }

  // ---- Pendientes anteriores: cambiar status ----
  async function setPrevStatus(t: Task, status: string) {
    setPrev(p => p.map(x => (x.id === t.id ? { ...x, status } : x)));
    setSave('saving');
    await api.patch(`/committee/${id}/live-task/${t.id}`, { status }).catch(() => {});
    flagSaved();
  }

  // ---- Nueva tarea ----
  const [ntTitle, setNtTitle] = useState('');
  const [ntResp, setNtResp] = useState('');
  const [ntCollab, setNtCollab] = useState('');
  const [ntDue, setNtDue] = useState('');
  const [ntPrio, setNtPrio] = useState('media');
  const [creating, setCreating] = useState(false);
  async function createTask() {
    if (!ntTitle.trim() || !ntResp) return;
    setCreating(true);
    const assignees = [ntResp, ...(ntCollab && ntCollab !== ntResp ? [ntCollab] : [])];
    try {
      await api.post(`/committee/${id}/live-task`, {
        title: ntTitle.trim(), assignees, due_date: ntDue || null, priority: ntPrio,
      });
      setNtTitle(''); setNtResp(''); setNtCollab(''); setNtDue(''); setNtPrio('media');
      await reload();
      flagSaved();
    } finally { setCreating(false); }
  }

  const [sending, setSending] = useState<'' | 'test' | 'close'>('');
  async function sendSummary(test: boolean) {
    setSending('test');
    try {
      const r = await api.post<{ sent_to: number }>(`/committee/${id}/send-summary`, { test });
      alert(`Previsualización enviada a tu correo (${r.sent_to}).`);
    } catch (e: any) {
      alert('Error al enviar: ' + (e?.message || 'desconocido'));
    } finally { setSending(''); }
  }
  async function closeAndSign() {
    if (!confirm('TRINY firmará y cerrará el acta, y enviará el resumen por mail a TODOS los usuarios de Trinorma. ¿Confirmás?')) return;
    setSending('close');
    try {
      const r = await api.post<{ sent_to: number }>(`/committee/${id}/close-and-sign`, {});
      alert(`Acta cerrada y firmada por TRINY. Resumen enviado a ${r.sent_to} usuarios de Trinorma.`);
      await reload();
    } catch (e: any) {
      alert('Error al cerrar: ' + (e?.message || 'desconocido'));
    } finally { setSending(''); }
  }

  if (loading) {
    return <div className="flex-1 grid place-items-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!meeting) {
    return <div className="flex-1 p-8 text-center text-gray-500">Reunión no encontrada.</div>;
  }

  const fdate = new Date(meeting.meeting_date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/committee')} className="text-gray-500 hover:text-dassa-red flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Comité
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 capitalize truncate">
              Reunión {meeting.meeting_number ? `#${meeting.meeting_number}` : ''} · {fdate}
            </h1>
            <p className="text-xs text-gray-500">{meeting.location} · {(meeting.attendees || []).length} asistentes</p>
          </div>
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${meeting.status === 'cerrada' ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>{meeting.status}</span>
          <span className="text-xs flex items-center gap-1 text-gray-400 w-28 justify-end">
            {save === 'saving' ? (<><Cloud className="w-4 h-4 animate-pulse text-blue-500" /> Guardando…</>)
              : save === 'saved' ? (<><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Guardado</>)
              : (<><Cloud className="w-4 h-4" /> Al día</>)}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-20">
        {/* PANEL A — Pendientes del comité anterior */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">Pendientes del comité anterior</h2>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{prev.length}</span>
          </div>
          {prev.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No hay tareas vivas de reuniones anteriores.</p>
          ) : (
            <div className="space-y-2">
              {prev.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{t.task_number && <span className="text-gray-400 font-mono text-xs mr-1">{t.task_number}</span>}{t.title}</div>
                    <div className="text-xs text-gray-500">{t.assignees?.map(a => a.name).join(', ') || 'sin responsable'}{t.due_date ? ` · vence ${new Date(t.due_date).toLocaleDateString('es-AR')}` : ''}</div>
                  </div>
                  <select value={t.status} onChange={e => setPrevStatus(t, e.target.value)}
                    className={`text-xs font-bold border rounded-lg px-2 py-1.5 ${STATUS_CLS[t.status] || ''}`}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PANEL D — Contexto del mes a revisar (NC / capacitaciones / objetivos) */}
        {ctx && (
          <section className="bg-white border border-gray-200 rounded-xl">
            <button onClick={() => setCtxOpen(o => !o)} className="w-full flex items-center gap-2 p-3 text-left">
              <Search className="w-5 h-5 text-violet-600" />
              <h2 className="text-base font-bold text-gray-900">Contexto del mes — revisar</h2>
              <span className="text-xs text-gray-500">
                {ctx.findings.length} NC · {ctx.trainings.length} capac. · {ctx.objectives.length} objetivos
              </span>
              <span className="ml-auto text-gray-400">{ctxOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</span>
            </button>
            {ctxOpen && (
              <div className="px-3 pb-3 space-y-4">
                {/* NC / desvíos abiertos */}
                <div>
                  <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> NC / Desvíos abiertos ({ctx.findings.length})</h3>
                  {ctx.findings.length === 0 ? <p className="text-xs text-gray-400 italic">Sin NC abiertas.</p> : (
                    <div className="space-y-1">
                      {ctx.findings.slice(0, 12).map(f => (
                        <div key={f.code} className="flex items-center gap-2 text-sm border border-gray-100 rounded-lg px-2 py-1.5">
                          <span className="font-mono text-[10px] text-gray-400">{f.code}</span>
                          <span className="flex-1 min-w-0 truncate text-gray-800">{f.title}</span>
                          <span className="text-[10px] font-bold text-red-600">{f.status}</span>
                          <button onClick={() => addItem('nc', `${f.code} — ${f.title}`)} className="text-[10px] font-bold text-dassa-red hover:underline flex items-center gap-0.5 shrink-0"><Plus className="w-3 h-3" />acta</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Capacitaciones del mes */}
                <div>
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1.5 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Capacitaciones del mes ({ctx.trainings.length}) · <span className="text-amber-600">{ctx.trainings_overdue} vencidas en total</span></h3>
                  {ctx.trainings.length === 0 ? <p className="text-xs text-gray-400 italic">Sin capacitaciones programadas este mes.</p> : (
                    <div className="space-y-1">
                      {ctx.trainings.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm border border-gray-100 rounded-lg px-2 py-1.5">
                          <span className="flex-1 min-w-0 truncate text-gray-800">{t.title}</span>
                          {t.is_mandatory && <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1 rounded">OBLIG</span>}
                          <span className="text-[10px] text-gray-500">{t.status}</span>
                          <button onClick={() => addItem('capacitacion', `Capacitación: ${t.title}`)} className="text-[10px] font-bold text-dassa-red hover:underline flex items-center gap-0.5 shrink-0"><Plus className="w-3 h-3" />acta</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Objetivos + mediciones */}
                <div>
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1.5 flex items-center gap-1"><LineChart className="w-3.5 h-3.5" /> Objetivos {new Date().getFullYear()} — cumplimiento ({ctx.objectives.length})</h3>
                  <div className="space-y-1">
                    {ctx.objectives.map(o => (
                      <div key={o.code} className="flex items-center gap-2 text-sm border border-gray-100 rounded-lg px-2 py-1.5">
                        <span className="flex-1 min-w-0 truncate text-gray-800">{o.name}</span>
                        <span className="text-[11px] tabular-nums text-gray-700">
                          {o.last_measurement ? `${o.last_measurement.value}${o.unit || ''}` : '—'}
                          <span className="text-gray-400"> / {o.target_value || (o.ind_target ?? '')}</span>
                        </span>
                        <button onClick={() => addItem('medicion', `${o.name}: último ${o.last_measurement ? o.last_measurement.value + (o.unit || '') : 's/d'} (meta ${o.target_value || o.ind_target || ''})`)} className="text-[10px] font-bold text-dassa-red hover:underline flex items-center gap-0.5 shrink-0"><Plus className="w-3 h-3" />acta</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PANEL B — Acta por puntos */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-dassa-red" />
            <h2 className="text-base font-bold text-gray-900">Acta — puntos tratados</h2>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
          </div>
          <div className="space-y-2">
            {items.map(it => {
              const cfg = TIPOS[it.tipo] || TIPOS.otro;
              return (
                <div key={it.id} className={`bg-white border rounded-xl p-3 ${it.resuelto ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <select value={it.tipo} onChange={e => saveItemDebounced(it.id, { tipo: e.target.value })}
                      className={`text-[11px] font-bold border rounded-md px-1.5 py-0.5 ${cfg.cls}`}>
                      {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <div className="flex-1" />
                    <button onClick={() => toggleResuelto(it)} title="Marcar resuelto"
                      className={`p-1 rounded ${it.resuelto ? 'text-emerald-600' : 'text-gray-300 hover:text-emerald-600'}`}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => delItem(it.id)} title="Eliminar" className="p-1 rounded text-gray-300 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea value={it.texto} onChange={e => saveItemDebounced(it.id, { texto: e.target.value })}
                    rows={2} placeholder="Escribí el punto tratado…"
                    className="w-full text-sm text-gray-800 border-0 focus:ring-0 resize-y p-0 placeholder:text-gray-300 bg-transparent" />
                </div>
              );
            })}
          </div>
          {/* Botones agregar por tipo */}
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(TIPOS).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <button key={k} onClick={() => addItem(k)}
                  className={`text-xs font-medium border rounded-lg px-2.5 py-1.5 flex items-center gap-1 hover:shadow-sm transition ${v.cls}`}>
                  <Plus className="w-3 h-3" /><Icon className="w-3.5 h-3.5" /> {v.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* PANEL C — Tareas de esta reunión */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Tareas de esta reunión</h2>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{tasks.length}</span>
          </div>
          {tasks.length > 0 && (
            <div className="space-y-2 mb-4">
              {tasks.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{t.task_number && <span className="text-gray-400 font-mono text-xs mr-1">{t.task_number}</span>}{t.title}</div>
                    <div className="text-xs text-gray-500">{t.assignees?.map(a => a.name).join(', ') || 'sin responsable'}{t.due_date ? ` · vence ${new Date(t.due_date).toLocaleDateString('es-AR')}` : ''}</div>
                  </div>
                  <span className={`text-[11px] font-bold border rounded-lg px-2 py-1 ${STATUS_CLS[t.status] || ''}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
          {/* Form nueva tarea */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700"><UserPlus className="w-4 h-4 text-dassa-red" /> Nueva tarea / pendiente</div>
            <input value={ntTitle} onChange={e => setNtTitle(e.target.value)} placeholder="¿Qué hay que hacer?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2 focus:border-dassa-red focus:ring-0" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <select value={ntResp} onChange={e => setNtResp(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
                <option value="">Responsable…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <select value={ntCollab} onChange={e => setNtCollab(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
                <option value="">Colaborador (opc.)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-gray-400 absolute left-2 top-2.5 pointer-events-none" />
                <input type="date" value={ntDue} onChange={e => setNtDue(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-2 py-2" />
              </div>
              <select value={ntPrio} onChange={e => setNtPrio(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <button onClick={createTask} disabled={!ntTitle.trim() || !ntResp || creating}
              className="mt-3 bg-dassa-red hover:bg-dassa-red-deep disabled:bg-gray-300 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear tarea
            </button>
          </div>
        </section>

        {/* Cierre — enviar resumen a Trinorma */}
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-dassa-red" />
            <h2 className="text-base font-bold text-gray-900">Cierre de la reunión</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            TRINY firma y cierra el acta, y envía el resumen (puntos + tareas y responsables) por mail a todos los usuarios de Trinorma.
            {meeting.status === 'cerrada' && <span className="text-emerald-600 font-medium"> · Cerrada y firmada por TRINY</span>}
            {meeting.summary_sent_at && <span className="text-gray-400"> · resumen enviado el {new Date(meeting.summary_sent_at).toLocaleString('es-AR')}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => sendSummary(true)} disabled={!!sending}
              className="text-sm font-medium border border-gray-300 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50">
              {sending === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Previsualizar (a mí)
            </button>
            <button onClick={closeAndSign} disabled={!!sending || meeting.status === 'cerrada'}
              className="text-sm font-bold bg-dassa-red hover:bg-dassa-red-deep text-white rounded-lg px-4 py-2 flex items-center gap-1.5 disabled:opacity-50">
              {sending === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {meeting.status === 'cerrada' ? 'Reunión cerrada' : 'Cerrar y firmar como TRINY + enviar a todos'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
