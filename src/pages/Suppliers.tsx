import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Truck, Search, CheckCircle2,
  XCircle, Phone, Mail, MapPin
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Supplier {
  id: string; name: string; cuit?: string; type?: string;
  contact_name?: string; email?: string; phone?: string;
  address?: string; status: string; notes?: string;
  created_at: string;
}

// ─── Constantes ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  activo:     { label: 'Activo',      bg: 'bg-emerald-100', color: 'text-emerald-700' },
  evaluacion: { label: 'Evaluación',  bg: 'bg-amber-100',   color: 'text-amber-700' },
  suspendido: { label: 'Suspendido',  bg: 'bg-red-100',     color: 'text-red-700' },
  inactivo:   { label: 'Inactivo',    bg: 'bg-gray-100',   color: 'text-gray-500' },
};

const TYPES = ['productos', 'servicios', 'transporte', 'tecnologia', 'mantenimiento', 'otros'];
const TYPE_LABELS: Record<string, string> = {
  productos: 'Productos', servicios: 'Servicios', transporte: 'Transporte',
  tecnologia: 'Tecnología', mantenimiento: 'Mantenimiento', otros: 'Otros',
};

// ─── New / Edit Supplier Modal ───────────────────────────────
function SupplierModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    cuit: supplier?.cuit ?? '',
    type: supplier?.type ?? 'servicios',
    contact_name: supplier?.contact_name ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    address: supplier?.address ?? '',
    status: supplier?.status ?? 'activo',
    notes: supplier?.notes ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      return isEdit
        ? api.patch(`/suppliers/${supplier!.id}`, form)
        : api.post('/suppliers', form);
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
              <input value={form.cuit} onChange={e => set('cuit', e.target.value)}
                placeholder="XX-XXXXXXXX-X" className="input-field" />
            </div>
            <div>
              <label className="label-field">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
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
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@proveedor.com" className="input-field" />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+54 11 ..." className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Dirección del proveedor" className="input-field" />
          </div>
          <div>
            <label className="label-field">Estado</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Observaciones sobre el proveedor" className="input-field resize-none" />
          </div>
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

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Suppliers() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', search, filterStatus, filterType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('type', filterType);
      const qs = params.toString();
      return api.get(`/suppliers${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const activos = suppliers.filter(s => s.status === 'activo').length;
  const enEval = suppliers.filter(s => s.status === 'evaluacion').length;
  const suspendidos = suppliers.filter(s => s.status === 'suspendido').length;

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

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
              <KPICard label="Total Proveedores" value={suppliers.length} sub="Registrados" icon={<Truck size={16} />} />
              <KPICard label="Activos" value={activos} sub="Habilitados" icon={<CheckCircle2 size={16} />} />
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
                <option value="">Todos los tipos</option>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              {(search || filterStatus || filterType) && (
                <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{suppliers.length} proveedores</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell">Proveedor</th>
                    <th className="th-cell hidden md:table-cell w-28">CUIT</th>
                    <th className="th-cell hidden md:table-cell w-24">Tipo</th>
                    <th className="th-cell hidden lg:table-cell">Contacto</th>
                    <th className="th-cell hidden xl:table-cell">Dirección</th>
                    <th className="th-cell w-24">Estado</th>
                    {isAdmin && <th className="th-cell w-28">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => {
                    const sc = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.activo;
                    return (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={s.name} size={28} />
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                              {s.contact_name && <p className="text-[10px] text-gray-400">{s.contact_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500 font-mono">{s.cuit || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500">{TYPE_LABELS[s.type ?? ''] || s.type || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {s.email && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Mail size={9} />{s.email}
                              </span>
                            )}
                            {s.phone && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Phone size={9} />{s.phone}
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
              {suppliers.length === 0 && (
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
    </>
  );
}
