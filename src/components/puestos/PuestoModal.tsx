// Modal admin para alta / edición de fichas de puesto.
// Tabs: General · Responsabilidades · Secundarias · Competencias · Capacitaciones · Empleados
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Loader2, ListChecks, Star, GraduationCap, Target, UserCheck,
  Plus, Trash2, Users, Briefcase,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Profile {
  id?: string; role_label: string; area: string; seniority: string;
  mission?: string; org_node_id?: string;
  responsibilities?: string[]; key_results?: string[];
  competencies?: string[]; training_required?: string[];
  employees?: { id: string; full_name: string; is_primary: boolean }[];
}
interface OrgNode { id: string; name: string; type: string; level: number; area: string; }
interface Employee { id: string; full_name: string; position?: string; sector?: string; is_active: boolean; }
interface Assignment {
  id: string; profile_id: string; role_label: string; is_primary: boolean;
  since?: string; until?: string;
}

const SENIORITY = [
  { v: 'triunvirato', l: 'Triunvirato' },
  { v: 'director',    l: 'Director' },
  { v: 'gerente',     l: 'Gerente' },
  { v: 'lider',       l: 'Líder / Supervisor' },
  { v: 'responsable', l: 'Responsable' },
  { v: 'semi',        l: 'Semi-senior' },
  { v: 'junior',      l: 'Junior' },
  { v: 'externo',     l: 'Externo' },
];

type Tab = 'general' | 'resps' | 'sec' | 'comp' | 'cap' | 'emp';
const TABS: { k: Tab; label: string; icon: any }[] = [
  { k: 'general', label: 'General',          icon: Briefcase },
  { k: 'resps',   label: 'Responsabilidades', icon: ListChecks },
  { k: 'sec',     label: 'Secundarias',       icon: Target },
  { k: 'comp',    label: 'Competencias',      icon: Star },
  { k: 'cap',     label: 'Capacitaciones',    icon: GraduationCap },
  { k: 'emp',     label: 'Empleados',         icon: Users },
];

export default function PuestoModal({ profile, nodes, onClose }: {
  profile?: Profile; nodes: OrgNode[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!profile?.id;
  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState({
    role_label:        profile?.role_label ?? '',
    area:              profile?.area ?? '',
    seniority:         profile?.seniority ?? '',
    mission:           profile?.mission ?? '',
    org_node_id:       profile?.org_node_id ?? '',
    responsibilities:  profile?.responsibilities ?? [],
    key_results:       profile?.key_results ?? [],
    competencies:      profile?.competencies ?? [],
    training_required: profile?.training_required ?? [],
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/orgchart/puestos/${profile!.id}`, form)
      : api.post<Profile>('/orgchart/puestos', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgchart'] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-[15px] font-extrabold text-gray-900">
              {isEdit ? `Editar ficha · ${profile!.role_label}` : 'Nueva ficha de puesto'}
            </h3>
            {isEdit && profile!.employees && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {profile!.employees.length} empleado{profile!.employees.length !== 1 ? 's' : ''} asignado{profile!.employees.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="border-b bg-gray-50 px-2 overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {TABS.map(t => {
              if (!isEdit && t.k === 'emp') return null;
              const Icon = t.icon;
              return (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border-b-2
                    ${tab === t.k
                      ? 'border-dassa-red text-dassa-red-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto" style={{ minHeight: 400, maxHeight: '70vh' }}>
          {tab === 'general' && (
            <>
              <div>
                <label className="label-field">Nombre del puesto <span className="text-red-500">*</span></label>
                <input value={form.role_label} onChange={e => set('role_label', e.target.value)}
                  placeholder="Ej: Apuntador — Controlador EXPO" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Área</label>
                  <input value={form.area} onChange={e => set('area', e.target.value)}
                    placeholder="Ej: Depósito" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Nivel</label>
                  <select value={form.seniority} onChange={e => set('seniority', e.target.value)}
                    className="input-field">
                    <option value="">— Sin definir —</option>
                    {SENIORITY.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">Nodo del organigrama</label>
                <select value={form.org_node_id} onChange={e => set('org_node_id', e.target.value)}
                  className="input-field">
                  <option value="">— Sin asignar —</option>
                  {nodes.map(n =>
                    <option key={n.id} value={n.id}>
                      {'—'.repeat(n.level)} {n.name} {n.area && `(${n.area})`}
                    </option>
                  )}
                </select>
              </div>
              <div>
                <label className="label-field">Misión</label>
                <textarea value={form.mission} onChange={e => set('mission', e.target.value)}
                  rows={4} placeholder="Qué hace este puesto y para qué existe..." className="input-field" />
              </div>
            </>
          )}

          {tab === 'resps' && <ArrayEditor
            label="Responsabilidades principales"
            items={form.responsibilities} onChange={v => set('responsibilities', v)}
            placeholder="Ej: Coordinar las cargas y descargas..."
            numbered
          />}
          {tab === 'sec' && <ArrayEditor
            label="Responsabilidades secundarias"
            items={form.key_results} onChange={v => set('key_results', v)}
            placeholder="Ej: Resolver desvíos operativos..."
          />}
          {tab === 'comp' && <ArrayEditor
            label="Competencias y herramientas"
            items={form.competencies} onChange={v => set('competencies', v)}
            placeholder="Ej: Depofis básico, inglés técnico..."
          />}
          {tab === 'cap' && <ArrayEditor
            label="Capacitaciones requeridas"
            items={form.training_required} onChange={v => set('training_required', v)}
            placeholder="Ej: Curso de autoelevadorista vigente..."
          />}

          {tab === 'emp' && isEdit && profile?.id && (
            <EmpleadosTab profileId={profile.id} />
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        {['general','resps','sec','comp','cap'].includes(tab) && (
          <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={() => !mut.isPending && mut.mutate()}
              disabled={!form.role_label.trim() || mut.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
              {mut.isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Ficha'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editor genérico de arrays de string ──────────────────────────
function ArrayEditor({ label, items, onChange, placeholder, numbered }: {
  label: string; items: string[]; onChange: (v: string[]) => void;
  placeholder: string; numbered?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label-field">{label} <span className="text-gray-400 font-normal">({items.length})</span></label>
        <button onClick={() => onChange([...items, ''])}
          className="text-[11px] font-bold text-dassa-celeste-deep hover:underline flex items-center gap-1">
          <Plus size={11} /> Agregar
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">Sin entradas. Hacé click en "Agregar".</p>
      )}
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-start gap-2">
            {numbered && (
              <span className="mt-2 text-[10px] font-bold text-gray-400 w-6 text-center">
                {String(idx + 1).padStart(2, '0')}
              </span>
            )}
            <textarea
              value={it}
              onChange={e => {
                const nx = [...items]; nx[idx] = e.target.value;
                onChange(nx);
              }}
              rows={2} placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
            />
            <button onClick={() => {
              const nx = [...items]; nx.splice(idx, 1); onChange(nx);
            }}
              className="mt-1.5 p-1.5 rounded-lg text-red-500 hover:bg-red-50">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-tab: empleados asignados al puesto ───────────────────────
function EmpleadosTab({ profileId }: { profileId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ employee_id: '', is_primary: false, since: '', notes: '' });
  const [err, setErr] = useState('');

  // Cargo lista completa de empleados activos
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', { status: 'activo' }],
    queryFn: () => api.get<Employee[]>('/employees?status=activo'),
    staleTime: 60_000,
  });

  // Asignaciones actuales del puesto (las recupero de profile/:id detail)
  const { data: detail, isLoading } = useQuery<{ ok: boolean; profile: any }>({
    queryKey: ['puesto', profileId, 'detail'],
    queryFn: () => api.get(`/orgchart/puesto/${profileId}`),
  });
  const asignaciones = (detail?.profile?.employees || []) as { id: string; full_name: string; is_primary: boolean; since?: string }[];

  const addMut = useMutation({
    mutationFn: () => api.post(`/orgchart/puestos/${profileId}/empleados`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['puesto', profileId, 'detail'] });
      qc.invalidateQueries({ queryKey: ['orgchart'] });
      setForm({ employee_id: '', is_primary: false, since: '', notes: '' });
      setAdding(false);
      setErr('');
    },
    onError: (e: any) => setErr(e.message),
  });
  const delMut = useMutation({
    mutationFn: (assignId: string) => api.delete(`/orgchart/puestos/${profileId}/empleados/${assignId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['puesto', profileId, 'detail'] });
      qc.invalidateQueries({ queryKey: ['orgchart'] });
    },
  });

  if (isLoading) return <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div>;

  return (
    <div className="space-y-2">
      {asignaciones.length === 0 && !adding && (
        <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">Sin empleados asignados.</p>
      )}
      {asignaciones.map(a => (
        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <UserCheck size={16} className={a.is_primary ? 'text-dassa-red' : 'text-gray-400'} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900">{a.full_name}</div>
            <div className="text-[11px] text-gray-500">
              {a.is_primary ? 'Titular' : 'Cobertura'}
              {a.since && ` · desde ${a.since.slice(0,10)}`}
            </div>
          </div>
          <button onClick={() => {
            // Necesitamos id de la asignación. El endpoint devuelve los IDs en /puesto/:id; usamos a.id como employee_id.
            // Para borrar usamos /:id/empleados/:assignId que requiere el id de job_profile_employees.
            // Conseguimos ese id de la query de detail (necesitaríamos JPE.id en lugar de employee_id).
            // Como aproximación: buscamos el JPE via API rápida.
            api.get<any[]>(`/employees/${a.id}/positions`).then(positions => {
              const jpe = positions.find(p => p.profile_id === profileId);
              if (jpe) delMut.mutate(jpe.id);
            });
          }}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Quitar">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
            className="input-field">
            <option value="">— Seleccionar empleado —</option>
            {employees
              .filter(e => !asignaciones.some(a => a.id === e.id))
              .map(e => (
                <option key={e.id} value={e.id}>{e.full_name}{e.position ? ` · ${e.position}` : ''}</option>
              ))}
          </select>
          <input type="date" value={form.since} onChange={e => setForm({ ...form, since: e.target.value })}
            className="input-field" placeholder="Desde" />
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} />
            Titular (titular del puesto)
          </label>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setErr(''); }}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancelar</button>
            <button onClick={() => form.employee_id && addMut.mutate()} disabled={!form.employee_id}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">Asignar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:border-blue-300 flex items-center justify-center gap-1">
          <Plus size={14} /> Asignar empleado
        </button>
      )}
    </div>
  );
}
