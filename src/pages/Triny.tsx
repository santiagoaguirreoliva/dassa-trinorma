// /triny · pantalla unificada del agente IA del sistema
// TRINY tiene N capabilities · sustituye lo que antes eran 3 agentes separados
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Bot, Shield, Inbox, ShoppingCart, CheckCircle2, BellRing, MessageCircle,
  Sparkles, Loader2, ToggleLeft, ToggleRight, Activity, DollarSign,
  TrendingUp, Settings, Zap, AlertTriangle,
} from 'lucide-react';

interface Capability {
  key: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  model: string;
  service_module: string;
  stats_endpoint?: string;
}

interface TrinyInfo {
  name: string;
  tagline: string;
  version: string;
  personality: string;
  status: string;
  total_capabilities: number;
  enabled_capabilities: number;
  capabilities: Capability[];
}

interface TrinyStats {
  auditor_runs_total: number;
  chats_last_week: number;
  cost_last_month: string | number;
}

const ICON_MAP: Record<string, any> = {
  Shield, Inbox, ShoppingCart, CheckCircle2: CheckCircle2, BellRing, MessageCircle, Bot,
};

const CAP_COLOR: Record<string, string> = {
  auditor:  'bg-violet-100 text-violet-700 border-violet-300',
  inbox:    'bg-blue-100 text-blue-700 border-blue-300',
  compras:  'bg-emerald-100 text-emerald-700 border-emerald-300',
  quality:  'bg-amber-100 text-amber-700 border-amber-300',
  wake_up:  'bg-rose-100 text-rose-700 border-rose-300',
  chat:     'bg-cyan-100 text-cyan-700 border-cyan-300',
};

export default function Triny() {
  const { user } = useAuth();
  const [info, setInfo] = useState<TrinyInfo | null>(null);
  const [stats, setStats] = useState<TrinyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const canEdit = ['master_admin', 'sgi_leader'].includes(user?.role || '');

  async function load() {
    setLoading(true);
    try {
      const [i, s] = await Promise.all([
        api.get<TrinyInfo>('/triny/info'),
        api.get<TrinyStats>('/triny/stats').catch(() => null),
      ]);
      setInfo(i);
      setStats(s);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(cap: Capability) {
    if (!canEdit) return;
    setToggling(cap.key);
    try {
      await api.patch(`/triny/capabilities/${cap.key}`, { enabled: !cap.enabled });
      await load();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally { setToggling(null); }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#BF1E2E]" />
    </div>
  );
  if (!info) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <Bot className="w-12 h-12 text-yellow-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl md:text-4xl font-black">{info.name}</h1>
                <span className="bg-emerald-500/20 text-emerald-200 text-xs font-bold px-2 py-1 rounded-full border border-emerald-400/30">
                  ● {info.status}
                </span>
                <span className="bg-white/15 text-white/80 text-xs font-mono px-2 py-1 rounded">v{info.version}</span>
              </div>
              <p className="text-lg text-white/90">{info.tagline}</p>
              <p className="text-sm text-white/70 mt-2">{info.personality}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80 flex-wrap pt-4 border-t border-white/20">
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" />
              <strong>{info.enabled_capabilities}/{info.total_capabilities}</strong> capacidades activas
            </span>
            {stats && (
              <>
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" />
                  <strong>{stats.auditor_runs_total}</strong> auditorías ejecutadas
                </span>
                <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />
                  <strong>{stats.chats_last_week}</strong> chats esta semana
                </span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />
                  <strong>USD {stats.cost_last_month}</strong> último mes
                </span>
              </>
            )}
          </div>
        </div>

        {/* Aclaración importante */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 mb-6">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-amber-900">TRINY ≠ NIXA.</strong>
              <span className="text-amber-800">
                {' '}TRINY es el agente IA del sistema (este bot). <strong>NIXA</strong> es la consultora auditora externa,
                una <strong>persona real</strong> que usa el sistema. El "Inbox NIXA" es su bandeja personal — TRINY le ayuda
                a triajearlo, pero las decisiones las toma NIXA persona.
              </span>
            </div>
          </div>
        </div>

        {/* Capabilities grid */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Capacidades de TRINY</h2>
        <p className="text-gray-600 mb-4">
          Cada capacidad es un "modo" en el que TRINY trabaja. Activá / desactivá según lo que necesites.
          {!canEdit && <em> (Solo master_admin y sgi_leader pueden modificar.)</em>}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {info.capabilities.map(cap => {
            const Icon = ICON_MAP[cap.icon] || Bot;
            const color = CAP_COLOR[cap.key] || 'bg-gray-100 text-gray-700 border-gray-300';
            return (
              <div key={cap.key} className={`bg-white rounded-xl border-2 p-5 transition ${cap.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start gap-3 mb-2">
                  <div className={`${color} border rounded-lg p-3 shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{cap.label}</h3>
                      <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{cap.key}</code>
                    </div>
                    <p className="text-sm text-gray-600">{cap.description}</p>
                  </div>
                  <button
                    onClick={() => toggle(cap)}
                    disabled={!canEdit || toggling === cap.key}
                    className="shrink-0 disabled:opacity-50">
                    {toggling === cap.key
                      ? <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
                      : cap.enabled
                        ? <ToggleRight className="w-9 h-9 text-emerald-600" />
                        : <ToggleLeft className="w-9 h-9 text-gray-400" />}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {cap.model.replace('-20251001','')}</span>
                  <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> {cap.service_module}</span>
                  {cap.stats_endpoint && (
                    <span className="text-gray-400 font-mono">{cap.stats_endpoint}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-violet-600 shrink-0" />
            <div className="text-sm text-gray-700">
              <strong className="block mb-1 text-gray-900">¿Por qué un agente unificado?</strong>
              Antes existían 3 servicios IA separados (Auditor IA · NIXA Inbox · Compras Assistant) que técnicamente eran el
              mismo proceso pero se presentaban como entidades distintas. Esto generaba confusión: <em>¿son varios bots?
              ¿el auditor compite con el inbox?</em> No. <strong>TRINY es uno solo</strong>, y cada capacidad es una forma
              específica en que el agente nos ayuda.
              <br /><br />
              <strong>Próximas capacidades planeadas:</strong> <em>resumen-semanal</em> (TRINY te manda un resumen ejecutivo
              cada lunes) · <em>recordatorios-inteligentes</em> (te avisa antes de que algo venza, con contexto) ·
              <em> generador-de-actas</em> (al cerrar una reunión, TRINY arma el acta en formato ISO).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
