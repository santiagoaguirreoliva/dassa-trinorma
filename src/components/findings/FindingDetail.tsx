import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, CheckCircle2,
         Clock, User, MessageSquare, Paperclip, Save, Loader2, Sparkles,
         Archive, History, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, FINDING_STATUS, FINDING_TYPE, Avatar } from '@/components/ui';

interface Props {
  findingId: string;
  onClose: () => void;
}

const STATUS_FLOW = [
  { key: 'abierto',      label: 'Detectado' },
  { key: 'analisis',     label: 'Análisis' },
  { key: 'plan_accion',  label: 'Plan AC' },
  { key: 'en_ejecucion', label: 'Ejecución' },
  { key: 'verificacion', label: 'Verificación' },
  { key: 'cerrado',      label: 'Cerrado' },
];

const STATUS_IDX: Record<string, number> = {
  abierto: 0, analisis: 1, plan_accion: 2, en_ejecucion: 3, verificacion: 4, cerrado: 5
};

export default function FindingDetail({ findingId, onClose }: Props) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'detalle' | 'causas' | 'acciones' | 'evidencia' | 'comentarios' | 'historial'>('detalle');
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction] = useState({ description: '', due_date: '', responsible_id: '' });
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const { data: finding, isLoading } = useQuery({
    queryKey: ['finding', findingId],
    queryFn: () => api.get<any>(`/findings/${findingId}`),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<any[]>('/users'),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/findings/${findingId}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finding', findingId] }); qc.invalidateQueries({ queryKey: ['findings'] }); },
  });

  const updateFinding = useMutation({
    mutationFn: (data: any) => api.patch(`/findings/${findingId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finding', findingId] }); qc.invalidateQueries({ queryKey: ['findings'] }); setEditMode(false); },
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/findings/${findingId}/comments`, { content: newComment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finding', findingId] }); setNewComment(''); },
  });

  const addAction = useMutation({
    mutationFn: () => api.post(`/findings/${findingId}/actions`, newAction),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finding', findingId] }); setNewAction({ description: '', due_date: '', responsible_id: '' }); },
  });

  const completeAction = useMutation({
    mutationFn: (aid: string) => api.patch(`/findings/${findingId}/actions/${aid}`, { status: 'completada' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finding', findingId] }),
  });

  const aiAnalyze = useMutation({
    mutationFn: () => api.post(`/findings/${findingId}/ai-analyze`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finding', findingId] }),
  });

  const archiveFinding = useMutation({
    mutationFn: () => api.delete(`/findings/${findingId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); onClose(); },
  });

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
    </div>
  );
  if (!finding) return null;

  const sc = FINDING_STATUS[finding.status];
  const tc = FINDING_TYPE[finding.finding_type];
  const currentIdx = STATUS_IDX[finding.status] ?? 0;
  const porques = finding.cause_analysis_content
    ? (typeof finding.cause_analysis_content === 'string'
        ? JSON.parse(finding.cause_analysis_content)
        : finding.cause_analysis_content)
    : {};

  const ed = (k: string) => editData[k] ?? finding[k] ?? '';
  const ai = finding.ai_analysis || null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end overflow-hidden" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {finding.code}
                </code>
                {tc && <Badge label={tc.label} variant={tc.variant} size="sm" />}
                {sc && <Badge label={sc.label} variant={sc.variant} size="sm" />}
                {finding.days_open > 15 && (
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                    {finding.days_open}d abierta
                  </span>
                )}
              </div>
              <h2 className="text-[15px] font-extrabold text-slate-900 leading-snug">{finding.title}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0 mt-0.5">
              <X size={20} />
            </button>
          </div>

          {/* Status flow */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            {STATUS_FLOW.map((s, idx) => (
              <button
                key={s.key}
                onClick={() => isAdmin && updateStatus.mutate(s.key)}
                disabled={!isAdmin || updateStatus.isPending}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors
                  ${idx === currentIdx
                    ? 'bg-blue-700 text-white'
                    : idx < currentIdx
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {idx < currentIdx ? '✓ ' : ''}{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 overflow-x-auto">
          {(['detalle','causas','acciones','evidencia','comentarios','historial'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-3 text-xs font-bold capitalize border-b-2 flex-shrink-0 transition-colors
                ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
              {t === 'acciones' ? `Acciones (${finding.actions?.length ?? 0})` : t}
              {t === 'comentarios' && finding.comments?.length > 0 ? ` (${finding.comments.length})` : ''}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-6 space-y-4">

          {/* ─── DETALLE ─── */}
          {tab === 'detalle' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Archivar la NC ${finding.code}? La evidencia se conserva, pero la NC sale de los tableros activos.`))
                        archiveFinding.mutate();
                    }}
                    disabled={archiveFinding.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {archiveFinding.isPending ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                    Archivar
                  </button>
                  <div className="flex">
                    <button
                      onClick={() => editMode ? updateFinding.mutate(editData) : setEditMode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                    >
                      {updateFinding.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      {editMode ? 'Guardar' : 'Editar'}
                    </button>
                    {editMode && (
                      <button onClick={() => { setEditMode(false); setEditData({}); }}
                        className="ml-2 px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <Field label="Descripción">
                {editMode
                  ? <textarea value={ed('description')} onChange={e => setEditData(p => ({...p, description: e.target.value}))}
                      rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                  : <p className="text-sm text-slate-700 whitespace-pre-wrap">{finding.description}</p>
                }
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Origen">
                  {editMode
                    ? <select value={ed('origin')} onChange={e => setEditData(p => ({...p, origin: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                        <option value="auditoria_interna">Auditoría interna</option>
                        <option value="auditoria_externa">Auditoría externa</option>
                        <option value="reclamo_cliente">Reclamo cliente</option>
                        <option value="desvio_operativo">Desvío operativo</option>
                        <option value="accidente">Accidente</option>
                        <option value="inspeccion">Inspección</option>
                        <option value="comite">Comité</option>
                      </select>
                    : <span className="text-sm text-slate-700 capitalize">{finding.origin?.replace(/_/g,' ')}</span>
                  }
                </Field>
                <Field label="Sector / Área">
                  {editMode
                    ? <input value={ed('area')} onChange={e => setEditData(p => ({...p, area: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    : <span className="text-sm text-slate-700">{finding.area}</span>
                  }
                </Field>
                <Field label="Detectó">
                  <div className="flex items-center gap-2">
                    {finding.reported_by_name && <Avatar name={finding.reported_by_name} size={22} />}
                    <span className="text-sm text-slate-700">{finding.reported_by_name || '—'}</span>
                  </div>
                </Field>
                <Field label="Responsable AC">
                  {editMode
                    ? <select value={ed('assigned_to')} onChange={e => setEditData(p => ({...p, assigned_to: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                        <option value="">Sin asignar</option>
                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                    : <div className="flex items-center gap-2">
                        {finding.assigned_to_name && <Avatar name={finding.assigned_to_name} size={22} />}
                        <span className="text-sm text-slate-700">{finding.assigned_to_name || '—'}</span>
                      </div>
                  }
                </Field>
                <Field label="Fecha límite">
                  {editMode
                    ? <input type="date" value={ed('due_date')?.substring(0,10)} onChange={e => setEditData(p => ({...p, due_date: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    : <span className="text-sm text-slate-700">
                        {finding.due_date ? new Date(finding.due_date).toLocaleDateString('es-AR') : '—'}
                      </span>
                  }
                </Field>
                <Field label="Creado">
                  <span className="text-sm text-slate-700">
                    {new Date(finding.created_at).toLocaleDateString('es-AR')}
                  </span>
                </Field>
              </div>

              <Field label="Acción Inmediata">
                {editMode
                  ? <textarea value={ed('immediate_action')} onChange={e => setEditData(p => ({...p, immediate_action: e.target.value}))}
                      rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                  : <p className="text-sm text-slate-700">{finding.immediate_action || '—'}</p>
                }
              </Field>

              {/* Verificación */}
              {finding.status === 'verificacion' || finding.status === 'cerrado' ? (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Seguimiento de Eficacia</p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={finding.v30_done}
                        onChange={e => isAdmin && updateFinding.mutate({ v30_done: e.target.checked })}
                        className="w-4 h-4 rounded" />
                      Verificación 30 días {finding.verification_date_30
                        ? `(${new Date(finding.verification_date_30).toLocaleDateString('es-AR')})` : ''}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={finding.v60_done}
                        onChange={e => isAdmin && updateFinding.mutate({ v60_done: e.target.checked })}
                        className="w-4 h-4 rounded" />
                      Verificación 60 días {finding.verification_date_60
                        ? `(${new Date(finding.verification_date_60).toLocaleDateString('es-AR')})` : ''}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={finding.efficacy_verified}
                        onChange={e => isAdmin && updateFinding.mutate({ efficacy_verified: e.target.checked })}
                        className="w-4 h-4 rounded" />
                      Eficacia verificada
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ─── CAUSAS (5 PORQUÉS) ─── */}
          {tab === 'causas' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Método 5 Porqués</p>
                <p className="text-xs text-blue-600">Preguntá "¿por qué?" 5 veces para llegar a la causa raíz del problema.</p>
              </div>

              {/* ── Alerta de recurrencia ── */}
              {ai?.recurrence?.is_recurrent && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-300">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={13} /> NC recurrente detectada
                  </p>
                  {ai.recurrence.note && <p className="text-sm text-amber-900 mt-1">{ai.recurrence.note}</p>}
                  {(ai.recurrence.related_codes?.length ?? 0) > 0 && (
                    <p className="text-xs text-amber-700 mt-1.5">
                      Relacionada con: <strong>{ai.recurrence.related_codes.join(', ')}</strong>
                    </p>
                  )}
                  <p className="text-[11px] text-amber-600 mt-1.5">
                    Una NC recurrente indica que la acción correctiva previa no fue eficaz (ISO 10.2).
                  </p>
                </div>
              )}

              {/* ── Análisis IA de Triny ── */}
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} /> Análisis de Triny IA
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => aiAnalyze.mutate()}
                      disabled={aiAnalyze.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50"
                    >
                      {aiAnalyze.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {ai ? 'Reanalizar' : 'Analizar con Triny'}
                    </button>
                  )}
                </div>
                {aiAnalyze.isPending && (
                  <p className="text-xs text-violet-600">Triny está analizando la causa raíz…</p>
                )}
                {aiAnalyze.isError && (
                  <p className="text-xs text-red-500">No se pudo completar el análisis. Reintentá en unos segundos.</p>
                )}
                {ai ? (
                  <>
                    {ai.summary && <p className="text-sm text-slate-700">{ai.summary}</p>}
                    {ai.root_cause && (
                      <div className="bg-white rounded-lg p-2.5 border border-violet-100">
                        <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Causa raíz</p>
                        <p className="text-sm text-slate-700 mt-0.5">{ai.root_cause}</p>
                      </div>
                    )}
                    {isAdmin && ai.porques && (
                      <button
                        onClick={() => setEditData(p => ({
                          ...p,
                          porq_p1: ai.porques.p1, porq_p2: ai.porques.p2, porq_p3: ai.porques.p3,
                          porq_p4: ai.porques.p4, porq_p5: ai.porques.p5,
                        }))}
                        className="text-xs font-bold text-violet-700 hover:underline"
                      >
                        ↓ Aplicar la sugerencia a los 5 porqués
                      </button>
                    )}
                  </>
                ) : !aiAnalyze.isPending && (
                  <p className="text-xs text-violet-600">
                    Todavía no hay análisis IA.{isAdmin ? ' Tocá "Analizar con Triny" para generarlo.' : ''}
                  </p>
                )}
              </div>
              {[1,2,3,4,5].map(n => {
                const key = `p${n}`;
                const val = porques[key] || '';
                return (
                  <div key={key} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {n}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-500 mb-1">¿Por qué? #{n}</p>
                      {isAdmin
                        ? <textarea
                            value={editData[`porq_${key}`] ?? val}
                            onChange={e => setEditData(p => ({...p, [`porq_${key}`]: e.target.value}))}
                            rows={2}
                            placeholder={`Causa ${n}...`}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                          />
                        : <p className={`text-sm p-3 rounded-lg ${val ? 'bg-white border border-slate-200 text-slate-700' : 'bg-slate-50 text-slate-300 italic'}`}>
                            {val || 'Sin completar'}
                          </p>
                      }
                    </div>
                  </div>
                );
              })}
              {isAdmin && (
                <button
                  onClick={() => {
                    const content = {
                      p1: editData.porq_p1 ?? porques.p1 ?? '',
                      p2: editData.porq_p2 ?? porques.p2 ?? '',
                      p3: editData.porq_p3 ?? porques.p3 ?? '',
                      p4: editData.porq_p4 ?? porques.p4 ?? '',
                      p5: editData.porq_p5 ?? porques.p5 ?? '',
                    };
                    updateFinding.mutate({
                      cause_analysis_type: '5_porques',
                      cause_analysis_content: content
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                  {updateFinding.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar análisis
                </button>
              )}
            </div>
          )}

          {/* ─── ACCIONES CORRECTIVAS ─── */}
          {tab === 'acciones' && (
            <div className="space-y-4">

              {/* Sugerencias de Triny IA */}
              {ai && ((ai.corrective_actions?.length ?? 0) > 0 || ai.improvement_opportunity) && (
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-200 space-y-2">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} /> Sugerencias de Triny
                  </p>
                  {(ai.corrective_actions ?? []).map((act: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-violet-100">
                      <p className="flex-1 text-sm text-slate-700">{act}</p>
                      {isAdmin && (
                        <button
                          onClick={() => { setNewAction(p => ({ ...p, description: act })); }}
                          className="text-xs font-bold text-violet-700 hover:underline flex-shrink-0"
                        >
                          Usar
                        </button>
                      )}
                    </div>
                  ))}
                  {ai.improvement_opportunity && (
                    <div className="bg-white rounded-lg p-2.5 border border-violet-100">
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Oportunidad de mejora</p>
                      <p className="text-sm text-slate-700 mt-0.5">{ai.improvement_opportunity}</p>
                    </div>
                  )}
                </div>
              )}

              {(finding.actions ?? []).map((a: any) => (
                <div key={a.id} className={`p-4 rounded-xl border ${a.status === 'completada' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => a.status !== 'completada' && completeAction.mutate(a.id)}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors
                        ${a.status === 'completada' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}
                    >
                      {a.status === 'completada' && <CheckCircle2 size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${a.status === 'completada' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {a.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {a.responsible_name && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <User size={10} /> {a.responsible_name}
                          </span>
                        )}
                        {a.due_date && (
                          <span className={`text-xs flex items-center gap-1 font-semibold
                            ${a.status !== 'completada' && new Date(a.due_date) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                            <Clock size={10} /> {new Date(a.due_date).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isAdmin && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nueva Acción Correctiva</p>
                  <textarea
                    value={newAction.description}
                    onChange={e => setNewAction(p => ({...p, description: e.target.value}))}
                    rows={2}
                    placeholder="Descripción de la acción correctiva..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newAction.responsible_id}
                      onChange={e => setNewAction(p => ({...p, responsible_id: e.target.value}))}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    >
                      <option value="">Sin responsable</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <input
                      type="date"
                      value={newAction.due_date}
                      onChange={e => setNewAction(p => ({...p, due_date: e.target.value}))}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => newAction.description && addAction.mutate()}
                    disabled={!newAction.description || addAction.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addAction.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Agregar acción
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── EVIDENCIA ─── */}
          {tab === 'evidencia' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(finding.evidence_urls ?? []).map((url: string, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={url} alt={`Evidencia ${i+1}`} className="w-full h-36 object-cover" />
                    <p className="text-xs text-slate-400 p-2 truncate">Evidencia {i+1}</p>
                  </div>
                ))}
              </div>
              {(finding.evidence_urls ?? []).length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Paperclip size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin evidencias adjuntas</p>
                </div>
              )}
              {isAdmin && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="evidence-upload"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => updateFinding.mutate({ photo_base64: reader.result });
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label htmlFor="evidence-upload"
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-slate-500">
                    <Paperclip size={15} />
                    Adjuntar foto de evidencia
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ─── COMENTARIOS ─── */}
          {tab === 'comentarios' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {(finding.comments ?? []).map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.full_name} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-700">{c.full_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{c.content}</p>
                    </div>
                  </div>
                ))}
                {(finding.comments ?? []).length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin comentarios</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newComment && addComment.mutate()}
                  placeholder="Escribí un comentario..."
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => newComment && addComment.mutate()}
                  disabled={!newComment || addComment.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Enviar'}
                </button>
              </div>
            </div>
          )}

          {/* ─── HISTORIAL ─── */}
          {tab === 'historial' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <History size={13} /> Trazabilidad de estados
              </div>
              {(finding.history ?? []).map((h: any) => {
                const lbl = (s: string) => STATUS_FLOW.find(x => x.key === s)?.label || s || '—';
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 border-b border-slate-100 pb-3">
                      <p className="text-sm text-slate-700">
                        {h.from_status
                          ? <>De <strong>{lbl(h.from_status)}</strong> a <strong>{lbl(h.to_status)}</strong></>
                          : <>Alta en <strong>{lbl(h.to_status)}</strong></>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{h.changed_by_name || 'Sistema'}</span>
                        <span>·</span>
                        <span>{new Date(h.changed_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                      {h.note && <p className="text-xs text-slate-500 mt-1 italic">{h.note}</p>}
                    </div>
                  </div>
                );
              })}
              {(finding.history ?? []).length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <History size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin movimientos registrados</p>
                </div>
              )}
              {finding.closed_by_name && (
                <p className="text-xs text-slate-400 pt-2">
                  Cerrada por <strong className="text-slate-600">{finding.closed_by_name}</strong>
                  {finding.closed_at ? ` el ${new Date(finding.closed_at).toLocaleDateString('es-AR')}` : ''}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}
