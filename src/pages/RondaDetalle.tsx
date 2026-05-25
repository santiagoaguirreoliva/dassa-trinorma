// /rondas/:id — Ejecución del rondín paso a paso, mobile vertical.
// Cumple/no cumple por ítem, observación, foto, geo, firma, co-firma.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Camera, X, MapPin, CheckCircle2, AlertTriangle,
  Loader2, ChevronRight, ChevronLeft, Check, Zap, Edit3,
} from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';

interface Item {
  id: string;
  section: string | null;
  order_idx: number;
  label: string;
  response_type: 'si_no' | 'cumple' | 'texto' | 'numero';
  is_critical: boolean;
  photo_on_fail: boolean;
  response_id?: string;
  answer?: string | null;
  observations?: string | null;
  photo_urls?: string[];
  finding_id?: string | null;
}
interface Assignee { user_id: string; role: string; signed: boolean; name: string; }
interface Inspection {
  id: string;
  code: string | null;
  template_code: string;
  template_name: string;
  template_family: 'rondin' | 'maquinaria';
  family: string;
  status: 'pendiente' | 'en_curso' | 'en_cofirma' | 'completada' | 'vencida' | 'anulada';
  requires_cosign: boolean;
  scheduled_date: string;
  due_date: string;
  period_label: string | null;
  machine_code: string | null;
  machine_name: string | null;
  operator_name: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  cosigned_by: string | null;
  cosigned_by_name: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_inside: boolean | null;
  signature_url: string | null;
  cosign_url: string | null;
  findings_count: number;
  notes: string | null;
  machine_hours: number | null;
  items: Item[];
  assignees: Assignee[];
}

type Answer = 'cumple' | 'no_cumple' | 'si' | 'no' | '';

interface Draft {
  answer: Answer;
  observations: string;
  photos: string[];
}

function isFail(a: string): boolean {
  return a === 'no_cumple' || a === 'no';
}

async function readFileAsB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RondaDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [insp, setInsp] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [machineHours, setMachineHours] = useState('');
  const [notes, setNotes] = useState('');
  const [cosignMode, setCosignMode] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [savedAgo, setSavedAgo] = useState<string>('');
  const skipPersistRef = useRef(true);

  const draftKey = id ? `insp-draft-${id}` : '';

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await api.get<Inspection>(`/inspections/${id}`);
      setInsp(data);
      // Cargar drafts desde respuestas existentes en BD
      const init: Record<string, Draft> = {};
      for (const it of data.items) {
        init[it.id] = {
          answer: (it.answer || '') as Answer,
          observations: it.observations || '',
          photos: it.photo_urls || [],
        };
      }

      // Restaurar borrador local si existe (solo si la inspección sigue editable y no hay datos en BD)
      let local: { drafts?: Record<string, Draft>; signature?: string; notes?: string; machineHours?: string; savedAt?: number } | null = null;
      const editable = ['pendiente', 'en_curso'].includes(data.status);
      if (editable && draftKey) {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) local = JSON.parse(raw);
        } catch { /* corrupto o sin acceso */ }
      }

      if (local?.drafts) {
        // El borrador local pisa al de BD solo en items donde el local tenga respuesta
        for (const itId in local.drafts) {
          if (init[itId] && local.drafts[itId]?.answer) init[itId] = local.drafts[itId];
        }
      }
      setDrafts(init);
      setSignature(local?.signature ?? null);
      setMachineHours(local?.machineHours ?? (data.machine_hours ? String(data.machine_hours) : ''));
      setNotes(local?.notes ?? (data.notes || ''));
      setSavedAt(local?.savedAt ?? null);

      // Si el rondín ya está en co-firma y el usuario no es quien completó, va a co-firma
      if (data.status === 'en_cofirma' && data.completed_by !== user?.id) {
        setCosignMode(true);
      }

      // Habilitamos persistencia recién después del load
      setTimeout(() => { skipPersistRef.current = false; }, 100);
    } catch (e: any) {
      setErr(e.message || 'Error al cargar la inspección');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Autosave a localStorage cada vez que cambia algo editable
  useEffect(() => {
    if (skipPersistRef.current || !draftKey || !insp) return;
    if (!['pendiente', 'en_curso'].includes(insp.status)) return;
    try {
      const payload = { drafts, signature, notes, machineHours, savedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setSavedAt(payload.savedAt);
    } catch { /* localStorage lleno o privacy mode */ }
  }, [drafts, signature, notes, machineHours, draftKey, insp]);

  // Tick para mostrar "guardado hace Xs"
  useEffect(() => {
    if (!savedAt) { setSavedAgo(''); return; }
    const fmt = () => {
      const s = Math.round((Date.now() - savedAt) / 1000);
      if (s < 60) setSavedAgo(`Borrador guardado hace ${s}s`);
      else if (s < 3600) setSavedAgo(`Borrador guardado hace ${Math.round(s / 60)} min`);
      else setSavedAgo(`Borrador guardado hace ${Math.round(s / 3600)} h`);
    };
    fmt();
    const t = setInterval(fmt, 15000);
    return () => clearInterval(t);
  }, [savedAt]);

  // Agrupar ítems por sección
  const sections = useMemo(() => {
    if (!insp) return [];
    const groups: { name: string; items: Item[] }[] = [];
    for (const it of insp.items) {
      const sec = it.section || 'General';
      const g = groups.find(x => x.name === sec);
      if (g) g.items.push(it);
      else groups.push({ name: sec, items: [it] });
    }
    return groups;
  }, [insp]);

  // Pasos = secciones + paso final (firma/envío)
  const totalSteps = sections.length + 1;
  const isLast = step >= sections.length;

  const setDraft = (itemId: string, patch: Partial<Draft>) => {
    setDrafts(p => ({ ...p, [itemId]: { ...p[itemId], ...patch } }));
  };

  const capturePhoto = async (itemId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { setErr('La foto no puede superar 5MB'); return; }
    try {
      const b64 = await readFileAsB64(file);
      setDraft(itemId, { photos: [...(drafts[itemId]?.photos || []), b64] });
    } catch {
      setErr('No se pudo cargar la foto');
    }
  };
  const removePhoto = (itemId: string, idx: number) => {
    const next = [...(drafts[itemId]?.photos || [])];
    next.splice(idx, 1);
    setDraft(itemId, { photos: next });
  };

  const captureGeo = () => {
    if (!navigator.geolocation) { setGeoStatus('fail'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (p) => { setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoStatus('ok'); },
      () => setGeoStatus('fail'),
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  // Validación: todos los ítems con respuesta + observación obligatoria si falla
  function validate(): string | null {
    if (!insp) return 'Sin datos';
    for (const it of insp.items) {
      const d = drafts[it.id];
      if (!d?.answer) return `Falta responder: ${it.label}`;
      if (isFail(d.answer)) {
        if (!d.observations || d.observations.trim().length < 3)
          return `Agregá una observación para: ${it.label}`;
        if (it.photo_on_fail && (!d.photos || d.photos.length === 0))
          return `Se requiere foto para: ${it.label}`;
      }
    }
    if (!signature) return 'Falta tu firma';
    return null;
  }

  async function start() {
    if (!insp) return;
    if (insp.status !== 'pendiente') return;
    try {
      await api.post(`/inspections/${insp.id}/start`);
      load();
    } catch (e: any) {
      // Puede fallar si ya no está pendiente; lo ignoramos silenciosamente
      console.warn(e);
    }
  }

  async function submit() {
    if (!insp) return;
    const v = validate();
    if (v) { setErr(v); return; }
    setSaving(true);
    setErr('');
    try {
      const responses = insp.items.map(it => {
        const d = drafts[it.id];
        return {
          item_id: it.id,
          answer: d.answer,
          observations: d.observations || null,
          // Solo enviamos fotos nuevas (data:), las URLs ya guardadas no se reenvían
          photos: (d.photos || []).filter(p => p.startsWith('data:')),
        };
      });
      const body: any = {
        responses,
        geo_lat: geo?.lat ?? null,
        geo_lng: geo?.lng ?? null,
        signature_base64: signature,
        notes: notes || null,
      };
      if (insp.template_family === 'maquinaria' && machineHours) {
        body.machine_hours = Number(machineHours);
      }
      await api.post(`/inspections/${insp.id}/complete`, body);
      // Limpiar borrador local solo si el envío fue exitoso
      if (draftKey) {
        try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      }
      navigate('/rondas');
    } catch (e: any) {
      setErr(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function cosign() {
    if (!signature) { setErr('Falta tu firma para co-firmar'); return; }
    setSaving(true);
    setErr('');
    try {
      await api.post(`/inspections/${insp!.id}/cosign`, { signature_base64: signature });
      navigate('/rondas');
    } catch (e: any) {
      setErr(e.message || 'Error al co-firmar');
    } finally {
      setSaving(false);
    }
  }

  async function generateFinding(item: Item, responseId?: string) {
    if (!responseId) {
      setErr('Guardá primero la inspección para generar la NC');
      return;
    }
    if (!confirm(`¿Generar No Conformidad para "${item.label}"?`)) return;
    try {
      const r = await api.post<{ code: string }>(`/inspections/${insp!.id}/finding`, {
        response_id: responseId,
      });
      alert(`NC creada: ${r.code}`);
      load();
    } catch (e: any) {
      setErr(e.message || 'Error al generar NC');
    }
  }

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  }
  if (!insp) {
    return (
      <div className="min-h-[100dvh] p-6 text-center">
        <p className="text-sm text-gray-600">{err || 'No se encontró la inspección'}</p>
        <button onClick={() => navigate('/rondas')} className="mt-3 text-xs font-bold text-blue-600">Volver</button>
      </div>
    );
  }

  const readOnly = insp.status === 'completada' || insp.status === 'anulada' ||
                   (insp.status === 'en_cofirma' && !cosignMode);
  const canFill = ['pendiente', 'en_curso'].includes(insp.status);

  // Si está pendiente, lo marcamos en_curso al primer cambio
  const handleStartIfPending = () => {
    if (insp.status === 'pendiente') start();
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate('/rondas')} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {insp.template_code} {insp.code && `· ${insp.code}`}
            </div>
            <div className="text-sm font-extrabold text-gray-900 truncate leading-tight">
              {insp.template_name}
              {insp.machine_code && <span className="text-gray-500 font-normal"> · {insp.machine_code}</span>}
            </div>
          </div>
          {savedAgo && !readOnly && canFill && (
            <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 whitespace-nowrap flex items-center gap-1" title="Tus respuestas se guardan localmente en este navegador. Cuando completes la ronda y firmes, se envían al servidor.">
              <CheckCircle2 size={11} />
              {savedAgo}
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        {!readOnly && canFill && (
          <div className="px-3 pb-2">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-colors
                  ${i <= step ? 'bg-dassa-celeste' : 'bg-gray-200'}`} />
              ))}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-center">
              Paso {step + 1} de {totalSteps}
              {!isLast && sections[step] && ` · ${sections[step].name}`}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        {/* Aviso de estado */}
        {insp.status === 'completada' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-emerald-900">Inspección completada</div>
              <div className="text-emerald-700 mt-0.5">
                Por {insp.completed_by_name}
                {insp.cosigned_by_name && ` · Co-firma: ${insp.cosigned_by_name}`}
              </div>
            </div>
          </div>
        )}
        {insp.status === 'en_cofirma' && !cosignMode && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-violet-900">Esperando co-firma</div>
              <div className="text-violet-700 mt-0.5">
                Completada por {insp.completed_by_name}. Otro responsable debe revisar y co-firmar.
              </div>
            </div>
          </div>
        )}
        {cosignMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <Edit3 size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <div className="font-bold text-blue-900">Co-firma pendiente</div>
              <div className="text-blue-700 mt-0.5">
                Revisá las respuestas cargadas y firmá abajo para cerrar el rondín.
              </div>
            </div>
          </div>
        )}

        {/* Modo co-firma: muestra respuestas en read-only + firma */}
        {cosignMode ? (
          <>
            <SectionReadOnly sections={sections} drafts={drafts} insp={insp} onGenerateFinding={generateFinding} />
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <SignaturePad label="Tu firma (co-firma)" height={160} onChange={setSignature} />
            </div>
            {err && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {err}
              </div>
            )}
            <button
              onClick={cosign}
              disabled={saving || !signature}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Co-firmar y cerrar
            </button>
          </>
        ) : readOnly ? (
          // Solo lectura: muestra respuestas y firma guardada
          <SectionReadOnly sections={sections} drafts={drafts} insp={insp} onGenerateFinding={generateFinding} />
        ) : (
          // Modo edición: paso a paso
          <>
            {!isLast && sections[step] && (
              <SectionForm
                section={sections[step]}
                drafts={drafts}
                setDraft={(id, patch) => { handleStartIfPending(); setDraft(id, patch); }}
                onPhoto={capturePhoto}
                onRemovePhoto={removePhoto}
              />
            )}
            {isLast && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Resumen</h3>
                  {insp.items.map(it => {
                    const d = drafts[it.id];
                    const fail = d && isFail(d.answer);
                    return (
                      <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700 truncate flex-1 pr-2">{it.label}</span>
                        <span className={`font-bold ${fail ? 'text-red-600' : d?.answer ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {d?.answer ? (fail ? '✗' : '✓') : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {insp.template_family === 'maquinaria' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Horómetro de la máquina
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={machineHours}
                      onChange={e => setMachineHours(e.target.value)}
                      placeholder="Ej: 1234.5"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Notas finales (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Cualquier observación general..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ubicación</div>
                  {geoStatus === 'ok' && geo ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                      <MapPin size={14} /> Capturada · {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={captureGeo}
                      className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-center gap-2 hover:border-blue-300"
                    >
                      {geoStatus === 'loading' && <Loader2 size={13} className="animate-spin" />}
                      <MapPin size={13} />
                      {geoStatus === 'fail' ? 'No se pudo obtener · reintentar' : 'Capturar ubicación'}
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <SignaturePad label="Tu firma" height={160} onChange={setSignature} />
                </div>

                {insp.requires_cosign && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    Este rondín requiere co-firma del segundo responsable.
                    Al enviar quedará en estado <strong>en co-firma</strong> hasta que el otro responsable lo cierre.
                  </div>
                )}

                {err && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {err}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer navegación */}
      {!readOnly && !cosignMode && canFill && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 z-20">
          <div className="max-w-2xl mx-auto flex gap-2">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Atrás
            </button>
            {!isLast ? (
              <button
                onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Enviar inspección
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Sección en modo edición ─────────────────────────────────────────────────
function SectionForm({
  section, drafts, setDraft, onPhoto, onRemovePhoto,
}: {
  section: { name: string; items: Item[] };
  drafts: Record<string, Draft>;
  setDraft: (id: string, patch: Partial<Draft>) => void;
  onPhoto: (id: string, file: File) => void;
  onRemovePhoto: (id: string, idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="px-1 py-2">
        <h2 className="text-sm font-extrabold text-gray-900">{section.name}</h2>
        <p className="text-[11px] text-gray-500">{section.items.length} ítem{section.items.length !== 1 && 's'}</p>
      </div>
      {section.items.map(it => {
        const d = drafts[it.id] || { answer: '', observations: '', photos: [] };
        const isOk = d.answer === 'cumple' || d.answer === 'si';
        const isFailA = isFail(d.answer);
        const fileId = `f-${it.id}`;
        return (
          <div key={it.id}
               className={`bg-white rounded-xl border p-3 transition-colors
                ${isFailA ? 'border-red-300 ring-1 ring-red-100'
                 : isOk ? 'border-emerald-300'
                 : 'border-gray-200'}`}>
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {it.is_critical && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-0.5">
                      <Zap size={9} /> CRÍTICO
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-gray-900 mt-0.5 leading-snug">{it.label}</div>
              </div>
            </div>

            {/* Botones de respuesta GIGANTES, mobile-first */}
            {(it.response_type === 'cumple' || it.response_type === 'si_no') && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(it.id, { answer: it.response_type === 'si_no' ? 'si' : 'cumple' })}
                  className={`py-4 rounded-xl text-sm font-extrabold border-2 transition-colors
                    ${isOk
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                >
                  ✓ {it.response_type === 'si_no' ? 'SÍ' : 'CUMPLE'}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(it.id, { answer: it.response_type === 'si_no' ? 'no' : 'no_cumple' })}
                  className={`py-4 rounded-xl text-sm font-extrabold border-2 transition-colors
                    ${isFailA
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                >
                  ✗ {it.response_type === 'si_no' ? 'NO' : 'NO CUMPLE'}
                </button>
              </div>
            )}

            {it.response_type === 'texto' && (
              <input
                type="text"
                value={d.observations}
                onChange={e => setDraft(it.id, { observations: e.target.value, answer: 'cumple' })}
                placeholder="Respuesta..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              />
            )}
            {it.response_type === 'numero' && (
              <input
                type="number"
                inputMode="decimal"
                value={d.observations}
                onChange={e => setDraft(it.id, { observations: e.target.value, answer: 'cumple' })}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              />
            )}

            {/* Observación + foto si NO CUMPLE */}
            {isFailA && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={d.observations}
                  onChange={e => setDraft(it.id, { observations: e.target.value })}
                  rows={2}
                  placeholder="Describí el problema (obligatorio)..."
                  className="w-full px-3 py-2.5 border border-red-200 bg-red-50/40 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none"
                />
                <input
                  id={fileId} type="file" accept="image/*" capture="environment"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onPhoto(it.id, f); e.target.value = ''; }}
                />
                <div className="flex flex-wrap gap-2">
                  {d.photos.map((p, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(it.id, idx)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-gray-200 shadow text-gray-600 flex items-center justify-center"
                      ><X size={11} /></button>
                    </div>
                  ))}
                  <label htmlFor={fileId}
                    className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer
                      ${it.photo_on_fail && d.photos.length === 0
                        ? 'border-red-300 bg-red-50/40 text-red-500'
                        : 'border-gray-300 text-gray-400 hover:border-blue-300'}`}>
                    <Camera size={18} />
                    <span className="text-[9px] mt-0.5">
                      {it.photo_on_fail && d.photos.length === 0 ? 'Obligatoria' : 'Foto'}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Observación opcional si cumple */}
            {isOk && (it.response_type === 'cumple' || it.response_type === 'si_no') && (
              <div className="mt-2">
                <input
                  type="text"
                  value={d.observations}
                  onChange={e => setDraft(it.id, { observations: e.target.value })}
                  placeholder="Observaciones (opcional)..."
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg text-xs focus:outline-none focus:border-blue-400 bg-gray-50"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sección en modo solo lectura ────────────────────────────────────────────
function SectionReadOnly({
  sections, drafts, insp, onGenerateFinding,
}: {
  sections: { name: string; items: Item[] }[];
  drafts: Record<string, Draft>;
  insp: Inspection;
  onGenerateFinding: (item: Item, responseId?: string) => void;
}) {
  return (
    <>
      {sections.map(sec => (
        <div key={sec.name} className="space-y-2">
          <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider px-1 pt-2">{sec.name}</h2>
          {sec.items.map(it => {
            const d = drafts[it.id];
            const fail = d && isFail(d.answer);
            return (
              <div key={it.id} className={`bg-white rounded-xl border p-3
                ${fail ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start gap-2">
                  <span className={`text-lg font-extrabold leading-none mt-0.5
                    ${fail ? 'text-red-500' : d?.answer ? 'text-emerald-500' : 'text-gray-300'}`}>
                    {fail ? '✗' : d?.answer ? '✓' : '–'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">{it.label}</div>
                    {d?.observations && (
                      <div className="text-xs text-gray-600 mt-1">{d.observations}</div>
                    )}
                    {d?.photos && d.photos.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {d.photos.map((p, idx) => (
                          <a key={idx} href={p} target="_blank" rel="noopener" className="block w-14 h-14">
                            <img src={p} alt="" className="w-full h-full object-cover rounded border border-gray-200" />
                          </a>
                        ))}
                      </div>
                    )}
                    {fail && it.is_critical && !it.finding_id && insp.status === 'completada' && (
                      <button
                        type="button"
                        onClick={() => onGenerateFinding(it, it.response_id)}
                        className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-wider hover:underline flex items-center gap-1"
                      >
                        <Zap size={10} /> Generar No Conformidad
                      </button>
                    )}
                    {it.finding_id && (
                      <div className="mt-2 text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                        NC vinculada
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {insp.signature_url && (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Firma</div>
          <img src={insp.signature_url} alt="Firma" className="max-h-32 border border-gray-200 rounded-lg bg-white" />
          {insp.cosign_url && (
            <>
              <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mt-3 mb-1.5">Co-firma</div>
              <img src={insp.cosign_url} alt="Co-firma" className="max-h-32 border border-gray-200 rounded-lg bg-white" />
            </>
          )}
        </div>
      )}
    </>
  );
}
