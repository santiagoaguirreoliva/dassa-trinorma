import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Calendar, List, ChevronLeft, ChevronRight,
  X, Save, Loader2, CheckCircle2, Clock, Users, Bell,
  Paperclip, Trash2, Upload, AlertTriangle, Shield
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Badge, Avatar, Spinner, PageContent, KPICard } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Training {
  id: string; title: string; description?: string; objective?: string;
  legal_framework?: string; training_type: string; category: string;
  status: string; scheduled_date: string; location?: string;
  instructor?: string; duration_hours?: number; is_mandatory: boolean;
  reminder_days: number; organized_by_name?: string;
  participants_count: number; attended_count: number; evidence_count: number;
}
interface Participant {
  id: string; user_id?: string; full_name?: string; position?: string;
  department?: string; external_name?: string; external_position?: string;
  external_sector?: string; attended: boolean; dni?: string; score?: number;
}
interface Evidence {
  id: string; file_url: string; file_name?: string; file_type?: string;
  description?: string; uploaded_by_name?: string; created_at: string;
}

// ─── Config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  programada:  { label: 'Programada',  bg: 'bg-dassa-red-tint',    text: 'text-dassa-red-deep' },
  en_curso:    { label: 'En curso',    bg: 'bg-amber-100',   text: 'text-amber-700' },
  completada:  { label: 'Completada',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelada:   { label: 'Cancelada',   bg: 'bg-gray-100',   text: 'text-gray-500' },
};

const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  capacitacion: { label: 'Capacitación',  emoji: '📚' },
  induccion:    { label: 'Inducción',      emoji: '🎓' },
  simulacro:    { label: 'Simulacro',      emoji: '🚨' },
  reunion:      { label: 'Reunión',        emoji: '👥' },
  examen_medico:{ label: 'Examen médico',  emoji: '🩺' },
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── F-TRI-36 View (pantalla) ────────────────────────────────
function FTri36View({ training, participants }: { training: any; participants: Participant[] }) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden text-sm">
      {/* Header membrete */}
      <div className="bg-gray-800 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center font-black text-lg">D</div>
          <div>
            <p className="font-black text-sm tracking-wide">DASSA</p>
            <p className="text-[9px] text-gray-400">DEPÓSITO AVELLANEDA SUR S.A.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-sm">F-TRI-36 REGISTRO DE FORMACIÓN</p>
          <div className="flex gap-4 text-[10px] text-gray-400 mt-1">
            <span>F-TRI-36</span>
            <span>Ver.: 03</span>
            <span>Emisión: Junio 2024</span>
            <span>HOJA: 1/1</span>
          </div>
        </div>
      </div>

      {/* Datos del curso */}
      <div className="border-b border-gray-200">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2 font-bold bg-gray-50 w-36 border-r border-gray-200">Nombre del Curso:</td>
              <td className="px-4 py-2 flex-1">{training.title}</td>
              <td className="px-4 py-2 font-bold bg-gray-50 w-32 border-l border-r border-gray-200">Fecha del curso:</td>
              <td className="px-4 py-2 w-32">{new Date(training.scheduled_date).toLocaleDateString('es-AR')}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2 font-bold bg-gray-50 border-r border-gray-200">Capacitador:</td>
              <td className="px-4 py-2">{training.instructor || '—'}</td>
              <td className="px-4 py-2 font-bold bg-gray-50 border-l border-r border-gray-200">Duración:</td>
              <td className="px-4 py-2">{training.duration_hours ? `${training.duration_hours} hs` : '—'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2 font-bold bg-gray-50 border-r border-gray-200" rowSpan={2}>Temario desarrollado:</td>
              <td className="px-4 py-2" rowSpan={2}>{training.description || '—'}</td>
              <td className="px-4 py-2 font-bold bg-gray-50 border-l border-r border-gray-200">Hora de inicio y cierre:</td>
              <td className="px-4 py-2">{new Date(training.scheduled_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2 font-bold bg-gray-50 border-l border-r border-gray-200">Firma del capacitador:</td>
              <td className="px-4 py-2 h-8"></td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-bold bg-gray-50 border-r border-gray-200">Objetivo:</td>
              <td className="px-4 py-2" colSpan={3}>{training.objective || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Lista participantes */}
      <div>
        <div className="bg-gray-100 px-4 py-2 text-center font-extrabold text-xs border-b border-gray-200 uppercase tracking-widest">
          Lista de Participantes al Curso
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 font-bold text-left w-8">N°</th>
              <th className="px-3 py-2 font-bold text-left">Apellido y Nombre</th>
              <th className="px-3 py-2 font-bold text-left">Cargo / Sector</th>
              <th className="px-3 py-2 font-bold text-center w-20">Firma / Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(16, participants.length) }).map((_, i) => {
              const p = participants[i];
              const name = p ? (p.full_name || p.external_name || '—') : '';
              const sector = p ? (p.department || p.position || p.external_position || p.external_sector || '—') : '';
              return (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-center font-bold text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-gray-500">{sector}</td>
                  <td className="px-3 py-2 text-center">
                    {p?.attended && <span className="text-emerald-600 font-bold">✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer eficacia */}
      <div className="border-t-2 border-gray-300">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-4 py-3 font-bold bg-gray-50 border-r border-gray-200">
                Responsable de verificar eficacia de acción formativa:
              </td>
              <td className="px-4 py-3">{training.organized_by_name || '—'}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold bg-gray-50 border-r border-gray-200">
                Resultado de la eficacia de la acción Formativa:
              </td>
              <td className="px-4 py-3 min-h-[32px]">
                {training.status === 'completada' ? 'Completada satisfactoriamente' : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Training Detail Panel ───────────────────────────────────
function TrainingDetail({ trainingId, onClose }: { trainingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'info' | 'participantes' | 'evidencia' | 'ftri36'>('info');
  const [newExt, setNewExt] = useState({ name: '', position: '', sector: '' });
  const [showAddExt, setShowAddExt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['training', trainingId],
    queryFn: () => api.get(`/trainings/${trainingId}`),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/trainings/${trainingId}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training', trainingId] }); qc.invalidateQueries({ queryKey: ['trainings'] }); },
  });

  const toggleAttendance = useMutation({
    mutationFn: ({ pid, attended }: { pid: string; attended: boolean }) =>
      api.patch(`/trainings/${trainingId}/participants/${pid}`, { attended }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', trainingId] }),
  });

  const addParticipantUser = useMutation({
    mutationFn: (user_id: string) => api.post(`/trainings/${trainingId}/participants`, { user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', trainingId] }),
  });

  const addParticipantExt = useMutation({
    mutationFn: () => api.post(`/trainings/${trainingId}/participants`, {
      external_name: newExt.name, external_position: newExt.position, external_sector: newExt.sector
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training', trainingId] }); setNewExt({ name:'', position:'', sector:'' }); setShowAddExt(false); },
  });

  const removeParticipant = useMutation({
    mutationFn: (pid: string) => api.delete(`/trainings/${trainingId}/participants/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', trainingId] }),
  });

  const sendReminder = useMutation({
    mutationFn: () => api.post(`/trainings/${trainingId}/send-reminder`, {}),
    onSuccess: () => alert('Recordatorio enviado'),
  });

  const uploadEvidence = useMutation({
    mutationFn: (file: { base64: string; name: string; type: string }) =>
      api.post(`/trainings/${trainingId}/evidence`, {
        file_base64: file.base64, file_name: file.name, file_type: file.type
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', trainingId] }),
  });

  const deleteEvidence = useMutation({
    mutationFn: (eid: string) => api.delete(`/trainings/${trainingId}/evidence/${eid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', trainingId] }),
  });

  if (isLoading || !data) return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <Spinner size={32} />
    </div>
  );

  const sc = STATUS_CONFIG[data.status];
  const tc = TYPE_CONFIG[data.training_type];
  const attended = (data.participants || []).filter((p: Participant) => p.attended).length;
  const total = (data.participants || []).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end overflow-hidden" onClick={onClose}>
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-lg">{tc?.emoji}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${sc?.bg} ${sc?.text}`}>{sc?.label}</span>
                {data.is_mandatory && (
                  <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Shield size={8} /> OBLIGATORIA
                  </span>
                )}
              </div>
              <h2 className="text-[15px] font-extrabold text-gray-900 leading-snug">{data.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(data.scheduled_date).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                {data.location ? ` · ${data.location}` : ''}
              </p>
            </div>
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>

          {/* Status flow */}
          {isAdmin && (
            <div className="flex gap-2 mt-3">
              {['programada','en_curso','completada'].map(s => {
                const sc2 = STATUS_CONFIG[s];
                const active = data.status === s;
                return (
                  <button key={s} onClick={() => updateStatus.mutate(s)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors
                      ${active ? `${sc2.bg} ${sc2.text}` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {sc2.label}
                  </button>
                );
              })}
              <button onClick={() => sendReminder.mutate()}
                disabled={sendReminder.isPending}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold hover:bg-amber-200">
                {sendReminder.isPending ? <Loader2 size={10} className="animate-spin" /> : <Bell size={10} />}
                Enviar recordatorio
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {[
            { key: 'info',          label: 'Información' },
            { key: 'participantes', label: `Participantes (${total})` },
            { key: 'evidencia',     label: `Evidencia (${data.evidence?.length || 0})` },
            { key: 'ftri36',        label: 'F-TRI-36 Acta' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-3 py-3 text-xs font-bold border-b-2 flex-shrink-0 transition-colors
                ${tab === t.key ? 'border-dassa-red text-dassa-red-deep' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-4">

          {/* ─── INFO ─── */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo">{tc?.label || data.training_type}</Field>
                <Field label="Categoría">{data.category === 'obligatoria' ? '🔴 Obligatoria' : data.category}</Field>
                <Field label="Instructor">{data.instructor || '—'}</Field>
                <Field label="Duración">{data.duration_hours ? `${data.duration_hours} hs` : '—'}</Field>
                <Field label="Lugar">{data.location || '—'}</Field>
                <Field label="Recordatorio">{data.reminder_days ? `${data.reminder_days} días antes` : '—'}</Field>
              </div>
              {data.objective && <Field label="Objetivo"><p className="text-sm text-gray-700">{data.objective}</p></Field>}
              {data.legal_framework && <Field label="Marco legal"><p className="text-sm text-gray-700">{data.legal_framework}</p></Field>}
              {data.description && <Field label="Descripción"><p className="text-sm text-gray-700">{data.description}</p></Field>}
              {total > 0 && (
                <div className={`p-4 rounded-xl border ${attended === total ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-700">Asistencia</p>
                    <p className="text-xs font-extrabold text-gray-800">{attended}/{total}</p>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${total > 0 ? (attended/total)*100 : 0}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── PARTICIPANTES ─── */}
          {tab === 'participantes' && (
            <div className="space-y-3">
              {/* Barra de asistencia */}
              {total > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-600">Asistencia registrada</span>
                    <span className="font-extrabold">{attended}/{total} ({total > 0 ? Math.round(attended/total*100) : 0}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${total > 0 ? (attended/total)*100 : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Lista */}
              <div className="space-y-1.5">
                {(data.participants || []).map((p: Participant) => {
                  const name = p.full_name || p.external_name || '?';
                  const sector = p.department || p.position || p.external_position || p.external_sector || '—';
                  const isExt = !p.user_id;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                      ${p.attended ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                      <button
                        onClick={() => toggleAttendance.mutate({ pid: p.id, attended: !p.attended })}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${p.attended ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'}`}>
                        {p.attended && <CheckCircle2 size={12} className="text-white" />}
                      </button>
                      {p.user_id
                        ? <Avatar name={name} size={28} />
                        : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold flex-shrink-0">EXT</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
                        <p className="text-[10px] text-gray-400">{sector}{isExt ? ' · Externo' : ''}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => removeParticipant.mutate(p.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Agregar participantes */}
              {isAdmin && (
                <div className="space-y-2 pt-2">
                  {/* Usuario del sistema */}
                  <select onChange={e => { if (e.target.value) addParticipantUser.mutate(e.target.value); e.target.value = ''; }}
                    className="input-field text-xs">
                    <option value="">+ Agregar usuario del sistema...</option>
                    {users
                      .filter((u: any) => !(data.participants || []).find((p: Participant) => p.user_id === u.id))
                      .map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>

                  {/* Externo */}
                  {!showAddExt ? (
                    <button onClick={() => setShowAddExt(true)}
                      className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs text-gray-400 hover:border-blue-400 hover:text-dassa-red transition-colors">
                      + Agregar participante externo
                    </button>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Participante externo</p>
                      <input value={newExt.name} onChange={e => setNewExt(p => ({...p, name: e.target.value}))}
                        placeholder="Nombre y apellido *" className="input-field text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={newExt.position} onChange={e => setNewExt(p => ({...p, position: e.target.value}))}
                          placeholder="Cargo" className="input-field text-xs" />
                        <input value={newExt.sector} onChange={e => setNewExt(p => ({...p, sector: e.target.value}))}
                          placeholder="Sector" className="input-field text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddExt(false)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500">Cancelar</button>
                        <button onClick={() => newExt.name && addParticipantExt.mutate()} disabled={!newExt.name}
                          className="flex-1 py-1.5 bg-dassa-red text-white rounded-lg text-xs font-bold hover:bg-dassa-red-deep disabled:opacity-50">Agregar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── EVIDENCIA ─── */}
          {tab === 'evidencia' && (
            <div className="space-y-3">
              <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => uploadEvidence.mutate({
                    base64: reader.result as string, name: file.name, type: file.type
                  });
                  reader.readAsDataURL(file);
                }} />

              {(data.evidence || []).map((ev: Evidence) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                  <Paperclip size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a href={ev.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-dassa-red hover:underline truncate block">
                      {ev.file_name || 'Archivo'}
                    </a>
                    {ev.description && <p className="text-[10px] text-gray-400">{ev.description}</p>}
                    <p className="text-[10px] text-gray-400">
                      {ev.uploaded_by_name} · {new Date(ev.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteEvidence.mutate(ev.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              {(data.evidence || []).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Paperclip size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin evidencia adjunta</p>
                </div>
              )}

              {isAdmin && (
                <button onClick={() => fileRef.current?.click()} disabled={uploadEvidence.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:bg-dassa-red-tint transition-colors">
                  {uploadEvidence.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  Subir foto o documento
                </button>
              )}
            </div>
          )}

          {/* ─── F-TRI-36 ─── */}
          {tab === 'ftri36' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 font-medium">
                  Vista del acta oficial F-TRI-36 Rev.03. Marcá la asistencia en la pestaña "Participantes" para que aparezca reflejada acá.
                </p>
              </div>
              <FTri36View training={data} participants={data.participants || []} />
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
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      {typeof children === 'string'
        ? <p className="text-sm text-gray-700">{children}</p>
        : children}
    </div>
  );
}

// ─── New Training Modal ───────────────────────────────────────
function NewTrainingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', objective: '', legal_framework: '',
    training_type: 'capacitacion', category: 'obligatoria',
    scheduled_date: '', location: '', instructor: '',
    duration_hours: '', is_mandatory: true, reminder_days: '7',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: () => api.post('/trainings', {
      ...form,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : undefined,
      reminder_days: parseInt(form.reminder_days),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trainings'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Nueva Capacitación</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Título <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Nombre de la capacitación" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo</label>
              <select value={form.training_type} onChange={e => set('training_type', e.target.value)} className="input-field">
                <option value="capacitacion">Capacitación</option>
                <option value="induccion">Inducción</option>
                <option value="simulacro">Simulacro</option>
                <option value="reunion">Reunión</option>
                <option value="examen_medico">Examen médico</option>
              </select>
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                <option value="obligatoria">Obligatoria</option>
                <option value="operativa">Operativa</option>
                <option value="tecnica">Técnica</option>
                <option value="normativa">Normativa</option>
                <option value="otra">Otra</option>
              </select>
            </div>
            <div>
              <label className="label-field">Fecha y hora <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Duración (horas)</label>
              <input type="number" step="0.5" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)}
                placeholder="Ej: 2" className="input-field" />
            </div>
            <div>
              <label className="label-field">Instructor</label>
              <input value={form.instructor} onChange={e => set('instructor', e.target.value)}
                placeholder="Nombre del capacitador" className="input-field" />
            </div>
            <div>
              <label className="label-field">Lugar</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="DASSA — Sala de Reuniones" className="input-field" />
            </div>
            <div>
              <label className="label-field">Recordatorio (días antes)</label>
              <select value={form.reminder_days} onChange={e => set('reminder_days', e.target.value)} className="input-field">
                <option value="1">1 día antes</option>
                <option value="3">3 días antes</option>
                <option value="7">7 días antes</option>
                <option value="14">14 días antes</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="mandatory" checked={form.is_mandatory}
                onChange={e => set('is_mandatory', e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="mandatory" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Obligatoria
              </label>
            </div>
          </div>
          <div>
            <label className="label-field">Objetivo</label>
            <textarea value={form.objective} onChange={e => set('objective', e.target.value)}
              rows={2} placeholder="¿Qué se espera lograr?" className="input-field resize-none" />
          </div>
          <div>
            <label className="label-field">Marco legal</label>
            <input value={form.legal_framework} onChange={e => set('legal_framework', e.target.value)}
              placeholder="Ej: Resolución SRT 299/2011" className="input-field" />
          </div>
          <div>
            <label className="label-field">Descripción / Temario</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Temario y contenido de la capacitación..." className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
            <button onClick={() => !create.isPending && create.mutate()}
              disabled={!form.title || !form.scheduled_date || create.isPending}
              className="flex-1 py-2.5 bg-dassa-red-deep text-white font-bold text-sm rounded-xl hover:bg-dassa-red flex items-center justify-center gap-2 disabled:opacity-50">
              {create.isPending && <Loader2 size={14} className="animate-spin" />}
              Crear capacitación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────
function CalendarView({ trainings, onSelect }: { trainings: Training[]; onSelect: (id: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1; // lunes primero

  const byDay: Record<number, Training[]> = {};
  trainings.forEach(t => {
    const d = new Date(t.scheduled_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(t);
    }
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const today = new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
        <p className="font-extrabold text-gray-900">{MONTHS[month]} {year}</p>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: adjustedFirst }).map((_, i) => (
          <div key={`e-${i}`} className="h-20 border-r border-b border-gray-100 bg-gray-50" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const events = byDay[day] || [];
          return (
            <div key={day} className={`h-20 border-r border-b border-gray-100 p-1 relative ${isToday ? 'bg-dassa-red-tint' : ''}`}>
              <span className={`text-[11px] font-bold inline-block w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? 'bg-dassa-red text-white' : 'text-gray-500'}`}>
                {day}
              </span>
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {events.slice(0, 2).map(t => {
                  const sc = STATUS_CONFIG[t.status];
                  return (
                    <button key={t.id} onClick={() => onSelect(t.id)}
                      className={`w-full text-left px-1 py-0.5 rounded text-[9px] font-semibold truncate
                        ${sc?.bg} ${sc?.text} hover:opacity-80 transition-opacity`}>
                      {t.is_mandatory && '🔴 '}{t.title}
                    </button>
                  );
                })}
                {events.length > 2 && (
                  <p className="text-[9px] text-gray-400 px-1">+{events.length - 2} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function Trainings() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data: trainings = [], isLoading } = useQuery<Training[]>({
    queryKey: ['trainings'],
    queryFn: () => api.get('/trainings'),
    refetchInterval: 60_000,
  });

  const filtered = trainings.filter(t => {
    const ms = !filterStatus || t.status === filterStatus;
    const mt = !filterType || t.training_type === filterType;
    return ms && mt;
  });

  const upcoming = trainings.filter(t => t.status === 'programada' && new Date(t.scheduled_date) >= new Date());
  const completed = trainings.filter(t => t.status === 'completada');
  const mandatory = trainings.filter(t => t.is_mandatory && t.status === 'programada');
  const thisMonth = trainings.filter(t => {
    const d = new Date(t.scheduled_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <>
      <Header
        title="Capacitaciones"
        subtitle={`${upcoming.length} programadas · ${completed.length} completadas`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView('list')}
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-dassa-red' : 'text-gray-400'}`}>
                <List size={15} />
              </button>
              <button onClick={() => setView('calendar')}
                className={`p-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-white shadow-sm text-dassa-red' : 'text-gray-400'}`}>
                <Calendar size={15} />
              </button>
            </div>
            {isAdmin && (
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
                <Plus size={14} /> Nueva
              </button>
            )}
          </div>
        }
      />

      <PageContent>
        {isLoading ? <div className="flex justify-center py-16"><Spinner size={32} /></div> : (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
              <KPICard label="Próximas" value={upcoming.length} sub="Programadas" onClick={() => setFilterStatus('programada')} />
              <KPICard label="Obligatorias" value={mandatory.length} sub="Pendientes" alert={mandatory.length > 0} alertColor="#ef4444" onClick={() => setFilterType('capacitacion')} />
              <KPICard label="Este mes" value={thisMonth.length} sub="Total del mes" />
              <KPICard label="Completadas" value={completed.length} sub="Total histórico" onClick={() => setFilterStatus('completada')} />
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none">
                <option value="">Todos los tipos</option>
                {Object.entries(TYPE_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
              {(filterStatus || filterType) && (
                <button onClick={() => { setFilterStatus(''); setFilterType(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{filtered.length} capacitaciones</span>
            </div>

            {view === 'calendar' ? (
              <CalendarView trainings={filtered} onSelect={setSelected} />
            ) : (
              <div className="space-y-2">
                {filtered.map(t => {
                  const sc = STATUS_CONFIG[t.status];
                  const tc = TYPE_CONFIG[t.training_type];
                  const isPast = new Date(t.scheduled_date) < new Date() && t.status === 'programada';
                  return (
                    <div key={t.id} onClick={() => setSelected(t.id)}
                      className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all
                        ${isPast ? 'border-amber-200 bg-amber-50' : 'border-gray-200 hover:border-blue-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0 mt-0.5">{tc?.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${sc?.bg} ${sc?.text}`}>{sc?.label}</span>
                            {t.is_mandatory && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Shield size={8} /> OBLIGATORIA
                              </span>
                            )}
                            {isPast && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">⚠ Fecha vencida</span>}
                          </div>
                          <p className="text-sm font-extrabold text-gray-900 leading-snug">{t.title}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                              <Calendar size={11} />
                              {new Date(t.scheduled_date).toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' })}
                            </span>
                            {t.location && <span className="text-[11px] text-gray-400">📍 {t.location}</span>}
                            {t.instructor && <span className="text-[11px] text-gray-400">👤 {t.instructor}</span>}
                            {t.duration_hours && <span className="text-[11px] text-gray-400">⏱ {t.duration_hours}hs</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {t.participants_count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
                              <Users size={12} />
                              <span className="font-semibold">{t.attended_count}/{t.participants_count}</span>
                            </div>
                          )}
                          {t.evidence_count > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 justify-end mt-0.5">
                              <Paperclip size={10} /> {t.evidence_count}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-gray-500">Sin capacitaciones</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PageContent>

      {selected && <TrainingDetail trainingId={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewTrainingModal onClose={() => setShowNew(false)} />}
    </>
  );
}

// Missing import
function List({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
