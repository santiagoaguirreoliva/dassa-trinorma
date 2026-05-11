import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Sparkles, Save, Loader2, ToggleLeft, ToggleRight, DollarSign,
  Activity, MessageSquare, AlertCircle, CheckCircle2, Settings
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

interface ToolMeta { name: string; description: string; }
interface AgentConfig {
  assistant_model: string;
  assistant_max_tokens: number;
  assistant_temperature: number;
  assistant_enabled_tools: string[];
  assistant_system_prompt_extra: string;
}
interface ConfigResponse {
  config: AgentConfig;
  all_tools: ToolMeta[];
  defaults: AgentConfig;
}
interface RecentConv {
  id: string;
  created_at: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  tools_used: string[];
  user_name: string;
  preview: string;
}
interface StatsResponse {
  stats: {
    conversaciones: { total: number; ultima_semana: number; hoy: number };
    alertas_auditor: { total_alertas: number };
    reportes_auditor: { reportes_semana: number };
  };
  recent_conversations: RecentConv[];
}

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', cost: 'Más barato (USD 0.8/4 por 1M)', speed: 'Más rápido' },
  { value: 'claude-sonnet-4-5',         label: 'Claude Sonnet 4.5', cost: 'Medio (USD 3/15 por 1M)', speed: 'Balance' },
  { value: 'claude-opus-4-6',           label: 'Claude Opus 4.6',  cost: 'Premium (USD 15/75 por 1M)', speed: 'Más capaz' },
];

export default function AgentSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'master_admin' || user?.role === 'director';

  if (!isAdmin) {
    return (
      <PageContent>
        <Header title="Configurar IA" subtitle="Solo administradores" />
        <div className="text-center py-20 text-gray-400">
          <AlertCircle size={32} className="mx-auto mb-3 opacity-40" />
          <p>No tenés permisos para acceder a esta sección.</p>
        </div>
      </PageContent>
    );
  }

  const { data: cfg, isLoading: loadingCfg } = useQuery<ConfigResponse>({
    queryKey: ['agent-config'],
    queryFn: () => api.get<{ ok: boolean } & ConfigResponse>('/agent/config').then(r => r),
  });
  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['agent-stats'],
    queryFn: () => api.get<{ ok: boolean } & StatsResponse>('/agent/stats').then(r => r),
    refetchInterval: 30_000,
  });

  const [form, setForm] = useState<AgentConfig | null>(null);
  useEffect(() => { if (cfg?.config) setForm({ ...cfg.config }); }, [cfg]);

  const saveMut = useMutation({
    mutationFn: (payload: Partial<AgentConfig>) => api.patch('/agent/config', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-config'] }),
  });

  if (loadingCfg || !form) return <PageContent><Spinner /></PageContent>;

  const toggleTool = (name: string) => {
    setForm(p => p && ({
      ...p,
      assistant_enabled_tools: p.assistant_enabled_tools.includes(name)
        ? p.assistant_enabled_tools.filter(t => t !== name)
        : [...p.assistant_enabled_tools, name]
    }));
  };

  const totalCost = (statsData?.recent_conversations || [])
    .reduce((s, c) => s + Number(c.cost_usd || 0), 0);
  const totalTokens = (statsData?.recent_conversations || [])
    .reduce((s, c) => s + (c.input_tokens || 0) + (c.output_tokens || 0), 0);

  return (
    <PageContent>
      <Header
        title="🤖 Configurar Asistente IA"
        subtitle="DASSA IA · agente unificado con Anthropic Claude · solo master_admin"
        icon={<Bot size={20} />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard
          label="Conversaciones hoy"
          value={statsData?.stats.conversaciones.hoy ?? 0}
          sub={`${statsData?.stats.conversaciones.ultima_semana ?? 0} esta semana`}
        />
        <KPICard
          label="Total histórico"
          value={statsData?.stats.conversaciones.total ?? 0}
          sub="conversaciones"
        />
        <KPICard
          label="Tokens últimas 10"
          value={totalTokens.toLocaleString('es-AR')}
          sub="input + output"
        />
        <KPICard
          label="Costo últimas 10"
          value={`USD $${totalCost.toFixed(4)}`}
          sub="cobrado a Anthropic"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Config principal ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Modelo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-dassa-celeste-deep" />
              <h3 className="text-sm font-extrabold text-gray-900">Modelo</h3>
            </div>
            <div className="space-y-2">
              {MODELS.map(m => (
                <label key={m.value} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${form.assistant_model === m.value ? 'border-dassa-red bg-dassa-red-tint/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    checked={form.assistant_model === m.value}
                    onChange={() => setForm(p => p && ({ ...p, assistant_model: m.value }))}
                    className="accent-dassa-red"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-900">{m.label}</div>
                    <div className="text-[11px] text-gray-500">{m.cost} · {m.speed}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Params */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">Parámetros</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Max tokens · respuesta</label>
                <input
                  type="number"
                  min={500} max={4000}
                  value={form.assistant_max_tokens}
                  onChange={e => setForm(p => p && ({ ...p, assistant_max_tokens: parseInt(e.target.value) }))}
                  className="input-field"
                />
                <p className="text-[10px] text-gray-400 mt-1">Recomendado: 1500</p>
              </div>
              <div>
                <label className="label-field">Temperature (0=preciso, 1=creativo)</label>
                <input
                  type="number"
                  min={0} max={1} step={0.1}
                  value={form.assistant_temperature}
                  onChange={e => setForm(p => p && ({ ...p, assistant_temperature: parseFloat(e.target.value) }))}
                  className="input-field"
                />
                <p className="text-[10px] text-gray-400 mt-1">Recomendado: 0.5</p>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-extrabold text-gray-900 mb-1">Tools disponibles</h3>
            <p className="text-[11px] text-gray-500 mb-4">
              {form.assistant_enabled_tools.length} / {cfg?.all_tools.length} habilitadas
            </p>
            <div className="space-y-2">
              {cfg?.all_tools.map(tool => {
                const enabled = form.assistant_enabled_tools.includes(tool.name);
                return (
                  <div key={tool.name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <button onClick={() => toggleTool(tool.name)} className="flex-shrink-0 mt-0.5">
                      {enabled
                        ? <ToggleRight size={28} className="text-dassa-celeste-deep" />
                        : <ToggleLeft size={28} className="text-gray-300" />}
                    </button>
                    <div className="flex-1">
                      <code className="text-xs font-bold text-dassa-red-deep">{tool.name}</code>
                      <p className="text-[11px] text-gray-600 mt-0.5">{tool.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System prompt extra */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-extrabold text-gray-900 mb-1">Instrucciones extra al agente</h3>
            <p className="text-[11px] text-gray-500 mb-3">Texto que se agrega al system prompt base. Útil para reglas particulares de DASSA o contexto adicional.</p>
            <textarea
              value={form.assistant_system_prompt_extra}
              onChange={e => setForm(p => p && ({ ...p, assistant_system_prompt_extra: e.target.value }))}
              rows={5}
              placeholder="Ej: Recordá que toda comunicación con NIXA debe pasar primero por Manuel. Ante dudas de TRINORMA escalar a Santiago."
              className="input-field resize-none w-full text-xs"
            />
          </div>

          {/* Save */}
          <div className="flex items-center justify-between bg-gradient-to-r from-dassa-red-tint to-dassa-celeste-tint p-4 rounded-xl">
            <p className="text-xs text-gray-700">
              {saveMut.isSuccess
                ? <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 size={13} /> Configuración guardada</span>
                : 'Los cambios se aplican inmediatamente al próximo chat'}
            </p>
            <button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50"
            >
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
          </div>
        </div>

        {/* ─── Sidebar derecha: conversaciones recientes ─── */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-dassa-celeste-deep" />
              <h3 className="text-sm font-extrabold text-gray-900">Conversaciones recientes</h3>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(statsData?.recent_conversations || []).map(c => (
                <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-700">{c.user_name || '—'}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.created_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2">{c.preview}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                    <span>{c.input_tokens + c.output_tokens} tokens</span>
                    <span>·</span>
                    <span>USD ${Number(c.cost_usd).toFixed(4)}</span>
                    {c.tools_used && Array.isArray(c.tools_used) && c.tools_used.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{c.tools_used.length} tools</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!statsData?.recent_conversations?.length && (
                <p className="text-xs text-gray-400 text-center py-6">Sin conversaciones aún</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
}
