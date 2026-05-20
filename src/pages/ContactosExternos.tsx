// /contactos-externos — CRUD de proveedores / consultores que figuran
// en el organigrama pero NO son empleados (ej. Nixa, Toti).
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Mail, Phone, Trash2, Edit3, ExternalLink as ExtIcon,
  Building2, MapPin, MessageCircle, UserCheck, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

interface External {
  id: string; full_name: string; role: string | null; organization: string | null;
  email: string | null; phone: string | null; whatsapp: string | null;
  address: string | null;
  org_node_id: string | null; org_node_name: string | null;
  supervisor_in_dassa_id: string | null; supervisor_name: string | null;
  notes: string | null; is_active: boolean;
}
interface Node { id: string; name: string; type: string; level: number; area: string; }
interface Employee { id: string; full_name: string; position?: string; }

export default function ContactosExternos() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing?: External }>({ open: false });

  const { data: externals = [], isLoading } = useQuery<External[]>({
    queryKey: ['external-contacts'],
    queryFn: () => api.get<External[]>('/orgchart/externals'),
  });
  const { data: org } = useQuery<{ nodes: Node[] }>({
    queryKey: ['orgchart'],
    queryFn: () => api.get('/orgchart'),
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', { status: 'activo' }],
    queryFn: () => api.get<Employee[]>('/employees?status=activo'),
    staleTime: 60_000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/orgchart/externals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-contacts'] }),
  });

  if (isLoading) return <PageContent><Spinner /></PageContent>;

  const filtered = externals.filter(e =>
    !q || e.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(q.toLowerCase()) ||
    (e.organization || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <PageContent>
      <Header
        title="🤝 Contactos externos"
        subtitle={`${externals.length} colaboradores externos · proveedores estratégicos`}
        icon={<ExtIcon size={20} />}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <Search size={14} className="text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre, rol u organización..."
            className="flex-1 text-xs focus:outline-none" />
        </div>
        {isAdmin && (
          <button onClick={() => setModal({ open: true })}
            className="px-4 py-2 rounded-xl bg-dassa-red-deep text-white text-xs font-bold flex items-center gap-1.5 hover:bg-dassa-red">
            <Plus size={14} /> Nuevo contacto
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <ExtIcon size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Sin contactos externos cargados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-extrabold flex-shrink-0">
                  {c.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">{c.full_name}</div>
                  <div className="text-[11px] text-gray-500">{c.role || '—'}</div>
                  {c.organization && (
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Building2 size={9} /> {c.organization}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Externo</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1 text-[11px] text-gray-700">
                {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-dassa-celeste-deep"><Mail size={11} /> {c.email}</a>}
                {c.phone && <div className="flex items-center gap-1.5"><Phone size={11} className="text-gray-400" /> {c.phone}</div>}
                {c.whatsapp && <div className="flex items-center gap-1.5"><MessageCircle size={11} className="text-gray-400" /> {c.whatsapp}</div>}
                {c.address && <div className="flex items-center gap-1.5"><MapPin size={11} className="text-gray-400" /> {c.address}</div>}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-[10px] text-gray-500">
                {c.supervisor_name && (
                  <span className="flex items-center gap-1"><UserCheck size={10} /> Supervisor: <strong className="text-gray-800">{c.supervisor_name}</strong></span>
                )}
                {c.org_node_name && (
                  <span className="ml-auto px-1.5 py-0.5 bg-gray-100 rounded">{c.org_node_name}</span>
                )}
              </div>

              {c.notes && (
                <p className="mt-2 text-[10px] text-gray-500 italic bg-gray-50 px-2 py-1 rounded">{c.notes}</p>
              )}

              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-1.5">
                  <button onClick={() => setModal({ open: true, editing: c })}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-1">
                    <Edit3 size={11} /> Editar
                  </button>
                  <button onClick={() => {
                    if (confirm(`Eliminar el contacto "${c.full_name}"?`)) delMut.mutate(c.id);
                  }}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <ExternalModal
          contact={modal.editing}
          nodes={org?.nodes || []}
          employees={employees}
          onClose={() => setModal({ open: false })}
        />
      )}
    </PageContent>
  );
}

function ExternalModal({ contact, nodes, employees, onClose }: {
  contact?: External; nodes: Node[]; employees: Employee[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!contact;
  const [form, setForm] = useState({
    full_name:              contact?.full_name ?? '',
    role:                   contact?.role ?? '',
    organization:           contact?.organization ?? '',
    email:                  contact?.email ?? '',
    phone:                  contact?.phone ?? '',
    whatsapp:               contact?.whatsapp ?? '',
    address:                contact?.address ?? '',
    org_node_id:            contact?.org_node_id ?? '',
    supervisor_in_dassa_id: contact?.supervisor_in_dassa_id ?? '',
    notes:                  contact?.notes ?? '',
  });
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/orgchart/externals/${contact!.id}`, form)
      : api.post('/orgchart/externals', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contacts'] }); onClose(); },
    onError: (e: any) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">
            {isEdit ? `Editar · ${contact!.full_name}` : 'Nuevo contacto externo'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label-field">Nombre completo <span className="text-red-500">*</span></label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Ej: Juan Pérez" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Rol</label>
              <input value={form.role} onChange={e => set('role', e.target.value)}
                placeholder="Ej: Consultora SGI" className="input-field" />
            </div>
            <div>
              <label className="label-field">Organización</label>
              <input value={form.organization} onChange={e => set('organization', e.target.value)}
                placeholder="Ej: Méndez Consultoría" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="email@..." className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+54 11..." className="input-field" inputMode="tel" />
            </div>
            <div>
              <label className="label-field">WhatsApp</label>
              <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                placeholder="+54 9 11..." className="input-field" inputMode="tel" />
            </div>
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nodo en el organigrama</label>
              <select value={form.org_node_id} onChange={e => set('org_node_id', e.target.value)}
                className="input-field">
                <option value="">— Sin asignar —</option>
                {nodes.map(n =>
                  <option key={n.id} value={n.id}>{'—'.repeat(n.level)} {n.name}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label-field">Supervisor en DASSA</label>
              <select value={form.supervisor_in_dassa_id} onChange={e => set('supervisor_in_dassa_id', e.target.value)}
                className="input-field">
                <option value="">— Sin supervisor —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} className="input-field" />
          </div>
          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mut.isPending && mut.mutate()}
            disabled={!form.full_name.trim() || mut.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mut.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar' : 'Crear contacto'}
          </button>
        </div>
      </div>
    </div>
  );
}
