import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, ArrowRightLeft } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  finding: any;
  users: any[];
  onClose: () => void;
  onConverted?: () => void;
}

type Destino = 'nc' | 'hallazgo' | 'incidente';

const DESTINOS: { key: Destino; label: string; help: string }[] = [
  { key: 'nc',        label: 'No conformidad',   help: 'Entra al circuito formal: análisis de causa, acción correctiva y verificación de eficacia.' },
  { key: 'hallazgo',  label: 'Aviso',            help: 'Identificación u oportunidad de mejora. Se revisa en la comisión mixta, sin acción correctiva formal.' },
  { key: 'incidente', label: 'Incidente de SST', help: 'Accidente o incidente de seguridad. El hallazgo se archiva y el registro pasa al módulo de Incidentes.' },
];

export default function ConvertModal({ finding, users, onClose, onConverted }: Props) {
  const qc = useQueryClient();
  const kindActual: 'nc' | 'hallazgo' = finding.report_kind === 'hallazgo' ? 'hallazgo' : 'nc';
  const opciones = DESTINOS.filter(d => d.key !== kindActual);

  const [destino, setDestino] = useState<Destino>(opciones[0].key);
  const [reason, setReason] = useState('');
  const [findingType, setFindingType] = useState('nc_real');
  const [assignedTo, setAssignedTo] = useState(finding.assigned_to || '');
  const [dueDate, setDueDate] = useState(finding.due_date?.slice(0, 10) || '');
  const [incidentType, setIncidentType] = useState('accidente');
  const [severity, setSeverity] = useState('leve');
  const [injured, setInjured] = useState('');
  const [artReported, setArtReported] = useState(false);
  const [lostDays, setLostDays] = useState(0);
  // La fecha del hecho no es la de carga: el accidente pudo ocurrir semanas antes
  // y de esa fecha dependen la denuncia a la ART y los indicadores de SST.
  const [incidentDate, setIncidentDate] = useState(
    (finding.created_at || new Date().toISOString()).slice(0, 10));
  const [incidentTime, setIncidentTime] = useState('');
  const [witness, setWitness] = useState('');

  const convertir = useMutation({
    mutationFn: () => destino === 'incidente'
      ? api.post(`/findings/${finding.id}/to-incident`, {
          incident_type: incidentType,
          date: incidentDate,
          time: incidentTime || null,
          severity,
          injured_person: injured || null,
          witness: witness || null,
          art_reported: artReported,
          lost_time_days: Number(lostDays) || 0,
          reason,
        })
      : api.patch(`/findings/${finding.id}/kind`, {
          kind: destino,
          reason,
          ...(destino === 'nc'
            ? { finding_type: findingType, assigned_to: assignedTo, due_date: dueDate }
            : {}),
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['findings'] });
      qc.invalidateQueries({ queryKey: ['finding', finding.id] });
      qc.invalidateQueries({ queryKey: ['findings-stats'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      onConverted?.();
      onClose();
    },
    onError: (e: any) => alert(e.message || 'No se pudo convertir'),
  });

  const faltaAlgo = !reason.trim()
    || (destino === 'nc' && (!assignedTo || !dueDate))
    || (destino === 'incidente' && (!incidentType || !incidentDate));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-dassa-red" />
            <h3 className="text-sm font-extrabold text-slate-900">Convertir {finding.code}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {opciones.map(o => (
              <label key={o.key}
                className={`block p-3 rounded-lg border cursor-pointer transition-colors
                  ${destino === o.key ? 'border-dassa-red bg-dassa-red-tint' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" checked={destino === o.key} onChange={() => setDestino(o.key)} />
                  <span className="text-xs font-bold text-slate-900">{o.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 ml-6">{o.help}</p>
              </label>
            ))}
          </div>

          {destino === 'nc' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                <select value={findingType} onChange={e => setFindingType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs">
                  <option value="nc_real">No conformidad real</option>
                  <option value="nc_potencial">No conformidad potencial</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Responsable</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs">
                  <option value="">Elegir…</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha límite</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>
          )}

          {destino === 'incidente' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs">
                  <option value="accidente">Accidente</option>
                  <option value="incidente">Incidente</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Severidad</label>
                <select value={severity} onChange={e => setSeverity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs">
                  <option value="leve">Leve</option>
                  <option value="moderada">Moderada</option>
                  <option value="grave">Grave</option>
                  <option value="muy_grave">Muy grave</option>
                  <option value="mortal">Mortal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha del hecho *</label>
                <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Hora</label>
                <input type="time" value={incidentTime} onChange={e => setIncidentTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Persona afectada</label>
                <input value={injured} onChange={e => setInjured(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Testigos</label>
                <input value={witness} onChange={e => setWitness(e.target.value)}
                  placeholder="Quién presenció el hecho"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <input id="art" type="checkbox" checked={artReported} onChange={e => setArtReported(e.target.checked)} />
                <label htmlFor="art" className="text-xs text-slate-700">Denunciado a la ART</label>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Días perdidos</label>
                <input type="number" min={0} value={lostDays} onChange={e => setLostDays(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Motivo de la conversión *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Por qué se reclasifica. Queda registrado con tu nombre y la fecha."
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
          </div>

          {destino === 'incidente' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              El hallazgo {finding.code} se archiva y su historia queda vinculada al nuevo incidente.
              Si además hubo un desvío del sistema, desde el incidente podés abrir la no conformidad.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-slate-600">Cancelar</button>
          <button
            onClick={() => convertir.mutate()}
            disabled={faltaAlgo || convertir.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red disabled:opacity-40"
          >
            {convertir.isPending ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightLeft size={12} />}
            Convertir
          </button>
        </div>
      </div>
    </div>
  );
}
