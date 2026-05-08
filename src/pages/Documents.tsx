import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, FileText, Search, Filter,
  BookOpen, FileCheck2, FileClock
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Doc {
  id: string; code: string; title: string;
  type: string; norma: string; version: number;
  status: string; review_date?: string; file_url?: string;
  created_by?: string; created_at: string; updated_at?: string;
}

// ─── Constantes ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  borrador:  { label: 'Borrador',  bg: 'bg-gray-100',    color: 'text-gray-600' },
  revision:  { label: 'Revisión',  bg: 'bg-amber-100',    color: 'text-amber-700' },
  aprobado:  { label: 'Aprobado',  bg: 'bg-emerald-100',  color: 'text-emerald-700' },
  obsoleto:  { label: 'Obsoleto',  bg: 'bg-red-100',      color: 'text-red-700' },
};

const TYPE_CONFIG: Record<string, string> = {
  procedimiento: 'Procedimiento',
  instruccion:   'Instrucción',
  registro:      'Registro',
  manual:        'Manual',
  politica:      'Política',
  formato:       'Formato',
};

const NORMAS = ['ISO 9001', 'ISO 14001', 'ISO 45001', 'TRINORMA'];
const TYPES = Object.keys(TYPE_CONFIG);

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── New / Edit Document Modal ───────────────────────────────
function DocModal({ doc, onClose }: { doc?: Doc; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!doc;
  const [form, setForm] = useState({
    title: doc?.title ?? '',
    type: doc?.type ?? 'procedimiento',
    norma: doc?.norma ?? 'TRINORMA',
    status: doc?.status ?? 'borrador',
    review_date: doc?.review_date?.substring(0, 10) ?? '',
    file_url: doc?.file_url ?? '',
    version: String(doc?.version ?? 1),
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        version: parseInt(form.version) || 1,
        review_date: form.review_date || null,
        file_url: form.file_url || null,
      };
      return isEdit
        ? api.patch(`/documents/${doc!.id}`, payload)
        : api.post('/documents', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Documento' : 'Nuevo Documento'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Título <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ej: Procedimiento de Control de Documentos" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo <span className="text-red-500">*</span></label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Norma <span className="text-red-500">*</span></label>
              <select value={form.norma} onChange={e => set('norma', e.target.value)} className="input-field">
                {NORMAS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Versión</label>
              <input type="number" value={form.version} onChange={e => set('version', e.target.value)}
                min="1" className="input-field" />
            </div>
            <div>
              <label className="label-field">Próx. Revisión</label>
              <input type="date" value={form.review_date} onChange={e => set('review_date', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">URL del Archivo</label>
            <input value={form.file_url} onChange={e => set('file_url', e.target.value)}
              placeholder="https://..." className="input-field" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.title || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Documento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Documents() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Doc | undefined>();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterNorma, setFilterNorma] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const qc = useQueryClient();

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ['documents', search, filterType, filterNorma, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterNorma) params.set('norma', filterNorma);
      if (filterStatus) params.set('status', filterStatus);
      const qs = params.toString();
      return api.get(`/documents${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });

  const aprobados = docs.filter(d => d.status === 'aprobado').length;
  const enRevision = docs.filter(d => d.status === 'revision').length;
  const borradores = docs.filter(d => d.status === 'borrador').length;

  return (
    <>
      <Header
        title="Documentos SGI"
        subtitle="Control de documentos del Sistema de Gestión Integrado"
        alerts={enRevision}
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Documento
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
              <KPICard label="Total Documentos" value={docs.length} sub="Registrados en el SGI" icon={<FileText size={16} />} />
              <KPICard label="Aprobados" value={aprobados} sub="Vigentes" icon={<FileCheck2 size={16} />} />
              <KPICard label="En Revisión" value={enRevision} sub="Pendientes de aprobación" alert={enRevision > 0} alertColor="#f59e0b" icon={<FileClock size={16} />} />
              <KPICard label="Borradores" value={borradores} sub="En desarrollo" icon={<BookOpen size={16} />} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por título o código..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los tipos</option>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]}</option>)}
              </select>
              <select value={filterNorma} onChange={e => setFilterNorma(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todas las normas</option>
                {NORMAS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(search || filterType || filterNorma || filterStatus) && (
                <button onClick={() => { setSearch(''); setFilterType(''); setFilterNorma(''); setFilterStatus(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{docs.length} documentos</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell w-24">Código</th>
                    <th className="th-cell">Título</th>
                    <th className="th-cell w-28">Tipo</th>
                    <th className="th-cell w-24">Norma</th>
                    <th className="th-cell w-16 text-center">Ver.</th>
                    <th className="th-cell w-24">Estado</th>
                    <th className="th-cell hidden lg:table-cell w-24">Revisión</th>
                    <th className="th-cell hidden lg:table-cell w-24">Creado</th>
                    {isAdmin && <th className="th-cell w-28">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => {
                    const sc = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.borrador;
                    return (
                      <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-[10px] font-extrabold text-dassa-red-deep">{d.code}</code>
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <p className="text-xs font-semibold text-gray-800 truncate">{d.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] text-gray-500">{TYPE_CONFIG[d.type] || d.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold text-dassa-red bg-dassa-red-tint px-1.5 py-0.5 rounded">
                            {d.norma}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-gray-700">v{d.version}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[10px] text-gray-400">{fmtDate(d.review_date)}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[10px] text-gray-400">{fmtDate(d.created_at)}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditing(d); setShowModal(true); }}
                                className="text-[10px] font-bold text-dassa-red hover:text-blue-800 px-2 py-1">
                                Editar
                              </button>
                              <button onClick={() => { if (confirm('¿Eliminar documento?')) deleteMut.mutate(d.id); }}
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
              {docs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin documentos registrados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <DocModal doc={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
