import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2, Clock, Lock, Loader2, Play, Eye, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, KPICard } from '@/components/ui';

interface Review {
  id: string; entity_type: string; status: string;
  reviewer_name: string; validator_name: string;
  sort_order: number; template_description: string;
  depends_on_entity_types: string[]; is_blocked: boolean;
}
interface Dep { parent_type: string; child_type: string; parent_id: string; child_id: string; dep_type: string; parent_status: string; }
interface CycleData { cycle: { year: number; name: string; status: string; opened_at: string }; reviews: Review[]; dependencies: Dep[]; }

const ENTITY_LABELS: Record<string,string> = {
  foda: 'FODA', job_profiles: 'Fichas de Puesto', procedures: 'Procedimientos',
  risks: 'AMFE Riesgos', legal_requirements: 'Requisitos Legales',
  environmental_aspects: 'Aspectos Ambientales', objectives: 'Objetivos',
  change_requests: 'Gestión de Cambios', audit_internal: 'Auditoría Interna',
  management_review: 'Revisión por la Dirección',
};
const STATUS_CFG: Record<string,{label:string;bg:string;color:string;icon:any}> = {
  programada: { label:'Programada', bg:'bg-amber-100', color:'text-amber-700', icon: Clock },
  en_revision: { label:'En revisión', bg:'bg-blue-100', color:'text-blue-700', icon: Loader2 },
  validada: { label:'Validada', bg:'bg-emerald-100', color:'text-emerald-700', icon: CheckCircle2 },
  rechazada: { label:'Rechazada', bg:'bg-red-100', color:'text-red-700', icon: X },
  bloqueada: { label:'Bloqueada', bg:'bg-gray-200', color:'text-gray-600', icon: Lock },
  postpuesta: { label:'Postpuesta', bg:'bg-gray-100', color:'text-gray-500', icon: Clock },
};

export default function Ciclo2026() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Review|null>(null);

  const { data, isLoading } = useQuery<{ ok:boolean } & CycleData>({
    queryKey: ['cycle-2026'],
    queryFn: () => api.get('/reviews/cycle/2026'),
    refetchInterval: 15_000,
  });

  const startMut = useMutation({
    mutationFn: (id:string) => api.post(`/reviews/${id}/start`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycle-2026'] }),
  });
  const validateMut = useMutation({
    mutationFn: (p:{id:string;approve:boolean;notes:string}) => api.post(`/reviews/${p.id}/validate`, { approve: p.approve, notes: p.notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['cycle-2026'] }); setSelected(null); },
  });

  if (isLoading || !data) return <PageContent><Spinner /></PageContent>;

  const validadas = data.reviews.filter(r=>r.status==='validada').length;
  const enRevision = data.reviews.filter(r=>r.status==='en_revision').length;
  const bloqueadas = data.reviews.filter(r=>r.status==='bloqueada').length;
  const listas = data.reviews.filter(r=>r.status==='programada').length;
  const pct = Math.round((validadas / data.reviews.length) * 100);

  return (
    <PageContent>
      <Header title={`🔄 Ciclo ${data.cycle.year} · TRINORMA`} subtitle={data.cycle.name + ' · ' + data.cycle.status} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Progreso" value={`${pct}%`} sub={`${validadas}/${data.reviews.length} validadas`} />
        <KPICard label="En revisión" value={enRevision} sub="actualmente" />
        <KPICard label="Listas para iniciar" value={listas} sub="sin bloqueos" />
        <KPICard label="Bloqueadas" value={bloqueadas} sub="esperan deps" alert={bloqueadas>0} />
      </div>

      {/* Grafo DAG */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 overflow-x-auto">
        <h3 className="text-sm font-extrabold mb-3 text-gray-900">Diagrama de dependencias</h3>
        <svg viewBox="0 0 900 500" className="w-full" style={{ minWidth: 700 }}>
          {/* Líneas de dependencias */}
          {data.dependencies.map((d, i) => {
            const parent = data.reviews.find(r => r.id === d.parent_id);
            const child = data.reviews.find(r => r.id === d.child_id);
            if (!parent || !child) return null;
            const px = (parent.sort_order ?? 0) * 80 + 50;
            const py = ((parent.sort_order ?? 0) % 3) * 140 + 80;
            const cx = (child.sort_order ?? 0) * 80 + 50;
            const cy = ((child.sort_order ?? 0) % 3) * 140 + 80;
            return (
              <line key={i} x1={px+50} y1={py+25} x2={cx} y2={cy+25}
                stroke={parent.status==='validada'?'#10B981':'#D1D5DB'}
                strokeWidth="1.5" strokeDasharray={parent.status==='validada'?'0':'4'} />
            );
          })}
          {/* Nodos */}
          {data.reviews.map((r) => {
            const x = (r.sort_order ?? 0) * 80 + 30;
            const y = ((r.sort_order ?? 0) % 3) * 140 + 60;
            const cfg = STATUS_CFG[r.status] || STATUS_CFG.programada;
            const fill = r.status==='validada'?'#10B981': r.status==='bloqueada'?'#9CA3AF':
                         r.status==='en_revision'?'#3B82F6': r.status==='rechazada'?'#EF4444':'#F59E0B';
            return (
              <g key={r.id} onClick={()=>setSelected(r)} className="cursor-pointer">
                <rect x={x} y={y} width={120} height={50} rx={8} fill={fill} opacity={0.9} stroke="#1F2937" strokeWidth="1" />
                <text x={x+60} y={y+22} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                  {ENTITY_LABELS[r.entity_type] ?? r.entity_type}
                </text>
                <text x={x+60} y={y+38} textAnchor="middle" fontSize="9" fill="#fff" opacity={0.9}>
                  {cfg.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Lista detallada */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">#</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Revisión</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Estado</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Reviewer</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Validator</th>
              <th className="text-left px-4 py-2 text-[11px] font-bold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.reviews.map(r => {
              const cfg = STATUS_CFG[r.status] || STATUS_CFG.programada;
              const Icon = cfg.icon;
              const canStart = r.status==='programada' || (r.status==='bloqueada' && !r.is_blocked);
              const _canValidate = r.status==='en_revision' && r.validator_name?.includes(user?.full_name?.split(' ')[0]||'');
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs font-bold text-gray-400">{r.sort_order}</td>
                  <td className="px-4 py-2">
                    <div className="font-semibold text-gray-900 text-xs">{ENTITY_LABELS[r.entity_type] ?? r.entity_type}</div>
                    <div className="text-[10px] text-gray-500">{r.template_description}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                      <Icon size={10}/>{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-700">{r.reviewer_name || '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-700">{r.validator_name || '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button onClick={()=>setSelected(r)} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-200">
                        <Eye size={11} className="inline"/> Ver
                      </button>
                      {canStart && (
                        <button onClick={()=>startMut.mutate(r.id)} disabled={startMut.isPending}
                          className="px-2 py-1 bg-dassa-celeste-deep text-white rounded text-[10px] font-bold hover:opacity-90 disabled:opacity-50">
                          <Play size={11} className="inline"/> Iniciar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">{ENTITY_LABELS[selected.entity_type] ?? selected.entity_type}</h3>
            <p className="text-xs text-gray-500 mb-4">{selected.template_description}</p>
            <div className="space-y-2 text-xs mb-4">
              <div><strong>Reviewer:</strong> {selected.reviewer_name||'—'}</div>
              <div><strong>Validator:</strong> {selected.validator_name||'—'}</div>
              <div><strong>Dependencias:</strong> {selected.depends_on_entity_types?.join(', ') || 'ninguna'}</div>
              <div><strong>Bloqueada:</strong> {selected.is_blocked? 'sí':'no'}</div>
            </div>
            {selected.status==='en_revision' && selected.validator_name?.includes(user?.full_name?.split(' ')[0]||'') && (
              <div className="border-t pt-4 mt-4">
                <p className="text-xs font-bold mb-2">Validar esta revisión:</p>
                <textarea id="notes" placeholder="Notas..." rows={3} className="input-field w-full text-xs mb-2"/>
                <div className="flex gap-2">
                  <button onClick={()=>validateMut.mutate({id:selected.id, approve:true, notes:(document.getElementById('notes') as HTMLTextAreaElement).value})}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold">✓ Aprobar</button>
                  <button onClick={()=>validateMut.mutate({id:selected.id, approve:false, notes:(document.getElementById('notes') as HTMLTextAreaElement).value})}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold">✗ Rechazar</button>
                </div>
              </div>
            )}
            <button onClick={()=>setSelected(null)} className="mt-4 text-xs text-gray-500">Cerrar</button>
          </div>
        </div>
      )}
    </PageContent>
  );
}
