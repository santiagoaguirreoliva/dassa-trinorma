// /revision-direccion — Revisión por la Dirección (ISO 9.3) paso a paso.
// Compila las entradas de desempeño del período (auto) y guía a la Dirección para
// redactar el análisis (9.3.2) y las decisiones (9.3.3), con firma de cierre.
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Target, GitMerge, PlusCircle, Trash2, PenLine, CheckCircle2, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard, Badge } from '@/components/ui';

const YEAR = 2026;

interface KpiRow { kpi: string; unit?: string; target?: string; connection?: string; last_value?: number | null; last_period?: string | null }
interface ObjRow { code: string; name: string; area?: string; enabled: boolean; kpis: KpiRow[] | null }
interface Inputs {
  objectives: ObjRow[];
  findings: { abiertas: string; cerradas_periodo: string; de_auditoria: string; total: string };
  incidents: { total: string; dias_perdidos: string };
  legal: { total: string; vigentes: string; vencidos: string; por_vencer: string };
  trainings: { total: string; realizadas: string; obligatorias: string };
  changes: { status: string; n: number }[];
}
interface Action { description: string; owner?: string; deadline?: string }
interface Review {
  id: string; year: number; period_label?: string; meeting_date?: string; location?: string; attendees?: string;
  prior_actions_review?: string; context_changes?: string; satisfaction_summary?: string; objectives_summary?: string;
  process_performance?: string; nc_capa_summary?: string; audit_summary?: string; legal_summary?: string;
  providers_summary?: string; resources_adequacy?: string; risks_actions_eval?: string; improvement_opportunities?: string;
  decisions?: string; improvement_actions?: Action[]; status: string; signatures?: { name: string; signed_at: string }[];
  created_by_name?: string;
}

const ENTRADAS: { key: keyof Review; label: string }[] = [
  { key: 'prior_actions_review', label: 'a) Estado de las acciones de revisiones previas' },
  { key: 'context_changes', label: 'b) Cambios en cuestiones externas e internas (FODA)' },
  { key: 'satisfaction_summary', label: 'c) Satisfacción del cliente y partes interesadas' },
  { key: 'objectives_summary', label: 'Grado de cumplimiento de los objetivos' },
  { key: 'process_performance', label: 'Desempeño de los procesos y conformidad' },
  { key: 'nc_capa_summary', label: 'No conformidades y acciones correctivas' },
  { key: 'audit_summary', label: 'Resultados de auditorías' },
  { key: 'legal_summary', label: 'Cumplimiento de requisitos legales' },
  { key: 'providers_summary', label: 'Desempeño de proveedores externos' },
  { key: 'resources_adequacy', label: 'Adecuación de los recursos' },
  { key: 'risks_actions_eval', label: 'Eficacia de las acciones frente a riesgos y oportunidades' },
  { key: 'improvement_opportunities', label: 'd) Oportunidades de mejora' },
];

function Field({ label, value, onChange, disabled }: { label: string; value?: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-dassa-celeste-deep focus:outline-none disabled:bg-gray-50 disabled:text-gray-500" />
    </div>
  );
}

export default function RevisionDireccion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = ['master_admin', 'director', 'sgi_leader'].includes(user?.role || '');

  const inputsQ = useQuery({ queryKey: ['mr-inputs', YEAR], queryFn: () => api.get<{ ok: boolean; inputs: Inputs }>(`/management-review/${YEAR}/inputs`) });
  const reviewsQ = useQuery({ queryKey: ['mr-reviews', YEAR], queryFn: () => api.get<{ ok: boolean; reviews: Review[] }>(`/management-review/${YEAR}`) });

  const review = reviewsQ.data?.reviews?.[0] || null;
  const [form, setForm] = useState<Review | null>(null);
  useEffect(() => { if (review) setForm(review); }, [review?.id, review?.status]);

  const create = useMutation({
    mutationFn: () => api.post('/management-review', { year: YEAR, period_label: `Revisión por la Dirección ${YEAR}` }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mr-reviews', YEAR] }),
  });
  const save = useMutation({
    mutationFn: (body: Partial<Review>) => api.patch(`/management-review/${review!.id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mr-reviews', YEAR] }),
  });
  const sign = useMutation({
    mutationFn: () => api.post(`/management-review/${review!.id}/close-and-sign`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mr-reviews', YEAR] }),
  });

  if (inputsQ.isLoading || reviewsQ.isLoading) return <PageContent><Header title="🏛️ Revisión por la Dirección" icon={<ClipboardCheck size={20} />} /><div className="flex justify-center py-10"><Spinner /></div></PageContent>;
  const inp = inputsQ.data!.inputs;
  const locked = !form || form.status === 'cerrada' || !canEdit;
  const set = (k: keyof Review, v: any) => setForm(f => f ? { ...f, [k]: v } : f);
  const actions: Action[] = form?.improvement_actions || [];

  return (
    <PageContent>
      <Header title="🏛️ Revisión por la Dirección" subtitle={`ISO 9.3 · ciclo ${YEAR}`} icon={<ClipboardCheck size={20} />} />

      {/* PASO 1 · Entradas de desempeño (auto) */}
      <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Target size={15} className="text-dassa-red" /> 1 · Entradas de desempeño del período <span className="text-[10px] font-normal text-gray-400">(compiladas automáticamente)</span></h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <KPICard label="NC abiertas" value={inp.findings.abiertas} sub={`${inp.findings.cerradas_periodo} cerradas · ${inp.findings.de_auditoria} de auditoría`} alert={Number(inp.findings.abiertas) > 0} />
        <KPICard label="Incidentes" value={inp.incidents.total} sub={`${inp.incidents.dias_perdidos} días perdidos`} />
        <KPICard label="Req. legales" value={`${inp.legal.vigentes}/${inp.legal.total}`} sub={`${inp.legal.vencidos} vencidos · ${inp.legal.por_vencer} por vencer`} alert={Number(inp.legal.vencidos) > 0} />
        <KPICard label="Capacitaciones" value={`${inp.trainings.realizadas}/${inp.trainings.total}`} sub={`${inp.trainings.obligatorias} obligatorias`} />
        <KPICard label="Cambios" value={inp.changes.reduce((s, c) => s + c.n, 0)} sub={inp.changes.map(c => `${c.n} ${c.status}`).join(' · ')} />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-5">
        <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">Desempeño de objetivos (KPIs habilitados)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {inp.objectives.map(o => (
            <div key={o.code} className="flex items-center gap-2 text-xs border-b border-gray-50 py-1">
              <span className="font-mono text-[9px] text-gray-400 w-12 shrink-0">{o.code}</span>
              <span className="font-semibold text-gray-700 flex-1 truncate">{o.name}</span>
              {(o.kpis && o.kpis.length) ? (
                <span className="text-[10px] text-emerald-700 font-bold shrink-0">
                  {o.kpis.filter(k => k.last_value != null).map(k => `${k.kpi.split(' ')[0]} ${k.last_value}`).join(' · ') || 'sin medición'}
                </span>
              ) : <span className="text-[10px] text-gray-300 shrink-0">en preparación</span>}
            </div>
          ))}
        </div>
      </div>

      {!review ? (
        <div className="bg-dassa-celeste/10 border border-dassa-celeste/30 rounded-xl p-5 text-center">
          <ClipboardCheck size={28} className="mx-auto text-dassa-celeste-deep mb-2" />
          <p className="text-sm text-gray-700 mb-3">Todavía no hay un acta de Revisión por la Dirección {YEAR}.</p>
          {canEdit && <button onClick={() => create.mutate()} disabled={create.isPending}
            className="px-4 py-2 bg-dassa-red text-white text-xs font-bold rounded-lg hover:bg-dassa-red-deep disabled:opacity-50">
            {create.isPending ? 'Creando…' : `Iniciar Revisión por la Dirección ${YEAR}`}</button>}
        </div>
      ) : form && (
        <>
          {/* Encabezado del acta */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900">{form.period_label}</h3>
              {form.status === 'cerrada'
                ? <Badge variant="green" label="Cerrada" />
                : <Badge variant="amber" label="Borrador" />}
            </div>
            {form.status === 'cerrada' && form.signatures?.length
              ? <span className="text-[11px] text-gray-500 inline-flex items-center gap-1"><Lock size={12} /> Firmada por {form.signatures.map(s => s.name).join(', ')}</span>
              : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 bg-white border border-gray-200 rounded-xl p-3">
            <Field label="Fecha de la reunión" value={form.meeting_date?.slice(0,10)} onChange={v => set('meeting_date', v)} disabled={locked} />
            <Field label="Lugar" value={form.location} onChange={v => set('location', v)} disabled={locked} />
            <Field label="Participantes" value={form.attendees} onChange={v => set('attendees', v)} disabled={locked} />
          </div>

          {/* PASO 2 · Análisis (9.3.2) */}
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5"><PenLine size={15} className="text-dassa-red" /> 2 · Análisis de las entradas (9.3.2)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-gray-200 rounded-xl p-4 mb-5">
            {ENTRADAS.map(e => <Field key={e.key} label={e.label} value={form[e.key] as string} onChange={v => set(e.key, v)} disabled={locked} />)}
          </div>

          {/* PASO 3 · Salidas (9.3.3) */}
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5"><GitMerge size={15} className="text-dassa-red" /> 3 · Decisiones y acciones (9.3.3)</h3>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
            <Field label="Decisiones de la Dirección (mejora, cambios al SGI, necesidades de recursos)" value={form.decisions} onChange={v => set('decisions', v)} disabled={locked} />
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-600">Acciones de mejora</label>
                {!locked && <button onClick={() => set('improvement_actions', [...actions, { description: '', owner: '', deadline: '' }])}
                  className="text-[11px] font-bold text-dassa-celeste-deep inline-flex items-center gap-1"><PlusCircle size={13} /> Agregar</button>}
              </div>
              <div className="space-y-1.5">
                {actions.map((a, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <input value={a.description} disabled={locked} placeholder="Acción" onChange={e => { const n = [...actions]; n[i] = { ...a, description: e.target.value }; set('improvement_actions', n); }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 disabled:bg-gray-50" />
                    <input value={a.owner || ''} disabled={locked} placeholder="Responsable" onChange={e => { const n = [...actions]; n[i] = { ...a, owner: e.target.value }; set('improvement_actions', n); }}
                      className="w-28 text-xs border border-gray-200 rounded px-2 py-1 disabled:bg-gray-50" />
                    <input value={a.deadline || ''} disabled={locked} placeholder="Plazo" onChange={e => { const n = [...actions]; n[i] = { ...a, deadline: e.target.value }; set('improvement_actions', n); }}
                      className="w-24 text-xs border border-gray-200 rounded px-2 py-1 disabled:bg-gray-50" />
                    {!locked && <button onClick={() => set('improvement_actions', actions.filter((_, j) => j !== i))} className="text-gray-300 hover:text-dassa-red"><Trash2 size={14} /></button>}
                  </div>
                ))}
                {!actions.length && <p className="text-[11px] text-gray-400">Sin acciones cargadas.</p>}
              </div>
            </div>
          </div>

          {/* Acciones del acta */}
          {!locked && (
            <div className="flex items-center justify-end gap-2 mb-8">
              <button onClick={() => save.mutate(form)} disabled={save.isPending}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {save.isPending ? 'Guardando…' : 'Guardar borrador'}</button>
              <button onClick={() => { save.mutate(form, { onSuccess: () => sign.mutate() }); }} disabled={sign.isPending || save.isPending}
                className="px-4 py-2 bg-dassa-red text-white text-xs font-bold rounded-lg hover:bg-dassa-red-deep disabled:opacity-50 inline-flex items-center gap-1">
                <CheckCircle2 size={14} /> Cerrar y firmar</button>
            </div>
          )}
          {form.status === 'cerrada' && <div className="mb-8 text-[11px] text-gray-500 inline-flex items-center gap-1"><Lock size={12} /> Acta cerrada y firmada — registro de la Revisión por la Dirección {YEAR}.</div>}
        </>
      )}
    </PageContent>
  );
}
