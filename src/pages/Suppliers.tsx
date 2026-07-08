import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Truck, Search, CheckCircle2,
  XCircle, Phone, Mail, MapPin, AlertTriangle, ClipboardCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Supplier {
  id: string; name: string; cuit?: string; category?: string;
  contact_name?: string; contact_email?: string; contact_phone?: string;
  address?: string; is_active?: boolean; is_homologated?: boolean;
  notes?: string; is_critical?: boolean;
  latest_eval_result?: string; latest_eval_year?: number;
  created_at: string;
}

interface SupplierEvaluation {
  id: string; year: number;
  quality_score: number; payment_terms_score: number;
  price_quality_score: number; legal_compliance_score: number;
  total: number; result: string; observations?: string;
  evaluated_by_name?: string; created_at: string;
}

interface Acuse {
  id: string; company_name: string; cuit: string; person_name: string;
  email: string; phone?: string; activity_type: string; comments?: string;
  doc_version?: string; created_at: string;
}

// ─── Constantes ─────────────────────────────────────────────
// Estado del proveedor DERIVADO del modelo real (no un campo manual):
// alta/baja (is_active) + homologación + resultado de la última evaluación F-TRI-17.
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  homologado: { label: 'Homologado',    bg: 'bg-emerald-100', color: 'text-emerald-700' },
  evaluacion: { label: 'En evaluación', bg: 'bg-blue-100',    color: 'text-blue-700' },
  suspendido: { label: 'Suspendido',    bg: 'bg-amber-100',   color: 'text-amber-700' },
  no_apto:    { label: 'No apto',        bg: 'bg-red-100',     color: 'text-red-700' },
  inactivo:   { label: 'Inactivo',       bg: 'bg-gray-100',    color: 'text-gray-500' },
};

function estadoDe(s: Supplier): keyof typeof STATUS_CONFIG {
  if (s.is_active === false) return 'inactivo';
  if (s.latest_eval_result === 'no_apto') return 'no_apto';
  if (s.latest_eval_result === 'suspendido') return 'suspendido';
  if (s.latest_eval_result === 'apto' || s.is_homologated) return 'homologado';
  return 'evaluacion';
}

const CATEGORIES = ['servicios', 'mantenimiento', 'transporte', 'insumos', 'tecnologia', 'otros'];
const CATEGORY_LABELS: Record<string, string> = {
  servicios: 'Servicios', mantenimiento: 'Mantenimiento', transporte: 'Transporte',
  insumos: 'Insumos', tecnologia: 'Tecnología', otros: 'Otros',
};

// F-TRI-17 · escala por criterio y resultado por puntaje total
const SCORE_OPTIONS = [
  { v: 0, label: 'N/A (0)' },
  { v: 1, label: 'Muy malo (1)' },
  { v: 2, label: 'Malo (2)' },
  { v: 3, label: 'Regular (3)' },
  { v: 4, label: 'Bueno (4)' },
  { v: 5, label: 'Muy bueno (5)' },
];
const EVAL_CRITERIA: [string, string][] = [
  ['quality_score',          'Calidad del servicio/producto'],
  ['payment_terms_score',    'Plazos de pago'],
  ['price_quality_score',    'Relación precio/calidad'],
  ['legal_compliance_score', 'Cumplimiento de requisitos legales'],
];
const RESULT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  apto:       { label: 'APTO PARA COMPRA', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  suspendido: { label: 'SUSPENDIDO',       bg: 'bg-amber-100',   color: 'text-amber-700' },
  no_apto:    { label: 'NO APTO',          bg: 'bg-red-100',     color: 'text-red-700' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  proveedor_insumos: 'Proveedor de insumos', contratista_obra: 'Contratista de obra',
  transportista: 'Transportista', otro: 'Otro',
};

const normCuit = (c?: string) => (c || '').replace(/\D/g, '');

// ─── New / Edit Supplier Modal ───────────────────────────────
function SupplierModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    cuit: supplier?.cuit ?? '',
    category: supplier?.category ?? 'servicios',
    contact_name: supplier?.contact_name ?? '',
    contact_email: supplier?.contact_email ?? '',
    contact_phone: supplier?.contact_phone ?? '',
    address: supplier?.address ?? '',
    notes: supplier?.notes ?? '',
  });
  const [isActive, setIsActive] = useState(supplier?.is_active ?? true);
  const [isCritical, setIsCritical] = useState(supplier?.is_critical ?? false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, is_active: isActive, is_critical: isCritical };
      return isEdit
        ? api.patch(`/suppliers/${supplier!.id}`, payload)
        : api.post('/suppliers', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Razón Social <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Nombre del proveedor" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">CUIT</label>
              <input inputMode="numeric" value={form.cuit} onChange={e => set('cuit', e.target.value)}
                placeholder="XX-XXXXXXXX-X" className="input-field" />
            </div>
            <div>
              <label className="label-field">Rubro</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                {CATEGORIES.map(t => <option key={t} value={t}>{CATEGORY_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Contacto</label>
            <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
              placeholder="Nombre del contacto" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Email</label>
              <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                placeholder="email@proveedor.com" className="input-field" />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                placeholder="+54 11 ..." className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Dirección del proveedor" className="input-field" />
          </div>
          <div>
            <label className="label-field">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Observaciones sobre el proveedor" className="input-field resize-none" />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="rounded border-gray-300" />
            Proveedor activo (dado de alta)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)}
              className="rounded border-gray-300" />
            Proveedor crítico (incidencia en la calidad del servicio — P-TRI-11)
          </label>
          <p className="text-[11px] text-gray-400">
            La condición <b>Homologado / Suspendido / No apto</b> se define con la evaluación anual F-TRI-17, no acá.
          </p>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.name || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Evaluation Modal (F-TRI-17) ─────────────────────────────
function EvaluationModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [scores, setScores] = useState<Record<string, number>>({
    quality_score: 3, payment_terms_score: 3, price_quality_score: 3, legal_compliance_score: 3,
  });
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');

  const { data: history = [] } = useQuery<SupplierEvaluation[]>({
    queryKey: ['supplier-evaluations', supplier.id],
    queryFn: () => api.get(`/suppliers/${supplier.id}/evaluations`),
  });

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const result = total > 12 ? 'apto' : total >= 10 ? 'suspendido' : 'no_apto';
  const rc = RESULT_CONFIG[result];

  const mutation = useMutation({
    mutationFn: () => api.post(`/suppliers/${supplier.id}/evaluations`,
      { year, ...scores, observations }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier-evaluations', supplier.id] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Evaluación F-TRI-17 · {supplier.name}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="w-32">
            <label className="label-field">Año</label>
            <input type="number" inputMode="numeric" min={2000} max={2100} value={year}
              onChange={e => setYear(Number(e.target.value))} className="input-field" />
          </div>
          {EVAL_CRITERIA.map(([key, label]) => (
            <div key={key}>
              <label className="label-field">{label}</label>
              <select value={scores[key]}
                onChange={e => setScores(p => ({ ...p, [key]: Number(e.target.value) }))}
                className="input-field">
                {SCORE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="label-field">Observaciones</label>
            <textarea value={observations} onChange={e => setObservations(e.target.value)}
              rows={2} placeholder="Observaciones de la evaluación" className="input-field resize-none" />
          </div>
          {/* Total + resultado en vivo (APTO > 12 · SUSPENDIDO 10-12 · NO APTO < 10) */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${rc.bg}`}>
            <span className={`text-xs font-bold ${rc.color}`}>Total: {total} / 20</span>
            <span className={`text-xs font-extrabold ${rc.color}`}>{rc.label}</span>
          </div>
          {history.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Histórico</p>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {history.map(ev => {
                  const hc = RESULT_CONFIG[ev.result] ?? RESULT_CONFIG.no_apto;
                  return (
                    <div key={ev.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-semibold text-gray-700">{ev.year}</span>
                      <span className="text-xs text-gray-500">{ev.total} pts</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${hc.bg} ${hc.color}`}>
                        {hc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={mutation.isPending || year < 2000 || year > 2100}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Guardar Evaluación
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Acuses de requisitos (landing pública) ──────────────────
function AcusesTable({ acuses }: { acuses: Acuse[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="th-cell">Empresa</th>
            <th className="th-cell w-32">CUIT</th>
            <th className="th-cell hidden md:table-cell">Persona</th>
            <th className="th-cell hidden md:table-cell w-40">Actividad</th>
            <th className="th-cell w-28">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {acuses.map(a => (
            <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-800">{a.company_name}</p>
                {a.email && <p className="text-[10px] text-gray-400">{a.email}</p>}
              </td>
              <td className="px-4 py-3">
                <span className="text-[10px] text-gray-500 font-mono">{a.cuit || '—'}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-xs text-gray-600">{a.person_name}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-[10px] text-gray-500">{ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-[10px] text-gray-500">{new Date(a.created_at).toLocaleDateString('es-AR')}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {acuses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ClipboardCheck size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin acuses registrados</p>
          <p className="text-xs text-gray-300 mt-1">Llegan desde la landing pública de proveedores</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Suppliers() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'proveedores' | 'acuses'>('proveedores');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>();
  const [evaluating, setEvaluating] = useState<Supplier | undefined>();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', search, filterType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('category', filterType);
      const qs = params.toString();
      return api.get(`/suppliers${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });

  // Estado es derivado (no filtrable en el server) → filtro client-side.
  const visibles = filterStatus ? suppliers.filter(s => estadoDe(s) === filterStatus) : suppliers;

  // Acuses de requisitos firmados en la landing pública (F-TRI-18 / F-TRI-52)
  const { data: acusesData } = useQuery<{ items: Acuse[] }>({
    queryKey: ['proveedores-acuses'],
    queryFn: () => api.get('/proveedores/acuses'),
    retry: false,
  });
  const acuses = acusesData?.items ?? [];
  const acuseCuits = new Set(acuses.map(a => normCuit(a.cuit)).filter(Boolean));

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const activos = suppliers.filter(s => s.is_active !== false).length;
  const enEval = suppliers.filter(s => estadoDe(s) === 'evaluacion').length;
  const suspendidos = suppliers.filter(s => ['suspendido', 'no_apto'].includes(estadoDe(s))).length;
  const criticos = suppliers.filter(s => s.is_critical).length;

  return (
    <>
      <Header
        title="Proveedores"
        subtitle="Evaluación y gestión de proveedores — ISO 9001"
        alerts={enEval}
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Proveedor
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {[
          { key: 'proveedores', label: 'Proveedores',           icon: <Truck size={13} /> },
          { key: 'acuses',      label: 'Acuses de requisitos',  icon: <ClipboardCheck size={13} /> },
        ].map((t: any) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors
              ${tab === t.key ? 'border-dassa-red text-dassa-red-deep' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.icon}{t.label}
            {t.key === 'acuses' && acuses.length > 0 && (
              <span className="ml-1 bg-gray-200 text-gray-600 text-[9px] font-bold rounded-full px-1.5 py-0.5">{acuses.length}</span>
            )}
          </button>
        ))}
      </div>

      <PageContent>
        {tab === 'acuses' ? (
          <AcusesTable acuses={acuses} />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KPICard label="Total Proveedores" value={suppliers.length} sub="Registrados" icon={<Truck size={16} />} />
              <KPICard label="Activos" value={activos} sub="Habilitados" icon={<CheckCircle2 size={16} />} />
              <KPICard label="Críticos" value={criticos} sub="Incidencia en el SGI" icon={<AlertTriangle size={16} />} />
              <KPICard label="En Evaluación" value={enEval} sub="Pendientes de aprobación" alert={enEval > 0} alertColor="#f59e0b" />
              <KPICard label="Suspendidos" value={suspendidos} sub="No aptos" alert={suspendidos > 0} icon={<XCircle size={16} />} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar proveedor..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los rubros</option>
                {CATEGORIES.map(t => <option key={t} value={t}>{CATEGORY_LABELS[t]}</option>)}
              </select>
              {(search || filterStatus || filterType) && (
                <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{visibles.length} proveedores</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell">Proveedor</th>
                    <th className="th-cell hidden md:table-cell w-28">CUIT</th>
                    <th className="th-cell hidden md:table-cell w-24">Rubro</th>
                    <th className="th-cell hidden lg:table-cell">Contacto</th>
                    <th className="th-cell hidden xl:table-cell">Dirección</th>
                    <th className="th-cell w-24">Estado</th>
                    {isAdmin && <th className="th-cell w-40">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(s => {
                    const sc = STATUS_CONFIG[estadoDe(s)];
                    return (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={s.name} size={28} />
                            <div>
                              <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                                {s.name}
                                {s.is_critical && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-100 text-red-700">CRÍTICO</span>
                                )}
                                {!!s.cuit && acuseCuits.has(normCuit(s.cuit)) && (
                                  <span title="Acuse de requisitos recibido"
                                    className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">Acuse ✓</span>
                                )}
                              </p>
                              {s.contact_name && <p className="text-[10px] text-gray-400">{s.contact_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500 font-mono">{s.cuit || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500">{CATEGORY_LABELS[s.category ?? ''] || s.category || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {s.contact_email && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Mail size={9} />{s.contact_email}
                              </span>
                            )}
                            {s.contact_phone && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Phone size={9} />{s.contact_phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell max-w-[180px]">
                          {s.address ? (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                              <MapPin size={9} className="flex-shrink-0" />{s.address}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEvaluating(s)} title="Evaluación anual F-TRI-17"
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 px-2 py-1">
                                Evaluar
                              </button>
                              <button onClick={() => { setEditing(s); setShowModal(true); }}
                                className="text-[10px] font-bold text-dassa-red hover:text-blue-800 px-2 py-1">
                                Editar
                              </button>
                              <button onClick={() => { if (confirm('¿Eliminar proveedor?')) deleteMut.mutate(s.id); }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1">
                                Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibles.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Truck size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin proveedores registrados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <SupplierModal supplier={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
      {evaluating && <EvaluationModal supplier={evaluating} onClose={() => setEvaluating(undefined)} />}
    </>
  );
}
