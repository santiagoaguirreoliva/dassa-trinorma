import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, AlertTriangle, Activity,
  Search, Shield
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Incident {
  id: string; code: string; type: string;
  date: string; area: string; severity: string;
  status: string; description?: string;
  employee_id?: string; corrective_action?: string;
  created_by?: string; created_at: string; updated_at?: string;
}

// ─── Constantes ─────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  incidente: { label: 'Incidente', bg: 'bg-amber-100', color: 'text-amber-700' },
  accidente: { label: 'Accidente', bg: 'bg-red-100',   color: 'text-red-700' },
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  leve:       { label: 'Leve',       bg: 'bg-emerald-100', color: 'text-emerald-700' },
  moderada:   { label: 'Moderada',   bg: 'bg-amber-100',   color: 'text-amber-700' },
  grave:      { label: 'Grave',      bg: 'bg-orange-100',  color: 'text-orange-700' },
  muy_grave:  { label: 'Muy Grave',  bg: 'bg-red-100',     color: 'text-red-700' },
  mortal:     { label: 'Mortal',     bg: 'bg-red-200',     color: 'text-red-900' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  abierto:       { label: 'Abierto',       bg: 'bg-red-100',      color: 'text-red-700' },
  investigacion: { label: 'Investigación', bg: 'bg-dassa-red-tint',     color: 'text-dassa-red-deep' },
  accion:        { label: 'Acción Correct.',bg: 'bg-violet-100',  color: 'text-violet-700' },
  cerrado:       { label: 'Cerrado',       bg: 'bg-emerald-100',  color: 'text-emerald-700' },
};

const AREAS = [
  'Depósito Fiscal', 'Playa de maniobras', 'Oficinas', 'Acceso principal',
  'Zona de carga/descarga', 'Estacionamiento', 'Laboratorio', 'Taller', 'Otra'
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── New / Edit Incident Modal ───────────────────────────────
function IncidentModal({ incident, onClose }: { incident?: Incident; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!incident;
  const [form, setForm] = useState({
    type: incident?.type ?? 'incidente',
    date: incident?.date?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    area: incident?.area ?? '',
    severity: incident?.severity ?? 'leve',
    status: incident?.status ?? 'abierto',
    description: incident?.description ?? '',
    corrective_action: incident?.corrective_action ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      return isEdit
        ? api.patch(`/incidents/${incident!.id}`, form)
        : api.post('/incidents', form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Incidente' : 'Nuevo Incidente / Accidente'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo <span className="text-red-500">*</span></label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                <option value="incidente">Incidente</option>
                <option value="accidente">Accidente</option>
              </select>
            </div>
            <div>
              <label className="label-field">Fecha <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Área <span className="text-red-500">*</span></label>
              <select value={form.area} onChange={e => set('area', e.target.value)} className="input-field">
                <option value="">Seleccionar...</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Severidad <span className="text-red-500">*</span></label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="input-field">
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="label-field">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label-field">Descripción del Hecho</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Describa qué ocurrió, dónde, cómo..."
              className="input-field resize-none" />
          </div>
          <div>
            <label className="label-field">Acción Correctiva</label>
            <textarea value={form.corrective_action} onChange={e => set('corrective_action', e.target.value)}
              rows={2} placeholder="Medidas adoptadas o a implementar"
              className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.type || !form.date || !form.area || !form.severity || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Incidents() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Incident | undefined>();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ['incidents', filterType, filterStatus, filterSeverity, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSeverity) params.set('severity', filterSeverity);
      if (search) params.set('search', search);
      const qs = params.toString();
      return api.get(`/incidents${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });

  const abiertos = incidents.filter(i => i.status === 'abierto').length;
  const accidentes = incidents.filter(i => i.type === 'accidente').length;
  const incidentes = incidents.filter(i => i.type === 'incidente').length;
  const graves = incidents.filter(i => ['grave', 'muy_grave', 'mortal'].includes(i.severity)).length;

  return (
    <>
      <Header
        title="Incidentes y Accidentes"
        subtitle="Registro y seguimiento — ISO 45001"
        alerts={abiertos}
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Registro
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
              <KPICard label="Abiertos" value={abiertos} sub="Sin cerrar" alert={abiertos > 0} icon={<AlertTriangle size={16} />} />
              <KPICard label="Accidentes" value={accidentes} sub="Total registrados" alert={accidentes > 0} alertColor="#f97316" icon={<Activity size={16} />} />
              <KPICard label="Incidentes" value={incidentes} sub="Total registrados" icon={<Shield size={16} />} />
              <KPICard label="Graves+" value={graves} sub="Grave, Muy Grave o Mortal" alert={graves > 0} icon={<AlertTriangle size={16} />} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative min-w-[180px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los tipos</option>
                <option value="incidente">Incidente</option>
                <option value="accidente">Accidente</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todas las severidades</option>
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(filterType || filterStatus || filterSeverity || search) && (
                <button onClick={() => { setFilterType(''); setFilterStatus(''); setFilterSeverity(''); setSearch(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{incidents.length} registros</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell w-24">Código</th>
                    <th className="th-cell w-24">Tipo</th>
                    <th className="th-cell w-24">Fecha</th>
                    <th className="th-cell">Descripción</th>
                    <th className="th-cell hidden md:table-cell">Área</th>
                    <th className="th-cell w-24">Severidad</th>
                    <th className="th-cell w-28">Estado</th>
                    <th className="th-cell hidden lg:table-cell">Acción Correctiva</th>
                    {isAdmin && <th className="th-cell w-20">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(inc => {
                    const tc = TYPE_CONFIG[inc.type] ?? TYPE_CONFIG.incidente;
                    const sev = SEVERITY_CONFIG[inc.severity] ?? SEVERITY_CONFIG.leve;
                    const sc = STATUS_CONFIG[inc.status] ?? STATUS_CONFIG.abierto;
                    return (
                      <tr key={inc.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                        ${inc.type === 'accidente' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <code className="text-[10px] font-extrabold text-dassa-red-deep">{inc.code}</code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tc.bg} ${tc.color}`}>
                            {tc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] text-gray-500">{fmtDate(inc.date)}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-gray-700 truncate">{inc.description || '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500">{inc.area}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell max-w-[180px]">
                          <p className="text-[10px] text-gray-500 truncate">{inc.corrective_action || '—'}</p>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => { setEditing(inc); setShowModal(true); }}
                              className="text-[10px] font-bold text-dassa-red hover:text-blue-800">
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {incidents.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <AlertTriangle size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin incidentes registrados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <IncidentModal incident={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
