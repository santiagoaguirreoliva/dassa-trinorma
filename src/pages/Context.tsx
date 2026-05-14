import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Target, TrendingUp, Shield, AlertTriangle,
  Users, Pencil, Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent } from '@/components/ui';

// ─── Types ──────────────────────────────────────────────────
interface FodaItem {
  id: string; foda_type: string; category: string;
  description: string; order_index: number; is_active: boolean;
  created_by?: string; created_by_name?: string; created_at: string;
}
interface FodaGrouped {
  fortaleza: FodaItem[]; oportunidad: FodaItem[];
  debilidad: FodaItem[]; amenaza: FodaItem[];
}
interface Strategy {
  id: string; strategy_type: string; name: string;
  description?: string; actions?: string[]; deadline?: string;
  responsible_id?: string; responsible_name?: string;
  status: string; created_at: string;
}
interface Stakeholder {
  id: string; name: string; stakeholder_type: string;
  category?: string; needs_expectations?: string;
  influence_level: string; is_active: boolean;
}
interface User { id: string; full_name: string; }

// ─── Constants ──────────────────────────────────────────────
const FODA_CONFIG = {
  fortaleza:   { label: 'Fortalezas',    color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', icon: Shield, letter: 'F' },
  oportunidad: { label: 'Oportunidades', color: 'bg-dassa-red',    light: 'bg-dassa-red-tint border-blue-200',      icon: TrendingUp, letter: 'O' },
  debilidad:   { label: 'Debilidades',   color: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200',    icon: AlertTriangle, letter: 'D' },
  amenaza:     { label: 'Amenazas',      color: 'bg-red-500',     light: 'bg-red-50 border-red-200',        icon: Target, letter: 'A' },
} as const;

const STRATEGY_TYPES = [
  { value: 'FO', label: 'FO — Aprovechar' },
  { value: 'FA', label: 'FA — Defender' },
  { value: 'DO', label: 'DO — Mejorar' },
  { value: 'DA', label: 'DA — Sobrevivir' },
];
const STRATEGY_STATUS = ['planned', 'in_progress', 'completed', 'cancelled'];
const STATUS_LABELS: Record<string, string> = { planned: 'Planificada', in_progress: 'En Curso', completed: 'Completada', cancelled: 'Cancelada' };
const STATUS_COLORS: Record<string, string> = { planned: 'bg-gray-100 text-gray-700', in_progress: 'bg-dassa-red-tint text-dassa-red-deep', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };

const STAKEHOLDER_TYPES = ['interno', 'externo'];
const INFLUENCE_LEVELS = ['bajo', 'medio', 'alto', 'critico'];
const INFLUENCE_COLORS: Record<string, string> = { bajo: 'bg-gray-100 text-gray-700', medio: 'bg-dassa-red-tint text-dassa-red-deep', alto: 'bg-amber-100 text-amber-700', critico: 'bg-red-100 text-red-700' };

const FODA_CATEGORIES: Record<string, string[]> = {
  fortaleza: ['Operaciones', 'RRHH', 'Financiera', 'Tecnología', 'Marca/Reputación', 'Infraestructura', 'SGI'],
  oportunidad: ['Mercado', 'Regulación', 'Tecnología', 'Alianzas', 'Expansión', 'Subsidios'],
  debilidad: ['Operaciones', 'RRHH', 'Financiera', 'Tecnología', 'Procesos', 'Infraestructura'],
  amenaza: ['Mercado', 'Competencia', 'Regulación', 'Económica', 'Tipo de cambio', 'Política'],
};

type TabKey = 'foda' | 'strategies' | 'stakeholders';

// ─── Component ──────────────────────────────────────────────
export default function Context() {
  useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('foda');
  const [modal, setModal] = useState<null | 'foda' | 'strategy' | 'stakeholder'>(null);
  const [editing, setEditing] = useState<any>(null);

  // Queries
  const { data: foda, isLoading: loadFoda } = useQuery<FodaGrouped>({
    queryKey: ['context-foda'], queryFn: () => api.get('/context/foda'),
  });
  const { data: strategies = [], isLoading: loadStrat } = useQuery<Strategy[]>({
    queryKey: ['context-strategies'], queryFn: () => api.get('/context/strategies'),
  });
  const { data: stakeholders = [], isLoading: loadStake } = useQuery<Stakeholder[]>({
    queryKey: ['context-stakeholders'], queryFn: () => api.get('/context/stakeholders'),
  });
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'], queryFn: () => api.get('/users'),
  });

  // Mutations
  const saveFoda = useMutation({
    mutationFn: (d: any) => d.id ? api.patch(`/context/foda/${d.id}`, d) : api.post('/context/foda', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['context-foda'] }); setModal(null); setEditing(null); },
  });
  const deleteFoda = useMutation({
    mutationFn: (id: string) => api.delete(`/context/foda/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['context-foda'] }),
  });
  const saveStrategy = useMutation({
    mutationFn: (d: any) => d.id ? api.patch(`/context/strategies/${d.id}`, d) : api.post('/context/strategies', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['context-strategies'] }); setModal(null); setEditing(null); },
  });
  const deleteStrategy = useMutation({
    mutationFn: (id: string) => api.delete(`/context/strategies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['context-strategies'] }),
  });
  const saveStakeholder = useMutation({
    mutationFn: (d: any) => d.id ? api.patch(`/context/stakeholders/${d.id}`, d) : api.post('/context/stakeholders', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['context-stakeholders'] }); setModal(null); setEditing(null); },
  });
  const deleteStakeholder = useMutation({
    mutationFn: (id: string) => api.delete(`/context/stakeholders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['context-stakeholders'] }),
  });

  const isLoading = loadFoda || loadStrat || loadStake;
  const totalFoda = foda ? Object.values(foda).flat().length : 0;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'foda', label: `FODA (${totalFoda})` },
    { key: 'strategies', label: `Estrategias (${strategies.length})` },
    { key: 'stakeholders', label: `Partes Interesadas (${stakeholders.length})` },
  ];

  if (isLoading) return <><Header title="Análisis de Contexto" subtitle="FODA + Estrategias + Partes Interesadas" /><PageContent><div className="flex justify-center py-20"><Spinner size={28} /></div></PageContent></>;

  return (
    <>
      <Header
        title="Análisis de Contexto"
        subtitle="FODA + Estrategias + Partes Interesadas (ISO Cláusula 4)"
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setModal(tab === 'foda' ? 'foda' : tab === 'strategies' ? 'strategy' : 'stakeholder');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-dassa-red text-white rounded-lg text-[13px] font-semibold hover:bg-dassa-red-deep"
          >
            <Plus size={15} /> Agregar
          </button>
        }
      />
      <PageContent>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {(Object.keys(FODA_CONFIG) as (keyof typeof FODA_CONFIG)[]).map((key) => {
            const cfg = FODA_CONFIG[key];
            const count = foda?.[key]?.length || 0;
            return (
              <KPICard key={key} label={cfg.label} value={count} icon={<cfg.icon size={18} />} />
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${
                tab === t.key ? 'bg-white text-dassa-red-deep shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'foda' && foda && <FodaGrid foda={foda} onEdit={(item) => { setEditing(item); setModal('foda'); }} onDelete={(id) => deleteFoda.mutate(id)} />}
        {tab === 'strategies' && <StrategiesTable strategies={strategies} users={users} onEdit={(s) => { setEditing(s); setModal('strategy'); }} onDelete={(id) => deleteStrategy.mutate(id)} />}
        {tab === 'stakeholders' && <StakeholdersTable stakeholders={stakeholders} onEdit={(s) => { setEditing(s); setModal('stakeholder'); }} onDelete={(id) => deleteStakeholder.mutate(id)} />}
      </PageContent>

      {/* Modals */}
      {modal === 'foda' && <FodaModal initial={editing} onClose={() => { setModal(null); setEditing(null); }} onSave={(d) => saveFoda.mutate(d)} saving={saveFoda.isPending} />}
      {modal === 'strategy' && <StrategyModal initial={editing} users={users} onClose={() => { setModal(null); setEditing(null); }} onSave={(d) => saveStrategy.mutate(d)} saving={saveStrategy.isPending} />}
      {modal === 'stakeholder' && <StakeholderModal initial={editing} onClose={() => { setModal(null); setEditing(null); }} onSave={(d) => saveStakeholder.mutate(d)} saving={saveStakeholder.isPending} />}
    </>
  );
}

// ─── FODA Grid ──────────────────────────────────────────────
function FodaGrid({ foda, onEdit, onDelete }: { foda: FodaGrouped; onEdit: (i: FodaItem) => void; onDelete: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(Object.keys(FODA_CONFIG) as (keyof typeof FODA_CONFIG)[]).map((type) => {
        const cfg = FODA_CONFIG[type];
        const items = foda[type] || [];
        return (
          <div key={type} className={`border rounded-xl p-4 ${cfg.light}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-lg ${cfg.color} text-white flex items-center justify-center font-bold text-sm`}>{cfg.letter}</span>
              <h3 className="font-bold text-gray-700">{cfg.label}</h3>
              <span className="ml-auto text-xs font-medium text-gray-500">{items.length}</span>
            </div>
            {items.length === 0 && <p className="text-xs text-gray-400 italic">Sin elementos cargados</p>}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm flex items-start gap-2 group">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase">{item.category}</span>
                    <p className="text-[13px] text-gray-700">{item.description}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-1 hover:bg-gray-100 rounded"><Pencil size={13} className="text-gray-400" /></button>
                    <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(item.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Strategies Table ───────────────────────────────────────
function StrategiesTable({ strategies, users: _users, onEdit, onDelete }: { strategies: Strategy[]; users: User[]; onEdit: (s: Strategy) => void; onDelete: (id: string) => void }) {
  const grouped = STRATEGY_TYPES.map((st) => ({
    ...st,
    items: strategies.filter((s) => s.strategy_type === st.value),
  }));

  return (
    <div className="space-y-4">
      {grouped.map((g) => (
        <div key={g.value}>
          <h3 className="text-sm font-bold text-gray-600 mb-2">{g.label} ({g.items.length})</h3>
          {g.items.length === 0 && <p className="text-xs text-gray-400 italic mb-3">Sin estrategias</p>}
          <div className="space-y-2">
            {g.items.map((s) => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[13px] text-gray-700">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[s.status] || ''}`}>{STATUS_LABELS[s.status] || s.status}</span>
                  </div>
                  {s.description && <p className="text-[12px] text-gray-500 line-clamp-2">{s.description}</p>}
                  <div className="flex gap-3 mt-1 text-[11px] text-gray-400">
                    {s.responsible_name && <span>Resp: {s.responsible_name}</span>}
                    {s.deadline && <span>Plazo: {new Date(s.deadline).toLocaleDateString('es-AR')}</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(s)} className="p-1 hover:bg-gray-100 rounded"><Pencil size={13} className="text-gray-400" /></button>
                  <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(s.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stakeholders Table ─────────────────────────────────────
function StakeholdersTable({ stakeholders, onEdit, onDelete }: { stakeholders: Stakeholder[]; onEdit: (s: Stakeholder) => void; onDelete: (id: string) => void }) {
  const internos = stakeholders.filter((s) => s.stakeholder_type === 'interno');
  const externos = stakeholders.filter((s) => s.stakeholder_type === 'externo');

  const renderGroup = (label: string, items: Stakeholder[]) => (
    <div>
      <h3 className="text-sm font-bold text-gray-600 mb-2">{label} ({items.length})</h3>
      {items.length === 0 && <p className="text-xs text-gray-400 italic mb-3">Sin partes interesadas</p>}
      <div className="space-y-2">
        {items.map((s) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Users size={14} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[13px] text-gray-700">{s.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${INFLUENCE_COLORS[s.influence_level] || ''}`}>
                  {s.influence_level}
                </span>
              </div>
              {s.needs_expectations && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{s.needs_expectations}</p>}
              {s.category && <span className="text-[11px] text-gray-400">{s.category}</span>}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(s)} className="p-1 hover:bg-gray-100 rounded"><Pencil size={13} className="text-gray-400" /></button>
              <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(s.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {renderGroup('Partes Interesadas Internas', internos)}
      {renderGroup('Partes Interesadas Externas', externos)}
    </div>
  );
}

// ─── Modals ─────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-700">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FodaModal({ initial, onClose, onSave, saving }: { initial?: FodaItem | null; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
  const [type, setType] = useState(initial?.foda_type || 'fortaleza');
  const [category, setCategory] = useState(initial?.category || '');
  const [description, setDescription] = useState(initial?.description || '');

  return (
    <ModalShell title={initial ? 'Editar Elemento FODA' : 'Nuevo Elemento FODA'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Tipo FODA</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setCategory(''); }} className="w-full border rounded-lg px-3 py-2 text-[13px]">
            {Object.entries(FODA_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Categoría</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
            <option value="">Seleccionar...</option>
            {(FODA_CATEGORIES[type] || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="Describir el elemento..." />
        </div>
        <button
          disabled={saving || !category || !description}
          onClick={() => onSave({ ...(initial?.id ? { id: initial.id } : {}), foda_type: type, category, description })}
          className="w-full py-2.5 bg-dassa-red text-white rounded-lg text-[13px] font-semibold hover:bg-dassa-red-deep disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} {initial ? 'Guardar Cambios' : 'Crear'}
        </button>
      </div>
    </ModalShell>
  );
}

function StrategyModal({ initial, users, onClose, onSave, saving }: { initial?: Strategy | null; users: User[]; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    strategy_type: initial?.strategy_type || 'FO',
    name: initial?.name || '',
    description: initial?.description || '',
    deadline: initial?.deadline?.slice(0, 10) || '',
    responsible_id: initial?.responsible_id || '',
    status: initial?.status || 'planned',
  });
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <ModalShell title={initial ? 'Editar Estrategia' : 'Nueva Estrategia'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Tipo</label>
            <select value={form.strategy_type} onChange={(e) => set('strategy_type', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
              {STRATEGY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Estado</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
              {STRATEGY_STATUS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Nombre</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="Nombre de la estrategia" />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Descripción</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Responsable</label>
            <select value={form.responsible_id} onChange={(e) => set('responsible_id', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
              <option value="">Sin asignar</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Plazo</label>
            <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" />
          </div>
        </div>
        <button
          disabled={saving || !form.name}
          onClick={() => onSave({ ...(initial?.id ? { id: initial.id } : {}), ...form })}
          className="w-full py-2.5 bg-dassa-red text-white rounded-lg text-[13px] font-semibold hover:bg-dassa-red-deep disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} {initial ? 'Guardar Cambios' : 'Crear'}
        </button>
      </div>
    </ModalShell>
  );
}

function StakeholderModal({ initial, onClose, onSave, saving }: { initial?: Stakeholder | null; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    stakeholder_type: initial?.stakeholder_type || 'externo',
    category: initial?.category || '',
    needs_expectations: initial?.needs_expectations || '',
    influence_level: initial?.influence_level || 'medio',
  });
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <ModalShell title={initial ? 'Editar Parte Interesada' : 'Nueva Parte Interesada'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Tipo</label>
            <select value={form.stakeholder_type} onChange={(e) => set('stakeholder_type', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
              {STAKEHOLDER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Influencia</label>
            <select value={form.influence_level} onChange={(e) => set('influence_level', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
              {INFLUENCE_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Nombre</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="Nombre de la parte interesada" />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Categoría</label>
          <input value={form.category} onChange={(e) => set('category', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="Ej: Proveedor, Cliente, Ente regulador..." />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Necesidades y Expectativas</label>
          <textarea value={form.needs_expectations} onChange={(e) => set('needs_expectations', e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="¿Qué espera esta parte interesada?" />
        </div>
        <button
          disabled={saving || !form.name}
          onClick={() => onSave({ ...(initial?.id ? { id: initial.id } : {}), ...form })}
          className="w-full py-2.5 bg-dassa-red text-white rounded-lg text-[13px] font-semibold hover:bg-dassa-red-deep disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} {initial ? 'Guardar Cambios' : 'Crear'}
        </button>
      </div>
    </ModalShell>
  );
}
