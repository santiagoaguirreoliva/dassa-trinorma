import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Save, CheckCircle2, XCircle,
  Play, Package, Lock, BarChart3, ShoppingCart,
  ChevronDown, AlertTriangle, DollarSign,
  Eye, ExternalLink, FileText, MessageSquare, Image as ImageIcon, Calendar, Sparkles, Wand2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Badge, Avatar, Spinner, KPICard, PageContent } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Purchase {
  id: string; code: string; description: string;
  category: string; priority: string;
  estimated_budget?: number; amount?: number;
  required_date?: string; purpose?: string;
  recommended_supplier?: string; supplier_name?: string;
  invoice_number?: string; purchase_date?: string;
  requested_by: string; requested_by_name: string;
  approved_by?: string; approved_by_name?: string;
  executed_by?: string; executed_by_name?: string;
  status: string; approval_notes?: string;
  deferred_until?: string; payment_method?: string;
  created_at: string; approved_at?: string;
  // CAPA 1 · Compras 2.0
  source_url?: string;
  long_description?: string;
  item_specs?: Record<string, any> | null;
  photo_urls?: string[] | null;
}

interface Perms { can_request: boolean; can_authorize: boolean; can_execute: boolean; }

// ─── Constantes ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  borrador:      { label: 'Solicitud',    color: 'text-gray-600',  bg: 'bg-gray-100' },
  aprobada:      { label: 'Autorizada',   color: 'text-dassa-red-deep',   bg: 'bg-dassa-red-tint' },
  rechazada:     { label: 'Rechazada',    color: 'text-red-700',    bg: 'bg-red-100' },
  en_ejecucion:  { label: 'En Ejecución', color: 'text-violet-700', bg: 'bg-violet-100' },
  completada:    { label: 'Recibida',     color: 'text-emerald-700',bg: 'bg-emerald-100' },
  cancelada:     { label: 'Cerrada',      color: 'text-gray-500',  bg: 'bg-gray-100' },
};

const CATEGORIES = ['general', 'servicios', 'materiales', 'equipamiento', 'otros'];
const CAT_LABELS: Record<string, string> = {
  general: 'Estándar', servicios: 'Servicios',
  materiales: 'Materiales', equipamiento: 'Equipamiento', otros: 'Otros'
};
const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  urgente: { label: 'Urgente', dot: 'bg-red-500' },
  alta:    { label: 'Alta',    dot: 'bg-orange-400' },
  media:   { label: 'Media',   dot: 'bg-amber-400' },
  baja:    { label: 'Baja',    dot: 'bg-gray-300' },
};

const CAT_COLORS: Record<string, string> = {
  general: '#3b82f6', servicios: '#8b5cf6',
  materiales: '#f59e0b', equipamiento: '#10b981', otros: '#94a3b8'
};

function fmt(n?: number) {
  if (!n) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.borrador;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
}

// ─── Nueva Solicitud Modal ────────────────────────────────────
function NewPurchaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: '', category: 'general', priority: 'media',
    estimated_budget: '', required_date: '', purpose: '', recommended_supplier: '',
    source_url: '', long_description: ''
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // CAPA 2 · Auto-completar con IA
  const [importInput, setImportInput] = useState('');
  const [importedSpecs, setImportedSpecs] = useState<Record<string, any> | null>(null);
  const [importedPhotos, setImportedPhotos] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  const importMut = useMutation({
    mutationFn: async () => {
      const trimmed = importInput.trim();
      const isUrl = /^https?:\/\//.test(trimmed);
      const payload = isUrl
        ? { url: trimmed.split(/\s/)[0], text: trimmed.includes(' ') ? trimmed : '' }
        : { text: trimmed };
      const r = await api.post('/purchases/parse-product-info', payload);
      return (r as any).data;
    },
    onSuccess: (data: any) => {
      setForm(p => ({
        ...p,
        description:          data.titulo || p.description,
        long_description:     [data.descripcion, data.garantia && `Garantía: ${data.garantia}`, data.envio && `Envío: ${data.envio}`, data.condicion && `Condición: ${data.condicion}`].filter(Boolean).join('\n\n') || p.long_description,
        source_url:           data._meta?.url || p.source_url,
        recommended_supplier: data.vendedor || p.recommended_supplier,
        estimated_budget:     (data.precio && (!data.moneda || data.moneda === 'ARS')) ? String(data.precio) : p.estimated_budget,
        category:             data.categoria_sgi || p.category,
      }));
      // Guardar specs y fotos para enviar al crear
      const specs: Record<string, any> = {};
      if (data.sku) specs.sku = data.sku;
      if (data.precio && data.moneda) specs.precio_origen = { valor: data.precio, moneda: data.moneda };
      if (data.condicion) specs.condicion = data.condicion;
      if (data.garantia) specs.garantia = data.garantia;
      if (data.envio) specs.envio = data.envio;
      if (data.categoria) specs.categoria_origen = data.categoria;
      if (data.disponible !== null && data.disponible !== undefined) specs.disponible = data.disponible;
      if (data._meta?.strategy) specs._import_strategy = data._meta.strategy;
      setImportedSpecs(Object.keys(specs).length ? specs : null);
      setImportedPhotos(Array.isArray(data.fotos) ? data.fotos : []);
      setImportSuccess(true);
      setImportError('');
    },
    onError: (e: any) => {
      setImportError(e.response?.data?.error || e.message || 'Error al parsear');
      setImportSuccess(false);
    },
  });

  const create = useMutation({
    mutationFn: () => api.post('/purchases', {
      ...form,
      estimated_budget: form.estimated_budget ? parseFloat(form.estimated_budget) : undefined,
      item_specs: importedSpecs || undefined,
      photo_urls: importedPhotos.length ? importedPhotos : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Nueva Solicitud de Compra</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* CAPA 2 · Auto-completar con IA */}
          <div className="rounded-xl border-2 border-dashed border-dassa-celeste/40 bg-dassa-celeste-tint/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 size={16} className="text-dassa-celeste-deep" />
              <h4 className="text-xs font-extrabold text-dassa-celeste-deep uppercase tracking-wide">Auto-completar con IA</h4>
            </div>
            <p className="text-[11px] text-gray-600 mb-2">
              Pegá un <strong>link</strong> de Mercado Libre / sitio del proveedor, o copiá el <strong>texto</strong> del producto desde la web/mail/PDF. La IA extrae título, precio, descripción y categoría.
            </p>
            <textarea
              value={importInput}
              onChange={e => setImportInput(e.target.value)}
              rows={3}
              placeholder="Pegá link y/o texto aquí. Ej: 'https://articulo.mercadolibre.com.ar/...' o 'Casco de seguridad Libus IRAM 3620 - $8500'"
              className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-dassa-celeste mb-2"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] text-gray-400 flex-1">
                {importSuccess && <span className="text-emerald-600 font-semibold">✓ Datos importados. Editá lo que necesites abajo.</span>}
                {importError && <span className="text-red-600 font-semibold">⚠ {importError}</span>}
              </div>
              <button
                onClick={() => importMut.mutate()}
                disabled={!importInput.trim() || importMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-celeste-deep text-white font-bold text-[11px] rounded-lg hover:bg-dassa-celeste disabled:opacity-40"
              >
                {importMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {importMut.isPending ? 'Procesando...' : 'Auto-completar'}
              </button>
            </div>
            {importedPhotos.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dassa-celeste/30">
                <p className="text-[10px] text-gray-500 mb-1">{importedPhotos.length} foto(s) importadas:</p>
                <div className="flex gap-1 overflow-x-auto">
                  {importedPhotos.slice(0,6).map((u,i) => (
                    <img key={i} src={u} alt="" className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label-field">Proveedor sugerido</label>
            <input value={form.recommended_supplier} onChange={e => set('recommended_supplier', e.target.value)}
              placeholder="Nombre del proveedor sugerido (opcional)"
              className="input-field" />
          </div>
          <div>
            <label className="label-field">Descripción <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Detalle de lo que se solicita comprar..."
              className="input-field resize-none" />
          </div>
          <div>
            <label className="label-field">Motivo / Propósito</label>
            <textarea value={form.purpose} onChange={e => set('purpose', e.target.value)}
              rows={2} placeholder="¿Para qué se necesita? ¿Está relacionado con alguna NC o requisito legal?"
              className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Monto estimado ($)</label>
              <input type="number" value={form.estimated_budget} onChange={e => set('estimated_budget', e.target.value)}
                placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="label-field">Fecha requerida</label>
              <input type="date" value={form.required_date} onChange={e => set('required_date', e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Prioridad</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input-field">
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>
          {/* CAPA 1 · Compras 2.0 · campos enriquecidos */}
          <div>
            <label className="label-field flex items-center gap-1.5">
              <ExternalLink size={12} className="text-dassa-celeste-deep" />
              Link de origen (Mercado Libre, web del proveedor)
            </label>
            <input value={form.source_url} onChange={e => set('source_url', e.target.value)}
              placeholder="https://articulo.mercadolibre.com.ar/..."
              className="input-field" />
            <p className="text-[10px] text-gray-400 mt-1">Si pegás un link, en la próxima fase la IA lo lee y autocompleta los datos.</p>
          </div>
          <div>
            <label className="label-field flex items-center gap-1.5">
              <FileText size={12} className="text-dassa-celeste-deep" />
              Descripción detallada / especificaciones técnicas
            </label>
            <textarea value={form.long_description} onChange={e => set('long_description', e.target.value)}
              rows={3} placeholder="Especificaciones, modelo, marca, dimensiones, garantía esperada, condiciones de entrega..."
              className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !create.isPending && create.mutate()}
            disabled={!form.description || create.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            Crear Solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Authorize Modal ──────────────────────────────────────────
function AuthorizeModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const qc = useQueryClient();
  const [approve, setApprove] = useState(true);
  const [notes, setNotes] = useState('');
  const [deferred, setDeferred] = useState(false);
  const [deferredDate, setDeferredDate] = useState('');

  const mutate = useMutation({
    mutationFn: () => api.patch(`/purchases/${purchase.id}/authorize`, {
      approve,
      notes,
      deferred_until: deferred ? deferredDate : undefined
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Autorizar / Rechazar</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 mb-1">{purchase.code}</p>
            <p className="text-sm font-semibold text-gray-800">{purchase.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>Solicitante: {purchase.requested_by_name}</span>
              <span>Presupuesto: {fmt(purchase.estimated_budget)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setApprove(v)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-colors
                  ${approve === v
                    ? v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                {v ? <><CheckCircle2 size={16} /> Autorizar</> : <><XCircle size={16} /> Rechazar</>}
              </button>
            ))}
          </div>
          {approve && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={deferred} onChange={e => setDeferred(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Autorización diferida a fecha futura</span>
            </label>
          )}
          {approve && deferred && (
            <div>
              <label className="label-field">Vigente desde</label>
              <input type="date" value={deferredDate} onChange={e => setDeferredDate(e.target.value)} className="input-field" />
            </div>
          )}
          <div>
            <label className="label-field">{approve ? 'Observaciones (opcional)' : 'Motivo de rechazo *'}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder={approve ? 'Notas adicionales...' : 'Explicar motivo del rechazo...'}
              className="input-field resize-none" />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => mutate.mutate()}
            disabled={(!approve && !notes) || mutate.isPending}
            className={`flex items-center gap-2 px-5 py-2 font-bold text-sm rounded-lg text-white disabled:opacity-50
              ${approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {mutate.isPending && <Loader2 size={14} className="animate-spin" />}
            {approve ? 'Confirmar autorización' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receive Modal ────────────────────────────────────────────
function ReceiveModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ purchase_date: '', amount: '', supplier_name: purchase.recommended_supplier || '', invoice_number: '', notes: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutate = useMutation({
    mutationFn: () => api.patch(`/purchases/${purchase.id}/receive`, {
      ...form, amount: form.amount ? parseFloat(form.amount) : undefined
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Registrar Recepción</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Fecha de recepción</label>
              <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Monto real ($)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder={String(purchase.estimated_budget || '')} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="label-field">Proveedor / Empresa</label>
              <input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)}
                className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="label-field">Nro. de factura / remito</label>
              <input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)}
                placeholder="FA-0001-00001234" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Notas de entrega / Firma receptor</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Observaciones y nombre de quien recibió..."
              className="input-field resize-none" />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => mutate.mutate()} disabled={mutate.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutate.isPending && <Loader2 size={14} className="animate-spin" />}
            Registrar recepción
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Detail Modal · CAPA 1 ────────────────────────────────────
function PurchaseDetailModal({ purchaseId, onClose }: { purchaseId: string; onClose: () => void }) {
  const { data: purchase, isLoading } = useQuery<Purchase & { comments?: any[] }>({
    queryKey: ['purchase', purchaseId],
    queryFn: () => api.get(`/purchases/${purchaseId}`).then(r => r.data),
  });

  if (isLoading || !purchase) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-12"><Spinner /></div>
      </div>
    );
  }

  const status = STATUS_CONFIG[purchase.status];
  const fmtMoney = (n?: number) => n ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }) : '—';
  const fmtDate  = (d?: string) => d ? new Date(d).toLocaleDateString('es-AR') : '—';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <code className="text-[11px] font-extrabold text-dassa-red-deep bg-dassa-red-tint px-2 py-0.5 rounded">{purchase.code}</code>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status?.bg} ${status?.color}`}>{status?.label || purchase.status}</span>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 leading-snug">{purchase.description}</h3>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Link de origen */}
          {purchase.source_url && (
            <div className="bg-dassa-celeste-tint/40 border border-dassa-celeste/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-dassa-celeste-deep uppercase tracking-wide mb-2">
                <ExternalLink size={13} /> Link de origen
              </div>
              <a href={purchase.source_url} target="_blank" rel="noopener noreferrer"
                 className="text-sm text-dassa-celeste-deep hover:underline break-all">
                {purchase.source_url}
              </a>
            </div>
          )}

          {/* Detalle long */}
          {purchase.long_description && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                <FileText size={13} /> Descripción detallada
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {purchase.long_description}
              </div>
            </div>
          )}

          {/* Fotos */}
          {purchase.photo_urls && purchase.photo_urls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                <ImageIcon size={13} /> Fotos ({purchase.photo_urls.length})
              </div>
              <div className="grid grid-cols-3 gap-2">
                {purchase.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90">
                    <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Datos clave grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Solicitante</span>
              <span className="font-semibold text-gray-700">{purchase.requested_by_name}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Categoría</span>
              <span className="font-semibold text-gray-700">{CAT_LABELS[purchase.category] || purchase.category}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Monto estimado</span>
              <span className="font-semibold text-gray-700">{fmtMoney(purchase.estimated_budget)}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Monto final</span>
              <span className="font-bold text-dassa-red-deep">{fmtMoney(purchase.amount)}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Fecha requerida</span>
              <span className="font-semibold text-gray-700">{fmtDate(purchase.required_date)}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Fecha de compra</span>
              <span className="font-semibold text-gray-700">{fmtDate(purchase.purchase_date)}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Proveedor sugerido</span>
              <span className="font-semibold text-gray-700">{purchase.recommended_supplier || '—'}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Proveedor real</span>
              <span className="font-semibold text-gray-700">{purchase.supplier_name || '—'}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Factura</span>
              <span className="font-semibold text-gray-700">{purchase.invoice_number || '—'}</span></div>
            <div><span className="text-[11px] text-gray-400 uppercase tracking-wide block">Método de pago</span>
              <span className="font-semibold text-gray-700">{purchase.payment_method || '—'}</span></div>
          </div>

          {/* Motivo */}
          {purchase.purpose && (
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Motivo / Propósito</div>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">{purchase.purpose}</div>
            </div>
          )}

          {/* Specs técnicas parseadas */}
          {purchase.item_specs && Object.keys(purchase.item_specs).length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                <Package size={13} /> Datos del link de origen
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(purchase.item_specs, null, 2)}
              </div>
            </div>
          )}

          {/* Notas de autorización si fue rechazada */}
          {purchase.status === 'rechazada' && purchase.approval_notes && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wide mb-1">Motivo de rechazo</div>
              <p className="text-sm text-red-800">{purchase.approval_notes}</p>
            </div>
          )}

          {/* Timeline de comentarios */}
          {purchase.comments && purchase.comments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">
                <MessageSquare size={13} /> Comentarios ({purchase.comments.length})
              </div>
              <div className="space-y-3">
                {purchase.comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.user_name} size={28} />
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">{c.user_name}</span>
                        <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString('es-AR')}</span>
                      </div>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{c.text || c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
          <span>Creada: {fmtDate(purchase.created_at)}</span>
          {purchase.approved_at && <span>Autorizada: {fmtDate(purchase.approved_at)} por {purchase.approved_by_name}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Permissions Tab ───────────────────────────────────────────────────────────────────────────────
function PermissionsTab() {
  const qc = useQueryClient();
  const { data: perms = [], isLoading } = useQuery<any[]>({
    queryKey: ['purchase-permissions'],
    queryFn: () => api.get('/purchases/permissions'),
  });
  const [local, setLocal] = useState<Record<string, any>>({});

  const save = useMutation({
    mutationFn: () => api.post('/purchases/permissions', {
      permissions: perms.map(p => ({
        user_id: p.id,
        can_request:   local[p.id]?.can_request   ?? p.can_request,
        can_authorize: local[p.id]?.can_authorize ?? p.can_authorize,
        can_execute:   local[p.id]?.can_execute   ?? p.can_execute,
      }))
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-permissions'] }); setLocal({}); },
  });

  const setP = (uid: string, field: string, val: boolean) =>
    setLocal(p => ({ ...p, [uid]: { ...(p[uid] || {}), [field]: val } }));

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Permisos de Compras por Usuario</p>
        <button onClick={() => save.mutate()} disabled={save.isPending || Object.keys(local).length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red disabled:opacity-50">
          {save.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Guardar permisos
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="th-cell">Usuario</th>
            <th className="th-cell">Rol</th>
            <th className="th-cell text-center">Solicitar</th>
            <th className="th-cell text-center">Autorizar</th>
            <th className="th-cell text-center">Ejecutar</th>
          </tr>
        </thead>
        <tbody>
          {perms.map((p: any) => {
            const cur = { ...p, ...(local[p.id] || {}) };
            const isAdmin = ['master_admin', 'director'].includes(p.role);
            return (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={p.full_name} size={26} />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{p.full_name}</p>
                      <p className="text-[10px] text-gray-400">{p.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] text-gray-500 capitalize">{p.role?.replace(/_/g,' ')}</span>
                </td>
                {(['can_request','can_authorize','can_execute'] as const).map(field => (
                  <td key={field} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAdmin ? true : !!cur[field]}
                      disabled={isAdmin}
                      onChange={e => setP(p.id, field, e.target.checked)}
                      className="w-4 h-4 rounded text-dassa-red cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────
function ReportsTab({ purchases }: { purchases: Purchase[] }) {
  // Agrupar por mes y categoría
  const monthsMap: Record<string, Record<string, number>> = {};
  purchases
    .filter(p => ['completada','en_ejecucion'].includes(p.status))
    .forEach(p => {
      const month = new Date(p.created_at).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      const val = p.amount || p.estimated_budget || 0;
      if (!monthsMap[month]) monthsMap[month] = {};
      monthsMap[month][p.category] = (monthsMap[month][p.category] || 0) + val;
    });

  const chartData = Object.entries(monthsMap).map(([month, cats]) => ({ mes: month, ...cats }));
  const totalGastado = purchases
    .filter(p => ['completada','en_ejecucion'].includes(p.status))
    .reduce((s, p) => s + (p.amount || p.estimated_budget || 0), 0);
  const pendienteAutorizar = purchases.filter(p => p.status === 'borrador').length;
  const enEjecucion = purchases.filter(p => p.status === 'en_ejecucion').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KPICard label="Total Ejecutado" value={fmt(totalGastado)} sub="Recibidas + En ejecución" />
        <KPICard label="Pendientes Autorizar" value={pendienteAutorizar} sub="En borrador" alert={pendienteAutorizar > 0} />
        <KPICard label="En Ejecución" value={enEjecucion} sub="Compras en proceso" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-[13px] font-bold text-gray-800 mb-1">Gasto Mensual por Categoría</p>
        <p className="text-[11px] text-gray-400 mb-4">Solo órdenes en ejecución o recibidas</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }}
                formatter={(v: any) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {CATEGORIES.map(c => (
                <Bar key={c} dataKey={c} name={CAT_LABELS[c]} fill={CAT_COLORS[c]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-300">
            <p className="text-sm">Sin datos para mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function Purchases() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<'solicitudes' | 'reportes' | 'permisos'>('solicitudes');
  const [showNew, setShowNew] = useState(false);
  const [authorizing, setAuthorizing] = useState<Purchase | null>(null);
  const [detailingId, setDetailingId] = useState<string | null>(null);
  const [receiving, setReceiving] = useState<Purchase | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const qc = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases'),
    refetchInterval: 30_000,
  });

  const { data: myPerms } = useQuery<Perms>({
    queryKey: ['my-purchase-perms'],
    queryFn: () => api.get('/purchases/my-permissions'),
  });

  const execute = useMutation({
    mutationFn: (id: string) => api.patch(`/purchases/${id}/execute`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const filtered = purchases.filter(p => {
    const ms = !filterStatus || p.status === filterStatus;
    const mc = !filterCat || p.category === filterCat;
    return ms && mc;
  });

  const pendingAuth = purchases.filter(p => p.status === 'borrador').length;

  return (
    <>
      <Header
        title="Compras"
        subtitle="Gestión de órdenes de compra con flujo de aprobación"
        alerts={pendingAuth}
        actions={
          myPerms?.can_request && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nueva Solicitud
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {[
          { key: 'solicitudes', label: 'Solicitudes', icon: <ShoppingCart size={13} /> },
          { key: 'reportes',    label: 'Reportes',    icon: <BarChart3 size={13} /> },
          ...(isAdmin ? [{ key: 'permisos', label: 'Permisos', icon: <Lock size={13} /> }] : []),
        ].map((t: any) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors
              ${tab === t.key ? 'border-dassa-red text-dassa-red-deep' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.icon}{t.label}
            {t.key === 'solicitudes' && pendingAuth > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{pendingAuth}</span>
            )}
          </button>
        ))}
      </div>

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : tab === 'reportes' ? (
          <ReportsTab purchases={purchases} />
        ) : tab === 'permisos' ? (
          <PermissionsTab />
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
              {(filterStatus || filterCat) && (
                <button onClick={() => { setFilterStatus(''); setFilterCat(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{filtered.length} órdenes</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell w-24">Código</th>
                    <th className="th-cell">Descripción</th>
                    <th className="th-cell hidden lg:table-cell w-28">Monto</th>
                    <th className="th-cell hidden md:table-cell w-24">Categoría</th>
                    <th className="th-cell w-28">Estado</th>
                    <th className="th-cell hidden lg:table-cell">Solicitante</th>
                    <th className="th-cell hidden xl:table-cell w-24">Fecha</th>
                    <th className="th-cell w-36">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const pr = PRIORITY_CONFIG[p.priority];
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pr?.dot ?? 'bg-gray-300'}`} />
                            <code className="text-[10px] font-extrabold text-dassa-red-deep">{p.code}</code>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <p className="text-xs font-semibold text-gray-800 truncate">{p.description}</p>
                          {p.purpose && <p className="text-[10px] text-gray-400 truncate">{p.purpose}</p>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs font-bold text-gray-700">{fmt(p.amount || p.estimated_budget)}</span>
                          {p.amount && p.estimated_budget && p.amount !== p.estimated_budget && (
                            <p className="text-[9px] text-gray-400">Est: {fmt(p.estimated_budget)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500">{CAT_LABELS[p.category] || p.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                          {p.status === 'rechazada' && p.approval_notes && (
                            <p className="text-[9px] text-red-500 mt-0.5 max-w-[120px] truncate" title={p.approval_notes}>
                              {p.approval_notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={p.requested_by_name} size={20} />
                            <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{p.requested_by_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-[10px] text-gray-400">
                            {new Date(p.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Ver detalle — siempre disponible */}
                            <button onClick={() => setDetailingId(p.id)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold hover:bg-gray-200">
                              <Eye size={11} /> Ver
                            </button>
                            {/* Autorizar — solo si borrador y tiene permiso */}
                            {p.status === 'borrador' && myPerms?.can_authorize && (
                              <button onClick={() => setAuthorizing(p)}
                                className="flex items-center gap-1 px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700">
                                <CheckCircle2 size={11} /> Autorizar
                              </button>
                            )}
                            {/* Ejecutar */}
                            {p.status === 'aprobada' && myPerms?.can_execute && (
                              <button onClick={() => execute.mutate(p.id)}
                                disabled={execute.isPending}
                                className="flex items-center gap-1 px-2 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-bold hover:bg-violet-700">
                                <Play size={11} /> Ejecutar
                              </button>
                            )}
                            {/* Recibir */}
                            {p.status === 'en_ejecucion' && myPerms?.can_execute && (
                              <button onClick={() => setReceiving(p)}
                                className="flex items-center gap-1 px-2 py-1.5 bg-dassa-red text-white rounded-lg text-[10px] font-bold hover:bg-dassa-red-deep">
                                <Package size={11} /> Recibir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin órdenes de compra</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showNew    && <NewPurchaseModal onClose={() => setShowNew(false)} />}
      {authorizing && <AuthorizeModal purchase={authorizing} onClose={() => setAuthorizing(null)} />}
      {receiving   && <ReceiveModal   purchase={receiving}   onClose={() => setReceiving(null)} />}
      {detailingId && <PurchaseDetailModal purchaseId={detailingId} onClose={() => setDetailingId(null)} />}
    </>
  );
}
