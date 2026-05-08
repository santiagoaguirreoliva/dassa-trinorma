import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Star, TrendingUp, Users, ThumbsUp, ClipboardList, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Badge } from '@/components/ui';

// ─── Types ──────────────────────────────────────────────────
interface Survey {
  id: string; title: string; survey_type: string;
  description?: string; period?: string; year?: number; quarter?: number;
  is_active: boolean; closes_at?: string; public_token?: string;
  created_by_name?: string; created_at: string; response_count: number;
}

interface SatisfactionData {
  surveys: Survey[];
  nps: number;
  total_surveys: number;
  total_responses: number;
  average_rating: number | string;
  promoters: number;
  detractors: number;
  passives: number;
}

// ─── Constants ──────────────────────────────────────────────
const SURVEY_TYPES = ['satisfaccion', 'clima_laboral', 'calidad_servicio', 'nps'];
const TYPE_LABELS: Record<string, string> = {
  satisfaccion: 'Satisfacción', clima_laboral: 'Clima Laboral',
  calidad_servicio: 'Calidad Servicio', nps: 'NPS',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getNPSColor(nps: number) {
  if (nps >= 50) return '#10b981';
  if (nps >= 0)  return '#f59e0b';
  return '#ef4444';
}

function getNPSLabel(nps: number) {
  if (nps >= 50) return 'Excelente';
  if (nps >= 0)  return 'Bueno';
  return 'Necesita mejora';
}

// ─── Modal ──────────────────────────────────────────────────
function SurveyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', survey_type: 'satisfaccion', description: '',
    period: '', year: String(new Date().getFullYear()),
    quarter: '', closes_at: '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post('/satisfaction', {
      ...form,
      year: form.year ? parseInt(form.year) : null,
      quarter: form.quarter ? parseInt(form.quarter) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['satisfaction'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">Nueva Encuesta</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Título <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ej: Encuesta Satisfacción Q1 2026" className="w-full border rounded-lg px-3 py-2 text-[13px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1">Tipo <span className="text-red-500">*</span></label>
              <select value={form.survey_type} onChange={e => set('survey_type', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
                {SURVEY_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1">Período</label>
              <input value={form.period} onChange={e => set('period', e.target.value)}
                placeholder="Ej: Q1-2026" className="w-full border rounded-lg px-3 py-2 text-[13px]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1">Año</label>
              <input type="number" value={form.year} onChange={e => set('year', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1">Trimestre</label>
              <select value={form.quarter} onChange={e => set('quarter', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]">
                <option value="">—</option>
                <option value="1">Q1</option><option value="2">Q2</option>
                <option value="3">Q3</option><option value="4">Q4</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Fecha de cierre</label>
            <input type="date" value={form.closes_at} onChange={e => set('closes_at', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-[13px] resize-none" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.title || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Crear Encuesta
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function CustomerSatisfaction() {
  const { user } = useAuth();
  const isAdmin = user && ['master_admin', 'director', 'sgi_leader'].includes(user.role);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'encuestas' | 'nps'>('encuestas');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SatisfactionData>({
    queryKey: ['satisfaction'],
    queryFn: () => api.get('/satisfaction'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/satisfaction/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['satisfaction'] }),
  });

  const surveys = data?.surveys ?? [];
  const nps = data?.nps ?? 0;
  const avg = data?.average_rating ?? 0;
  const totalResponses = data?.total_responses ?? 0;
  const promoters = data?.promoters ?? 0;
  const detractors = data?.detractors ?? 0;
  const passives = data?.passives ?? 0;

  return (
    <>
      <Header
        title="Encuestas de Satisfacción"
        subtitle="Medición NPS y satisfacción del cliente — ISO 9001"
        actions={
          isAdmin ? (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nueva Encuesta
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {[
          { key: 'encuestas' as const, label: 'Encuestas', icon: <ClipboardList size={13} /> },
          { key: 'nps' as const,       label: 'NPS / Reportes', icon: <TrendingUp size={13} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors
              ${tab === t.key ? 'border-dassa-red text-dassa-red-deep' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : tab === 'nps' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="NPS" value={nps} sub={getNPSLabel(nps)} icon={<TrendingUp size={16} />} />
              <KPICard label="Promedio" value={avg} sub={`${totalResponses} respuestas`} icon={<Star size={16} />} />
              <KPICard label="Promotores" value={promoters} sub={`${totalResponses > 0 ? Math.round(promoters/totalResponses*100) : 0}%`} icon={<ThumbsUp size={16} />} />
              <KPICard label="Detractores" value={detractors} sub={`${totalResponses > 0 ? Math.round(detractors/totalResponses*100) : 0}%`}
                alert={detractors > 0} icon={<Users size={16} />} />
            </div>

            {/* NPS gauge */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-[13px] font-bold text-gray-800 mb-1">Indicador NPS</p>
              <p className="text-[11px] text-gray-400 mb-4">Promotores ({promoters}) − Detractores ({detractors}) = NPS {nps}</p>
              {totalResponses > 0 ? (
                <>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex mb-3">
                    <div className="bg-red-400 h-full" style={{ width: `${(detractors/totalResponses)*100}%` }} />
                    <div className="bg-amber-300 h-full" style={{ width: `${(passives/totalResponses)*100}%` }} />
                    <div className="bg-emerald-400 h-full" style={{ width: `${(promoters/totalResponses)*100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-red-500">Detractores: {detractors}</span>
                    <span className="text-amber-500">Pasivos: {passives}</span>
                    <span className="text-emerald-500">Promotores: {promoters}</span>
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-gray-400 text-center py-6">Sin respuestas NPS registradas aún</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="Encuestas" value={surveys.length} icon={<ClipboardList size={16} />} />
              <KPICard label="Activas" value={surveys.filter(s => s.is_active).length} icon={<Star size={16} />} />
              <KPICard label="Respuestas" value={totalResponses} icon={<Users size={16} />} />
              <KPICard label="NPS Global" value={nps} icon={<TrendingUp size={16} />} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Encuesta</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-24">Tipo</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-20">Resp.</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-24">Período</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-20">Estado</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-24">Cierre</th>
                    {isAdmin && <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-20">Acc.</th>}
                  </tr>
                </thead>
                <tbody>
                  {surveys.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-800">{s.title}</p>
                        {s.description && <p className="text-[11px] text-gray-400 truncate max-w-[250px]">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium text-gray-600">
                          {TYPE_LABELS[s.survey_type] || s.survey_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full bg-dassa-red-tint text-dassa-red-deep text-[11px] font-bold">
                          {s.response_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-gray-500">{s.period || (s.year ? `${s.year} Q${s.quarter || '?'}` : '—')}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.is_active ? 'Activa' : 'Cerrada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-gray-500">{fmtDate(s.closes_at)}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { if (confirm('¿Eliminar encuesta?')) deleteMut.mutate(s.id); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1">
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {surveys.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardList size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin encuestas registradas</p>
                  <p className="text-xs mt-1">Creá una encuesta para empezar a medir la satisfacción</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <SurveyModal onClose={() => setShowModal(false)} />}
    </>
  );
}
