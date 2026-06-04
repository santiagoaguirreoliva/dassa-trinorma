// /rondas/config — Configuración admin del módulo: plantillas, máquinas,
// operadores (PIN), geofence. Tabs simples + acciones inline.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  ArrowLeft, Plus, Truck, KeyRound, FileText, MapPin, Loader2,
  RefreshCw, Printer, Edit3, AlertTriangle, CheckCircle2, FileBox,
} from 'lucide-react';

type Tab = 'templates' | 'machines' | 'operators' | 'geofence';

interface Template {
  id: string; code: string; name: string; family: string; frequency: string;
  requires_cosign: boolean; active: boolean; items_count: number;
  responsibles: { user_id: string; name: string; role: string }[];
}
interface Machine {
  id: string; code: string; name: string; type: string; qr_token: string;
  active: boolean; daily_checklist: boolean;
}
interface Operator {
  id: string; full_name: string; active: boolean;
}

export default function RondasConfig() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <main className="min-h-[100dvh] bg-slate-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate('/rondas')} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-gray-900">Configuración de Rondas</div>
            <div className="text-[11px] text-gray-500">Solo admin · plantillas, máquinas, operadores, geofence</div>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-2 pb-2 overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {[
              { k: 'templates', label: 'Plantillas', icon: <FileText size={13} /> },
              { k: 'machines', label: 'Máquinas', icon: <Truck size={13} /> },
              { k: 'operators', label: 'Choferes', icon: <KeyRound size={13} /> },
              { k: 'geofence', label: 'Geofence', icon: <MapPin size={13} /> },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as Tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap
                  ${tab === t.k ? 'bg-dassa-celeste/20 text-dassa-ink' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-4">
        {tab === 'templates' && <TemplatesPanel />}
        {tab === 'machines' && <MachinesPanel />}
        {tab === 'operators' && <OperatorsPanel />}
        {tab === 'geofence' && <GeofencePanel />}
      </div>
    </main>
  );
}

// ─── Plantillas ────────────────────────────────────────────────────────────
function TemplatesPanel() {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try { setList(await api.get<Template[]>('/inspections/templates')); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  if (err) return <Err msg={err} />;

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-gray-500 px-1 mb-1">
        El motor es dirigido por plantillas — editar ítems no requiere desplegar nuevo código.
      </div>
      {list.map(t => (
        <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-400">{t.code}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{t.family}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{t.frequency}</span>
                {t.requires_cosign && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">co-firma</span>
                )}
                {!t.active && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">inactiva</span>
                )}
              </div>
              <div className="text-sm font-bold text-gray-900 mt-1">{t.name}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {t.items_count} ítems · Responsables: {t.responsibles.map(r => r.name).join(', ') || '—'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Máquinas ──────────────────────────────────────────────────────────────
function MachinesPanel() {
  const [list, setList] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'autoelevador', daily_checklist: true });
  const [qr, setQr] = useState<{ machineCode: string; url: string; png: string } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function load() {
    setLoading(true); setErr('');
    try { setList(await api.get<Machine[]>('/inspections/machines')); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.code || !form.name) { setErr('Código y nombre requeridos'); return; }
    try {
      await api.post('/inspections/machines', form);
      setForm({ code: '', name: '', type: 'autoelevador', daily_checklist: true });
      setCreating(false);
      load();
    } catch (e: any) { setErr(e.message); }
  }

  async function toggleDaily(m: Machine) {
    try {
      await api.patch(`/inspections/machines/${m.id}`, { daily_checklist: !m.daily_checklist });
      load();
    } catch (e: any) { setErr(e.message); }
  }

  async function downloadQrsPdf() {
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('dassa_token');
      const r = await fetch('/api/inspections/machines/qrs.pdf', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrs-maquinaria-dassa-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function viewQR(m: Machine) {
    try {
      const r = await api.get<{ machine: Machine; url: string; png: string }>(`/inspections/machines/${m.id}/qr`);
      setQr({ machineCode: m.code, url: r.url, png: r.png });
    } catch (e: any) { setErr(e.message); }
  }
  async function rotateQR(m: Machine) {
    if (!confirm(`Rotar el QR de ${m.code}? El QR anterior dejará de funcionar.`)) return;
    try {
      await api.post(`/inspections/machines/${m.id}/rotate-qr`);
      load();
    } catch (e: any) { setErr(e.message); }
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  const activas = list.filter(m => m.active);

  return (
    <div className="space-y-2">
      {err && <Err msg={err} />}

      {activas.length > 0 && (
        <button
          onClick={downloadQrsPdf}
          disabled={downloadingPdf}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileBox size={14} />}
          Descargar PDF con todos los QRs ({activas.length} máquina{activas.length !== 1 ? 's' : ''})
        </button>
      )}

      {!creating ? (
        <button onClick={() => setCreating(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:border-blue-300 flex items-center justify-center gap-1">
          <Plus size={14} /> Agregar máquina
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                 placeholder="Código (ej: AE-15)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                 placeholder="Nombre (ej: TEU 3.0 TN #15 — Nafta/Gas)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="autoelevador">Autoelevador</option>
            <option value="kalmar">Kalmar</option>
            <option value="mitsubishi">Mitsubishi</option>
            <option value="montacargas">Montacargas</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.daily_checklist}
                   onChange={e => setForm({ ...form, daily_checklist: e.target.checked })}
                   className="w-4 h-4" />
            Checklist diario obligatorio (desmarcar para on-demand)
          </label>
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancelar</button>
            <button onClick={create} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Crear</button>
          </div>
        </div>
      )}

      {list.map(m => (
        <div key={m.id} className={`bg-white rounded-xl border p-3 flex items-center gap-3
          ${m.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center
            ${m.type === 'kalmar' ? 'bg-amber-50 text-amber-600' :
              m.type === 'mitsubishi' ? 'bg-violet-50 text-violet-600' :
              'bg-orange-50 text-orange-600'}`}>
            <Truck size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-gray-400">{m.code}</div>
            <div className="text-sm font-bold text-gray-900 truncate">{m.name}</div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 flex-wrap">
              <span>{m.type}</span>
              {m.active && (
                <button onClick={() => toggleDaily(m)}
                  className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider
                    ${m.daily_checklist
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                  title="Click para cambiar">
                  {m.daily_checklist ? '✓ Check diario' : '⏸ On-demand'}
                </button>
              )}
              {!m.active && <span className="text-gray-400">· inactiva</span>}
            </div>
          </div>
          {m.active && (
            <>
              <button onClick={() => viewQR(m)} title="Ver QR"
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><Printer size={15} /></button>
              <button onClick={() => rotateQR(m)} title="Rotar QR"
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><RefreshCw size={15} /></button>
            </>
          )}
        </div>
      ))}

      {qr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setQr(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">QR · {qr.machineCode}</div>
            <img src={qr.png} alt="QR" className="mx-auto" />
            <div className="text-[10px] text-gray-500 break-all mt-3">{qr.url}</div>
            <div className="flex gap-2 mt-4">
              <a href={qr.png} download={`qr-${qr.machineCode}.png`}
                 className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Descargar PNG</a>
              <button onClick={() => setQr(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Operadores (choferes con PIN) ─────────────────────────────────────────
function OperatorsPanel() {
  const [list, setList] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: '', pin: '' });
  const [resetting, setResetting] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try { setList(await api.get<Operator[]>('/inspections/operators')); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.full_name || !/^\d{4}$/.test(form.pin)) { setErr('Nombre y PIN de 4 dígitos requeridos'); return; }
    try {
      await api.post('/inspections/operators', form);
      setMsg(`Operador ${form.full_name} creado`);
      setForm({ full_name: '', pin: '' });
      setCreating(false);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) { setErr(e.message); }
  }

  async function resetPin(id: string) {
    if (!/^\d{4}$/.test(newPin)) { setErr('El PIN debe tener 4 dígitos'); return; }
    try {
      await api.patch(`/inspections/operators/${id}`, { pin: newPin });
      setMsg('PIN actualizado');
      setResetting(null);
      setNewPin('');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) { setErr(e.message); }
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-2">
      {err && <Err msg={err} />}
      {msg && <Ok msg={msg} />}
      {!creating ? (
        <button onClick={() => setCreating(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:border-blue-300 flex items-center justify-center gap-1">
          <Plus size={14} /> Agregar chofer
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                 placeholder="Nombre y apellido" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                 inputMode="numeric" maxLength={4}
                 placeholder="PIN (4 dígitos)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancelar</button>
            <button onClick={create} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Crear</button>
          </div>
        </div>
      )}

      {list.map(o => (
        <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {o.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{o.full_name}</div>
              <div className="text-[11px] text-gray-500">{o.active ? 'Activo' : 'Inactivo'}</div>
            </div>
            <button onClick={() => { setResetting(o.id); setNewPin(''); }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-1">
              <Edit3 size={12} /> PIN
            </button>
          </div>
          {resetting === o.id && (
            <div className="mt-2 flex gap-2">
              <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                     inputMode="numeric" maxLength={4}
                     placeholder="Nuevo PIN" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={() => resetPin(o.id)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">OK</button>
              <button onClick={() => setResetting(null)} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">×</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Geofence ──────────────────────────────────────────────────────────────
function GeofencePanel() {
  const [config, setConfig] = useState<{ geofence_lat?: string; geofence_lng?: string; geofence_radius_m?: string; geofence_calibrated?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [lat, setLat] = useState(''); const [lng, setLng] = useState(''); const [radius, setRadius] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const c = await api.get<any>('/inspections/config');
      setConfig(c);
      setLat(c.geofence_lat || '');
      setLng(c.geofence_lng || '');
      setRadius(c.geofence_radius_m || '');
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function captureHere() {
    if (!navigator.geolocation) { setErr('Geolocalización no disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setLat(String(p.coords.latitude)); setLng(String(p.coords.longitude)); },
      () => setErr('No se pudo capturar la ubicación')
    );
  }
  async function save() {
    setErr(''); setMsg('');
    try {
      await api.put('/inspections/config/geofence', {
        lat: Number(lat), lng: Number(lng), radius_m: Number(radius), calibrated: true,
      });
      setMsg('Geofence actualizado');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) { setErr(e.message); }
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  const calibrated = config?.geofence_calibrated === 'true';

  return (
    <div className="space-y-3">
      {err && <Err msg={err} />}
      {msg && <Ok msg={msg} />}
      {!calibrated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            El geofence aún no está calibrado. Mientras tanto, las inspecciones se marcan con <code>geo_inside=null</code>.
            Capturá la ubicación parado en el predio para fijar el centroide.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Latitud</label>
          <input value={lat} onChange={e => setLat(e.target.value)}
                 type="number" step="any"
                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Longitud</label>
          <input value={lng} onChange={e => setLng(e.target.value)}
                 type="number" step="any"
                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Radio (metros)</label>
          <input value={radius} onChange={e => setRadius(e.target.value)}
                 type="number"
                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={captureHere}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-center gap-1">
            <MapPin size={13} /> Usar mi ubicación
          </button>
          <button onClick={save}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {msg}
    </div>
  );
}
function Ok({ msg }: { msg: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 flex items-start gap-2">
      <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" /> {msg}
    </div>
  );
}
