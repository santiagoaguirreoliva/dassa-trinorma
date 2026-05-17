// /mis-pendientes · Centro nervioso de tareas asignadas al user actual
// Soporta multi-responsable: tareas compartidas muestran avatares de todos los assignees
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckSquare, AlertCircle, Calendar, Users, Filter,
  Loader2, CheckCircle2, ChevronRight, Building2, AlertTriangle,
  GraduationCap, ShoppingCart, FileText, X, MessageSquare,
} from 'lucide-react';

interface Assignee { id: string; name: string; email: string; role: 'principal' | 'colaborador'; }
interface Task {
  id: string;
  task_number: string | null;
  title: string;
  description?: string;
  status: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
  priority: 'alta' | 'media' | 'baja' | 'urgente';
  due_date?: string;
  source_module: string;
  origin_type?: string;
  origin_detail?: string;
  committee_id?: string;
  committee_meeting_date?: string;
  finding_id?: string;
  overdue?: boolean;
  assignees: Assignee[];
  created_at: string;
}

const SOURCE_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  committee:     { label: 'Comité Mixto', icon: Building2,      color: 'bg-violet-100 text-violet-800' },
  findings:      { label: 'NC / Desvío',  icon: AlertTriangle,  color: 'bg-orange-100 text-orange-800' },
  trainings:     { label: 'Capacitación', icon: GraduationCap,  color: 'bg-blue-100 text-blue-800' },
  purchases:     { label: 'Compras',      icon: ShoppingCart,   color: 'bg-emerald-100 text-emerald-800' },
  general:       { label: 'General',      icon: FileText,       color: 'bg-gray-100 text-gray-700' },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'bg-red-200 text-red-800 border-red-400',
  alta:  'bg-red-100 text-red-700 border-red-300',
  media: 'bg-amber-100 text-amber-700 border-amber-300',
  baja:  'bg-gray-100 text-gray-600 border-gray-300',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

function colorForUser(name: string) {
  const colors = ['#C8202C', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#84CC16'];
  const idx = (name.charCodeAt(0) + name.length) % colors.length;
  return colors[idx];
}

// Clasifica una tarea por proximidad de vencimiento (para el seguimiento semanal)
function dueBucket(t: { overdue?: boolean; due_date?: string }) {
  if (t.overdue) return { key: 'venc', label: 'Vencidas', order: 0 };
  if (!t.due_date) return { key: 'sinfecha', label: 'Sin fecha', order: 3 };
  const days = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
  if (days <= 7) return { key: 'semana', label: 'Esta semana', order: 1 };
  return { key: 'adelante', label: 'Más adelante', order: 2 };
}

export default function MisPendientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'en_curso' | 'overdue'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'estado' | 'origen' | 'vencimiento'>('vencimiento');
  const [completing, setCompleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const items = await api.get<Task[]>('/tasks/mine');
      setTasks(items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Comentarios de la tarea seleccionada
  useEffect(() => {
    if (!selected) { setComments([]); setCloseNote(''); setNewComment(''); return; }
    api.get<any[]>(`/tasks/${selected.id}/comments`).then(setComments).catch(() => setComments([]));
  }, [selected]);

  async function markDone(id: string) {
    setCompleting(id);
    try {
      await api.patch(`/tasks/mine/${id}`, {
        status: 'completada',
        observations: closeNote.trim() || undefined,
      });
      setTasks(t => t.filter(x => x.id !== id));
      setSelected(null);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setCompleting(null);
    }
  }

  async function addComment() {
    if (!selected || !newComment.trim()) return;
    setPosting(true);
    try {
      const c = await api.post<any>(`/tasks/${selected.id}/comments`, { body: newComment.trim() });
      setComments(cs => [...cs, c]);
      setNewComment('');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setPosting(false);
    }
  }

  async function setTaskStatus(id: string, status: Task['status']) {
    try {
      await api.patch(`/tasks/mine/${id}`, { status });
      setTasks(t => t.map(x => x.id === id ? { ...x, status } : x));
      setSelected(s => s && s.id === id ? { ...s, status } : s);
    } catch (e: any) { alert('Error: ' + e.message); }
  }

  async function changePriority(id: string, priority: Task['priority']) {
    try {
      await api.patch(`/tasks/mine/${id}`, { priority });
      setTasks(t => t.map(x => x.id === id ? { ...x, priority } : x));
      setSelected(s => s && s.id === id ? { ...s, priority } : s);
    } catch (e: any) { alert('Error: ' + e.message); }
  }

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter === 'overdue' && !t.overdue) return false;
      if (statusFilter === 'pendiente' && t.status !== 'pendiente') return false;
      if (statusFilter === 'en_curso' && t.status !== 'en_curso') return false;
      if (sourceFilter !== 'all' && t.source_module !== sourceFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, sourceFilter]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', order: 0, tasks: filtered }];
    const map = new Map<string, { label: string; order: number; tasks: Task[] }>();
    const add = (key: string, label: string, order: number, t: Task) => {
      if (!map.has(key)) map.set(key, { label, order, tasks: [] });
      map.get(key)!.tasks.push(t);
    };
    for (const t of filtered) {
      if (groupBy === 'estado') {
        if (t.overdue) add('venc', 'Vencidas', 0, t);
        else if (t.status === 'en_curso') add('curso', 'En curso', 1, t);
        else add('pend', 'Pendientes', 2, t);
      } else if (groupBy === 'origen') {
        add(t.source_module, SOURCE_LABEL[t.source_module]?.label || t.source_module, 0, t);
      } else {
        const b = dueBucket(t);
        add(b.key, b.label, b.order, t);
      }
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, label: v.label, order: v.order, tasks: v.tasks }))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [filtered, groupBy]);

  const stats = useMemo(() => ({
    total: tasks.length,
    pendientes: tasks.filter(t => t.status === 'pendiente').length,
    en_curso: tasks.filter(t => t.status === 'en_curso').length,
    overdue: tasks.filter(t => t.overdue).length,
    shared: tasks.filter(t => t.assignees.length > 1).length,
  }), [tasks]);

  const sourcesPresent = useMemo(() => {
    const set = new Set(tasks.map(t => t.source_module));
    return Array.from(set);
  }, [tasks]);

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="dassa-eyebrow mb-1.5">Mis tareas</p>
            <h1 className="page-heading flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-dassa-red" strokeWidth={2.2} />
              Mis Pendientes
            </h1>
            <p className="text-sm text-slate-600 mt-1.5">Todas tus tareas asignadas — comité, NCs, capacitaciones, todo.</p>
          </div>
          <button onClick={load} className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors">
            Refrescar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Stat label="Total" value={stats.total} color="bg-gray-100 text-gray-900" />
          <Stat label="Pendientes" value={stats.pendientes} color="bg-amber-100 text-amber-900" />
          <Stat label="En curso" value={stats.en_curso} color="bg-blue-100 text-blue-900" />
          <Stat label="Vencidas" value={stats.overdue} color="bg-red-100 text-red-900" />
          <Stat label="Compartidas" value={stats.shared} color="bg-violet-100 text-violet-900" />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-dassa-card p-4 mb-4 flex flex-wrap gap-3 items-center">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex gap-1">
            {[
              { v: 'all', l: 'Todas' },
              { v: 'pendiente', l: 'Pendientes' },
              { v: 'en_curso', l: 'En curso' },
              { v: 'overdue', l: 'Vencidas' },
            ].map(o => (
              <button key={o.v}
                onClick={() => setStatusFilter(o.v as any)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                  statusFilter === o.v ? 'bg-dassa-red text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {o.l}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-gray-300" />
          <span className="text-sm text-gray-600">Origen:</span>
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">Todos</option>
            {sourcesPresent.map(s => (
              <option key={s} value={s}>{SOURCE_LABEL[s]?.label || s}</option>
            ))}
          </select>
          <div className="w-px h-6 bg-gray-300" />
          <span className="text-sm text-gray-600">Agrupar:</span>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
            <option value="vencimiento">Por vencimiento</option>
            <option value="estado">Por estado</option>
            <option value="origen">Por origen</option>
            <option value="none">Sin agrupar</option>
          </select>
          <span className="ml-auto text-sm text-gray-500">{filtered.length} resultados</span>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-10 h-10 animate-spin text-dassa-red mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-xl text-gray-900">¡Estás al día!</h3>
            <p className="text-gray-600 mt-1">No hay tareas pendientes con esos filtros.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(g => (
              <div key={g.key}>
                {g.label && (
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-gray-700">{g.label}</h3>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{g.tasks.length}</span>
                  </div>
                )}
                <div className="space-y-3">
            {g.tasks.map(t => {
              const src = SOURCE_LABEL[t.source_module] || SOURCE_LABEL.general;
              const SrcIcon = src.icon;
              const others = t.assignees.filter(a => a.id !== user.id);
              return (
                <div key={t.id}
                  onClick={() => setSelected(t)}
                  className={`bg-white rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition ${
                    t.overdue ? 'border-red-300' : 'border-gray-200 hover:border-dassa-red'
                  }`}>
                  <div className="flex items-start gap-3">
                    {/* Task number */}
                    <div className="bg-gray-900 text-white text-xs font-bold rounded px-2 py-1 font-mono shrink-0">
                      {t.task_number || '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 ${src.color} rounded-full px-2.5 py-0.5 text-xs font-semibold`}>
                          <SrcIcon className="w-3 h-3" />
                          {src.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[t.priority]}`}>
                          {t.priority}
                        </span>
                        {t.status === 'en_curso' && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">En curso</span>
                        )}
                        {t.overdue && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Vencida
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-snug">{t.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 flex-wrap">
                        {t.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Vence: {new Date(t.due_date).toLocaleDateString('es-AR')}
                          </span>
                        )}
                        {t.committee_meeting_date && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Desde reunión {new Date(t.committee_meeting_date).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Assignees avatars */}
                    <div className="flex -space-x-2 shrink-0">
                      {t.assignees.slice(0, 4).map((a, i) => (
                        <div key={a.id}
                          title={`${a.name} (${a.role})`}
                          className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-white"
                          style={{ backgroundColor: colorForUser(a.name), zIndex: 10 - i }}>
                          {getInitials(a.name)}
                        </div>
                      ))}
                      {t.assignees.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center border-2 border-white">
                          +{t.assignees.length - 4}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                  </div>
                  {others.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-600">
                      <Users className="w-3.5 h-3.5" />
                      <span>Compartida con: <strong>{others.map(o => o.name).join(', ')}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
              <div>
                <span className="bg-gray-900 text-white text-xs font-bold rounded px-2 py-1 font-mono">{selected.task_number}</span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selected.description && (
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-1">Descripción</h4>
                  <p className="text-sm text-gray-600">{selected.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-bold text-gray-700 mb-1">Estado</h4>
                  <p className="text-gray-600">{selected.status}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 mb-1">Prioridad</h4>
                  <select
                    value={selected.priority}
                    onChange={e => changePriority(selected.id, e.target.value as Task['priority'])}
                    className="text-sm border border-gray-200 rounded px-2 py-1 bg-white">
                    <option value="baja">baja</option>
                    <option value="media">media</option>
                    <option value="alta">alta</option>
                    <option value="urgente">urgente</option>
                  </select>
                </div>
                {selected.due_date && (
                  <div>
                    <h4 className="font-bold text-gray-700 mb-1">Vence</h4>
                    <p className="text-gray-600">{new Date(selected.due_date).toLocaleDateString('es-AR')}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-700 mb-1">Origen</h4>
                  <p className="text-gray-600">{SOURCE_LABEL[selected.source_module]?.label || selected.source_module}</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-700 mb-2">Responsables ({selected.assignees.length})</h4>
                <div className="space-y-2">
                  {selected.assignees.map(a => (
                    <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                      <div className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center"
                        style={{ backgroundColor: colorForUser(a.name) }}>
                        {getInitials(a.name)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{a.name}</div>
                        <div className="text-xs text-gray-500">{a.email}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${a.role === 'principal' ? 'bg-dassa-red text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {a.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Comentarios / historial */}
              <div>
                <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Comentarios y observaciones
                </h4>
                <div className="space-y-2 mb-3">
                  {comments.length === 0 && (
                    <p className="text-xs text-gray-400">Sin comentarios todavía.</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id}
                      className={`rounded-lg p-2.5 border text-sm ${
                        c.kind === 'cierre' ? 'bg-emerald-50 border-emerald-200'
                        : c.kind === 'reapertura' ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-gray-700">{c.author_name || 'Usuario'}</span>
                        {c.kind === 'cierre' && <span className="text-[10px] font-bold text-emerald-600 uppercase">Cierre</span>}
                        <span className="text-[10px] text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-0.5">{c.body}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                    placeholder="Escribí un comentario..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dassa-red"
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim() || posting}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50">
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                  </button>
                </div>
              </div>

              {/* Observación de cierre + completar */}
              <div className="border-t border-gray-100 pt-4">
                {selected.status === 'pendiente' && (
                  <button
                    onClick={() => setTaskStatus(selected.id, 'en_curso')}
                    className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4" /> Marcar en curso
                  </button>
                )}
                <textarea
                  value={closeNote}
                  onChange={e => setCloseNote(e.target.value)}
                  rows={2}
                  placeholder="Observación de cierre (opcional) — qué se hizo, resultado, evidencia..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none mb-2"
                />
                <button
                  onClick={() => markDone(selected.id)}
                  disabled={completing === selected.id}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                  {completing === selected.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Marcar como completada
                </button>
              </div>
              {selected.committee_id && (
                <button
                  onClick={() => { navigate(`/committee/${selected.committee_id}`); setSelected(null); }}
                  className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4" /> Ver reunión de origen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-3xl font-black mt-1">{value}</div>
    </div>
  );
}
