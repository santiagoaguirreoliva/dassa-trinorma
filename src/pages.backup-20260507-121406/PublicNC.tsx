import { useState, useRef, FormEvent } from 'react';
import { CheckCircle2, Upload, X, AlertTriangle, Loader2 } from 'lucide-react';

const SECTORES = [
  'DEPOSITO - ALMACEN',
  'COORDINACION',
  'PLAZOLETA',
  'ADMINISTRACION',
  'MANTENIMIENTO',
  'OTROS',
];

export default function PublicNC() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    description: '',
    area: '',
    detected_by: '',
    detected_by_email: '',
    affected_client: 'No',
    client_complaint: 'No',
    immediate_action_required: 'No',
    immediate_action: '',
    current_status: 'ABIERTO',
    comments: '',
    photo_base64: '',
    photo_name: '',
  });
  const [codeResult, setCodeResult] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La foto no puede superar 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => set('photo_base64', reader.result as string);
    reader.readAsDataURL(file);
    set('photo_name', file.name);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) { setError('La descripción es obligatoria'); return; }
    if (!form.area) { setError('El sector es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/nc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setCodeResult(data.code);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">¡NC Registrada!</h2>
          <p className="text-slate-500 text-sm mb-4">Tu no conformidad fue registrada correctamente y será gestionada por el equipo de calidad.</p>
          <div className="bg-blue-50 rounded-xl px-6 py-4 mb-6">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Número de referencia</p>
            <p className="text-2xl font-extrabold text-blue-700">{codeResult}</p>
          </div>
          <button
            onClick={() => { setStep('form'); setForm({ description:'', area:'', detected_by:'', detected_by_email:'', affected_client:'No', client_complaint:'No', immediate_action_required:'No', immediate_action:'', current_status:'ABIERTO', comments:'', photo_base64:'', photo_name:'' }); }}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Registrar otra NC
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-xl mx-auto mb-3">
            D
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">DASSA — Avisos de No Conformidades</h1>
          <p className="text-xs text-slate-400 mt-1">Completá el formulario para registrar una no conformidad o desvío</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Descripción de la NC / Desvío <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              required
              placeholder="Describí qué pasó, dónde, cuándo y cómo sucedieron los hechos..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Sector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Sector <span className="text-red-500">*</span>
            </label>
            <select
              value={form.area}
              onChange={e => set('area', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="">— Seleccioná el sector —</option>
              {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Detectó */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Tu nombre / puesto
              </label>
              <input
                type="text"
                value={form.detected_by}
                onChange={e => set('detected_by', e.target.value)}
                placeholder="Nombre o puesto"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email (opcional)
              </label>
              <input
                type="email"
                value={form.detected_by_email}
                onChange={e => set('detected_by_email', e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Afectó cliente / Reclamo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                ¿Afectó al cliente?
              </label>
              <div className="flex gap-2">
                {['Sí', 'No'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('affected_client', v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors
                      ${form.affected_client === v
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                  >{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                ¿Reclamo de cliente?
              </label>
              <div className="flex gap-2">
                {['Sí', 'No'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('client_complaint', v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors
                      ${form.client_complaint === v
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                  >{v}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Acción inmediata */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              ¿Requirió alguna acción inmediata?
            </label>
            <div className="flex gap-2 mb-2">
              {['Sí', 'No'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('immediate_action_required', v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors
                    ${form.immediate_action_required === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                >{v}</button>
              ))}
            </div>
            {form.immediate_action_required === 'Sí' && (
              <textarea
                value={form.immediate_action}
                onChange={e => set('immediate_action', e.target.value)}
                rows={2}
                placeholder="¿Qué acción inmediata se tomó?"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
            )}
          </div>

          {/* Estado actual */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              El caso se encuentra
            </label>
            <div className="flex gap-2 flex-wrap">
              {['ABIERTO', 'EN PROCESO', 'CERRADO'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('current_status', v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                    ${form.current_status === v
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                >{v}</button>
              ))}
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Comentarios adicionales
            </label>
            <textarea
              value={form.comments}
              onChange={e => set('comments', e.target.value)}
              rows={2}
              placeholder="Cualquier información adicional relevante..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Foto / Evidencia (opcional)
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {form.photo_base64 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-700 flex-1 truncate">{form.photo_name}</span>
                <button type="button" onClick={() => { set('photo_base64', ''); set('photo_name', ''); }}>
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Upload size={20} className="text-slate-300" />
                <span className="text-xs text-slate-400">Tocá para adjuntar una foto (máx. 5MB)</span>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-sm hover:from-blue-600 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Registrando...' : 'Registrar No Conformidad'}
          </button>

          <p className="text-center text-xs text-slate-400">
            DASSA — Depósito Avellaneda Sur S.A. · Sistema de Gestión Integrado Trinorma
          </p>
        </form>
      </div>
    </div>
  );
}
