import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Target, TrendingUp, Shield, AlertTriangle,
  Pencil, Trash2, Check, Lock, CalendarCheck, RotateCcw, Link2
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

// ─── Constants ──────────────────────────────────────────────
const FODA_CONFIG = {
  fortaleza:   { label: 'Fortalezas',    color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', icon: Shield, letter: 'F' },
  oportunidad: { label: 'Oportunidades', color: 'bg-dassa-red',    light: 'bg-dassa-red-tint border-blue-200',      icon: TrendingUp, letter: 'O' },
  debilidad:   { label: 'Debilidades',   color: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200',    icon: AlertTriangle, letter: 'D' },
  amenaza:     { label: 'Amenazas',      color: 'bg-red-500',     light: 'bg-red-50 border-red-200',        icon: Target, letter: 'A' },
} as const;

const FODA_CATEGORIES: Record<string, string[]> = {
  fortaleza: ['Operaciones', 'RRHH', 'Financiera', 'Tecnología', 'Marca/Reputación', 'Infraestructura', 'SGI'],
  oportunidad: ['Mercado', 'Regulación', 'Tecnología', 'Alianzas', 'Expansión', 'Subsidios'],
  debilidad: ['Operaciones', 'RRHH', 'Financiera', 'Tecnología', 'Procesos', 'Infraestructura'],
  amenaza: ['Mercado', 'Competencia', 'Regulación', 'Económica', 'Tipo de cambio', 'Política'],
};

// ─── Component ──────────────────────────────────────────────
export default function Context() {
  const { user } = useAuth();
  const isAdmin = ['master_admin', 'director', 'sgi_leader'].includes(user?.role || '');
  const isHomologador = ['master_admin', 'director'].includes(user?.role || '');
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | 'foda'>(null);
  const [editing, setEditing] = useState<any>(null);

  // Queries
  const { data: foda, isLoading: loadFoda } = useQuery<FodaGrouped>({
    queryKey: ['context-foda'], queryFn: () => api.get('/context/foda?active=1'),
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

  const isLoading = loadFoda;

  if (isLoading) return <><Header title="Análisis de Contexto" subtitle="Análisis FODA (ISO Cláusula 4.1)" /><PageContent><div className="flex justify-center py-20"><Spinner size={28} /></div></PageContent></>;

  return (
    <>
      <Header
        title="Análisis de Contexto"
        subtitle="Análisis FODA (ISO Cláusula 4.1)"
        actions={
          (isAdmin && !homologado) ? (
            <button
              onClick={() => { setEditing(null); setModal('foda'); }}
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

        {/* FODA */}
        {foda && <FodaGrid foda={foda} ciclo={ciclo} isAdmin={isAdmin} isHomologador={isHomologador} onEdit={(item) => { setEditing(item); setModal('foda'); }} onDelete={(id) => deleteFoda.mutate(id)} onValidate={(id, status) => validateFoda.mutate({ id, status })} onHomologar={(nota, force) => homologar.mutate({ nota, force })} onReabrir={() => reabrir.mutate()} homologando={homologar.isPending} />}
      </PageContent>

      {/* Modal */}
      {modal === 'foda' && <FodaModal initial={editing} onClose={() => { setModal(null); setEditing(null); }} onSave={(d) => saveFoda.mutate(d)} saving={saveFoda.isPending} />}
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

