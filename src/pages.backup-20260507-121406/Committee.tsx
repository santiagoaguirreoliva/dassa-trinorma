import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, ChevronRight, CheckCircle2, Clock, Sparkles,
  Users, Calendar, FileText, X, Save, Loader2, AlertTriangle,
  ClipboardList, RotateCcw, ChevronLeft, Eye
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Badge, Avatar, Spinner, PageContent, PriorityDot } from '@/components/ui';

// ─── Tipos ─────────────────────────────────────────────────
interface Meeting {
  id: string; meeting_date: string; year: number; month: number;
  meeting_number?: number; attendees: string[]; agenda?: string;
  minutes?: string; status: string; ai_processed: boolean;
  ai_summary?: string; tasks_count: number; tasks_done: number;
  created_by_name?: string; next_meeting_date?: string;
}
interface Task {
  id: string; title: string; description?: string; status: string;
  priority: string; due_date?: string; source: string;
  responsible_id?: string; responsible_name?: string; completed_at?: string;
}

const ATTENDEES_DEFAULT = [
  'Santiago Aguirre Oliva', 'Manuel De La Arena', 'María Del Carmen',
  'Fernando Ponzi', 'Christian Carrasco', 'NIXA Consultora', 'Maximiliano (Sindicato)'
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  programada: { label: 'Programada', color: 'text-blue-700',    bg: 'bg-blue-100' },
  realizada:  { label: 'Realizada',  color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelada:  { label: 'Cancelada',  color: 'text-slate-500',   bg: 'bg-slate-100' },
};

// ─── Modal nueva reunión ────────────────────────────────────
function NewMeetingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    meeting_date: '', attendees: [...ATTENDEES_DEFAULT],
    agenda: '', location: 'DASSA — Sarandi', next_meeting_date: ''
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: () => api.post('/committee', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committee'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const toggleAttendee = (name: string) => {
    set('attendees', form.attendees.includes(name)
      ? form.attendees.filter(a => a !== name)
      : [...form.attendees, name]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-slate-900">Nueva Reunión del Comité</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Fecha de reunión <span className="text-red-500">*</span></label>
              <input type="date" value={form.meeting_date} onChange={e => set('meeting_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Próxima reunión</label>
              <input type="date" value={form.next_meeting_date} onChange={e => set('next_meeting_date', e.target.value)} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="label-field">Lugar</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field mb-2">Participantes</label>
            <div className="flex flex-wrap gap-2">
              {ATTENDEES_DEFAULT.map(a => (
                <button key={a} type="button" onClick={() => toggleAttendee(a)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors
                    ${form.attendees.includes(a)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                  {a.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">Agenda (temas a tratar)</label>
            <textarea value={form.agenda} onChange={e => set('agenda', e.target.value)}
              rows={3} placeholder="1. Seguimiento tareas del mes anterior&#10;2. Nuevos temas..." className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Cancelar</button>
            <button onClick={() => !create.isPending && create.mutate()} disabled={!form.meeting_date || create.isPending}
              className="flex-1 py-2.5 bg-blue-700 text-white font-bold text-sm rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50">
              {create.isPending && <Loader2 size={14} className="animate-spin" />}
              Crear Reunión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Detail ─────────────────────────────────────────
function MeetingDetail({ meetingId, onBack }: { meetingId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'acta' | 'tareas' | 'resumen'>('acta');
  const [minutes, setMinutes] = useState('');
  const [minutesEdited, setMinutesEdited] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [newTask, setNewTask] = useState({ title: '', due_date: '', responsible_id: '', priority: 'media' });
  const [showNewTask, setShowNewTask] = useState(false);

  const { data: meeting, isLoading } = useQuery<Meeting & { tasks: Task[] }>({
    queryKey: ['committee', meetingId],
    queryFn: () => api.get(`/committee/${meetingId}`),
    onSuccess: (d) => { if (!minutesEdited) setMinutes(d.minutes || ''); }
  } as any);

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const saveMinutes = useMutation({
    mutationFn: () => api.patch(`/committee/${meetingId}`, { minutes, status: 'realizada' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committee', meetingId] }); qc.invalidateQueries({ queryKey: ['committee'] }); setMinutesEdited(false); },
  });

  const addTask = useMutation({
    mutationFn: () => api.post(`/committee/${meetingId}/tasks`, newTask),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committee', meetingId] }); setShowNewTask(false); setNewTask({ title: '', due_date: '', responsible_id: '', priority: 'media' }); },
  });

  const toggleTask = useMutation({
    mutationFn: ({ tid, status }: { tid: string; status: string }) =>
      api.patch(`/committee/${meetingId}/tasks/${tid}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['committee', meetingId] }),
  });

  async function processWithAI() {
    setAiLoading(true);
    setAiError('');
    try {
      const result: any = await api.post(`/committee/${meetingId}/process-ai`, {});
      qc.invalidateQueries({ queryKey: ['committee', meetingId] });
      qc.invalidateQueries({ queryKey: ['committee'] });
      setTab('tareas');
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size={32} /></div>;
  if (!meeting) return null;

  const sc = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.programada;
  const pendingTasks = (meeting.tasks || []).filter(t => t.status !== 'completada');
  const doneTasks = (meeting.tasks || []).filter(t => t.status === 'completada');
  const progress = meeting.tasks_count > 0
    ? Math.round((meeting.tasks_done / meeting.tasks_count) * 100) : 0;

  return (
    <>
      <Header
        title={`Reunión #${meeting.meeting_number || '—'} — ${new Date(meeting.meeting_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        subtitle={`${meeting.attendees?.length || 0} participantes · ${meeting.tasks_count} tareas`}
        actions={
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200">
            <ChevronLeft size={14} /> Volver
          </button>
        }
      />

      {/* Status bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${sc.bg} ${sc.color}`}>
          {sc.label}
        </span>
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500">{meeting.attendees?.join(', ')}</span>
        </div>
        {meeting.tasks_count > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">{progress}% completado</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex">
        {[
          { key: 'acta',    label: 'Acta',       icon: <FileText size={13} /> },
          { key: 'tareas',  label: `Tareas (${meeting.tasks_count})`, icon: <ClipboardList size={13} /> },
          { key: 'resumen', label: 'Resumen IA',  icon: <Sparkles size={13} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors
              ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <PageContent>
        {/* ─── ACTA ─── */}
        {tab === 'acta' && (
          <div className="space-y-4 max-w-3xl">
            {meeting.agenda && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Agenda</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.agenda}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-field">Texto del Acta</label>
                {minutesEdited && (
                  <button onClick={() => saveMinutes.mutate()} disabled={saveMinutes.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
                    {saveMinutes.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Guardar acta
                  </button>
                )}
              </div>
              <textarea
                value={minutes}
                onChange={e => { setMinutes(e.target.value); setMinutesEdited(true); }}
                rows={16}
                placeholder={`Pegá el texto completo del acta acá...

Ejemplo:
COMITÉ MIXTO DE HIGIENE Y SEGURIDAD
REUNIÓN: ${new Date(meeting.meeting_date).toLocaleDateString('es-AR')}
Participantes: Santiago, María, Fernando, Christian, NIXA...

MINUTA DEL MES ANTERIOR:
- Tarea 1: REALIZADO
- Tarea 2: PENDIENTE

NUEVAS TAREAS:
- Descripción de la tarea. Fecha máx: DD/MM/AA. Responsable: Nombre`}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none font-mono leading-relaxed"
              />
            </div>

            {/* AI Process button */}
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-5 border border-violet-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-slate-800 mb-1">Procesamiento con IA</p>
                  <p className="text-xs text-slate-500 mb-3">
                    Claude lee el acta, genera un resumen ejecutivo y extrae automáticamente todas las tareas con responsable y fecha límite.
                  </p>
                  {aiError && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <AlertTriangle size={13} /> {aiError}
                    </div>
                  )}
                  <button
                    onClick={processWithAI}
                    disabled={aiLoading || !minutes.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-700 to-blue-600 text-white font-bold text-sm rounded-xl hover:from-violet-600 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {aiLoading
                      ? <><Loader2 size={15} className="animate-spin" /> Procesando con IA...</>
                      : <><Sparkles size={15} /> {meeting.ai_processed ? 'Reprocesar con IA' : 'Procesar con IA'}</>
                    }
                  </button>
                  {meeting.ai_processed && !aiLoading && (
                    <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Procesado — {(meeting.tasks || []).filter(t => t.source === 'ai_extracted').length} tareas extraídas
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAREAS ─── */}
        {tab === 'tareas' && (
          <div className="space-y-4 max-w-3xl">
            {/* Pendientes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pendientes ({pendingTasks.length})
                </p>
                {isAdmin && (
                  <button onClick={() => setShowNewTask(!showNewTask)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700">
                    <Plus size={11} /> Nueva tarea
                  </button>
                )}
              </div>

              {showNewTask && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3 space-y-3">
                  <input value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))}
                    placeholder="Descripción de la tarea..." className="input-field" />
                  <div className="grid grid-cols-3 gap-2">
                    <select value={newTask.responsible_id} onChange={e => setNewTask(p => ({...p, responsible_id: e.target.value}))}
                      className="input-field">
                      <option value="">Sin responsable</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({...p, due_date: e.target.value}))} className="input-field" />
                    <select value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value}))} className="input-field">
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewTask(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">Cancelar</button>
                    <button onClick={() => newTask.title && addTask.mutate()} disabled={!newTask.title || addTask.isPending}
                      className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      Agregar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {pendingTasks.map(t => {
                  const overdue = t.due_date && new Date(t.due_date) < new Date();
                  return (
                    <div key={t.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors
                        ${overdue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <button
                        onClick={() => toggleTask.mutate({ tid: t.id, status: 'completada' })}
                        className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-400 flex-shrink-0 mt-0.5 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{t.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {t.responsible_name && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Avatar name={t.responsible_name} size={14} />
                              {t.responsible_name.split(' ')[0]}
                            </span>
                          )}
                          {t.due_date && (
                            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                              <Clock size={10} />
                              {new Date(t.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                              {overdue && ' — VENCIDA'}
                            </span>
                          )}
                          <PriorityDot priority={t.priority} />
                          {t.source === 'ai_extracted' && (
                            <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Sparkles size={8} /> IA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {pendingTasks.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-300" />
                    <p className="text-sm font-medium">Todas las tareas completadas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completadas */}
            {doneTasks.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Completadas ({doneTasks.length})
                </p>
                <div className="space-y-1.5">
                  {doneTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-slate-500 line-through flex-1">{t.title}</span>
                      {t.responsible_name && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{t.responsible_name.split(' ')[0]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── RESUMEN IA ─── */}
        {tab === 'resumen' && (
          <div className="max-w-3xl space-y-4">
            {meeting.ai_processed && meeting.ai_summary ? (
              <>
                <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-5 border border-violet-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-violet-600" />
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Resumen ejecutivo generado por IA</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{meeting.ai_summary}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-600">Tareas extraídas por IA</p>
                  </div>
                  {(meeting.tasks || []).filter(t => t.source === 'ai_extracted').map((t, i) => (
                    <div key={t.id} className="flex items-start gap-3 px-5 py-3 border-b border-slate-100 last:border-0">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{t.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {t.responsible_name && <span className="text-[10px] text-slate-400">{t.responsible_name}</span>}
                          {t.due_date && <span className="text-[10px] text-slate-400">{new Date(t.due_date).toLocaleDateString('es-AR')}</span>}
                          <PriorityDot priority={t.priority} />
                          <Badge label={t.status === 'completada' ? 'Completada' : 'Pendiente'}
                            variant={t.status === 'completada' ? 'green' : 'amber'} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <Sparkles size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-slate-500">Aún no se procesó esta reunión con IA</p>
                <p className="text-sm mt-1">Cargá el acta en la pestaña "Acta" y hacé click en "Procesar con IA"</p>
                <button onClick={() => setTab('acta')}
                  className="mt-4 px-4 py-2 bg-violet-600 text-white font-bold text-sm rounded-xl hover:bg-violet-700">
                  Ir al Acta
                </button>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────
export default function Committee() {
  const { isAdmin } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['committee'],
    queryFn: () => api.get('/committee'),
  });

  if (selected) return <MeetingDetail meetingId={selected} onBack={() => setSelected(null)} />;

  const upcoming = meetings.filter(m => m.status === 'programada');
  const done = meetings.filter(m => m.status === 'realizada');

  return (
    <>
      <Header
        title="Comité Mixto"
        subtitle="Higiene y Seguridad — Reuniones + IA extrae tareas"
        actions={
          isAdmin && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-600">
              <Plus size={14} /> Nueva Reunión
            </button>
          )
        }
      />
      <PageContent>
        {isLoading ? <div className="flex justify-center py-16"><Spinner size={32} /></div> : (
          <div className="space-y-6 max-w-4xl">
            {/* Próximas */}
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Próximas reuniones</p>
                <div className="space-y-3">
                  {upcoming.map(m => (
                    <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Historial */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Historial ({done.length} reuniones)
              </p>
              <div className="space-y-3">
                {done.map(m => (
                  <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m.id)} />
                ))}
              </div>
            </div>

            {meetings.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-slate-500">Sin reuniones registradas</p>
                <p className="text-sm mt-1">Creá la primera reunión del Comité</p>
              </div>
            )}
          </div>
        )}
      </PageContent>
      {showNew && <NewMeetingModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const sc = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.programada;
  const progress = meeting.tasks_count > 0
    ? Math.round((meeting.tasks_done / meeting.tasks_count) * 100) : 0;

  return (
    <div onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
              {sc.label}
            </span>
            {meeting.ai_processed && (
              <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Sparkles size={8} /> IA procesada
              </span>
            )}
            {meeting.meeting_number && (
              <span className="text-[10px] text-slate-400">Reunión #{meeting.meeting_number}</span>
            )}
          </div>
          <p className="text-[15px] font-extrabold text-slate-900">
            {new Date(meeting.meeting_date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {meeting.attendees?.length > 0 && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {meeting.attendees.join(' · ')}
            </p>
          )}
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" />
      </div>

      {meeting.tasks_count > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 font-semibold flex-shrink-0">
            {meeting.tasks_done}/{meeting.tasks_count} tareas
          </span>
        </div>
      )}

      {meeting.ai_summary && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {meeting.ai_summary}
        </p>
      )}
    </div>
  );
}
