import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Shield, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Risk {
  id: string; code: string; activity: string; hazard: string;
  risk_factor?: string; activity_type?: string; impact?: string;
  probability: number; severity: number; ir?: number;
  legal_req: boolean; current_controls?: string;
  responsible_id?: string; responsible_name?: string;
  control_status?: string;
  residual_probability?: number; residual_severity?: number;
  is_active: boolean; created_at: string;
}

interface User { id: string; full_name: string; }

// ─── Constantes ─────────────────────────────────────────────
const IR_LEVELS = {
  critical: { label: 'Crítico',     color: 'bg-red-600',    text: 'text-white',    min: 16 },
  high:     { label: 'Alto',        color: 'bg-orange-500',  text: 'text-white',    min: 9 },
  medium:   { label: 'Medio',       color: 'bg-amber-400',   text: 'text-amber-900',min: 4 },
  low:      { label: 'Bajo',        color: 'bg-emerald-500', text: 'text-white',    min: 1 },
};

function getIRLevel(ir: number) {
  if (ir >= 16) return IR_LEVELS.critical;
  if (ir >= 9) return IR_LEVELS.high;
  if (ir >= 4) return IR_LEVELS.medium;
  return IR_LEVELS.low;
}

function getIRColor(ir: number) {
  if (ir >= 16) return '#dc2626';
  if (ir >= 9) return '#f97316';
  if (ir >= 4) return '#f59e0b';
  return '#10b981';
}

const ACTIVITY_TYPES = ['rutinaria', 'no_rutinaria', 'emergencia'];
const ACTIVITY_LABELS: Record<string, string> = {
  rutinaria: 'Rutinaria', no_rutinaria: 'No Rutinaria', emergencia: 'Emergencia'
};

const CONTROL_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  implementado:    { label: 'Implementado',    bg: 'bg-emerald-100', color: 'text-emerald-700' },
  en_progreso:     { label: 'En Progreso',     bg: 'bg-blue-100',    color: 'text-blue-700' },
  pendiente:       { label: 'Pendiente',       bg: 'bg-amber-100',   color: 'text-amber-700' },
  no_aplica:       { label: 'No Aplica',       bg: 'bg-slate-100',   color: 'text-slate-500' },
};

// ─── IR Badge ────────────────────────────────────────────────
function IRBadge({ ir }: { ir: number }) {
  const level = getIRLevel(ir);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold ${level.color} ${level.text}`}>
      {ir} — {level.label}
    </span>
  );
}

// ─── Risk Matrix Visual ──────────────────────────────────────
function RiskMatrix({ risks }: { risks: Risk[] }) {
  const matrix: Record<string, Risk[]> = {};
  risks.forEach(r => {
    const key = `${r.probability}-${r.severity}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(r);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-[13px] font-bold text-slate-800 mb-1">Matriz de Riesgos (Probabilidad × Severidad)</p>
      <p className="text-[11px] text-slate-400 mb-4">Cada celda muestra la cantidad de riesgos en esa intersección</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 p-2 text-[10px] text-slate-400 font-bold">P \ S</th>
              {[1,2,3,4,5].map(s => (
                <th key={s} className="p-2 text-[10px] text-slate-500 font-bold text-center w-20">
                  Sev. {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5,4,3,2,1].map(p => (
              <tr key={p}>
                <td className="p-2 text-[10px] text-slate-500 font-bold">Prob. {p}</td>
                {[1,2,3,4,5].map(s => {
                  const ir = p * s;
                  const key = `${p}-${s}`;
                  const count = matrix[key]?.length || 0;
                  const bg = ir >= 16 ? 'bg-red-100' : ir >= 9 ? 'bg-orange-100' : ir >= 4 ? 'bg-amber-50' : 'bg-emerald-50';
                  const border = ir >= 16 ? 'border-red-300' : ir >= 9 ? 'border-orange-300' : ir >= 4 ? 'border-amber-200' : 'border-emerald-200';
                  return (
                    <td key={s} className={`p-1.5 text-center border ${border} ${bg} rounded`}>
                      {count > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[14px] font-extrabold" style={{ color: getIRColor(ir) }}>{count}</span>
                          <span className="text-[8px] text-slate-400">IR={ir}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300">{ir}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── New / Edit Risk Modal ───────────────────────────────────
function RiskModal({ risk, users, onClose }: { risk?: Risk; users: User[]; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!risk;
  const [form, setForm] = useState({
    activity: risk?.activity ?? '',
    hazard: risk?.hazard ?? '',
    risk_factor: risk?.risk_factor ?? '',
    activity_type: risk?.activity_type ?? 'rutinaria',
    impact: risk?.impact ?? '',
    probability: String(risk?.probability ?? 3),
    severity: String(risk?.severity ?? 3),
    legal_req: risk?.legal_req ?? false,
    current_controls: risk?.current_controls ?? '',
    responsible_id: risk?.responsible_id ?? '',
    control_status: risk?.control_status ?? 'pendiente',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const ir = parseInt(form.probability) * parseInt(form.severity);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        probability: parseInt(form.probability),
        severity: parseInt(form.severity),
        responsible_id: form.responsible_id || null,
      };
      return isEdit
        ? api.patch(`/risks/${risk!.id}`, payload)
        : api.post('/risks', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-slate-900">{isEdit ? 'Editar Riesgo' : 'Nuevo Riesgo'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Actividad / Proceso <span className="text-red-500">*</span></label>
            <input value={form.activity} onChange={e => set('activity', e.target.value)}
              placeholder="Ej: Operación de autoelevador" className="input-field" />
          </div>
          <div>
            <label className="label-field">Peligro / Fuente <span className="text-red-500">*</span></label>
            <input value={form.hazard} onChange={e => set('hazard', e.target.value)}
              placeholder="Ej: Atropellamiento, caída de carga" className="input-field" />
          </div>
          <div>
            <label className="label-field">Factor de Riesgo</label>
            <input value={form.risk_factor} onChange={e => set('risk_factor', e.target.value)}
              placeholder="Ej: Mecánico, Ergonómico, Químico" className="input-field" />
          </div>
          <div>
            <label className="label-field">Impacto</label>
            <textarea value={form.impact} onChange={e => set('impact', e.target.value)}
              rows={2} placeholder="Descripción del impacto potencial" className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo de Actividad</label>
              <select value={form.activity_type} onChange={e => set('activity_type', e.target.value)} className="input-field">
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Estado del Control</label>
              <select value={form.control_status} onChange={e => set('control_status', e.target.value)} className="input-field">
                {Object.entries(CONTROL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Probabilidad (1–5) <span className="text-red-500">*</span></label>
              <select value={form.probability} onChange={e => set('probability', e.target.value)} className="input-field">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Raro','Improbable','Posible','Probable','Casi seguro'][n-1]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Severidad (1–5) <span className="text-red-500">*</span></label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="input-field">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Insignificante','Menor','Moderado','Mayor','Catastrófico'][n-1]}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Índice de Riesgo (P × S)</span>
            <IRBadge ir={ir} />
          </div>
          <div>
            <label className="label-field">Controles Actuales</label>
            <textarea value={form.current_controls} onChange={e => set('current_controls', e.target.value)}
              rows={2} placeholder="Medidas de control implementadas" className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Responsable</label>
              <select value={form.responsible_id} onChange={e => set('responsible_id', e.target.value)} className="input-field">
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={form.legal_req}
                onChange={e => set('legal_req', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <label className="text-xs text-slate-600 font-semibold">Requisito Legal Asociado</label>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.activity || !form.hazard || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white font-bold text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Riesgo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Risks() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'listado' | 'matriz' | 'reportes'>('listado');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Risk | undefined>();
  const [filterLevel, setFilterLevel] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data: risks = [], isLoading } = useQuery<Risk[]>({
    queryKey: ['risks'],
    queryFn: () => api.get('/risks'),
    refetchInterval: 30_000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const withIR = risks.map(r => ({ ...r, ir: r.ir ?? r.probability * r.severity }));

  const filtered = withIR.filter(r => {
    if (filterLevel) {
      const level = getIRLevel(r.ir!);
      if (filterLevel === 'critical' && level !== IR_LEVELS.critical) return false;
      if (filterLevel === 'high' && level !== IR_LEVELS.high) return false;
      if (filterLevel === 'medium' && level !== IR_LEVELS.medium) return false;
      if (filterLevel === 'low' && level !== IR_LEVELS.low) return false;
    }
    if (filterType && r.activity_type !== filterType) return false;
    return true;
  });

  const critical = withIR.filter(r => r.ir! >= 16).length;
  const high = withIR.filter(r => r.ir! >= 9 && r.ir! < 16).length;
  const withLegal = withIR.filter(r => r.legal_req).length;
  const avgIR = withIR.length > 0 ? (withIR.reduce((s, r) => s + r.ir!, 0) / withIR.length).toFixed(1) : '—';

  return (
    <>
      <Header
        title="Matriz de Riesgos"
        subtitle="Evaluación de riesgos SGI — ISO 45001 / 14001 / 9001"
        alerts={critical}
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-600">
              <Plus size={14} /> Nuevo Riesgo
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1">
        {[
          { key: 'listado', label: 'Listado', icon: <Shield size={13} /> },
          { key: 'matriz',  label: 'Matriz P×S', icon: <AlertTriangle size={13} /> },
          { key: 'reportes', label: 'Reportes', icon: <BarChart3 size={13} /> },
        ].map((t: any) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors
              ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : tab === 'matriz' ? (
          <RiskMatrix risks={withIR} />
        ) : tab === 'reportes' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <KPICard label="Riesgos Críticos" value={critical} sub="IR ≥ 16" alert={critical > 0} icon={<AlertTriangle size={16} />} />
              <KPICard label="Riesgos Altos" value={high} sub="IR 9–15" alert={high > 0} alertColor="#f97316" icon={<Shield size={16} />} />
              <KPICard label="Con Req. Legal" value={withLegal} sub="Asociado a normativa" />
              <KPICard label="IR Promedio" value={avgIR} sub={`${withIR.length} riesgos totales`} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-[13px] font-bold text-slate-800 mb-1">Distribución por Nivel de Riesgo</p>
              <p className="text-[11px] text-slate-400 mb-4">Cantidad de riesgos por categoría de IR</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { nivel: 'Crítico (≥16)', count: withIR.filter(r => r.ir! >= 16).length, fill: '#dc2626' },
                  { nivel: 'Alto (9-15)', count: withIR.filter(r => r.ir! >= 9 && r.ir! < 16).length, fill: '#f97316' },
                  { nivel: 'Medio (4-8)', count: withIR.filter(r => r.ir! >= 4 && r.ir! < 9).length, fill: '#f59e0b' },
                  { nivel: 'Bajo (1-3)', count: withIR.filter(r => r.ir! < 4).length, fill: '#10b981' },
                ]} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="nivel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} />
                  <Bar dataKey="count" name="Riesgos" radius={[4,4,0,0]}>
                    {[
                      { fill: '#dc2626' }, { fill: '#f97316' }, { fill: '#f59e0b' }, { fill: '#10b981' }
                    ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los niveles</option>
                <option value="critical">Crítico (≥16)</option>
                <option value="high">Alto (9–15)</option>
                <option value="medium">Medio (4–8)</option>
                <option value="low">Bajo (1–3)</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los tipos</option>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>)}
              </select>
              {(filterLevel || filterType) && (
                <button onClick={() => { setFilterLevel(''); setFilterType(''); }}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">{filtered.length} riesgos</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="th-cell w-20">Código</th>
                    <th className="th-cell">Actividad / Peligro</th>
                    <th className="th-cell w-14 text-center">P</th>
                    <th className="th-cell w-14 text-center">S</th>
                    <th className="th-cell w-28">IR</th>
                    <th className="th-cell hidden lg:table-cell">Controles</th>
                    <th className="th-cell hidden md:table-cell w-24">Estado</th>
                    <th className="th-cell hidden lg:table-cell">Responsable</th>
                    {isAdmin && <th className="th-cell w-20">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const cs = CONTROL_STATUS[r.control_status ?? 'pendiente'] ?? CONTROL_STATUS.pendiente;
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-[10px] font-extrabold text-blue-700">{r.code}</code>
                          {r.legal_req && (
                            <span className="ml-1 text-[8px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded font-bold">LEG</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <p className="text-xs font-semibold text-slate-800 truncate">{r.activity}</p>
                          <p className="text-[10px] text-slate-400 truncate">{r.hazard}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-slate-700">{r.probability}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-slate-700">{r.severity}</span>
                        </td>
                        <td className="px-4 py-3"><IRBadge ir={r.ir!} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell max-w-[180px]">
                          <p className="text-[10px] text-slate-500 truncate">{r.current_controls || '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cs.bg} ${cs.color}`}>
                            {cs.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {r.responsible_name ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar name={r.responsible_name} size={20} />
                              <span className="text-[10px] text-slate-600 truncate max-w-[80px]">{r.responsible_name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => { setEditing(r); setShowModal(true); }}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Shield size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin riesgos registrados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <RiskModal risk={editing} users={users} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
