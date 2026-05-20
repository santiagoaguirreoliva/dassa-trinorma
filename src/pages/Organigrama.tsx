// /organigrama — modelo F-TRI-34 v2024:
// - Triunvirato horizontal arriba (3 cards lado a lado).
// - Bajo cada uno, su rama con áreas / sectores / puestos / empleados.
// - Colapsable. Click en un puesto va a /puestos/:id.
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, ChevronRight, ChevronDown, Crown, ExternalLink as ExtIcon, UserCircle2,
  Plus, Edit3, Trash2, Settings, X, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Node {
  id: string; name: string; parent_id: string | null;
  type: string; level: number; area: string;
  description: string | null; color: string | null; sort_order: number;
}
interface ProfileEmployee { id: string; full_name: string; position: string | null; is_primary: boolean; notes: string | null; }
interface Profile {
  id: string; role_label: string; area: string; seniority: string | null;
  mission: string | null; org_node_id: string | null;
  employees: ProfileEmployee[];
}
interface External {
  id: string; full_name: string; role: string | null; organization: string | null;
  email: string | null; org_node_id: string | null; supervisor_name: string | null;
}
interface OrgData { ok: boolean; nodes: Node[]; profiles: Profile[]; externals: External[]; }

export default function Organigrama() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<OrgData>({
    queryKey: ['orgchart'],
    queryFn: () => api.get<OrgData>('/orgchart'),
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [nodeModal, setNodeModal] = useState<{ open: boolean; editing?: Node; defaultParent?: string | null }>({ open: false });
  const toggle = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  const delNodeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/orgchart/nodes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orgchart'] }),
    onError: (e: any) => alert(e.message),
  });

  const { childrenByParent, profilesByNode, externalsByNode, triunvirato, root } = useMemo(() => {
    const c: Record<string, Node[]> = {};
    const p: Record<string, Profile[]> = {};
    const e: Record<string, External[]> = {};
    if (data) {
      for (const n of data.nodes) {
        if (n.parent_id) (c[n.parent_id] = c[n.parent_id] || []).push(n);
      }
      for (const pr of data.profiles) {
        if (pr.org_node_id) (p[pr.org_node_id] = p[pr.org_node_id] || []).push(pr);
      }
      for (const ex of data.externals || []) {
        if (ex.org_node_id) (e[ex.org_node_id] = e[ex.org_node_id] || []).push(ex);
      }
    }
    const r = data?.nodes.find(n => !n.parent_id) || null;
    const tri = r ? (c[r.id] || []) : [];
    return { childrenByParent: c, profilesByNode: p, externalsByNode: e, triunvirato: tri, root: r };
  }, [data]);

  if (isLoading || !data || !root) return <PageContent><Spinner /></PageContent>;

  return (
    <PageContent>
      <Header
        title="🏛️ Organigrama DASSA"
        subtitle={`${data.profiles.length} puestos · ${data.profiles.reduce((a,p)=>a+p.employees.length,0)} empleados · ${data.externals?.length || 0} externos`}
        icon={<Users size={20} />}
      />

      {isAdmin && (
        <div className="mb-4 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Settings size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-700">Modo edición</span>
          <button onClick={() => setEditMode(v => !v)}
            className={`ml-2 px-3 py-1 rounded-full text-[11px] font-bold transition-colors
              ${editMode ? 'bg-dassa-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {editMode ? 'ON · click ítems para editar' : 'OFF'}
          </button>
          {editMode && (
            <button onClick={() => setNodeModal({ open: true })}
              className="ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white flex items-center gap-1">
              <Plus size={11} /> Nuevo nodo
            </button>
          )}
        </div>
      )}

      {/* Triunvirato — 3 cards horizontales */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Crown size={14} className="text-dassa-red" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-dassa-red-deep">{root.name}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {triunvirato.map(t => {
            const titular = (profilesByNode[t.id] || [])[0]?.employees[0];
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className="bg-gradient-to-br from-dassa-red-deep to-dassa-red text-white rounded-2xl p-4 shadow-lg text-left hover:scale-[1.01] transition-transform"
              >
                <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{t.area}</div>
                <div className="text-base font-extrabold leading-tight">{t.name}</div>
                {titular && (
                  <div className="text-xs opacity-90 mt-1">{titular.full_name}</div>
                )}
                {t.description && (
                  <div className="text-[10px] opacity-70 mt-2 italic line-clamp-2">{t.description}</div>
                )}
                <div className="mt-3 flex items-center gap-1 text-[10px] font-bold opacity-90">
                  {collapsed[t.id] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {collapsed[t.id] ? 'Expandir rama' : 'Ocultar rama'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ramas de cada miembro del triunvirato */}
      {triunvirato.map(t => {
        if (collapsed[t.id]) return null;
        const branchChildren = childrenByParent[t.id] || [];
        if (!branchChildren.length && !editMode) return null;
        return (
          <div key={`branch-${t.id}`} className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-2 flex items-center gap-2">
              Rama: {t.name}
              {editMode && (
                <button onClick={() => setNodeModal({ open: true, defaultParent: t.id })}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={10} /> agregar hijo
                </button>
              )}
            </h3>
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1">
              {branchChildren.map(c => (
                <BranchNode
                  key={c.id} node={c} depth={0}
                  childrenByParent={childrenByParent}
                  profilesByNode={profilesByNode}
                  externalsByNode={externalsByNode}
                  collapsed={collapsed}
                  toggle={toggle}
                  editMode={editMode}
                  onEdit={(n) => setNodeModal({ open: true, editing: n })}
                  onDelete={(n) => {
                    if (confirm(`Eliminar el nodo "${n.name}"?`)) delNodeMut.mutate(n.id);
                  }}
                  onAddChild={(parentId) => setNodeModal({ open: true, defaultParent: parentId })}
                />
              ))}
            </div>
          </div>
        );
      })}

      {nodeModal.open && (
        <NodeModal
          editing={nodeModal.editing}
          defaultParent={nodeModal.defaultParent}
          allNodes={data.nodes}
          onClose={() => setNodeModal({ open: false })}
        />
      )}
    </PageContent>
  );
}

function BranchNode({
  node, depth, childrenByParent, profilesByNode, externalsByNode, collapsed, toggle,
  editMode, onEdit, onDelete, onAddChild,
}: {
  node: Node; depth: number;
  childrenByParent: Record<string, Node[]>;
  profilesByNode: Record<string, Profile[]>;
  externalsByNode: Record<string, External[]>;
  collapsed: Record<string, boolean>;
  toggle: (id: string) => void;
  editMode?: boolean;
  onEdit?: (n: Node) => void;
  onDelete?: (n: Node) => void;
  onAddChild?: (parentId: string) => void;
}) {
  const subNodes = childrenByParent[node.id] || [];
  const profiles = profilesByNode[node.id] || [];
  const externals = externalsByNode[node.id] || [];
  const expanded = !collapsed[node.id];
  const hasChildren = subNodes.length + profiles.length + externals.length > 0;

  const typeStyle: Record<string, string> = {
    area:    'bg-blue-50 border-blue-200 text-blue-900',
    sector:  'bg-indigo-50 border-indigo-200 text-indigo-900',
    externo: 'bg-gray-100 border-gray-300 text-gray-700',
    equipo:  'bg-amber-50 border-amber-200 text-amber-900',
  };
  const style = typeStyle[node.type] || 'bg-white border-gray-200 text-gray-900';

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => hasChildren && toggle(node.id)}
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-left ${style} ${hasChildren ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'}`}
        >
          {hasChildren
            ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
            : <span className="w-3 inline-block" />}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">{node.name}</div>
            {node.description && <div className="text-[10px] opacity-70 italic">{node.description}</div>}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">{node.type}</span>
        </button>
        {editMode && (
          <>
            <button onClick={() => onAddChild?.(node.id)} title="Agregar hijo"
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Plus size={12} /></button>
            <button onClick={() => onEdit?.(node)} title="Editar"
              className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Edit3 size={12} /></button>
            <button onClick={() => onDelete?.(node)} title="Eliminar"
              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 size={12} /></button>
          </>
        )}
      </div>

      {expanded && (
        <div className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3">
          {profiles.map(p => (
            <Link key={p.id} to={`/puestos/${p.id}`}
                  className="block bg-white border border-gray-100 rounded-lg px-3 py-2 hover:border-dassa-celeste hover:bg-dassa-celeste/5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900">{p.role_label}</div>
                  <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                    {p.seniority && <span className="px-1.5 py-0.5 rounded bg-gray-100 font-bold">{p.seniority}</span>}
                    {p.employees.length > 0 ? (
                      <span>{p.employees.length} empleado{p.employees.length !== 1 && 's'}</span>
                    ) : (
                      <span className="text-amber-700">vacante</span>
                    )}
                  </div>
                  {p.employees.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.employees.map(e => (
                        <span key={e.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1
                            ${e.is_primary ? 'bg-dassa-red/10 text-dassa-red-deep font-bold' : 'bg-gray-100 text-gray-700'}`}>
                          <UserCircle2 size={9} /> {e.full_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight size={12} className="text-gray-400 mt-1 flex-shrink-0" />
              </div>
            </Link>
          ))}

          {externals.map(ex => (
            <div key={ex.id}
              className="bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <ExtIcon size={12} className="text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-800">{ex.full_name}</div>
                  <div className="text-[10px] text-gray-500">
                    {ex.role || '—'}
                    {ex.organization && ` · ${ex.organization}`}
                    {ex.supervisor_name && ` · sup: ${ex.supervisor_name}`}
                  </div>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Externo</span>
              </div>
            </div>
          ))}

          {subNodes.map(sn => (
            <BranchNode
              key={sn.id} node={sn} depth={depth + 1}
              childrenByParent={childrenByParent}
              profilesByNode={profilesByNode}
              externalsByNode={externalsByNode}
              collapsed={collapsed}
              toggle={toggle}
              editMode={editMode}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal admin de nodo (crear / editar) ────────────────────────
function NodeModal({ editing, defaultParent, allNodes, onClose }: {
  editing?: Node;
  defaultParent?: string | null;
  allNodes: Node[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!editing;
  const [form, setForm] = useState({
    name:        editing?.name ?? '',
    type:        editing?.type ?? 'area',
    parent_id:   editing?.parent_id ?? defaultParent ?? '',
    area:        editing?.area ?? '',
    description: editing?.description ?? '',
    color:       editing?.color ?? '',
    sort_order:  editing?.sort_order ?? 10,
    level:       editing?.level ?? 1,
  });
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/orgchart/nodes/${editing!.id}`, form)
      : api.post('/orgchart/nodes', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgchart'] }); onClose(); },
    onError: (e: any) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">
            {isEdit ? `Editar nodo · ${editing!.name}` : 'Nuevo nodo del organigrama'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label-field">Nombre <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: Depósito" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo <span className="text-red-500">*</span></label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                <option value="root">Root (raíz)</option>
                <option value="triunvirato">Triunvirato</option>
                <option value="direccion">Dirección</option>
                <option value="area">Área</option>
                <option value="sector">Sector</option>
                <option value="puesto">Puesto</option>
                <option value="equipo">Equipo</option>
                <option value="externo">Externo</option>
              </select>
            </div>
            <div>
              <label className="label-field">Nivel</label>
              <input type="number" value={form.level} onChange={e => set('level', +e.target.value)}
                min={0} max={6} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Padre</label>
            <select value={form.parent_id || ''} onChange={e => set('parent_id', e.target.value)} className="input-field">
              <option value="">— Sin padre (raíz) —</option>
              {allNodes.filter(n => n.id !== editing?.id).map(n =>
                <option key={n.id} value={n.id}>
                  {'—'.repeat(n.level)} {n.name} ({n.type})
                </option>
              )}
            </select>
            <p className="text-[10px] text-gray-400 mt-0.5">Cambiar el padre = mover el nodo.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Área (texto)</label>
              <input value={form.area} onChange={e => set('area', e.target.value)}
                placeholder="Ej: Depósito" className="input-field" />
            </div>
            <div>
              <label className="label-field">Orden</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className="input-field" />
          </div>
          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mut.isPending && mut.mutate()}
            disabled={!form.name.trim() || !form.type || mut.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mut.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar' : 'Crear nodo'}
          </button>
        </div>
      </div>
    </div>
  );
}
