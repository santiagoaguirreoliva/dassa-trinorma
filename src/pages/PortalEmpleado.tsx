// /portal-empleado — Portal del Empleado (externo, sin cuenta de la app).
// Primer ingreso por link de invitación (?t=token) → el empleado crea su PIN → onboarding
// obligatorio de legajo → portal. Accesos siguientes: login por PIN.
// Secciones: Mi ficha · Mis capacitaciones · Comunicaciones · Mis datos · Organigrama ·
//            Mapa de procesos · Procedimientos · Identidad DASSA. Mobile-first, "dedo gigante".
import { useCallback, useEffect, useState } from 'react';
import {
  Lock, Delete, LogOut, Briefcase, GraduationCap, Network, Workflow, BookOpen,
  Compass, ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertTriangle, Clock,
  CalendarClock, ShieldCheck, Eye, Heart, ScrollText, User2, Megaphone, CheckCheck,
  Save, KeyRound, Pin, IdCard,
} from 'lucide-react';

const API = '/api/public/portal';
const SS_SESSION = 'portal_empleado_session';
const SS_EMP = 'portal_empleado_emp';

type Stage = 'pin' | 'activate' | 'onboarding' | 'home' | 'mi-ficha' | 'mis-capac'
  | 'comunicaciones' | 'mis-datos' | 'organigrama' | 'mapa' | 'procedimientos' | 'identidad';

interface Emp { id: string; full_name: string; position?: string | null; sector?: string | null; }
interface Profile {
  id: string; role_label: string; area?: string | null; seniority?: string | null; mission?: string | null;
  responsibilities?: string[] | null; competencies?: string[] | null; authority?: string | null;
  autonomy_level?: string | null; is_primary?: boolean; is_critical?: boolean; reports_to_role?: string | null;
}
interface Proc { id: string; code: string | null; title: string; module?: string | null; norma?: string | null; }
interface Training {
  cap_code: string; requirement: string; training_title: string; training_category?: string | null;
  last_attended_at?: string | null; next_programmed_at?: string | null; status: string;
}
interface MeData {
  employee: Emp & { supervisor_name?: string | null };
  profiles: Profile[]; procedures: Proc[]; training_status: Training[];
  compliance: { total_obligatorias: number; vencidas: number; programadas: number; pendientes: number; pct_obligatorias_ok: number };
}
interface Doc { code: string; doc_type: string; title: string; body_md: string | null; metadata?: { icon?: string; items?: { title?: string; label?: string; desc?: string }[] } | null; }
interface InstData {
  organigrama: { nodes: { id: string; name: string; area?: string | null; level?: number }[]; profiles: { id: string; role_label: string; area?: string | null; employees: { full_name: string; is_primary?: boolean }[] }[] };
  strategic_docs: Doc[];
}
interface PubProc { id: string; code: string | null; title: string; content_md: string | null; proceso: string | null; norma: string | null; }
interface Comunicacion { id: string; code: string | null; title: string; body_md: string; category: string; norma: string | null; sent_at: string | null; attachment_urls: string[] | null; leida: boolean; }
interface Novedad { id: string; title: string; body_md: string; category: string; published_at: string; pinned: boolean; }
interface ComsData { comunicaciones: Comunicacion[]; novedades: Novedad[]; unread: number; }
interface Legajo {
  full_name: string; sector?: string | null; position?: string | null;
  birth_date?: string | null; marital_status?: string | null; cuil?: string | null; address?: string | null;
  phone?: string | null; whatsapp?: string | null; email?: string | null;
  emergency_contact_name?: string | null; emergency_contact_phone?: string | null; emergency_contact_relation?: string | null;
  onboarded?: boolean;
}

const NORMA_COLOR: Record<string, string> = {
  TRINORMA: '#1A1A1A', 'ISO 9001': '#BF1E2E', 'ISO 14001': '#1F979C', 'ISO 45001': '#B26A00',
};
const PROC_CATEGORIAS: { key: string; procesos: string[] }[] = [
  { key: 'Estratégicos / Dirección', procesos: ['CONTEXTO', 'RIESGOS', 'GESTIÓN GERENCIAL', 'ANÁLISIS Y EVALUACIÓN DE LA GESTIÓN'] },
  { key: 'Comercial', procesos: ['COMERCIAL', 'RETROALIMENTACIÓN CLIENTES'] },
  { key: 'Operación', procesos: ['OPERACIÓN'] },
  { key: 'Soporte', procesos: ['COMPRAS', 'RECURSOS HUMANOS', 'MANTENIMIENTO', 'GESTIÓN AMBIENTAL', 'EVALUACIÓN RIESGOS Y PELIGROS', 'PARTICIPACIÓN Y CONSULTA', 'INCIDENTES Y ACCIDENTES', 'EMERGENCIAS'] },
];
const MARITAL = ['Soltero/a', 'Casado/a', 'Unión convivencial', 'Divorciado/a', 'Separado/a', 'Viudo/a'];

function MD({ md }: { md: string }) {
  const lines = (md || '').split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
  const flush = (k: number) => { if (list.length) { const items = list.slice(); out.push(<ul key={`u${k}`} className="list-disc pl-5 my-1.5 space-y-1">{items.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>); list = []; } };
  lines.forEach((raw, idx) => {
    const l = raw.trim();
    if (/^#{1,3}\s+/.test(l)) { flush(idx); out.push(<h4 key={idx} className="font-extrabold text-dassa-ink mt-3 mb-1 uppercase text-[13px] tracking-wide">{l.replace(/^#{1,3}\s+/, '')}</h4>); }
    else if (/^[-*]\s+/.test(l)) { list.push(l.replace(/^[-*]\s+/, '')); }
    else if (l === '') { flush(idx); }
    else { flush(idx); out.push(<p key={idx} className="my-1.5 leading-relaxed">{inline(l)}</p>); }
  });
  flush(9999);
  return <div className="text-[14px] text-slate-700">{out}</div>;
}

const DOC_ICON: Record<string, React.ReactNode> = {
  MISION_DASSA: <Compass size={20} />, VISION_DASSA: <Eye size={20} />,
  VALORES_DASSA: <Heart size={20} />, POLITICA_GESTION_INTEGRADA: <ScrollText size={20} />,
};
const TRAIN_STYLE: Record<string, { bg: string; fg: string; icon: React.ReactNode; label: string }> = {
  completada: { bg: 'bg-emerald-50', fg: 'text-emerald-700', icon: <CheckCircle2 size={15} />, label: 'Completada' },
  vencida: { bg: 'bg-red-50', fg: 'text-red-700', icon: <AlertTriangle size={15} />, label: 'Vencida' },
  programada: { bg: 'bg-sky-50', fg: 'text-sky-700', icon: <CalendarClock size={15} />, label: 'Programada' },
  pendiente: { bg: 'bg-amber-50', fg: 'text-amber-700', icon: <Clock size={15} />, label: 'Pendiente' },
};

export default function PortalEmpleado() {
  const inviteToken = new URLSearchParams(window.location.search).get('t');
  const [stage, setStage] = useState<Stage>(() => {
    if (sessionStorage.getItem(SS_SESSION)) return 'home';
    return inviteToken ? 'activate' : 'pin';
  });
  const [session, setSession] = useState<string | null>(() => sessionStorage.getItem(SS_SESSION));
  const [emp, setEmp] = useState<Emp | null>(() => { try { return JSON.parse(sessionStorage.getItem(SS_EMP) || 'null'); } catch { return null; } });
  const [me, setMe] = useState<MeData | null>(null);
  const [inst, setInst] = useState<InstData | null>(null);
  const [pubProcs, setPubProcs] = useState<PubProc[] | null>(null);
  const [coms, setComs] = useState<ComsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [secErr, setSecErr] = useState('');

  const fetchJSON = useCallback(async (path: string, opts?: RequestInit) => {
    const r = await fetch(path, { ...opts, headers: { 'x-portal-session': session || '', ...(opts?.headers || {}) } });
    if (r.status === 401) { doLogout(); throw new Error('Sesión expirada — volvé a ingresar'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Error de conexión');
    return r.json();
  }, [session]);

  function doLogout() {
    sessionStorage.removeItem(SS_SESSION); sessionStorage.removeItem(SS_EMP);
    setSession(null); setEmp(null); setMe(null); setInst(null); setPubProcs(null); setComs(null); setStage('pin');
  }
  function afterAuth(token: string, employee: Emp, onboarded: boolean) {
    sessionStorage.setItem(SS_SESSION, token);
    sessionStorage.setItem(SS_EMP, JSON.stringify(employee));
    setSession(token); setEmp(employee);
    setStage(onboarded ? 'home' : 'onboarding');
  }

  // Badge de comunicaciones sin leer: carga al entrar al home la primera vez.
  useEffect(() => {
    if (stage === 'home' && session && !coms) {
      fetchJSON(`${API}/me/comunicaciones`).then(setComs).catch(() => {});
    }
  }, [stage, session, coms, fetchJSON]);

  const goto = useCallback(async (s: Stage) => {
    setSecErr('');
    try {
      if ((s === 'mi-ficha' || s === 'mis-capac') && !me) { setLoading(true); setMe(await fetchJSON(`${API}/me`)); }
      if ((s === 'organigrama' || s === 'identidad') && !inst) { setLoading(true); setInst(await fetchJSON(`${API}/institucional`)); }
      if (s === 'procedimientos' && !pubProcs) { setLoading(true); setPubProcs(await fetchJSON('/api/public/procedimientos')); }
      if (s === 'comunicaciones' && !coms) { setLoading(true); setComs(await fetchJSON(`${API}/me/comunicaciones`)); }
      setStage(s);
    } catch (e) { setSecErr((e as Error).message); }
    finally { setLoading(false); }
  }, [me, inst, pubProcs, coms, fetchJSON]);

  if (stage === 'activate') return <ActivateScreen token={inviteToken || ''} onOk={afterAuth} onUseLogin={() => setStage('pin')} />;
  if (stage === 'pin') return <PinScreen onOk={afterAuth} />;
  if (stage === 'onboarding') return <LegajoForm fetchJSON={fetchJSON} mode="onboarding" onDone={() => setStage('home')} empName={emp?.full_name} />;

  const HOME_CARDS: { s: Stage; label: string; sub: string; icon: React.ReactNode; tone: string; badge?: number }[] = [
    { s: 'mi-ficha', label: 'Mi ficha de puesto', sub: 'Rol, misión, tareas', icon: <Briefcase size={24} />, tone: 'from-dassa-red to-dassa-red-deep' },
    { s: 'mis-capac', label: 'Mis capacitaciones', sub: 'Estado y vencimientos', icon: <GraduationCap size={24} />, tone: 'from-dassa-celeste-deep to-dassa-celeste' },
    { s: 'comunicaciones', label: 'Comunicaciones', sub: 'Novedades y avisos', icon: <Megaphone size={24} />, tone: 'from-fuchsia-600 to-pink-500', badge: coms?.unread },
    { s: 'mis-datos', label: 'Mis datos', sub: 'Legajo y contacto', icon: <IdCard size={24} />, tone: 'from-teal-600 to-teal-400' },
    { s: 'organigrama', label: 'Organigrama', sub: 'Estructura DASSA', icon: <Network size={24} />, tone: 'from-slate-700 to-slate-500' },
    { s: 'mapa', label: 'Mapa de procesos', sub: 'Cómo trabajamos', icon: <Workflow size={24} />, tone: 'from-indigo-600 to-indigo-400' },
    { s: 'procedimientos', label: 'Procedimientos', sub: 'Instructivos del SGI', icon: <BookOpen size={24} />, tone: 'from-amber-600 to-amber-400' },
    { s: 'identidad', label: 'Identidad DASSA', sub: 'Misión, visión, valores', icon: <Compass size={24} />, tone: 'from-emerald-600 to-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-dassa-red text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {stage !== 'home' && (
            <button onClick={() => setStage('home')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/15 active:bg-white/25" aria-label="Volver"><ChevronLeft size={22} /></button>
          )}
          <img src="/ds/logos/dassa-isotipo.png" alt="" className="w-8 h-8" />
          <div className="flex-1 leading-tight">
            <div className="font-extrabold text-[15px]">Portal del Empleado</div>
            <div className="text-[11px] text-white/80">{emp?.full_name} · {emp?.position || emp?.sector || 'DASSA'}</div>
          </div>
          <button onClick={doLogout} className="p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25" aria-label="Salir"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        {loading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-dassa-red" size={32} /></div>}
        {secErr && !loading && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2"><AlertTriangle size={18} />{secErr}</div>}

        {!loading && stage === 'home' && (
          <>
            <h1 className="text-[22px] font-extrabold text-dassa-ink mb-1">Hola, {emp?.full_name?.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 text-sm mb-5">¿Qué querés ver hoy?</p>
            <div className="grid grid-cols-2 gap-3">
              {HOME_CARDS.map(c => (
                <button key={c.s} onClick={() => goto(c.s)}
                  className={`relative bg-gradient-to-br ${c.tone} text-white rounded-2xl p-4 text-left shadow-sm active:scale-[0.97] transition min-h-[118px] flex flex-col justify-between`}>
                  <div className="opacity-90">{c.icon}</div>
                  {!!c.badge && c.badge > 0 && <span className="absolute top-2.5 right-2.5 bg-white text-dassa-red text-[11px] font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">{c.badge}</span>}
                  <div>
                    <div className="font-extrabold text-[14px] leading-tight">{c.label}</div>
                    <div className="text-[11px] text-white/80 mt-0.5">{c.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {!loading && stage === 'mi-ficha' && me && <MiFicha me={me} />}
        {!loading && stage === 'mis-capac' && me && <MisCapac me={me} />}
        {!loading && stage === 'comunicaciones' && coms && <Comunicaciones coms={coms} fetchJSON={fetchJSON} onRead={(id) => setComs(c => c && ({ ...c, unread: Math.max(0, c.unread - 1), comunicaciones: c.comunicaciones.map(x => x.id === id ? { ...x, leida: true } : x) }))} />}
        {!loading && stage === 'mis-datos' && <LegajoForm fetchJSON={fetchJSON} mode="edit" onDone={() => setStage('home')} empName={emp?.full_name} />}
        {!loading && stage === 'organigrama' && inst && <Organigrama inst={inst} />}
        {!loading && stage === 'mapa' && <MapaProcesos />}
        {!loading && stage === 'procedimientos' && pubProcs && <Procedimientos docs={pubProcs} />}
        {!loading && stage === 'identidad' && inst && <Identidad docs={inst.strategic_docs} />}
      </main>
      <footer className="max-w-lg mx-auto px-4 pb-6 text-center text-[11px] text-slate-400">DASSA · Sistema de Gestión Integrado (TRINORMA)</footer>
    </div>
  );
}

// ═══════════════════════════ PIN PAD compartido (login y crear/confirmar) ═══
function PinKeypad({ pin, onPress, onDel, busy }: { pin: string; onPress: (d: string) => void; onDel: () => void; busy: boolean }) {
  return (
    <>
      <div className="flex gap-3 mb-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-black border-2 transition
            ${pin.length > i ? 'border-dassa-celeste bg-dassa-celeste/15 text-white' : 'border-white/20 text-white/30'}`}>{pin.length > i ? '•' : ''}</div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-[300px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
          <button key={n} onClick={() => onPress(n)} disabled={busy} className="h-16 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/25 text-white text-2xl font-bold disabled:opacity-40">{n}</button>
        ))}
        <div />
        <button onClick={() => onPress('0')} disabled={busy} className="h-16 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/25 text-white text-2xl font-bold disabled:opacity-40">0</button>
        <button onClick={onDel} disabled={busy} className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/70 flex items-center justify-center disabled:opacity-40" aria-label="Borrar"><Delete size={24} /></button>
      </div>
    </>
  );
}

// ═══════════════════════════ LOGIN por PIN ═══
function PinScreen({ onOk }: { onOk: (t: string, e: Emp, onboarded: boolean) => void }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = useCallback(async (value: string) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: value }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Error'); setPin(''); setBusy(false); return; }
      onOk(j.session, j.employee, j.onboarded);
    } catch { setErr('Sin conexión. Reintentá.'); setPin(''); setBusy(false); }
  }, [onOk]);
  const press = (d: string) => { if (busy) return; setErr(''); const n = (pin + d).slice(0, 4); setPin(n); if (n.length === 4) submit(n); };
  return (
    <div className="min-h-screen bg-dassa-ink flex flex-col items-center justify-center px-6 font-sans">
      <img src="/ds/logos/dassa-isotipo.png" alt="DASSA" className="w-16 h-16 mb-4" />
      <h1 className="text-white font-extrabold text-xl">Portal del Empleado</h1>
      <p className="text-white/60 text-sm mt-1 mb-7 flex items-center gap-1.5"><Lock size={14} /> Ingresá tu PIN de 4 dígitos</p>
      <PinKeypad pin={pin} onPress={press} onDel={() => !busy && setPin(p => p.slice(0, -1))} busy={busy} />
      <div className="h-6 mt-3">{busy ? <Loader2 className="animate-spin text-dassa-celeste" size={20} /> : err ? <span className="text-red-300 text-sm font-semibold">{err}</span> : null}</div>
      <p className="text-white/40 text-[12px] mt-6 text-center max-w-xs">¿No tenés PIN? Pedí tu link de acceso a tu supervisor o a SGI.</p>
    </div>
  );
}

// ═══════════════════════════ PRIMER ACCESO · crear PIN ═══
function ActivateScreen({ token, onOk, onUseLogin }: { token: string; onOk: (t: string, e: Emp, onboarded: boolean) => void; onUseLogin: () => void }) {
  const [info, setInfo] = useState<{ full_name: string; activated: boolean } | null>(null);
  const [step, setStep] = useState<'load' | 'create' | 'confirm' | 'error'>('load');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [pin1, setPin1] = useState(''); const [pin2, setPin2] = useState('');

  useEffect(() => {
    fetch(`${API}/activate/${token}`).then(async r => {
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Link inválido'); setStep('error'); return; }
      setInfo({ full_name: j.full_name, activated: j.activated }); setStep('create');
    }).catch(() => { setErr('Sin conexión'); setStep('error'); });
  }, [token]);

  const finish = useCallback(async (pin: string) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${API}/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, pin }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Error'); setPin1(''); setPin2(''); setStep('create'); setBusy(false); return; }
      onOk(j.session, j.employee, j.onboarded);
    } catch { setErr('Sin conexión. Reintentá.'); setBusy(false); }
  }, [token, onOk]);

  const pressCreate = (d: string) => { setErr(''); const n = (pin1 + d).slice(0, 4); setPin1(n); if (n.length === 4) setStep('confirm'); };
  const pressConfirm = (d: string) => {
    setErr(''); const n = (pin2 + d).slice(0, 4); setPin2(n);
    if (n.length === 4) { if (n === pin1) finish(n); else { setErr('Los PIN no coinciden. Probá de nuevo.'); setPin1(''); setPin2(''); setStep('create'); } }
  };

  return (
    <div className="min-h-screen bg-dassa-ink flex flex-col items-center justify-center px-6 font-sans">
      <img src="/ds/logos/dassa-isotipo.png" alt="DASSA" className="w-16 h-16 mb-4" />
      {step === 'load' && <Loader2 className="animate-spin text-dassa-celeste" size={28} />}
      {step === 'error' && (
        <div className="text-center">
          <AlertTriangle className="text-red-300 mx-auto mb-2" size={28} />
          <p className="text-white font-bold">{err}</p>
          <button onClick={onUseLogin} className="mt-5 text-dassa-celeste font-semibold text-sm underline">Ya tengo PIN — ingresar</button>
        </div>
      )}
      {(step === 'create' || step === 'confirm') && info && (
        <>
          {info.activated && step === 'create' && (
            <div className="bg-amber-400/15 text-amber-200 text-[12px] rounded-lg px-3 py-2 mb-3 text-center max-w-xs">Ya activaste tu acceso antes. Si seguís, vas a <b>reemplazar tu PIN</b>.</div>
          )}
          <h1 className="text-white font-extrabold text-xl text-center">¡Hola, {info.full_name?.split(' ')[0]}! 👋</h1>
          <p className="text-white/60 text-sm mt-1 mb-7 flex items-center gap-1.5">
            <KeyRound size={14} /> {step === 'create' ? 'Creá tu PIN de 4 dígitos' : 'Repetí tu PIN para confirmar'}
          </p>
          {step === 'create'
            ? <PinKeypad pin={pin1} onPress={pressCreate} onDel={() => setPin1(p => p.slice(0, -1))} busy={busy} />
            : <PinKeypad pin={pin2} onPress={pressConfirm} onDel={() => setPin2(p => p.slice(0, -1))} busy={busy} />}
          <div className="h-6 mt-3">{busy ? <Loader2 className="animate-spin text-dassa-celeste" size={20} /> : err ? <span className="text-red-300 text-sm font-semibold">{err}</span> : null}</div>
          <p className="text-white/40 text-[12px] mt-6 text-center max-w-xs">Memorizá tu PIN: lo vas a usar para entrar siempre.</p>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════ LEGAJO · onboarding obligatorio + edición ═══
function Field({ label, value, onChange, type = 'text', placeholder, required, options }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; options?: string[];
}) {
  return (
    <label className="block mb-3">
      <span className="text-[12px] font-bold text-slate-600">{label}{required && <span className="text-dassa-red"> *</span>}</span>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] bg-white focus:border-dassa-celeste outline-none">
            <option value="">Elegir…</option>{options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] focus:border-dassa-celeste outline-none" />}
    </label>
  );
}
function LegajoForm({ fetchJSON, mode, onDone, empName }: { fetchJSON: (p: string, o?: RequestInit) => Promise<any>; mode: 'onboarding' | 'edit'; onDone: () => void; empName?: string }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [f, setF] = useState<Legajo | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(false);
  useEffect(() => { fetchJSON(`${API}/me/legajo`).then((r: { legajo: Legajo }) => setF(r.legajo)).catch((e: Error) => setErr(e.message)); }, [fetchJSON]);
  const set = (k: keyof Legajo) => (v: string) => setF(p => p && ({ ...p, [k]: v }));

  function missing(): string[] {
    if (!f) return ['cargando'];
    const req: [keyof Legajo, string][] = [['birth_date', 'Fecha de nacimiento'], ['cuil', 'CUIL'], ['address', 'Dirección'], ['marital_status', 'Estado civil'],
      ['emergency_contact_name', 'Nombre del contacto de emergencia'], ['emergency_contact_phone', 'Teléfono de emergencia'], ['emergency_contact_relation', 'Vínculo de emergencia']];
    const m = req.filter(([k]) => !String(f[k] ?? '').trim()).map(([, l]) => l);
    if (!String(f.phone ?? '').trim() && !String(f.whatsapp ?? '').trim()) m.push('Teléfono o WhatsApp');
    return m;
  }
  async function save() {
    setBusy(true); setErr(''); setOk(false);
    try {
      const r = await fetchJSON(`${API}/me/legajo`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      if (mode === 'onboarding') { if (r.onboarded) onDone(); else setErr('Faltan datos obligatorios.'); }
      else { setOk(true); }
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  if (!f) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-dassa-red" size={30} /></div>;
  const faltan = missing();

  return (
    <div className={mode === 'onboarding' ? 'min-h-screen bg-slate-100 -m-4 p-4 pb-10' : ''}>
      {mode === 'onboarding' && (
        <div className="text-center mb-4 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-dassa-red text-white flex items-center justify-center mx-auto mb-2"><IdCard size={26} /></div>
          <h1 className="text-xl font-extrabold text-dassa-ink">¡Bienvenido/a, {empName?.split(' ')[0]}!</h1>
          <p className="text-slate-500 text-sm">Antes de entrar, completá tus datos. Es por única vez.</p>
        </div>
      )}
      {mode === 'edit' && <h2 className="text-xl font-extrabold text-dassa-ink mb-3">Mis datos</h2>}

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <h3 className="font-extrabold text-dassa-ink text-[14px] mb-2 flex items-center gap-2"><User2 size={16} className="text-dassa-red" /> Datos personales</h3>
        <Field label="Fecha de nacimiento" type="date" value={f.birth_date?.slice(0, 10) || ''} onChange={set('birth_date')} required />
        <Field label="CUIL" value={f.cuil || ''} onChange={set('cuil')} placeholder="20-12345678-9" required />
        <Field label="Dirección" value={f.address || ''} onChange={set('address')} placeholder="Calle, número, localidad" required />
        <Field label="Estado civil" value={f.marital_status || ''} onChange={set('marital_status')} options={MARITAL} required />
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <h3 className="font-extrabold text-dassa-ink text-[14px] mb-2 flex items-center gap-2"><KeyRound size={16} className="text-dassa-celeste-deep" /> Contacto</h3>
        <Field label="Teléfono" type="tel" value={f.phone || ''} onChange={set('phone')} placeholder="11 4455 6677" />
        <Field label="WhatsApp" type="tel" value={f.whatsapp || ''} onChange={set('whatsapp')} placeholder="11 4455 6677" />
        <Field label="Email personal" type="email" value={f.email || ''} onChange={set('email')} placeholder="nombre@mail.com" />
        <p className="text-[11px] text-slate-400">Completá al menos teléfono o WhatsApp.</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <h3 className="font-extrabold text-dassa-ink text-[14px] mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> Contacto de emergencia</h3>
        <Field label="Nombre y apellido" value={f.emergency_contact_name || ''} onChange={set('emergency_contact_name')} required />
        <Field label="Teléfono" type="tel" value={f.emergency_contact_phone || ''} onChange={set('emergency_contact_phone')} required />
        <Field label="Vínculo" value={f.emergency_contact_relation || ''} onChange={set('emergency_contact_relation')} placeholder="Esposo/a, hijo/a, padre…" required />
      </div>

      {mode === 'onboarding' && faltan.length > 0 && (
        <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-[12px] mb-3">Falta completar: {faltan.join(' · ')}</div>
      )}
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3 flex items-center gap-2"><AlertTriangle size={16} />{err}</div>}
      {ok && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 text-sm mb-3 flex items-center gap-2"><CheckCircle2 size={16} /> Datos guardados.</div>}

      <button onClick={save} disabled={busy || (mode === 'onboarding' && faltan.length > 0)}
        className="w-full bg-dassa-red text-white font-extrabold rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition">
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
        {mode === 'onboarding' ? 'Completar y entrar' : 'Guardar cambios'}
      </button>
    </div>
  );
}

// ═══════════════════════════ Helpers de UI read-only ═══
function Pill({ children, tone = 'celeste' }: { children: React.ReactNode; tone?: string }) {
  const map: Record<string, string> = { celeste: 'bg-dassa-celeste-tint text-dassa-celeste-deep', red: 'bg-dassa-red-tint text-dassa-red-deep', slate: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${map[tone]}`}>{children}</span>;
}
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <section className="bg-white rounded-2xl p-4 shadow-sm mb-3"><h3 className="font-extrabold text-dassa-ink text-[15px] mb-2.5 flex items-center gap-2">{icon}{title}</h3>{children}</section>;
}

function MiFicha({ me }: { me: MeData }) {
  const p = me.profiles[0];
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-3">Mi ficha de puesto</h2>
      {!p && <div className="bg-white rounded-2xl p-5 text-slate-500 text-sm">Todavía no tenés una ficha de puesto asignada. Consultá con tu supervisor.</div>}
      {p && (
        <>
          <Card title={p.role_label} icon={<Briefcase size={18} className="text-dassa-red" />}>
            <div className="flex flex-wrap gap-2 mb-2">
              {p.area && <Pill>{p.area}</Pill>}
              {p.seniority && <Pill tone="slate">{p.seniority}</Pill>}
              {p.is_critical && <Pill tone="red">Puesto crítico</Pill>}
              {p.autonomy_level && <Pill tone="slate">Autonomía: {p.autonomy_level}</Pill>}
            </div>
            {p.mission && <p className="text-[14px] text-slate-700 leading-relaxed">{p.mission}</p>}
            {me.employee.supervisor_name && <p className="text-[12px] text-slate-500 mt-2 flex items-center gap-1.5"><User2 size={13} /> Reporta a: <b>{p.reports_to_role || me.employee.supervisor_name}</b></p>}
          </Card>
          {!!p.responsibilities?.length && <Card title="Responsabilidades" icon={<CheckCircle2 size={18} className="text-dassa-celeste-deep" />}><ul className="list-disc pl-5 space-y-1 text-[14px] text-slate-700">{p.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul></Card>}
          {!!p.competencies?.length && <Card title="Competencias requeridas" icon={<ShieldCheck size={18} className="text-dassa-celeste-deep" />}><div className="flex flex-wrap gap-1.5">{p.competencies.map((c, i) => <Pill key={i}>{c}</Pill>)}</div></Card>}
          {!!me.procedures.length && (
            <Card title="Procedimientos de mi puesto" icon={<BookOpen size={18} className="text-amber-600" />}>
              <ul className="space-y-1.5">{me.procedures.map(pr => (
                <li key={pr.id} className="flex items-center gap-2 text-[13px]">
                  {pr.norma && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: NORMA_COLOR[pr.norma] || '#64748b' }}>{pr.code}</span>}
                  <span className="text-slate-700">{pr.title}</span>
                </li>))}</ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function MisCapac({ me }: { me: MeData }) {
  const c = me.compliance;
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-3">Mis capacitaciones</h2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm"><div className="text-2xl font-black text-emerald-600">{c.pct_obligatorias_ok}%</div><div className="text-[10px] text-slate-500 font-semibold">Obligatorias OK</div></div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm"><div className="text-2xl font-black text-red-600">{c.vencidas}</div><div className="text-[10px] text-slate-500 font-semibold">Vencidas</div></div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm"><div className="text-2xl font-black text-sky-600">{c.programadas}</div><div className="text-[10px] text-slate-500 font-semibold">Programadas</div></div>
      </div>
      {!me.training_status.length && <div className="bg-white rounded-2xl p-5 text-slate-500 text-sm">No tenés capacitaciones registradas.</div>}
      <div className="space-y-2">
        {me.training_status.map((t, i) => {
          const st = TRAIN_STYLE[t.status] || TRAIN_STYLE.pendiente;
          return (
            <div key={i} className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1"><div className="font-bold text-dassa-ink text-[14px] leading-tight">{t.training_title}</div><div className="text-[11px] text-slate-400 mt-0.5">{t.cap_code} · {t.requirement === 'obligatoria' ? 'Obligatoria' : 'Recomendada'}</div></div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${st.bg} ${st.fg}`}>{st.icon}{st.label}</span>
              </div>
              {(t.last_attended_at || t.next_programmed_at) && (
                <div className="text-[11px] text-slate-500 mt-1.5 flex gap-3">
                  {t.last_attended_at && <span>Última: {new Date(t.last_attended_at).toLocaleDateString('es-AR')}</span>}
                  {t.next_programmed_at && <span>Próxima: {new Date(t.next_programmed_at).toLocaleDateString('es-AR')}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Comunicaciones({ coms, fetchJSON, onRead }: { coms: ComsData; fetchJSON: (p: string, o?: RequestInit) => Promise<any>; onRead: (id: string) => void }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [open, setOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  async function confirmar(id: string) {
    setConfirming(id);
    try { await fetchJSON(`${API}/me/comunicaciones/${id}/leer`, { method: 'POST' }); onRead(id); }
    catch { /* noop */ } finally { setConfirming(null); }
  }
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-3">Comunicaciones</h2>
      {coms.comunicaciones.length === 0 && coms.novedades.length === 0 && <div className="bg-white rounded-2xl p-5 text-slate-500 text-sm">No hay comunicaciones por ahora.</div>}

      {coms.comunicaciones.map(c => (
        <div key={c.id} className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
          <button onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full flex items-start gap-2 p-4 text-left">
            <Megaphone size={18} className={`mt-0.5 shrink-0 ${c.leida ? 'text-slate-300' : 'text-fuchsia-600'}`} />
            <div className="flex-1">
              <div className="font-extrabold text-dassa-ink text-[14px] leading-tight">{c.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{c.sent_at ? new Date(c.sent_at).toLocaleDateString('es-AR') : ''}{c.norma ? ` · ${c.norma}` : ''}</div>
            </div>
            {!c.leida ? <span className="shrink-0 text-[10px] font-black bg-fuchsia-100 text-fuchsia-700 rounded-full px-2 py-0.5">NUEVA</span>
              : <CheckCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
          </button>
          {open === c.id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <MD md={c.body_md} />
              {!!c.attachment_urls?.length && <div className="mt-2 flex flex-wrap gap-2">{c.attachment_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noopener" className="text-[12px] font-semibold text-dassa-celeste-deep underline">Adjunto {i + 1}</a>)}</div>}
              {!c.leida && (
                <button onClick={() => confirmar(c.id)} disabled={confirming === c.id}
                  className="mt-3 w-full bg-emerald-600 text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
                  {confirming === c.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCheck size={16} />} Leí y entendí
                </button>
              )}
              {c.leida && <p className="mt-3 text-[12px] text-emerald-600 font-semibold flex items-center gap-1.5"><CheckCheck size={14} /> Lectura confirmada</p>}
            </div>
          )}
        </div>
      ))}

      {coms.novedades.length > 0 && <div className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wide mt-5 mb-2">Novedades</div>}
      {coms.novedades.map(n => (
        <div key={n.id} className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
          <button onClick={() => setOpen(open === n.id ? null : n.id)} className="w-full flex items-start gap-2 p-4 text-left">
            {n.pinned ? <Pin size={16} className="text-dassa-red mt-0.5 shrink-0" /> : <Megaphone size={16} className="text-slate-400 mt-0.5 shrink-0" />}
            <div className="flex-1"><div className="font-bold text-dassa-ink text-[14px] leading-tight">{n.title}</div><div className="text-[11px] text-slate-400 mt-0.5">{new Date(n.published_at).toLocaleDateString('es-AR')}</div></div>
            <ChevronRight size={16} className={`text-slate-400 transition mt-0.5 ${open === n.id ? 'rotate-90' : ''}`} />
          </button>
          {open === n.id && <div className="px-4 pb-4 border-t border-slate-100 pt-3"><MD md={n.body_md} /></div>}
        </div>
      ))}
    </>
  );
}

function Organigrama({ inst }: { inst: InstData }) {
  const byArea = new Map<string, InstData['organigrama']['profiles']>();
  for (const p of inst.organigrama.profiles) { const a = p.area || 'Sin área'; if (!byArea.has(a)) byArea.set(a, []); byArea.get(a)!.push(p); }
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-3">Organigrama</h2>
      {[...byArea.entries()].map(([area, profs]) => (
        <Card key={area} title={area} icon={<Network size={18} className="text-slate-500" />}>
          <ul className="space-y-2">{profs.map(p => (
            <li key={p.id} className="border-l-2 border-dassa-celeste/40 pl-3">
              <div className="font-bold text-dassa-ink text-[14px]">{p.role_label}</div>
              {p.employees.length > 0 ? <div className="text-[12px] text-slate-600">{p.employees.map(e => e.full_name).join(' · ')}</div> : <div className="text-[12px] text-slate-400 italic">Vacante</div>}
            </li>))}</ul>
        </Card>
      ))}
    </>
  );
}

function MapaProcesos() {
  const Box = ({ children, tone }: { children: React.ReactNode; tone: string }) => <div className={`rounded-xl px-3 py-2.5 text-center text-[13px] font-semibold shadow-sm ${tone}`}>{children}</div>;
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-1">Mapa de procesos</h2>
      <p className="text-slate-500 text-sm mb-4">Cómo se encadena el trabajo en DASSA (F-TRI-03).</p>
      <div className="mb-3"><div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Entrada</div><Box tone="bg-dassa-ink text-white">Cliente · Comercial (cotización y captación)</Box></div>
      <div className="flex justify-center text-slate-300 mb-2"><ChevronRight size={20} className="rotate-90" /></div>
      <div className="mb-3"><div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Operación (circuitos)</div>
        <div className="grid grid-cols-2 gap-2">
          <Box tone="bg-dassa-red text-white">Importación Marítima</Box><Box tone="bg-dassa-red text-white">Importación Terrestre</Box>
          <Box tone="bg-dassa-celeste-deep text-white">Exportación Marítima</Box><Box tone="bg-dassa-celeste-deep text-white">Exportación Terrestre</Box>
        </div></div>
      <div className="flex justify-center text-slate-300 mb-2"><ChevronRight size={20} className="rotate-90" /></div>
      <div className="mb-3"><div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Salida</div><Box tone="bg-emerald-600 text-white">Entrega · Retroalimentación del cliente</Box></div>
      <div className="mt-5"><div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Procesos de soporte</div>
        <div className="flex flex-wrap gap-1.5">{['RR.HH.', 'Compras', 'Mantenimiento', 'Gestión Ambiental', 'Seguridad e Higiene', 'Emergencias', 'Riesgos y Peligros', 'Participación y Consulta'].map(s => <span key={s} className="text-[12px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{s}</span>)}</div></div>
    </>
  );
}

function Procedimientos({ docs }: { docs: PubProc[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const byCat = PROC_CATEGORIAS.map(cat => ({ key: cat.key, docs: docs.filter(d => d.proceso && cat.procesos.includes(d.proceso.toUpperCase())) })).filter(c => c.docs.length);
  const usados = new Set(byCat.flatMap(c => c.docs.map(d => d.id)));
  const otros = docs.filter(d => !usados.has(d.id));
  if (otros.length) byCat.push({ key: 'Otros', docs: otros });
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-1">Procedimientos</h2>
      <p className="text-slate-500 text-sm mb-4">{docs.length} procedimientos aprobados del SGI.</p>
      {byCat.map(cat => (
        <div key={cat.key} className="mb-4">
          <div className="text-[12px] font-extrabold text-dassa-celeste-deep uppercase tracking-wide mb-1.5">{cat.key}</div>
          <div className="space-y-1.5">{cat.docs.map(d => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => setOpen(open === d.id ? null : d.id)} className="w-full flex items-center gap-2 p-3 text-left active:bg-slate-50">
                {d.norma && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: NORMA_COLOR[d.norma] || '#64748b' }}>{d.code}</span>}
                <span className="flex-1 text-[14px] font-semibold text-dassa-ink">{d.title}</span>
                <ChevronRight size={16} className={`text-slate-400 transition ${open === d.id ? 'rotate-90' : ''}`} />
              </button>
              {open === d.id && <div className="px-3 pb-3 border-t border-slate-100 pt-2">{d.content_md ? <MD md={d.content_md} /> : <div className="text-[13px] text-slate-400 italic">Documento disponible en planta / SGI.</div>}</div>}
            </div>))}</div>
        </div>
      ))}
    </>
  );
}

function Identidad({ docs }: { docs: Doc[] }) {
  return (
    <>
      <h2 className="text-xl font-extrabold text-dassa-ink mb-3">Identidad DASSA</h2>
      {!docs.length && <div className="bg-white rounded-2xl p-5 text-slate-500 text-sm">Documentos institucionales no disponibles.</div>}
      {docs.map(d => (
        <section key={d.code} className="bg-white rounded-2xl p-4 shadow-sm mb-3">
          <h3 className="font-extrabold text-[15px] mb-2 flex items-center gap-2 text-dassa-red">{DOC_ICON[d.code] || <Compass size={20} />}{d.title}</h3>
          {d.body_md && <MD md={d.body_md} />}
          {!!d.metadata?.items?.length && (
            <div className="grid grid-cols-1 gap-1.5 mt-2">{d.metadata.items.map((it, i) => (
              <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2"><Heart size={14} className="text-dassa-red mt-0.5 shrink-0" /><div><b className="text-[13px] text-dassa-ink">{it.title || it.label}</b>{it.desc && <span className="text-[13px] text-slate-600"> — {it.desc}</span>}</div></div>
            ))}</div>
          )}
        </section>
      ))}
    </>
  );
}
