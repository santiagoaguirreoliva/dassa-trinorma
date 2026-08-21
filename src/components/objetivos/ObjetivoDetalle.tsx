// Panel de detalle de un objetivo del F-TRI-04.
// Cuatro bloques: la ficha de la planilla (editable), la carga de mediciones del
// período, los vínculos con el resto del sistema (capacitaciones, proyectos,
// cambios, desvíos, riesgos) y la bitácora de registros.
// La edición está abierta a cualquier usuario por decisión de Dirección; cada
// cambio de la ficha queda asentado en la bitácora con autor y valor anterior.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Plus, Trash2, Link2, PenLine, History, Save, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface Props { objectiveId: string; onClose: () => void }

type TipoVinculo = 'capacitacion' | 'proyecto' | 'cambio' | 'hallazgo' | 'riesgo';

const TIPOS: { key: TipoVinculo; label: string }[] = [
  { key: 'capacitacion', label: 'Capacitaciones' },
  { key: 'proyecto', label: 'Proyectos' },
  { key: 'cambio', label: 'Cambios y mejoras' },
  { key: 'hallazgo', label: 'NC y avisos' },
  { key: 'riesgo', label: 'Riesgos' },
];
const TIPO_LABEL: Record<string, string> = {
  capacitacion: 'Capacitación', proyecto: 'Proyecto', cambio: 'Cambio',
  hallazgo: 'Desvío', riesgo: 'Riesgo',
};
const ENTRY_LABEL: Record<string, string> = {
  avance: 'Avance', nota: 'Nota', evidencia: 'Evidencia', edicion: 'Edición de la ficha',
};

// Campos de la planilla F-TRI-04 que se editan como texto libre
const CAMPOS: { key: string; label: string; ancho?: boolean }[] = [
  { key: 'target_value', label: 'META' },
  { key: 'admissible_value', label: 'Admisible' },
  { key: 'responsible_text', label: 'Responsable' },
  { key: 'plazo_frecuencia', label: 'Plazo / Frecuencia' },
  { key: 'acciones_asociadas', label: 'Acciones asociadas', ancho: true },
  { key: 'recursos', label: 'Recursos', ancho: true },
  { key: 'cumplimiento_nota', label: 'Cumplimiento', ancho: true },
  { key: 'acciones_si_no_llega', label: 'Acciones si no se llega', ancho: true },
];

export default function ObjetivoDetalle({ objectiveId, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ficha' | 'mediciones' | 'vinculos' | 'bitacora'>('ficha');
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [nuevoRegistro, setNuevoRegistro] = useState({ content: '', entry_type: 'avance' });
  const [nuevoVinculo, setNuevoVinculo] = useState<{ tipo: TipoVinculo; id: string }>({ tipo: 'capacitacion', id: '' });
  const [med, setMed] = useState({ indicator_id: '', mes: '', valor: '' });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['objetivo-detalle', objectiveId] });
    qc.invalidateQueries({ queryKey: ['objetivos'] });
  };
  const onErr = (e: any) => setError(e?.message || 'No se pudo guardar');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['objetivo-detalle', objectiveId],
    queryFn: () => api.get(`/objetivos/${objectiveId}/detalle`),
  });
  const { data: catalogo } = useQuery<any>({
    queryKey: ['objetivos-vinculables'],
    queryFn: () => api.get('/objetivos/vinculables/todo'),
    staleTime: 5 * 60_000,
  });

  const guardar = useMutation({
    mutationFn: () => api.patch(`/objetivos/${objectiveId}`, edit),
    onSuccess: () => { setError(null); setEdit({}); refresh(); },
    onError: onErr,
  });
  const addEntry = useMutation({
    mutationFn: () => api.post(`/objetivos/${objectiveId}/entries`, nuevoRegistro),
    onSuccess: () => { setError(null); setNuevoRegistro({ content: '', entry_type: 'avance' }); refresh(); },
    onError: onErr,
  });
  const addLink = useMutation({
    mutationFn: () => api.post(`/objetivos/${objectiveId}/links`,
      { entity_type: nuevoVinculo.tipo, entity_id: nuevoVinculo.id }),
    onSuccess: () => { setError(null); setNuevoVinculo({ ...nuevoVinculo, id: '' }); refresh(); },
    onError: onErr,
  });
  const delLink = useMutation({
    mutationFn: (linkId: string) => api.delete(`/objetivos/${objectiveId}/links/${linkId}`),
    onSuccess: () => { setError(null); refresh(); },
    onError: onErr,
  });
  const addMed = useMutation({
    mutationFn: () => api.post(`/objetivos/${objectiveId}/mediciones`, med),
    onSuccess: () => { setError(null); setMed({ ...med, valor: '' }); refresh(); },
    onError: onErr,
  });

  if (isLoading || !data) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><Loader2 size={26} className="animate-spin text-dassa-red" /></div>
    </div>
  );

  const o = data.objective;
  const inds = data.indicators || [];
  const val = (k: string) => edit[k] ?? (o[k] ?? '');
  const hayCambios = Object.keys(edit).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white z-10 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <code className="text-xs font-extrabold text-dassa-celeste-deep">{o.code}</code>
              <h2 className="text-[15px] font-extrabold text-gray-900 leading-snug">{o.name}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{o.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={20} /></button>
          </div>

          {error && (
            <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400"><X size={13} /></button>
            </div>
          )}

          <div className="flex border-b border-gray-200 -mx-6 px-6 -mb-4 mt-3 overflow-x-auto">
            {([
              ['ficha', 'Ficha', <PenLine key="i" size={12} />],
              ['mediciones', `Mediciones`, null],
              ['vinculos', `Vínculos (${(data.links || []).length})`, <Link2 key="i" size={12} />],
              ['bitacora', `Bitácora (${(data.entries || []).length})`, <History key="i" size={12} />],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k as any)}
                className={`px-3 py-3 text-xs font-bold border-b-2 shrink-0 transition-colors
                  ${tab === k ? 'border-dassa-red text-dassa-red' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 space-y-4">

          {tab === 'ficha' && (
            <>
              <p className="text-[11px] text-gray-400">
                Columnas del F-TRI-04. Cualquier cambio queda registrado en la bitácora con tu nombre.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CAMPOS.map(c => (
                  <div key={c.key} className={c.ancho ? 'col-span-2' : undefined}>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{c.label}</label>
                    <textarea rows={c.ancho ? 2 : 1} value={val(c.key)}
                      onChange={e => setEdit(p => ({ ...p, [c.key]: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-dassa-celeste-deep focus:outline-none" />
                  </div>
                ))}
              </div>
              {hayCambios && (
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setEdit({}); setError(null); }}
                    className="px-3 py-1.5 text-xs font-bold text-gray-500">Descartar</button>
                  <button onClick={() => guardar.mutate()} disabled={guardar.isPending}
                    className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
                    {guardar.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Guardar cambios
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'mediciones' && (
            <>
              {inds.map((ind: any) => (
                <div key={ind.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-900">{ind.indicator_name}</span>
                    <span className="text-[10px] text-gray-400">{ind.frequency} · {ind.unit}</span>
                  </div>
                  {ind.item_medido && <p className="text-[11px] text-gray-500 mb-2">Ítem a medir: {ind.item_medido}</p>}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(ind.mediciones || []).map((m: any) => (
                      <span key={m.mes} className="text-[10px] bg-gray-100 rounded px-1.5 py-0.5" title={m.notes || ''}>
                        <strong>{m.mes}</strong> {m.valor}
                      </span>
                    ))}
                    {!(ind.mediciones || []).length && <span className="text-[11px] text-gray-400">Sin mediciones cargadas.</span>}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input type="month" value={med.indicator_id === ind.id ? med.mes : ''}
                      onChange={e => setMed({ indicator_id: ind.id, mes: e.target.value, valor: med.valor })}
                      className="text-xs border border-gray-200 rounded px-2 py-1" />
                    <input type="number" step="any" placeholder="valor"
                      value={med.indicator_id === ind.id ? med.valor : ''}
                      onChange={e => setMed({ indicator_id: ind.id, mes: med.mes, valor: e.target.value })}
                      className="w-24 text-xs border border-gray-200 rounded px-2 py-1" />
                    <button onClick={() => addMed.mutate()}
                      disabled={addMed.isPending || med.indicator_id !== ind.id || !med.mes || med.valor === ''}
                      className="px-2.5 py-1 bg-dassa-celeste-deep text-white text-[11px] font-bold rounded disabled:opacity-40">
                      Cargar
                    </button>
                  </div>
                </div>
              ))}
              {!inds.length && <p className="text-sm text-gray-400">Este objetivo todavía no tiene indicador.</p>}
            </>
          )}

          {tab === 'vinculos' && (
            <>
              <div className="flex gap-1.5 items-center">
                <select value={nuevoVinculo.tipo}
                  onChange={e => setNuevoVinculo({ tipo: e.target.value as TipoVinculo, id: '' })}
                  className="text-xs border border-gray-200 rounded px-2 py-1.5">
                  {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select value={nuevoVinculo.id} onChange={e => setNuevoVinculo({ ...nuevoVinculo, id: e.target.value })}
                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5">
                  <option value="">Elegir…</option>
                  {(catalogo?.[nuevoVinculo.tipo] || []).map((x: any) => (
                    <option key={x.id} value={x.id}>{x.detalle ? `${x.detalle} — ` : ''}{x.nombre}</option>
                  ))}
                </select>
                <button onClick={() => addLink.mutate()} disabled={!nuevoVinculo.id || addLink.isPending}
                  className="px-3 py-1.5 bg-dassa-red text-white text-[11px] font-bold rounded-lg inline-flex items-center gap-1 disabled:opacity-40">
                  {addLink.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />} Vincular
                </button>
              </div>
              <div className="space-y-1.5">
                {(data.links || []).map((l: any) => (
                  <div key={l.id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-[9px] font-bold uppercase text-gray-400 w-20 shrink-0">{TIPO_LABEL[l.entity_type]}</span>
                    <span className="text-xs text-gray-800 flex-1 truncate">
                      {l.entity_code ? <code className="text-[10px] text-dassa-red-deep mr-1">{l.entity_code}</code> : null}
                      {l.entity_name}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">{l.created_by_name}</span>
                    <button onClick={() => delLink.mutate(l.id)} className="text-gray-300 hover:text-dassa-red shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {!(data.links || []).length && (
                  <p className="text-[11px] text-gray-400">
                    Sin vínculos. Acá se atan las capacitaciones, proyectos, cambios y desvíos que empujan este objetivo.
                  </p>
                )}
              </div>
            </>
          )}

          {tab === 'bitacora' && (
            <>
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="flex gap-1.5 mb-2">
                  {(['avance', 'nota', 'evidencia'] as const).map(t => (
                    <button key={t} onClick={() => setNuevoRegistro(p => ({ ...p, entry_type: t }))}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${nuevoRegistro.entry_type === t ? 'bg-dassa-red text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {ENTRY_LABEL[t]}
                    </button>
                  ))}
                </div>
                <textarea rows={2} value={nuevoRegistro.content}
                  onChange={e => setNuevoRegistro(p => ({ ...p, content: e.target.value }))}
                  placeholder="Qué pasó con este objetivo…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-dassa-celeste-deep focus:outline-none" />
                <div className="flex justify-end mt-1.5">
                  <button onClick={() => addEntry.mutate()} disabled={!nuevoRegistro.content.trim() || addEntry.isPending}
                    className="px-3 py-1.5 bg-dassa-red text-white text-[11px] font-bold rounded-lg disabled:opacity-40 inline-flex items-center gap-1">
                    {addEntry.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />} Registrar
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(data.entries || []).map((e: any) => (
                  <div key={e.id} className={`border-l-2 pl-3 py-1 ${e.entry_type === 'edicion' ? 'border-gray-200' : 'border-dassa-celeste'}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{ENTRY_LABEL[e.entry_type]}</span>
                      <span className="text-[10px] text-gray-400">
                        {e.created_by_name} · {new Date(e.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${e.entry_type === 'edicion' ? 'text-gray-500' : 'text-gray-800'}`}>{e.content}</p>
                  </div>
                ))}
                {!(data.entries || []).length && <p className="text-[11px] text-gray-400">Sin registros todavía.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
