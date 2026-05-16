// /committee · Comité Mixto rediseñado + Wizard de nueva reunión
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2, Plus, Users, ChevronRight, CheckCircle2,
  Loader2, X, ChevronLeft, FileSignature, Save, Trash2, UserPlus,
} from 'lucide-react';

interface Meeting {
  id: string;
  meeting_date: string;
  year: number;
  month: number;
  attendees: string[];
  location?: string;
  status: string;
  closed_at?: string;
  signatures?: any[];
  preamble?: string;
}

interface User { id: string; full_name: string; email: string; role: string; }
interface PendingTask {
  id: string; task_number: string; title: string; description?: string;
  status: string; priority: string; due_date?: string;
  origin_meeting_date?: string;
  assignees: { id: string; name: string; role: string }[];
}
interface NewTaskDraft {
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baja';
  due_date: string;
  assignees: string[];
}

const ROLE_LABEL: Record<string, string> = {
  master_admin: 'Master Admin', sgi_leader: 'SGI Leader', rrhh: 'RRHH',
  operaciones: 'Operaciones', seguridad_higiene: 'SySO',
  compras_approver: 'Compras', auditor_externo: 'Auditor Externo',
};

function getInitials(name: string) { return name.split(' ').slice(0,2).map(p=>p[0]||'').join('').toUpperCase(); }
function colorForUser(name: string) {
  const colors = ['#C8202C','#0EA5E9','#10B981','#F59E0B','#8B5CF6','#EC4899','#6366F1','#84CC16'];
  return colors[(name.charCodeAt(0) + name.length) % colors.length];
}

export default function Committee() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  async function loadMeetings() {
    setLoading(true);
    try {
      const m = await api.get<Meeting[]>('/committee');
      setMeetings(m || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadMeetings(); }, []);

  const isAdmin = ['master_admin','sgi_leader'].includes(user?.role || '');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold text-dassa-red uppercase tracking-widest">SGI · ISO 45001</p>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-dassa-red" />
              Comité Mixto
            </h1>
            <p className="text-gray-600 mt-1">Reuniones bimestrales · participación y consulta</p>
          </div>
          {isAdmin && (
            <button onClick={() => setWizardOpen(true)}
              className="bg-dassa-red hover:bg-dassa-red-deep text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2">
              <Plus className="w-5 h-5" /> Nueva reunión
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-10 h-10 animate-spin text-dassa-red mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {meetings.sort((a,b) => b.meeting_date.localeCompare(a.meeting_date)).map(m => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        )}
      </div>

      {wizardOpen && <Wizard onClose={() => { setWizardOpen(false); loadMeetings(); }} />}
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const navigate = useNavigate();
  const isFuture = new Date(meeting.meeting_date) > new Date();
  const isClosed = meeting.status === 'cerrada' || !!meeting.closed_at;
  const sigCount = (meeting.signatures || []).length;
  const attCount = (meeting.attendees || []).length;

  return (
    <div onClick={() => navigate(`/committee/${meeting.id}`)}
      className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-dassa-red hover:shadow-md transition">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="bg-dassa-red text-white rounded-lg w-20 text-center py-3 shrink-0">
          <div className="text-xs uppercase">{new Date(meeting.meeting_date).toLocaleString('es-AR',{month:'short'})}</div>
          <div className="text-2xl font-black">{new Date(meeting.meeting_date).getDate()}</div>
          <div className="text-xs">{meeting.year}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-bold text-gray-900">Comité Mixto · {meeting.location || 'DASSA'}</h3>
            {isFuture && <span className="bg-violet-100 text-violet-800 text-xs px-2 py-0.5 rounded-full font-semibold">Próxima</span>}
            {isClosed && <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">Cerrada</span>}
            {!isFuture && !isClosed && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold">Realizada</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {attCount} asistentes</span>
            {sigCount > 0 && <span className="flex items-center gap-1 text-emerald-700"><FileSignature className="w-4 h-4" /> {sigCount} firmas</span>}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}

// ───────────────────── WIZARD: nueva reunión 3 pasos ─────────────────────
function Wizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [pending, setPending] = useState<PendingTask[]>([]);
  const [loadingPrev, setLoadingPrev] = useState(false);

  // Step 1 data
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0,10));
  const [location, setLocation] = useState('DASSA — Sarandí');
  const [preamble, setPreamble] = useState('Temas generales: OEA · Huella de carbono · Reciclaje pallets y hojas');
  const [attendees, setAttendees] = useState<string[]>([]);

  // Step 2: review pending
  const [reviewedTasks, setReviewedTasks] = useState<Record<string, 'sigue'|'completada'|'cancelada'>>({});

  // Step 3: new tasks
  const [newTasks, setNewTasks] = useState<NewTaskDraft[]>([]);
  const [draft, setDraft] = useState<NewTaskDraft>({ title:'', description:'', priority:'media', due_date:'', assignees:[] });

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    api.get<User[]>('/users').then(setUsers).catch(()=>{});
    setLoadingPrev(true);
    api.get<PendingTask[]>('/committee/pending-alive').then(p => {
      setPending(p || []);
      const init: any = {};
      (p || []).forEach(t => init[t.id] = 'sigue');
      setReviewedTasks(init);
    }).finally(() => setLoadingPrev(false));
  }, []);

  function toggleAttendee(name: string) {
    setAttendees(a => a.includes(name) ? a.filter(x=>x!==name) : [...a, name]);
  }
  function toggleDraftAssignee(uid: string) {
    setDraft(d => ({ ...d, assignees: d.assignees.includes(uid) ? d.assignees.filter(x=>x!==uid) : [...d.assignees, uid] }));
  }
  function addDraftToList() {
    if (!draft.title || draft.assignees.length === 0) {
      alert('Título y al menos un responsable son obligatorios');
      return;
    }
    setNewTasks(n => [...n, draft]);
    setDraft({ title:'', description:'', priority:'media', due_date:'', assignees:[] });
  }

  async function save() {
    setSaving(true);
    try {
      // 1. Crear reunión + new_tasks vía wizard
      const r: any = await api.post('/committee/wizard', {
        meeting_date: meetingDate,
        location,
        attendees,
        preamble,
        new_tasks: newTasks.map(t => ({
          title: t.title, description: t.description, priority: t.priority,
          due_date: t.due_date || null, assignees: t.assignees
        }))
      });
      // 2. Actualizar pendientes según review
      for (const tid of Object.keys(reviewedTasks)) {
        const newStatus = reviewedTasks[tid];
        if (newStatus === 'completada' || newStatus === 'cancelada') {
          await api.patch(`/tasks/mine/${tid}`, { status: newStatus, completed_at: new Date().toISOString() }).catch(()=>{});
        }
        // "sigue" → no se toca el status, pero se podría revincular al nuevo meeting (no implementado)
      }
      setSavedId(r.meeting_id);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally { setSaving(false); }
  }

  if (savedId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Reunión guardada</h2>
          <p className="text-gray-600 mb-6">
            La reunión fue creada con {newTasks.length} tareas nuevas.
            Los responsables ya las tienen en Mis Pendientes.
          </p>
          <button onClick={onClose} className="w-full bg-dassa-red text-white py-3 rounded-lg font-bold">Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-dassa-red text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Nueva reunión de Comité Mixto</h2>
            <p className="text-white/80 text-sm">Paso {step} de 3</p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-100 h-1">
          <div className="bg-dassa-red h-1 transition-all" style={{ width: `${(step/3)*100}%` }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PASO 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Datos de la reunión</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Fecha</label>
                  <input type="date" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Ubicación</label>
                  <input type="text" value={location} onChange={e=>setLocation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Preámbulo / temas generales</label>
                <textarea value={preamble} onChange={e=>setPreamble(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Asistentes ({attendees.length} marcados)</label>
                <div className="grid grid-cols-2 gap-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input type="checkbox" checked={attendees.includes(u.full_name)} onChange={()=>toggleAttendee(u.full_name)} />
                      <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center"
                        style={{ backgroundColor: colorForUser(u.full_name) }}>
                        {getInitials(u.full_name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{u.full_name}</div>
                        <div className="text-xs text-gray-500">{ROLE_LABEL[u.role] || u.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: pendientes anteriores */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <strong>Revisión de pendientes ({pending.length} tareas vivas)</strong> · marcar el estado actual de cada una
              </div>
              {loadingPrev ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : pending.map(t => (
                <div key={t.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-900 text-white text-xs font-mono px-2 py-1 rounded">{t.task_number}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Resp: {t.assignees.map(a=>a.name).join(', ') || 'sin asignar'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[
                      {v:'sigue',l:'Sigue pendiente'},
                      {v:'completada',l:'✓ Completada'},
                      {v:'cancelada',l:'Cancelar'},
                    ].map(o => (
                      <button key={o.v}
                        onClick={()=>setReviewedTasks(r=>({...r, [t.id]:o.v as any}))}
                        className={`text-xs px-3 py-1 rounded font-medium ${
                          reviewedTasks[t.id]===o.v
                            ? (o.v==='completada' ? 'bg-emerald-600 text-white' :
                               o.v==='cancelada' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900')
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PASO 3: nuevas tareas */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Tareas NUEVAS de esta reunión</h3>
              {/* Lista de tareas ya agregadas */}
              {newTasks.map((t, i) => (
                <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-gray-600">
                      Resp: {t.assignees.map(uid => users.find(u=>u.id===uid)?.full_name).filter(Boolean).join(', ')}
                      {t.due_date && ` · Vence: ${t.due_date}`}
                    </div>
                  </div>
                  <button onClick={()=>setNewTasks(n => n.filter((_,j)=>j!==i))}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
              {/* Form para agregar */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <input type="text" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}
                  placeholder="Título de la tarea"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}
                  placeholder="Descripción (opcional)" rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value as any})}
                    className="border border-gray-300 rounded-lg px-3 py-2">
                    <option value="alta">Prioridad alta</option>
                    <option value="media">Prioridad media</option>
                    <option value="baja">Prioridad baja</option>
                  </select>
                  <input type="date" value={draft.due_date} onChange={e=>setDraft({...draft,due_date:e.target.value})}
                    className="border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Responsables (obligatorio, al menos 1)</div>
                  <div className="flex flex-wrap gap-1">
                    {users.map(u => (
                      <button key={u.id} onClick={()=>toggleDraftAssignee(u.id)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 ${
                          draft.assignees.includes(u.id) ? 'bg-dassa-red text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}>
                        <UserPlus className="w-3 h-3" /> {u.full_name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={addDraftToList}
                  disabled={!draft.title || draft.assignees.length === 0}
                  className="w-full bg-emerald-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Agregar tarea
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer navegación */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(step-1) : onClose()}
            className="bg-white border border-gray-300 px-5 py-2 rounded-lg flex items-center gap-2 font-medium">
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          <div className="text-sm text-gray-500">
            {step === 1 && `${attendees.length} asistentes`}
            {step === 2 && `${Object.values(reviewedTasks).filter(v=>v==='completada').length} completadas · ${Object.values(reviewedTasks).filter(v=>v==='sigue').length} siguen`}
            {step === 3 && `${newTasks.length} tareas nuevas`}
          </div>
          {step < 3 ? (
            <button onClick={() => setStep(step+1)}
              disabled={step === 1 && attendees.length === 0}
              className="bg-dassa-red disabled:bg-gray-300 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              className="bg-emerald-600 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar reunión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
