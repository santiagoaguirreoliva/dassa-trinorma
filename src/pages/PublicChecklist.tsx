// /checklist-maquina?m=<qr_token> — Checklist diario público de maquinaria.
// Sin auth: QR → PIN (4 dígitos) → checklist 21 ítems → firma. Dedo-gigante.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck, Loader2, CheckCircle2, AlertTriangle, Camera, X,
  Gauge, MapPin, ChevronRight, ChevronLeft, KeyRound, Lock,
} from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';

interface Machine { id: string; code: string; name: string; type: string; }
interface Template { id: string; code: string; name: string; }
interface Item {
  id: string; section: string | null; order_idx: number; label: string;
  response_type: string; is_critical: boolean; photo_on_fail: boolean;
}
interface Bundle { machine: Machine; template: Template; items: Item[]; }
interface Draft { answer: 'si' | 'no' | ''; observations: string; photos: string[]; }

async function readFileAsB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export default function PublicChecklist() {
  const [params] = useSearchParams();
  const token = params.get('m') || '';
  const [stage, setStage] = useState<'load' | 'pin' | 'fill' | 'submit' | 'done' | 'error'>('load');
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [err, setErr] = useState('');
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [session, setSession] = useState<{ token: string; operator: { id: string; name: string }; expiresAt: number } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [step, setStep] = useState(0);
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ code: string; critical_failures: number } | null>(null);
  const sessionTimer = useRef<number | null>(null);

  // 1) Resolver máquina + plantilla
  useEffect(() => {
    if (!token) { setStage('error'); setErr('Falta el código QR. Pedí ayuda al supervisor.'); return; }
    (async () => {
      try {
        const r = await fetch(`/api/public/checklist/machine?token=${encodeURIComponent(token)}`);
        const data = await r.json();
        if (!r.ok) { setStage('error'); setErr(data.error || 'QR inválido'); return; }
        setBundle(data);
        const init: Record<string, Draft> = {};
        for (const it of data.items) init[it.id] = { answer: '', observations: '', photos: [] };
        setDrafts(init);
        setStage('pin');
      } catch {
        setStage('error');
        setErr('No se pudo conectar. Probá de nuevo en un minuto.');
      }
    })();
  }, [token]);

  // Auto-logout cuando expira la sesión
  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt - Date.now();
    sessionTimer.current = window.setTimeout(() => {
      setSession(null);
      setStage('pin');
      setErr('La sesión expiró. Ingresá tu PIN otra vez.');
    }, ms);
    return () => { if (sessionTimer.current) clearTimeout(sessionTimer.current); };
  }, [session]);

  // Agrupar ítems en secciones
  const sections = useMemo(() => {
    if (!bundle) return [];
    const g: { name: string; items: Item[] }[] = [];
    for (const it of bundle.items) {
      const s = it.section || 'General';
      const ex = g.find(x => x.name === s);
      if (ex) ex.items.push(it); else g.push({ name: s, items: [it] });
    }
    return g;
  }, [bundle]);
  const totalSteps = sections.length + 1; // +1 firma/envío
  const isLast = step >= sections.length;

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts(p => ({ ...p, [id]: { ...p[id], ...patch } }));
  };

  async function verifyPin() {
    if (!/^\d{4}$/.test(pin)) { setErr('Ingresá un PIN de 4 dígitos'); return; }
    setPinLoading(true); setErr('');
    try {
      const r = await fetch('/api/public/checklist/verify-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_token: token, pin }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error || 'PIN incorrecto'); return; }
      setSession({
        token: data.session,
        operator: data.operator,
        expiresAt: Date.now() + (data.expires_in * 1000),
      });
      setPin('');
      setStage('fill');
    } catch {
      setErr('No se pudo conectar');
    } finally {
      setPinLoading(false);
    }
  }

  async function capturePhoto(itemId: string, file: File) {
    if (file.size > 5 * 1024 * 1024) { setErr('La foto no puede superar 5MB'); return; }
    try {
      const b64 = await readFileAsB64(file);
      setDraft(itemId, { photos: [...(drafts[itemId]?.photos || []), b64] });
    } catch { setErr('No se pudo cargar la foto'); }
  }
  function removePhoto(itemId: string, idx: number) {
    const next = [...(drafts[itemId]?.photos || [])];
    next.splice(idx, 1);
    setDraft(itemId, { photos: next });
  }
  function captureGeo() {
    if (!navigator.geolocation) { setGeoStatus('fail'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      p => { setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoStatus('ok'); },
      () => setGeoStatus('fail'),
      { timeout: 8000 }
    );
  }

  function validate(): string | null {
    if (!bundle) return 'Sin datos';
    for (const it of bundle.items) {
      const d = drafts[it.id];
      if (!d?.answer) return `Falta responder: ${it.label}`;
      if (d.answer === 'no') {
        if (!d.observations || d.observations.trim().length < 3)
          return `Agregá una observación para: ${it.label}`;
        if (it.photo_on_fail && !d.photos.length)
          return `Se requiere foto para: ${it.label}`;
      }
    }
    if (!signature) return 'Falta tu firma';
    return null;
  }

  async function submit() {
    if (!session) { setStage('pin'); setErr('Sesión expirada — ingresá tu PIN'); return; }
    const v = validate();
    if (v) { setErr(v); return; }
    setSubmitting(true); setErr('');
    try {
      const responses = bundle!.items.map(it => {
        const d = drafts[it.id];
        return {
          item_id: it.id,
          answer: d.answer,
          observations: d.observations || null,
          photos: d.photos,
        };
      });
      const r = await fetch('/api/public/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: session.token,
          responses,
          machine_hours: hours ? Number(hours) : null,
          notes: notes || null,
          signature_base64: signature,
          geo_lat: geo?.lat ?? null,
          geo_lng: geo?.lng ?? null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 401) { setSession(null); setStage('pin'); setErr(data.error); return; }
        setErr(data.error || 'Error al enviar'); return;
      }
      setResult({ code: data.code, critical_failures: data.critical_failures });
      setStage('done');
    } catch {
      setErr('No se pudo conectar');
    } finally { setSubmitting(false); }
  }

  // ── Render ──
  if (stage === 'load') {
    return <Center><Loader2 className="animate-spin text-gray-400" size={28} /></Center>;
  }
  if (stage === 'error') {
    return (
      <Center>
        <AlertTriangle className="text-red-500 mb-3" size={36} />
        <h1 className="text-base font-extrabold text-gray-900 mb-1">QR no válido</h1>
        <p className="text-sm text-gray-600 text-center max-w-xs">{err}</p>
      </Center>
    );
  }

  if (stage === 'done' && result) {
    return (
      <Center>
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-lg font-extrabold text-center text-gray-900">¡Checklist enviado!</h1>
          <p className="text-xs text-gray-500 text-center mt-1">
            {bundle?.machine.code} · {bundle?.machine.name}
          </p>
          <div className="bg-gray-50 rounded-xl px-4 py-3 my-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Código</div>
            <div className="text-xl font-extrabold text-gray-900">{result.code}</div>
          </div>
          {result.critical_failures > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                Reportaste <strong>{result.critical_failures} falla(s) crítica(s)</strong>.
                Avisamos a Mantenimiento. No operes la máquina hasta que revisen.
              </div>
            </div>
          )}
          <button onClick={() => window.location.reload()}
                  className="w-full mt-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold">
            Cerrar
          </button>
        </div>
      </Center>
    );
  }

  if (stage === 'pin') {
    return (
      <main className="min-h-[100dvh] bg-slate-50 flex items-start justify-center p-4 pt-12">
        <div className="bg-white rounded-2xl shadow p-6 max-w-sm w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Truck size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{bundle?.machine.code}</div>
              <div className="text-base font-extrabold text-gray-900 truncate">{bundle?.machine.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-4">
            <Lock size={12} /> Sesión segura · ingresá tu PIN de 4 dígitos
          </div>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="w-full text-center text-3xl font-extrabold tracking-[0.5em] py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
          />
          {err && <div className="mt-3 text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> {err}</div>}
          <button
            onClick={verifyPin}
            disabled={pin.length !== 4 || pinLoading}
            className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pinLoading && <Loader2 size={16} className="animate-spin" />}
            <KeyRound size={16} /> Ingresar
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-4">
            DASSA — Trinorma · Checklist diario de maquinaria
          </p>
        </div>
      </main>
    );
  }

  // ── Stage 'fill' — checklist paso a paso ──
  if (!bundle) return null;

  return (
    <main className="min-h-[100dvh] bg-slate-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-orange-500" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{bundle.machine.code}</div>
              <div className="text-sm font-extrabold text-gray-900 truncate">{bundle.template.name}</div>
            </div>
            {session && (
              <div className="text-right">
                <div className="text-[9px] font-bold text-gray-400 uppercase">Operador</div>
                <div className="text-[11px] font-bold text-gray-700 truncate" style={{ maxWidth: 110 }}>{session.operator.name}</div>
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 text-center">
            Paso {step + 1} de {totalSteps}{!isLast && sections[step] && ` · ${sections[step].name}`}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3 py-3 space-y-2">
        {!isLast && sections[step] && (
          <>
            <h2 className="text-base font-extrabold text-gray-900 px-1 pt-1">{sections[step].name}</h2>
            {sections[step].items.map(it => {
              const d = drafts[it.id];
              const isOk = d?.answer === 'si';
              const isFailA = d?.answer === 'no';
              const fileId = `pf-${it.id}`;
              return (
                <div key={it.id}
                     className={`bg-white rounded-xl border p-3 transition-colors
                      ${isFailA ? 'border-red-300 ring-1 ring-red-100'
                       : isOk ? 'border-emerald-300'
                       : 'border-gray-200'}`}>
                  {it.is_critical && (
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 mb-1.5">
                      ⚡ CRÍTICO
                    </span>
                  )}
                  <div className="text-sm font-bold text-gray-900 mb-2.5">{it.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button"
                            onClick={() => setDraft(it.id, { answer: 'si' })}
                            className={`py-5 rounded-xl text-base font-extrabold border-2
                              ${isOk ? 'bg-emerald-500 text-white border-emerald-500'
                                     : 'bg-white text-gray-600 border-gray-200'}`}>
                      ✓ SÍ
                    </button>
                    <button type="button"
                            onClick={() => setDraft(it.id, { answer: 'no' })}
                            className={`py-5 rounded-xl text-base font-extrabold border-2
                              ${isFailA ? 'bg-red-500 text-white border-red-500'
                                        : 'bg-white text-gray-600 border-gray-200'}`}>
                      ✗ NO
                    </button>
                  </div>
                  {isFailA && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={d.observations}
                        onChange={e => setDraft(it.id, { observations: e.target.value })}
                        rows={2}
                        placeholder="Describí el problema (obligatorio)..."
                        className="w-full px-3 py-2.5 border border-red-200 bg-red-50/40 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none"
                      />
                      <input id={fileId} type="file" accept="image/*" capture="environment" className="hidden"
                             onChange={e => { const f = e.target.files?.[0]; if (f) capturePhoto(it.id, f); e.target.value = ''; }} />
                      <div className="flex flex-wrap gap-2">
                        {d.photos.map((p, idx) => (
                          <div key={idx} className="relative w-20 h-20">
                            <img src={p} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                            <button type="button" onClick={() => removePhoto(it.id, idx)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border shadow text-gray-600 flex items-center justify-center">
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                        <label htmlFor={fileId}
                          className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer
                            ${it.photo_on_fail && !d.photos.length
                              ? 'border-red-300 bg-red-50/40 text-red-500'
                              : 'border-gray-300 text-gray-400'}`}>
                          <Camera size={18} />
                          <span className="text-[9px] mt-0.5">
                            {it.photo_on_fail && !d.photos.length ? 'Obligatoria' : 'Foto'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {isLast && (
          <div className="space-y-2">
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Gauge size={12} /> Horómetro
              </label>
              <input
                type="number" inputMode="decimal" value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="Ej: 1234.5"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Notas</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder="Comentarios (opcional)..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Ubicación</div>
              {geoStatus === 'ok' && geo ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <MapPin size={14} /> Capturada · {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                </div>
              ) : (
                <button type="button" onClick={captureGeo}
                        className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-center gap-2">
                  {geoStatus === 'loading' && <Loader2 size={13} className="animate-spin" />}
                  <MapPin size={13} />
                  {geoStatus === 'fail' ? 'No se pudo · reintentar' : 'Capturar ubicación'}
                </button>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <SignaturePad label="Tu firma" height={160} onChange={setSignature} />
            </div>
            {err && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {err}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 z-20">
        <div className="max-w-md mx-auto flex gap-2">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-40 flex items-center gap-1">
            <ChevronLeft size={16} /> Atrás
          </button>
          {!isLast ? (
            <button onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
                    className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold flex items-center justify-center gap-1">
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Enviar checklist
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6">
      {children}
    </main>
  );
}
