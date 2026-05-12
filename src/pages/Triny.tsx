// /triny · TRINY agente IA del sistema · tabs: Capabilities · Políticas · Jobs · Log
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Bot, Shield, Inbox, ShoppingCart, CheckCircle2, BellRing, MessageCircle,
  Sparkles, Loader2, ToggleLeft, ToggleRight, Activity, DollarSign,
  Settings, Zap, AlertTriangle, Mail, Clock, Play, AlertCircle, BookOpen,
  ChevronDown, ChevronRight, Eye, Send,
} from 'lucide-react';

interface Capability { key: string; label: string; description: string; icon: string; enabled: boolean; model: string; service_module: string; }
interface TrinyInfo { name: string; tagline: string; version: string; personality: string; status: string; total_capabilities: number; enabled_capabilities: number; capabilities: Capability[]; }
interface TrinyStats { auditor_runs_total: number; chats_last_week: number; cost_last_month: string | number; }
interface Job { key: string; label: string; cron_expr: string; enabled: boolean; dry_run: boolean; description: string; tone: string; last_run_at: string | null; success_count: number; error_count: number; }
interface CommLog { id: string; job_type: string; tone: string; recipient_email: string; recipient_name: string; subject: string; success: boolean; sent_at: string; meta: any; }

const ICON_MAP: Record<string, any> = { Shield, Inbox, ShoppingCart, CheckCircle2, BellRing, MessageCircle, Bot };
const CAP_COLOR: Record<string, string> = {
  auditor: 'bg-violet-100 text-violet-700', inbox: 'bg-blue-100 text-blue-700',
  compras: 'bg-emerald-100 text-emerald-700', quality: 'bg-amber-100 text-amber-700',
  wake_up: 'bg-rose-100 text-rose-700', chat: 'bg-cyan-100 text-cyan-700',
};
const TONE_COLOR: Record<string, string> = {
  calido: 'bg-emerald-100 text-emerald-800', formal: 'bg-blue-100 text-blue-800',
  firme: 'bg-amber-100 text-amber-800', intimacion: 'bg-red-100 text-red-800',
};

export default function Triny() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'caps' | 'jobs' | 'log' | 'policies'>('caps');
  const [info, setInfo] = useState<TrinyInfo | null>(null);
  const [stats, setStats] = useState<TrinyStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [log, setLog] = useState<CommLog[]>([]);
  const [policiesDoc, setPoliciesDoc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const canEdit = ['master_admin', 'sgi_leader'].includes(user?.role || '');

  async function loadAll() {
    setLoading(true);
    try {
      const [i, s, j, l, p] = await Promise.all([
        api.get<TrinyInfo>('/triny/info'),
        api.get<TrinyStats>('/triny/stats').catch(() => null),
        api.get<Job[]>('/triny/jobs').catch(() => []),
        api.get<CommLog[]>('/triny/comms-log?limit=80').catch(() => []),
        api.get<{ content: string }>('/triny/policies-doc').catch(() => ({ content: '' })),
      ]);
      setInfo(i); setStats(s); setJobs(j); setLog(l); setPoliciesDoc(p.content);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  async function toggleCap(cap: Capability) {
    if (!canEdit) return;
    try {
      await api.patch(`/triny/capabilities/${cap.key}`, { enabled: !cap.enabled });
      await loadAll();
    } catch (e: any) { alert('Error: ' + e.message); }
  }

  async function toggleJob(job: Job, field: 'enabled' | 'dry_run') {
    if (!canEdit) return;
    try {
      await api.patch(`/triny/jobs/${job.key}`, { [field]: !job[field] });
      await loadAll();
    } catch (e: any) { alert('Error: ' + e.message); }
  }

  async function runJob(key: string, forceSend: boolean) {
    if (!canEdit) return;
    if (forceSend && !confirm(`ENVÍO REAL: vas a mandar mails reales al job "${key}". ¿Confirmás?`)) return;
    setRunning(key);
    setFeedback('');
    try {
      const r: any = await api.post(`/triny/run-job/${key}`, { force_send: forceSend });
      setFeedback(`OK job ${key}: ${JSON.stringify(r).slice(0, 200)}`);
      await loadAll();
    } catch (e: any) { setFeedback('Error: ' + e.message); }
    finally { setRunning(null); }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#BF1E2E]" /></div>;
  if (!info) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white mb-6">
          <div className="flex items-start gap-4 mb-4 flex-wrap">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20"><Bot className="w-12 h-12 text-yellow-300" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-black">{info.name}</h1>
                <span className="bg-emerald-500/20 text-emerald-200 text-xs font-bold px-2 py-1 rounded-full border border-emerald-400/30">● {info.status}</span>
                <span className="bg-white/15 text-white/80 text-xs font-mono px-2 py-1 rounded">v{info.version}</span>
              </div>
              <p className="text-lg text-white/90">{info.tagline}</p>
              <p className="text-sm text-white/70 mt-2">{info.personality}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80 flex-wrap pt-4 border-t border-white/20">
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /><strong>{info.enabled_capabilities}/{info.total_capabilities}</strong> capacidades</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><strong>{jobs.filter(j=>j.enabled).length}/{jobs.length}</strong> jobs activos</span>
            {stats && <>
              <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /><strong>{stats.chats_last_week}</strong> chats esta semana</span>
              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /><strong>USD {stats.cost_last_month}</strong> mes</span>
            </>}
          </div>
        </div>

        {/* Aclaración */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-3 mb-6 flex gap-2 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>TRINY ≠ NIXA.</strong> TRINY es el bot del sistema. <strong>NIXA</strong> es la consultora auditora externa, persona real.
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl border border-gray-200 flex overflow-x-auto">
          {[
            { v: 'caps',     l: 'Capacidades',     i: Sparkles },
            { v: 'jobs',     l: 'Jobs programados', i: Clock },
            { v: 'log',      l: 'Log de envíos',    i: Mail },
            { v: 'policies', l: 'Políticas',        i: BookOpen },
          ].map(t => {
            const Ti = t.i;
            return (
              <button key={t.v} onClick={() => setTab(t.v as any)}
                className={`flex items-center gap-2 px-5 py-3 font-medium border-b-2 transition ${
                  tab === t.v ? 'border-[#BF1E2E] text-[#BF1E2E] bg-[#BF1E2E]/5' : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}>
                <Ti className="w-4 h-4" /> {t.l}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-b-xl border-x border-b border-gray-200 p-5 md:p-6">
          {/* TAB capabilities */}
          {tab === 'caps' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {info.capabilities.map(cap => {
                const Icon = ICON_MAP[cap.icon] || Bot;
                const color = CAP_COLOR[cap.key] || 'bg-gray-100 text-gray-700';
                return (
                  <div key={cap.key} className={`bg-white rounded-xl border-2 p-4 transition ${cap.enabled ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`${color} rounded-lg p-3 shrink-0`}><Icon className="w-6 h-6" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-gray-900">{cap.label}</h3>
                          <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{cap.key}</code>
                        </div>
                        <p className="text-sm text-gray-600">{cap.description}</p>
                        <div className="text-xs text-gray-500 mt-2"><Zap className="inline w-3 h-3" /> {cap.model.replace('-20251001','')}</div>
                      </div>
                      <button onClick={() => toggleCap(cap)} disabled={!canEdit} className="shrink-0 disabled:opacity-50">
                        {cap.enabled ? <ToggleRight className="w-9 h-9 text-emerald-600" /> : <ToggleLeft className="w-9 h-9 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB jobs */}
          {tab === 'jobs' && (
            <div className="space-y