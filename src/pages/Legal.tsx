import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Scale, Clock,
  CheckCircle2, XCircle, Calendar
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';
import ExportExcelButton from '@/components/ExportExcelButton';
import SearchInput from '@/components/SearchInput';
import { matchesQuery } from '@/lib/textSearch';

// ─── Tipos ──────────────────────────────────────────────────
interface LegalReq {
  id: string; code: string; title: string; description?: string;
  category: string; issuing_authority?: string; applicable_area?: string;
  effective_date?: string; expiration_date?: string;
  alert_days_before: number; responsible_id?: string; responsible_name?: string;
  evidence_url?: string; evidence_notes?: string;
  compliance_status?: string; compliance_evaluation?: string; last_verification_date?: string;
  computed_status?: string; days_remaining?: number;
  is_active: boolean; created_at: string;
}

interface User { id: string; full_name: string; }

// ─── Constantes ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: typeof CheckCircle2 }> = {
  vigente:    { label: 'Vigente',     bg: 'bg-emerald-100', color: 'text-emerald-700', icon: CheckCircle2 },
  por_vencer: { label: 'Por Vencer',  bg: 'bg-amber-100',   color: 'text-amber-700',   icon: Clock },
  vencido:    { label: 'Vencido',     bg: 'bg-red-100',     color: 'text-red-700',     icon: XCircle },
};

const CATEGORIES = [
  'laboral', 'ambiental', 'seguridad_higiene', 'calidad',
  'habilitacion', 'tributaria', 'aduanera', 'otra'
];
const CAT_LABELS: Record<string, string> = {
  laboral: 'Laboral', ambiental: 'Ambiental', seguridad_higiene: 'Seg. e Higiene',
  calidad: 'Calidad', habilitacion: 'Habilitación', tributaria: 'Tributaria',
  aduanera: 'Aduanera', otra: 'Otra',
};

// Evaluación del cumplimiento (ISO 14001/45001 9.1.2) — distinta de la vigencia:
// un requisito puede estar vigente y no cumplirse todavía.
const COMPLIANCE: Record<string, { label: string; bg: string; color: string }> = {
  cumple:      { label: 'Cumple',      bg: 'bg-emerald-100', color: 'text-emerald-700' },
  en_proceso:  { label: 'En proceso',  bg: 'bg-amber-100',   color: 'text-amber-700' },
  no_aplica:   { label: 'No aplica',   bg: 'bg-slate-100',   color: 'text-slate-500' },
  sin_evaluar: { label: 'Sin evaluar', bg: 'bg-red-50',      color: 'text-red-600' },
};

function ComplianceBadge({ status, evaluation }: { status?: string; evaluation?: string }) {
  const c = COMPLIANCE[status || 'sin_evaluar'] ?? COMPLIANCE.sin_evaluar;
  return (
    <span title={evaluation || 'Sin evaluación registrada'}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status, days }: { status?: string; days?: number }) {
  const c = STATUS_CONFIG[status ?? 'vigente'] ?? STATUS_CONFIG.vigente;
  const Icon = c.icon;
  return (
    <div className="flex flex-col items-start">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${c.bg} ${c.color}`}>
        <Icon size={10} />
        {c.label}
      </span>
      {days !== null && days !== undefined && status !== 'vigente' && (
        <span className={`text-[9px] mt-0.5 ${status === 'vencido' ? 'text-red-500' : 'text-amber-500'}`}>
          {status === 'vencido' ? `Venció hace ${Math.abs(days)} días` : `Faltan ${days} días`}
        </span>
      )}
    </div>
  );
}

// ─── New / Edit Legal Modal ──────────────────────────────────
function LegalModal({ item, users, onClose }: { item?: LegalReq; users: User[]; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState({
    title: item?.title ?? '',
    description: item?.description ?? '',
    category: item?.category ?? 'laboral',
    issuing_authority: item?.issuing_authority ?? '',
    applicable_area: item?.applicable_area ?? '',
    effective_date: item?.effective_date?.substring(0, 10) ?? '',
    expiration_date: item?.expiration_date?.substring(0, 10) ?? '',
    alert_days_before: String(item?.alert_days_before ?? 90),
    responsible_id: item?.responsible_id ?? '',
    evidence_url: item?.evidence_url ?? '',
    evidence_notes: item?.evidence_notes ?? '',
    compliance_status: item?.compliance_status ?? 'sin_evaluar',
    compliance_evaluation: item?.compliance_evaluation ?? '',
    last_verification_date: item?.last_verification_date?.substring(0, 10) ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        alert_days_before: parseInt(form.alert_days_before) || 90,
        responsible_id: form.responsible_id || null,
        effective_date: form.effective_date || null,
        expiration_date: form.expiration_date || null,
        last_verification_date: form.last_verification_date || null,
      };
      return isEdit
        ? api.patch(`/legal/${item!.id}`, payload)
        : api.post('/legal', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Requisito Legal' : 'Nuevo Requisito Legal'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Título <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ej: Habilitación municipal, Ley 19587" className="input-field" />
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Detalle del requisito legal" className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Categoría <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Organismo Emisor</label>
              <input value={form.issuing_authority} onChange={e => set('issuing_authority', e.target.value)}
                placeholder="Ej: AFIP, SRT, Municipio" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Área Aplicable</label>
            <input value={form.applicable_area} onChange={e => set('applicable_area', e.target.value)}
              placeholder="Ej: Depósito fiscal, Toda la empresa" className="input-field" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Fecha Vigencia</label>
              <input type="date" value={form.effective_date} onChange={e => set('effective_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Fecha Vencimiento</label>
              <input type="date" value={form.expiration_date} onChange={e => set('expiration_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Días Alerta</label>
              <input type="number" inputMode="numeric" value={form.alert_days_before} onChange={e => set('alert_days_before', e.target.value)}
                placeholder="90" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Responsable</label>
            <select value={form.responsible_id} onChange={e => set('responsible_id', e.target.value)} className="input-field">
              <option value="">Sin asignar</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          {/* Evaluación del cumplimiento — ISO 14001/45001 9.1.2 */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/60">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Evaluación del cumplimiento</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Estado</label>
                <select value={form.compliance_status} onChange={e => set('compliance_status', e.target.value)} className="input-field">
                  {Object.entries(COMPLIANCE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Fecha de evaluación</label>
                <input type="date" value={form.last_verification_date}
                  onChange={e => set('last_verification_date', e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label-field">Fundamento de la evaluación</label>
              <textarea value={form.compliance_evaluation} onChange={e => set('compliance_evaluation', e.target.value)}
                rows={2} placeholder="Cómo se verifica el cumplimiento de este requisito"
                className="input-field resize-none" />
            </div>
          </div>

          <div>
            <label className="label-field">Evidencia / Notas</label>
            <textarea value={form.evidence_notes} onChange={e => set('evidence_notes', e.target.value)}
              rows={2} placeholder="Notas sobre evidencias de cumplimiento" className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.title || !form.category || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Requisito'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Legal() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LegalReq | undefined>();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterCompliance, setFilterCompliance] = useState('');
  const [q, setQ] = useState('');

  const { data: items = [], isLoading } = useQuery<LegalReq[]>({
    queryKey: ['legal'],
    queryFn: () => api.get('/legal'),
    refetchInterval: 60_000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const filtered = items.filter(r => {
    if (!matchesQuery(q, r.code, r.title, r.description, CAT_LABELS[r.category] || r.category, r.issuing_authority, r.applicable_area, r.responsible_name, r.compliance_evaluation, r.evidence_notes)) return false;
    if (filterStatus && r.computed_status !== filterStatus) return false;
    if (filterCat && r.category !== filterCat) return false;
    if (filterCompliance && (r.compliance_status || 'sin_evaluar') !== filterCompliance) return false;
    return true;
  });

  const vencidos = items.filter(r => r.computed_status === 'vencido').length;
  const porVencer = items.filter(r => r.computed_status === 'por_vencer').length;
  const vigentes = items.filter(r => r.computed_status === 'vigente' || !r.computed_status).length;
  const sinVto = items.filter(r => !r.expiration_date).length;
  const sinEvaluar = items.filter(r => !r.compliance_status || r.compliance_status === 'sin_evaluar').length;
  const cumplen = items.filter(r => r.compliance_status === 'cumple').length;
  const alertas = vencidos + porVencer;

  return (
    <>
      <Header
        title="Requisitos Legales"
        subtitle="Control de cumplimiento legal y normativo — TRINORMA"
        doc="F-TRI-10"
        alerts={alertas}
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Requisito
            </button>
          )
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
              <KPICard label="Vencidos" value={vencidos} sub="Requieren acción inmediata" alert={vencidos > 0} icon={<XCircle size={16} />} />
              <KPICard label="Por Vencer" value={porVencer} sub="Dentro del período de alerta" alert={porVencer > 0} alertColor="#f59e0b" icon={<Clock size={16} />} />
              <KPICard label="Vigentes" value={vigentes} sub="En cumplimiento" icon={<CheckCircle2 size={16} />} />
              <KPICard label="Sin Vencimiento" value={sinVto} sub="Permanentes / indefinidos" icon={<Calendar size={16} />} />
            </div>

            {/* Evaluación del cumplimiento — ISO 14001/45001 9.1.2 */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Cumplen" value={`${cumplen}/${items.length}`} sub="Con evaluación registrada" icon={<CheckCircle2 size={16} />} />
              <KPICard label="Sin evaluar" value={sinEvaluar} sub="Falta evaluar el cumplimiento" alert={sinEvaluar > 0} icon={<Scale size={16} />} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <SearchInput value={q} onChange={setQ} placeholder="Buscar requisito…" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterCompliance} onChange={e => setFilterCompliance(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todo el cumplimiento</option>
                {Object.entries(COMPLIANCE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
              {(filterStatus || filterCat || filterCompliance) && (
                <button onClick={() => { setFilterStatus(''); setFilterCat(''); setFilterCompliance(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{filtered.length} requisitos</span>
              <ExportExcelButton<LegalReq> filename="F-TRI-10-requisitos-legales" sheetName="Requisitos Legales" rows={filtered} columns={[
                { header: 'Código', value: r => r.code },
                { header: 'Título', value: r => r.title },
                { header: 'Descripción', value: r => r.description || '' },
                { header: 'Categoría', value: r => CAT_LABELS[r.category] || r.category },
                { header: 'Organismo', value: r => r.issuing_authority || '' },
                { header: 'Área aplicable', value: r => r.applicable_area || '' },
                { header: 'Vigencia', value: r => fmtDate(r.effective_date) },
                { header: 'Vencimiento', value: r => fmtDate(r.expiration_date) },
                { header: 'Estado', value: r => STATUS_CONFIG[r.computed_status ?? 'vigente']?.label ?? '' },
                { header: 'Cumplimiento', value: r => COMPLIANCE[r.compliance_status || 'sin_evaluar']?.label ?? '' },
                { header: 'Fundamento de la evaluación', value: r => r.compliance_evaluation || '' },
                { header: 'Fecha de evaluación', value: r => fmtDate(r.last_verification_date) },
                { header: 'Responsable', value: r => r.responsible_name || '' },
                { header: 'Evidencia / notas', value: r => r.evidence_notes || '' },
              ]}/>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell w-20">Código</th>
                    <th className="th-cell">Título</th>
                    <th className="th-cell w-28">Categoría</th>
                    <th className="th-cell hidden lg:table-cell">Organismo</th>
                    <th className="th-cell w-24">Vigencia</th>
                    <th className="th-cell w-24">Vencimiento</th>
                    <th className="th-cell w-28">Estado</th>
                    <th className="th-cell w-24">Cumplimiento</th>
                    <th className="th-cell hidden lg:table-cell">Responsable</th>
                    {isAdmin && <th className="th-cell w-20">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                      ${r.computed_status === 'vencido' ? 'bg-red-50/40' : r.computed_status === 'por_vencer' ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <code className="text-[10px] font-extrabold text-dassa-red-deep">{r.code}</code>
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-xs font-semibold text-gray-800 truncate">{r.title}</p>
                        {r.applicable_area && <p className="text-[10px] text-gray-400 truncate">{r.applicable_area}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {CAT_LABELS[r.category] || r.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-[10px] text-gray-500">{r.issuing_authority || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-gray-500">{fmtDate(r.effective_date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold ${r.computed_status === 'vencido' ? 'text-red-600' : r.computed_status === 'por_vencer' ? 'text-amber-600' : 'text-gray-500'}`}>
                          {fmtDate(r.expiration_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.computed_status} days={r.days_remaining} />
                      </td>
                      <td className="px-4 py-3">
                        <ComplianceBadge status={r.compliance_status} evaluation={r.compliance_evaluation} />
                        {r.last_verification_date && (
                          <p className="text-[9px] text-gray-400 mt-0.5">{fmtDate(r.last_verification_date)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {r.responsible_name ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={r.responsible_name} size={20} />
                            <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{r.responsible_name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button onClick={() => { setEditing(r); setShowModal(true); }}
                            className="text-[10px] font-bold text-dassa-red hover:text-blue-800">
                            Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Scale size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin requisitos legales</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <LegalModal item={editing} users={users} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
