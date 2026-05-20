// /puestos — Lista de fichas de puesto con CRUD admin.
// Admins ven los botones "Nueva ficha", "Editar" y "Eliminar".
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit3, Trash2, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PuestoModal from '@/components/puestos/PuestoModal';

interface Profile {
  id: string; role_label: string; area: string; seniority: string;
  mission?: string; org_node_id?: string;
  responsibilities?: string[]; key_results?: string[];
  competencies?: string[]; training_required?: string[];
  employees: { id: string; full_name: string; is_primary: boolean }[];
}
interface OrgNode { id: string; name: string; type: string; level: number; area: string; }

export default function Puestos() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing?: Profile }>({ open: false });

  const { data, isLoading } = useQuery<{ ok: boolean; profiles: Profile[]; nodes: OrgNode[] }>({
    queryKey: ['orgchart'],
    queryFn: () => api.get('/orgchart'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/orgchart/puestos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orgchart'] }),
  });

  if (isLoading || !data) return <PageContent><Spinner /></PageContent>;

  const filtered = data.profiles.filter(p =>
    !q || p.role_label.toLowerCase().includes(q.toLowerCase()) ||
    p.area.toLowerCase().includes(q.toLowerCase()) ||
    (p.mission || '').toLowerCase().includes(q.toLowerCase())
  );

  const byArea: Record<string, Profile[]> = {};
  filtered.forEach(p => { (byArea[p.area] = byArea[p.area] || []).push(p); });

  return (
    <PageContent>
      <Header
        title="💼 Puestos · Fichas"
        subtitle={`${data.profiles.length} puestos activos`}
        icon={<Briefcase size={20} />}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <Search size={14} className="text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre, área o misión..."
            className="flex-1 text-xs focus:outline-none" />
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ open: true })}
            className="px-4 py-2 rounded-xl bg-dassa-red-deep text-white text-xs font-bold flex items-center gap-1.5 hover:bg-dassa-red"
          >
            <Plus size={14} /> Nueva ficha
          </button>
        )}
      </div>

      {Object.entries(byArea).map(([area, profiles]) => (
        <div key={area} className="mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            {area} <span className="text-gray-400 font-normal">· {profiles.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profiles.map(p => (
              <div key={p.id}
                   className="bg-white border border-gray-200 rounded-xl p-4 hover:border-dassa-celeste hover:shadow-md transition-all flex flex-col">
                <Link to={`/puestos/${p.id}`} className="flex-1">
                  <h4 className="font-bold text-sm text-gray-900 mb-1">{p.role_label}</h4>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded font-bold uppercase tracking-wider">{p.seniority || '—'}</span>
                    <span className="text-[10px] text-gray-400">{p.employees.length} empleado{p.employees.length !== 1 ? 's' : ''}</span>
                  </div>
                  {p.mission && <p className="text-[11px] text-gray-600 line-clamp-3">{p.mission}</p>}
                  {p.employees.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                      {p.employees.slice(0, 3).map(e => (
                        <span key={e.id}
                          className={`text-[10px] px-2 py-0.5 rounded-full
                            ${e.is_primary ? 'bg-dassa-red/10 text-dassa-red-deep font-bold' : 'bg-gray-100 text-gray-700'}`}>
                          {e.full_name}
                        </span>
                      ))}
                      {p.employees.length > 3 && (
                        <span className="text-[10px] text-gray-400 self-center">+{p.employees.length - 3}</span>
                      )}
                    </div>
                  )}
                  {p.employees.length === 0 && (
                    <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded">⚠ Vacante</p>
                  )}
                </Link>
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-1.5">
                    <button onClick={() => setModal({ open: true, editing: p })}
                      className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-1">
                      <Edit3 size={11} /> Editar
                    </button>
                    <button onClick={() => {
                      if (confirm(`Eliminar la ficha "${p.role_label}"?\nLos empleados quedan sin asignación a este puesto.`))
                        delMut.mutate(p.id);
                    }}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center">
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {modal.open && (
        <PuestoModal
          profile={modal.editing}
          nodes={data.nodes}
          onClose={() => { setModal({ open: false }); qc.invalidateQueries({ queryKey: ['orgchart'] }); }}
        />
      )}
    </PageContent>
  );
}
