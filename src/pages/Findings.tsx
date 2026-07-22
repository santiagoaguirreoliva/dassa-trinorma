import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LayoutGrid, List, Search, Loader2, X, AlertTriangle, Download, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Badge, FINDING_STATUS, FINDING_TYPE, Avatar, Spinner, PageContent } from '@/components/ui';
import FindingDetail from '@/components/findings/FindingDetail';
import FindingsReports from '@/components/findings/FindingsReports';
import { exportToCSV } from '@/lib/exportCsv';

// ─── Tipos ──────────────────────────────────────────────────
interface Finding {
  id: string; code: string; title: string; description: string;
  finding_type: string; status: string; origin: string; area: string;
  report_kind?: string;
  due_date?: string; reported_by_name?: string;
  assigned_to?: string; assigned_to_name?: string; assigned_to_avatar?: string;
  days_open: number; actions_count: number; comments_count: number;
  created_at: string;
}

const KANBAN_COLS = [
  { key: 'abierto',      label: 'Detectado',    color: 'bg-red-500' },
  { key: 'analisis',     label: 'En Análisis',  color: 'bg-amber-500' },
  { key: 'plan_accion',  label: 'Plan de AC',   color: 'bg-violet-500' },
  { key: 'en_ejecucion', label: 'En Ejecución', color: 'bg-dassa-red' },
  { key: 'verificacion', label: 'Verificación', color: 'bg-pink-500' },
  { key: 'cerrado',      label: 'Cerrado',       color: 'bg-emerald-500' },
];

// F-G: estados conocidos del kanban — una NC con status fuera de este set
// no debe quedar invisible, se muestra en una columna "Sin clasificar".
const KNOWN_STATUS = new Set(KANBAN_COLS.map(c => c.key));

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'nc_real', label: 'NC Real' },
  { value: 'nc_potencial', label: 'NC Potencial' },
  { value: 'mejora', label: 'Mejora' },
  { value: 'desvio_cliente', label: 'Desvío Cliente' },
];

const AREAS = ['', 'Depósito — Almacén', 'Coordinación', 'Plazoleta', 'Administración', 'Mantenimiento', 'Otros'];

// ─── NC Card (kanban) ─────────────────────────────────────────
function NCCard({ finding, onClick, draggable, onDragStart }: {
  finding: Finding; onClick: () => void;
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void;
}) {
  const tc = FINDING_TYPE[finding.finding_type];
  const overdue = finding.due_date && new Date(finding.due_date) < new Date() && finding.status !== 'cerrado';
  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all group
        ${draggable ? 'active:cursor-grabbing' : ''}
        ${overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <code className="text-[9px] font-extrabold text-dassa-red-deep bg-dassa-red-tint px-1.5 py-0.5 rounded">
          {finding.code}
        </code>
        {tc && <Badge label={tc.label} variant={tc.variant} size="sm" />}
      </div>
      <p className="text-[12px] font-semibold text-gray-800 leading-snug mb-2 line-clamp-2">
        {finding.title}
      </p>
      {finding.area && (
        <p className="text-[10px] text-gray-400 mb-2 truncate">{finding.area}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {finding.assigned_to_name && <Avatar name={finding.assigned_to_name} size={18} />}
          {finding.actions_count > 0 && (
            <span className="text-[10px] text-gray-400">{finding.actions_count} AC</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {overdue && <AlertTriangle size={11} className="text-red-500" />}
          <span className={`text-[10px] font-bold ${finding.days_open > 15 ? 'text-red-500' : 'text-gray-400'}`}>
            {finding.days_open}d
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── New Finding Modal ────────────────────────────────────────
function NewFindingModal({ onClose, users }: { onClose: () => void; users: any[] }) {
  const qc = useQueryClient();
  useAuth();
  const [form, setForm] = useState({
    title: '', description: '', finding_type: 'nc_real',
    origin: 'desvio_operativo', area: '', due_date: '',
    assigned_to: '', immediate_action: '',
  });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/findings', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Nueva No Conformidad</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Título <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Descripción breve de la NC"
              className="input-field" />
          </div>
          <div>
            <label className="label-field">Descripción completa <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Qué pasó, dónde, cuándo, quiénes estuvieron involucrados..."
              className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo</label>
              <select value={form.finding_type} onChange={e => set('finding_type', e.target.value)} className="input-field">
                <option value="nc_real">NC Real</option>
                <option value="nc_potencial">NC Potencial</option>
                <option value="mejora">Oportunidad de Mejora</option>
                <option value="desvio_cliente">Desvío Cliente</option>
              </select>
            </div>
            <div>
              <label className="label-field">Origen</label>
              <select value={form.origin} onChange={e => set('origin', e.target.value)} className="input-field">
                <option value="desvio_operativo">Desvío operativo</option>
                <option value="auditoria_interna">Auditoría interna</option>
                <option value="auditoria_externa">Auditoría externa</option>
                <option value="reclamo_cliente">Reclamo cliente</option>
                <option value="accidente">Accidente</option>
                <option value="inspeccion">Inspección</option>
                <option value="comite">Comité</option>
              </select>
            </div>
            <div>
              <label className="label-field">Sector</label>
              <select value={form.area} onChange={e => set('area', e.target.value)} className="input-field">
                <option value="">— Seleccionar —</option>
                {AREAS.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Fecha límite</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="label-field">Asignar responsable</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className="input-field">
                <option value="">Sin asignar</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Acción inmediata tomada</label>
            <textarea value={form.immediate_action} onChange={e => set('immediate_action', e.target.value)}
              rows={2} placeholder="Acciones de contención aplicadas inmediatamente..."
              className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button
            onClick={() => !create.isPending && create.mutate()}
            disabled={!form.title || !form.description || create.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50"
          >
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            Registrar NC
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function Findings() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<'kanban' | 'table' | 'informes'>('kanban');
  // Segregación: NC Trinorma (gestión formal) vs avisos/hallazgos generales (comisión mixta)
  const [kindTab, setKindTab] = useState<'nc' | 'hallazgo'>('nc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: findings = [], isLoading } = useQuery<Finding[]>({
    queryKey: ['findings'],
    queryFn: () => api.get('/findings'),
    refetchInterval: 30_000,
  });

  const moveCard = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/findings/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }),
    onError: (e: any) => alert(e.message || 'No se pudo mover la NC'),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['findings-stats'],
    queryFn: () => api.get('/findings/stats'),
    refetchInterval: 30_000,
  });

  // Un finding sin report_kind (histórico) cuenta como NC
  const byKind = findings.filter(f => (f.report_kind || 'nc') === kindTab);
  const ncCount = findings.filter(f => (f.report_kind || 'nc') === 'nc' && f.status !== 'cerrado').length;
  const hallazgoCount = findings.filter(f => f.report_kind === 'hallazgo' && f.status !== 'cerrado').length;

  const filtered = byKind.filter(f => {
    const matchSearch = !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.area?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || f.finding_type === filterType;
    const matchArea = !filterArea || f.area?.includes(filterArea);
    const matchStatus = !filterStatus || f.status === filterStatus;
    const matchAssigned = !filterAssigned || f.assigned_to === filterAssigned;
    return matchSearch && matchType && matchArea && matchStatus && matchAssigned;
  });

  const openCount = byKind.filter(f => f.status !== 'cerrado').length;
  const overdueCount = byKind.filter(f => f.status !== 'cerrado' && f.due_date && new Date(f.due_date) < new Date()).length;
  const orphans = filtered.filter(f => !KNOWN_STATUS.has(f.status));

  return (
    <>
      <Header
        title="Hallazgos / NC"
        subtitle={`${openCount} abiertas · ${overdueCount > 0 ? overdueCount + ' vencidas' : 'sin vencidas'}`}
        alerts={overdueCount}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView('kanban')}
                className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-dassa-red' : 'text-gray-400'}`}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setView('table')}
                className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white shadow-sm text-dassa-red' : 'text-gray-400'}`}>
                <List size={15} />
              </button>
              <button onClick={() => setView('informes')} title="Informes mensuales"
                className={`p-1.5 rounded-md transition-colors ${view === 'informes' ? 'bg-white shadow-sm text-dassa-red' : 'text-gray-400'}`}>
                <FileText size={15} />
              </button>
            </div>
            <button
              onClick={() => exportToCSV(filtered as unknown as Record<string, unknown>[], `hallazgos-${new Date().toISOString().slice(0,10)}`, [
                { key: 'code', header: 'Código' },
                { key: 'title', header: 'Título' },
                { key: 'finding_type', header: 'Tipo' },
                { key: 'status', header: 'Estado' },
                { key: 'area', header: 'Área' },
                { key: 'due_date', header: 'Fecha límite' },
                { key: 'assigned_to_name', header: 'Responsable' },
                { key: 'created_at', header: 'Creado' },
              ])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
              title="Exportar CSV"
            >
              <Download size={14} /> CSV
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red transition-colors"
              >
                <Plus size={14} /> Nueva NC
              </button>
            )}
          </div>
        }
      />

      {/* Segregación NC Trinorma vs hallazgos generales */}
      {view !== 'informes' && (
      <div className="bg-white border-b border-gray-200 px-6 pt-2.5 flex items-center gap-2">
        <button
          onClick={() => setKindTab('nc')}
          className={`px-4 py-2 rounded-t-lg text-xs font-bold border-b-2 transition-colors
            ${kindTab === 'nc' ? 'border-dassa-red text-dassa-red bg-dassa-red-tint' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          No Conformidades TRINORMA {ncCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-dassa-red text-white text-[10px]">{ncCount}</span>}
        </button>
        <button
          onClick={() => setKindTab('hallazgo')}
          className={`px-4 py-2 rounded-t-lg text-xs font-bold border-b-2 transition-colors
            ${kindTab === 'hallazgo' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Avisos y hallazgos generales {hallazgoCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">{hallazgoCount}</span>}
        </button>
        {kindTab === 'hallazgo' && (
          <span className="ml-auto text-[11px] text-gray-400 pb-1">Se revisan en la comisión mixta — no entran al circuito formal de NC</span>
        )}
      </div>
      )}

      {/* Filters bar */}
      {view !== 'informes' && (
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, título, área..."
            className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
          {AREAS.map(a => <option key={a} value={a}>{a || 'Todos los sectores'}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
          <option value="">Todos los estados</option>
          {KANBAN_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
          <option value="">Todos los responsables</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        {(search || filterType || filterArea || filterStatus || filterAssigned) && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterArea(''); setFilterStatus(''); setFilterAssigned(''); }}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} resultados</span>
      </div>
      )}

      <PageContent>
        {/* KPIs del módulo de NC */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KpiCard label="Abiertas" value={stats.open_count} tone="amber" />
            <KpiCard label="Vencidas" value={stats.overdue_count} tone={stats.overdue_count > 0 ? 'red' : 'gray'} />
            <KpiCard label="Cerradas (30 días)" value={stats.closed_30d} tone="emerald" />
            <KpiCard label="Total registradas" value={stats.total} tone="blue" />
          </div>
        )}
        {view === 'informes' ? (
          <FindingsReports />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : view === 'kanban' ? (

          /* ─── KANBAN ─── */
          <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
            {KANBAN_COLS.map(col => {
              const cards = filtered.filter(f => f.status === col.key);
              return (
                <div
                  key={col.key}
                  className="flex-shrink-0 w-[230px]"
                  onDragOver={isAdmin ? (e => e.preventDefault()) : undefined}
                  onDrop={isAdmin ? (() => {
                    if (dragId) moveCard.mutate({ id: dragId, status: col.key });
                    setDragId(null);
                  }) : undefined}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="text-xs font-bold text-gray-700">{col.label}</span>
                    <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {cards.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {cards.map(f => (
                      <NCCard key={f.id} finding={f} onClick={() => setSelectedId(f.id)}
                        draggable={isAdmin}
                        onDragStart={() => setDragId(f.id)} />
                    ))}
                    {cards.length === 0 && (
                      <div className="border-2 border-dashed border-gray-100 rounded-xl h-24 flex items-center justify-center">
                        <span className="text-xs text-gray-300">Sin NC</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* F-G: NC con estado fuera de las columnas conocidas */}
            {orphans.length > 0 && (
              <div className="flex-shrink-0 w-[230px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span className="text-xs font-bold text-gray-700">Sin clasificar</span>
                  <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {orphans.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {orphans.map(f => (
                    <NCCard key={f.id} finding={f} onClick={() => setSelectedId(f.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (

          /* ─── TABLE ─── */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Código</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28 hidden md:table-cell">Sector</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Tipo</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Estado</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20 hidden lg:table-cell">Responsable</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16 hidden lg:table-cell">Días</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const sc = FINDING_STATUS[f.status];
                  const tc = FINDING_TYPE[f.finding_type];
                  const overdue = f.status !== 'cerrado' && f.due_date && new Date(f.due_date) < new Date();
                  return (
                    <tr key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={`border-b border-gray-100 cursor-pointer hover:bg-dassa-red-tint transition-colors
                        ${overdue ? 'bg-red-50 hover:bg-red-100' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <code className="text-[10px] font-extrabold text-dassa-red-deep bg-dassa-red-tint px-1.5 py-0.5 rounded">
                          {f.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs truncate max-w-[260px]">{f.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500 truncate">{f.area || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {tc && <Badge label={tc.label} variant={tc.variant} size="sm" />}
                      </td>
                      <td className="px-4 py-3">
                        {sc && <Badge label={sc.label} variant={sc.variant} size="sm" />}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {f.assigned_to_name
                          ? <div className="flex items-center gap-1.5"><Avatar name={f.assigned_to_name} size={20} /><span className="text-xs text-gray-600 truncate max-w-[80px]">{f.assigned_to_name}</span></div>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className={`text-xs font-bold ${f.days_open > 15 && f.status !== 'cerrado' ? 'text-red-500' : 'text-gray-400'}`}>
                          {f.days_open}d
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="font-medium">Sin resultados</p>
                <p className="text-sm mt-1">Probá con otros filtros</p>
              </div>
            )}
          </div>
        )}
      </PageContent>

      {/* Detail panel */}
      {selectedId && (
        <FindingDetail findingId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* New NC modal */}
      {showNew && <NewFindingModal onClose={() => setShowNew(false)} users={users} />}
    </>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600',
    blue: 'text-blue-700', gray: 'text-gray-500',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold mt-0.5 ${tones[tone] || 'text-gray-700'}`}>{value ?? 0}</p>
    </div>
  );
}
