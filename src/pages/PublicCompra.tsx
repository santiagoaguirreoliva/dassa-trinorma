import { useState, useRef, FormEvent } from 'react';
import { CheckCircle2, Upload, X, AlertTriangle, Loader2, Link2, Sparkles, ShoppingCart } from 'lucide-react';

const SECTORES = [
  'DEPOSITO - ALMACEN',
  'COORDINACION',
  'PLAZOLETA',
  'ADMINISTRACION',
  'MANTENIMIENTO',
  'OTROS',
];

const URGENCIAS = [
  { value: 'baja',    label: 'Puede esperar' },
  { value: 'media',   label: 'Normal' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

interface AnalyzedProduct {
  titulo?: string | null;
  descripcion?: string | null;
  precio?: number | null;
  moneda?: string | null;
  vendedor?: string | null;
  fotos?: string[];
  categoria_sgi?: string | null;
  [k: string]: unknown;
}

export default function PublicCompra() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    requester_name: '',
    requester_email: '',
    requesting_area: '',
    description: '',
    quantity: '1',
    priority: 'media',
    purpose: '',
    estimated_budget: '',
    source_url: '',
    photo_base64: '',
    photo_name: '',
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedProduct | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [codeResult, setCodeResult] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleAnalyze() {
    if (!form.source_url.trim() && !pasteText.trim()) { setAnalyzeError('Pegá primero el link o el texto del producto'); return; }
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const res = await fetch('/api/public/compras/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.source_url.trim() || null, text: pasteText.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo analizar el link');
      const p: AnalyzedProduct = data.data;
      if (!p.titulo && !p.precio) {
        setAnalyzed(null);
        setShowPaste(true);
        throw new Error('La página no dejó leer el producto (pasa seguido con MercadoLibre). Copiá el título y precio desde la página y pegalos en el campo de texto de abajo, después tocá Analizar de nuevo.');
      }
      setAnalyzed(p);
      // Autocompletar lo que falte con lo que leyó la IA
      setForm(f => ({
        ...f,
        description: f.description || p.titulo || '',
        estimated_budget: f.estimated_budget || (p.precio ? String(p.precio) : ''),
      }));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Error al analizar');
      setAnalyzed(null);
    } finally {
      setAnalyzing(false);
    }
  }

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
    if (!form.requester_name.trim()) { setError('Ingresá tu nombre'); return; }
    if (!form.requesting_area) { setError('El sector es obligatorio'); return; }
    if (!form.description.trim()) { setError('Contanos qué necesitás comprar'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: form.requester_name,
          requester_email: form.requester_email,
          requesting_area: form.requesting_area,
          description: form.description,
          quantity: form.quantity ? Number(form.quantity) : null,
          priority: form.priority,
          purpose: form.purpose,
          estimated_budget: form.estimated_budget ? Number(form.estimated_budget) : null,
          source_url: form.source_url || null,
          long_description: analyzed?.descripcion || null,
          category: analyzed?.categoria_sgi || 'general',
          recommended_supplier: analyzed?.vendedor || null,
          item_specs: analyzed || null,
          photo_urls: analyzed?.fotos?.slice(0, 6) || [],
          photo_base64: form.photo_base64 || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setCodeResult(data.code);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">¡Solicitud enviada!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Tu solicitud de compra fue registrada y va a ser revisada para su aprobación.
            Vas a poder seguirla con este número:
          </p>
          <div className="bg-dassa-red-tint rounded-xl px-6 py-4 mb-6">
            <p className="text-xs text-dassa-red font-semibold uppercase tracking-wider mb-1">Número de solicitud</p>
            <p className="text-2xl font-extrabold text-dassa-red-deep">{codeResult}</p>
          </div>
          <button
            onClick={() => {
              setStep('form');
              setAnalyzed(null);
              setForm({ requester_name: form.requester_name, requester_email: form.requester_email, requesting_area: form.requesting_area, description: '', quantity: '1', priority: 'media', purpose: '', estimated_budget: '', source_url: '', photo_base64: '', photo_name: '' });
            }}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            Cargar otra solicitud
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-700 to-red-500 flex items-center justify-center text-white mx-auto mb-3">
            <ShoppingCart size={22} />
          </div>
          <h1 className="text-lg font-extrabold text-gray-900">DASSA — Solicitud de Compra</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pedí lo que necesitás. Si tenés un link de MercadoLibre (u otra tienda), pegalo y lo analizamos automáticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">

          {/* Link del producto + análisis IA */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Link del producto (opcional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={form.source_url}
                  onChange={e => set('source_url', e.target.value)}
                  placeholder="https://articulo.mercadolibre.com.ar/..."
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
                />
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-3.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {analyzing ? 'Analizando…' : 'Analizar'}
              </button>
            </div>
            {analyzeError && <p className="text-xs text-red-600 mt-2">{analyzeError}</p>}
            {!showPaste ? (
              <button type="button" onClick={() => setShowPaste(true)}
                className="text-[11px] text-gray-400 hover:text-gray-600 mt-2 underline">
                ¿No funciona el link? Pegá el texto del producto
              </button>
            ) : (
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={3}
                placeholder="Pegá acá el título, precio y descripción copiados de la página del producto…"
                className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none"
              />
            )}
            {analyzed && (
              <div className="mt-3 flex gap-3 items-start bg-white border border-emerald-200 rounded-xl p-3">
                {analyzed.fotos?.[0] && (
                  <img src={analyzed.fotos[0]} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{analyzed.titulo || 'Producto detectado'}</p>
                  <p className="text-xs text-gray-500">
                    {analyzed.precio ? `$ ${Number(analyzed.precio).toLocaleString('es-AR')} ${analyzed.moneda || ''}` : 'Precio no detectado'}
                    {analyzed.vendedor ? ` · ${analyzed.vendedor}` : ''}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">✓ Datos cargados a la solicitud</p>
                </div>
              </div>
            )}
          </div>

          {/* Qué necesitás */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              ¿Qué necesitás comprar? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              required
              placeholder="Ej: 2 cascos de seguridad blancos talle L / Notebook para administración..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-400 resize-none"
            />
          </div>

          {/* Cantidad + urgencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Cantidad</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Urgencia</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-red-400"
              >
                {URGENCIAS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Sector que lo pide <span className="text-red-500">*</span>
            </label>
            <select
              value={form.requesting_area}
              onChange={e => set('requesting_area', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-red-400 bg-white"
            >
              <option value="">— Seleccioná el sector —</option>
              {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Quién pide */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Tu nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.requester_name}
                onChange={e => set('requester_name', e.target.value)}
                required
                placeholder="Nombre y apellido"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email (opcional)</label>
              <input
                type="email"
                value={form.requester_email}
                onChange={e => set('requester_email', e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              />
            </div>
          </div>

          {/* Para qué + presupuesto */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">¿Para qué se necesita?</label>
            <textarea
              value={form.purpose}
              onChange={e => set('purpose', e.target.value)}
              rows={2}
              placeholder="Motivo o uso previsto (ayuda a que se apruebe más rápido)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Precio estimado (ARS)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.estimated_budget}
              onChange={e => set('estimated_budget', e.target.value)}
              placeholder="Se completa solo si analizaste un link"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
            />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Foto de referencia (opcional)
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {form.photo_base64 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-700 flex-1 truncate">{form.photo_name}</span>
                <button
                  type="button"
                  onClick={() => { set('photo_base64', ''); set('photo_name', ''); }}
                  aria-label="Quitar foto adjunta"
                  className="flex items-center justify-center w-9 h-9 -mr-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1.5 hover:border-red-300 hover:bg-dassa-red-tint transition-colors"
              >
                <Upload size={18} className="text-gray-400" />
                <span className="text-xs text-gray-500">Tocá para adjuntar una foto (máx. 5MB)</span>
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white font-bold text-sm hover:from-red-600 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Enviando…' : 'Enviar solicitud de compra'}
          </button>

          <p className="text-center text-xs text-gray-500">
            DASSA — Depósito Avellaneda Sur S.A. · Sistema de Gestión Integrado Trinorma
          </p>
        </form>
      </div>
    </main>
  );
}
