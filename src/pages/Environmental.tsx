import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Leaf, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface EnvironmentalAspect {
  id: string; aspect: string; activity?: string; impact?: string;
  frequency: number; severity: number; detection: number;
  significance: number; is_significant: boolean;
  control_measure?: string; created_at: string;
}

// ─── Constantes ─────────────────────────────────────────────
function getSigLevel(sig: number) {
  if (sig > 64)  return { label: 'Crítico',       bg: 'bg-red-600',     text: 'text-white' };
  if (sig > 36)  return { label: 'Significativo',  bg: 'bg-orange-500',  text: 'text-white' };
  if (sig > 18)  return { label: 'Moderado',       bg: 'bg-amber-400',   text: 'text-amber-900' };
  return              { label: 'No Significativo',bg: 'bg-emerald-500', text: 'text-white' };
}

function getSigColor(sig: number) {
  if (sig > 64) return '#dc2626';
  if (sig > 36) return '#f97316';
  if (sig > 18) return '#f59e0b';
  return '#10b981';
}

// ─── Significance Badge ──────────────────────────────────────
function SigBadge({ sig }: { sig: number }) {
  const level = getSigLevel(sig);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold ${level.bg} ${level.text}`}>
      {sig} — {level.label}
    </span>
  );
}

// ─── New / Edit Modal ────────────────────────────────────────
function AspectModal({ aspect, onClose }: { aspect?: EnvironmentalAspect; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!aspect;
  const [form, setForm] = useState({
    aspect: aspect?.aspect ?? '',
    activity: aspect?.activity ?? '',
    impact: aspect?.impact ?? '',
    frequency: String(aspect?.frequency ?? 3),
    severity: String(aspect?.severity ?? 3),
    detection: String(aspect?.detection ?? 3),
    control_measure: aspect?.control_measure ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const sig = parseInt(form.frequency) * parseInt(form.severity) * parseInt(form.detection);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        frequency: parseInt(form.frequency),
        severity: parseInt(form.severity),
        detection: parseInt(form.detection),
      };
      return isEdit
        ? api.patch(`/environmental/${aspect!.id}`, payload)
        : api.post('/environmental', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['environmental'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Aspecto Ambiental' : 'Nuevo Aspecto Ambiental'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Aspecto Ambiental <span className="text-red-500">*</span></label>
            <input value={form.aspect} onChange={e => set('aspect', e.target.value)}
              placeholder="Ej: Generación de residuos peligrosos" className="input-field" />
          </div>
          <div>
            <label className="label-field">Actividad Asociada</label>
            <input value={form.activity} onChange={e => set('activity', e.target.value)}
              placeholder="Ej: Mantenimiento de equipos" className="input-field" />
          </div>
          <div>
            <label className="label-field">Impacto Ambiental</label>
            <textarea value={form.impact} onChange={e => set('impact', e.target.value)}
              rows={2} placeholder="Ej: Contaminación de suelo y agua" className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Frecuencia (1–5) <span className="text-red-500">*</span></label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="input-field">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Rara','Esporádica','Ocasional','Frecuente','Continua'][n-1]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Severidad (1–5) <span className="text-red-500">*</span></label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="input-field">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Insignificante','Menor','Moderado','Mayor','Catastrófico'][n-1]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Detección (1–5) <span className="text-red-500">*</span></label>
              <select value={form.detection} onChange={e => set('detection', e.target.value)} className="input-field">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Alta','Buena','Moderada','Baja','Nula'][n-1]}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Significancia (F × S × D)</span>
            <SigBadge sig={sig} />
          </div>
          <div>
            <label className="label-field">Medida de Control</label>
            <textarea value={form.control_measure} onChange={e => set('control_measure', e.target.value)}
              rows={2} placeholder="Controles operacionales aplicados" className="input-field resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.aspect || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Aspecto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Environmental() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EnvironmentalAspect | undefined>();
  const [filterSig, setFilterSig] = useState('');
  const qc = useQueryClient();

  const { data: aspects = [], isLoading } = useQuery<EnvironmentalAspect[]>({
    queryKey: ['environmental'],
    queryFn: () => api.get('/environmental'),
    refetchInterval: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/environmental/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['environmental'] }),
  });

  const filtered = aspects.filter(a => {
    if (filterSig === 'significant' && !a.is_significant) return false;
    if (filterSig === 'not_significant' && a.is_significant) return false;
    return true;
  });

  const significant = aspects.filter(a => a.is_significant).length;
  const notSignificant = aspects.filter(a => !a.is_significant).length;
  const avgSig = aspects.length > 0
    ? (aspects.reduce((s, a) => s + a.significance, 0) / aspects.length).toFixed(1)
    : '—';
  const critical = aspects.filter(a => a.significance > 64).length;

  return (
    <>
      <Header
        title="Aspectos Ambientales"
        subtitle="Matriz de evaluación F×S×D — ISO 14001"
        alerts={significant}
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Aspecto
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
              <KPICard label="Significativos" value={significant} sub="Requieren control" alert={significant > 0} icon={<AlertTriangle size={16} />} />
              <KPICard label="Críticos" value={critical} sub="Significancia > 64" alert={critical > 0} alertColor="#dc2626" icon={<Leaf size={16} />} />
              <KPICard label="No Significativos" value={notSignificant} sub="Bajo impacto" icon={<CheckCircle2 size={16} />} />
              <KPICard label="Sig. Promedio" value={avgSig} sub={`${aspects.length} aspectos totales`} icon={<Leaf size={16} />} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <select value={filterSig} onChange={e => setFilterSig(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos</option>
                <option value="significant">Significativos</option>
                <option value="not_significant">No Significativos</option>
              </select>
              {filterSig && (
                <button onClick={() => setFilterSig('')}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{filtered.length} aspectos</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell">Aspecto Ambiental</th>
                    <th className="th-cell hidden md:table-cell">Actividad</th>
                    <th className="th-cell hidden lg:table-cell">Impacto</th>
                    <th className="th-cell w-12 text-center">F</th>
                    <th className="th-cell w-12 text-center">S</th>
                    <th className="th-cell w-12 text-center">D</th>
                    <th className="th-cell w-32">Significancia</th>
                    <th className="th-cell hidden lg:table-cell">Control</th>
                    {isAdmin && <th className="th-cell w-28">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                      ${a.is_significant ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs font-semibold text-gray-800 truncate">{a.aspect}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell max-w-[160px]">
                        <p className="text-[10px] text-gray-500 truncate">{a.activity || '—'}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-[160px]">
                        <p className="text-[10px] text-gray-500 truncate">{a.impact || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-gray-700">{a.frequency}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-gray-700">{a.severity}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-gray-700">{a.detection}</span>
                      </td>
                      <td className="px-4 py-3">
                        <SigBadge sig={a.significance} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-[160px]">
                        <p className="text-[10px] text-gray-500 truncate">{a.control_measure || '—'}</p>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditing(a); setShowModal(true); }}
                              className="text-[10px] font-bold text-dassa-red hover:text-blue-800 px-2 py-1">
                              Editar
                            </button>
                            <button onClick={() => { if (confirm('¿Eliminar aspecto?')) deleteMut.mutate(a.id); }}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Leaf size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin aspectos ambientales</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <AspectModal aspect={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
