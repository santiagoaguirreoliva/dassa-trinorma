import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Target, TrendingUp, Shield, AlertTriangle,
  Users, Pencil, Trash2, Check, Lock, CalendarCheck, RotateCcw, Link2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent } from '@/components/ui';

// ─── Types ──────────────────────────────────────────────────
interface FodaItem {
  id: string; foda_type: string; category: string;
  description: string; order_index: number; is_active: boolean;
  vinculo?: string | null; ciclo?: string | null;
  created_by?: string; created_by_name?: string; created_at: string;
  validation_status?: 'pendiente' | 'validado' | 'rechazado';
  validated_by_name?: string; validated_at?: string;
}
interface FodaGrouped {
  fortaleza: FodaItem[]; oportunidad: FodaItem[];
  debilidad: FodaItem[]; amenaza: FodaItem[];
}
interface FodaCiclo {
  ciclo: string; estado: 'borrador' | 'homologado';
  homologado_at?: string | null; homologado_by_name?: string | null; nota?: string | null;
  items?: number; validados?: number; pendientes?: number;
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
  const { user } = useAuth();
  const isAdmin = ['master_admin', 'director', 'sgi_leader'].includes(user?.role || '');
  const isHomologador = ['master_admin', 'director'].includes(user?.role || '');
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('foda');
  const [modal, setModal] = useState<null | 'foda' | 'strategy' | 'stakeholder'>(null);
  const [editing, setEditing] = useState<any>(null);

  // Queries
  const { data: foda, isLoading: loadFoda } = useQuery<FodaGrouped>({
    queryKey: ['context-foda'], queryFn: () => api.get('/context/foda?active=1'),
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
  const validateFoda = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/context/foda/${v.id}/validation`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['context-foda'] }),
  });
  const { data: ciclo } = useQuery<FodaCiclo>({
    queryKey: ['context-foda-ciclo'], queryFn: () => api.get('/context/foda/ciclo?ciclo=2025-2026'),
  });
  const homologar = useMutation({
    mutationFn: (v: { nota?: string; force?: boolean }) => api.post('/context/foda/homologar', { ciclo: '2025-2026', ...v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['context-foda-ciclo'] }); qc.invalidateQueries({ queryKey: ['context-foda'] }); },
  });
  const reabrir = useMutation({
    mutationFn: () => api.post('/context/foda/reabrir', { ciclo: '2025-2026' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['context-foda-ciclo'] }),
  });
  const homologado = ciclo?.estado === 'homologado';
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
          (tab !== 'foda' || (isAdmin && !homologado)) ? (
            <button
              onClick={() => {
                setEditing(null);
                setModal(tab === 'foda' ? 'foda' : tab === 'strategies' ? 'strategy' : 'stakeholder');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-dassa-red text-white rounded-lg text-[13px] font-semibold hover:bg-dassa-red-deep"
            >
              <Plus size={15} /> Agregar
            </button>
          ) : undefined
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
        {tab === 'foda' && foda && <FodaGrid foda={foda} ciclo={ciclo} isAdmin={isAdmin} isHomologador={isHomologador} onEdit={(item) => { setEditing(item); setModal('foda'); }} onDelete={(id) => deleteFoda.mutate(id)} onValidate={(id, status) => validateFoda.mutate({ id, status })} onHomologar={(nota, force) => homologar.mutate({ nota, force })} onReabrir={() => reabrir.mutate()} homologando={homologar.isPending} />}
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
function FodaGrid({ foda, ciclo, isAdmin, isHomologador, onEdit, onDelete, onValidate, onHomologar, onReabrir, homologando }: { foda: FodaGrouped; ciclo?: FodaCiclo; isAdmin: boolean; isHomologador: boolean; onEdit: (i: FodaItem) => void; onDelete: (id: string) => void; onValidate: (id: string, status: string) => void; onHomologar: (nota?: string, force?: boolean) => void; onReabrir: () => void; homologando: boolean }) {
  const all = Object.values(foda).flat();
  const val = all.filter(i => i.validation_status === 'validado').length;
  const rej = all.filter(i => i.validation_status === 'rechazado').length;
  const pend = all.filter(i => !i.validation_status || i.validation_status === 'pendiente').length;
  const pct = all.length ? Math.round(((val + rej) / all.length) * 100) : 0;
  const homologado = ciclo?.estado === 'homologado';
  const cicloLabel = ciclo?.ciclo || '2025-2026';

  const doHomologar = () => {
    if (pend > 0) {
      if (!confirm(`Quedan ${pend} ítems sin validar. ¿Homologar y cerrar igual el FODA del ciclo ${cicloLabel} con fecha de hoy?`)) return;
      onHomologar(undefined, true);
    } else {
      if (!confirm(`¿Homologar y cerrar el FODA del ciclo ${cicloLabel} con fecha de hoy? Quedará congelado (sin edición) hasta reabrirlo.`)) return;
      onHomologar(undefined, false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cierre homologado del FODA por ciclo */}
      <div className={`rounded-xl p-4 border ${homologado ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {homologado ? <Lock size={16} className="text-emerald-600" /> : <CalendarCheck size={16} className="text-dassa-red" />}
            <h3 className="text-sm font-bold text-gray-700">FODA Ciclo {cicloLabel}</h3>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${homologado ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
              {homologado ? 'Homologado' : 'En elaboración'}
            </span>
          </div>
          {isHomologador && (homologado ? (
            <button onClick={() => { if (confirm(`¿Reabrir el FODA del ciclo ${cicloLabel} para editar? Se quitará el cierre homologado.`)) onReabrir(); }}
              className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50">
              <RotateCcw size={13} /> Reabrir ciclo
            </button>
          ) : (
            <button onClick={doHomologar} disabled={homologando}
              className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg bg-dassa-red text-white hover:bg-dassa-red-deep disabled:opacity-50">
              {homologando ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />} Homologar y cerrar el ciclo
            </button>
          ))}
        </div>
        {homologado ? (
          <p className="text-[12px] text-emerald-700 mt-2">
            Cerrado y homologado el <b>{ciclo?.homologado_at ? new Date(ciclo.homologado_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</b>
            {ciclo?.homologado_by_name ? <> por <b>{ciclo.homologado_by_name}</b></> : null}. El FODA quedó congelado como evidencia del análisis de contexto (ISO 4.1). Reabrir el ciclo para modificarlo.
          </p>
        ) : (
          <>
            <div className="flex gap-2 text-[11px] font-bold mt-2 mb-2">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{val} validados</span>
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{rej} rechazados</span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pend} pendientes</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-dassa-red rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">{pct}% revisado · {isAdmin ? 'Editá/agregá/eliminá ítems, validá con NIXA y al cerrar el ciclo homologá con fecha.' : 'Validá o rechazá cada punto antes de homologar el ciclo.'}</p>
          </>
        )}
      </div>

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
                {items.map((item) => {
                  const st = item.validation_status || 'pendiente';
                  const ring = st === 'validado' ? 'ring-1 ring-emerald-300' : st === 'rechazado' ? 'ring-1 ring-red-300 opacity-60' : '';
                  return (
                    <div key={item.id} className={`bg-white rounded-lg p-3 shadow-sm ${ring}`}>
                      <div className="flex items-start gap-2 group">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase">{item.category}</span>
                          <p className={`text-[13px] text-gray-700 ${st === 'rechazado' ? 'line-through' : ''}`}>{item.description}</p>
                          {item.vinculo && (
                            <span className="inline-flex items-start gap-1 mt-1.5 text-[10.5px] text-dassa-celeste-deep bg-dassa-celeste-tint rounded px-1.5 py-0.5">
                              <Link2 size={11} className="mt-px shrink-0" /> {item.vinculo}
                            </span>
                          )}
                        </div>
                        {isAdmin && !homologado && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(item)} className="p-1 hover:bg-gray-100 rounded"><Pencil size={13} className="text-gray-400" /></button>
                            <button onClick={() => { if (confirm('¿Eliminar este ítem del FODA?')) onDelete(item.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button>
                          </div>
                        )}
                      </div>
                      {/* Botones de validación (bloqueados si el ciclo está homologado) */}
                      {!homologado ? (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                          <button onClick={() => onValidate(item.id, 'validado')}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1 ${st === 'validado' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                            <Check size={12} /> Validar
                          </button>
                          <button onClick={() => onValidate(item.id, 'rechazado')}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1 ${st === 'rechazado' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                            <X size={12} /> Rechazar
                          </button>
                          {st !== 'pendiente' && (
                            <button onClick={() => onValidate(item.id, 'pendiente')} className="text-[10px] text-gray-400 hover:text-gray-600 ml-1">revertir</button>
                          )}
                          {item.validated_by_name && st !== 'pendiente' && (
                            <span className="text-[10px] text-gray-400 ml-auto">{st === 'validado' ? '✓' : '✗'} {item.validated_by_name}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100 text-[10.5px] font-bold">
                          <span className={st === 'validado' ? 'text-emerald-600' : st === 'rechazado' ? 'text-red-500' : 'text-gray-400'}>
                            {st === 'validado' ? '✓ Validado' : st === 'rechazado' ? '✗ Rechazado' : '· Sin validar'}
                          </span>
                          {item.validated_by_name && <span className="text-gray-400 ml-auto">{item.validated_by_name}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
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
  const [vinculo, setVinculo] = useState(initial?.vinculo || '');
  const catOptions = Array.from(new Set([...(FODA_CATEGORIES[type] || []), ...(category ? [category] : [])]));

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
            {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="Describir el elemento..." />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-500 mb-1">Vínculo estratégico <span className="text-gray-400 font-normal">(objetivo 2026 / Visión 2030 / proyecto)</span></label>
          <input value={vinculo} onChange={(e) => setVinculo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" placeholder="Ej. Obj. 14 (rentabilidad) · Visión 2030 (trazabilidad)" />
        </div>
        <button
          disabled={saving || !category || !description}
          onClick={() => onSave({ ...(initial?.id ? { id: initial.id } : {}), foda_type: type, category, description, vinculo: vinculo || null })}
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
