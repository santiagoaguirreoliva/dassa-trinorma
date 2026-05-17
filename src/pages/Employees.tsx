import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Users, Search, UserCheck, UserX, Phone, Mail, MessageCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Employee {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  sector?: string;
  position?: string;
  is_active: boolean;
  evaluator_name?: string;
  created_at: string;
}

// ─── New / Edit Employee Modal ───────────────────────────────
function EmployeeModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!employee;
  const [form, setForm] = useState({
    full_name: employee?.full_name ?? '',
    position: employee?.position ?? '',
    sector: employee?.sector ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    whatsapp: employee?.whatsapp ?? '',
    is_active: employee?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/employees/${employee!.id}`, form)
      : api.post('/employees', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-gray-900">{isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label-field">Nombre completo <span className="text-red-500">*</span></label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Apellido y nombre" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Puesto</label>
              <input value={form.position} onChange={e => set('position', e.target.value)}
                placeholder="Ej: Operario de playa" className="input-field" />
            </div>
            <div>
              <label className="label-field">Sector</label>
              <input value={form.sector} onChange={e => set('sector', e.target.value)}
                placeholder="Ej: Depósito" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="email@dassa.com.ar" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+54 11 ..." className="input-field" inputMode="tel" />
            </div>
            <div>
              <label className="label-field">WhatsApp</label>
              <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                placeholder="+54 9 11 ..." className="input-field" inputMode="tel" />
            </div>
          </div>
          <div>
            <label className="label-field">Estado</label>
            <select value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}
              className="input-field">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.full_name.trim() || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-dassa-red-deep text-white font-bold text-sm rounded-lg hover:bg-dassa-red disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Employees() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>();
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const qc = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees', search, filterSector, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterSector) params.set('sector', filterSector);
      if (filterStatus) params.set('status', filterStatus);
      const qs = params.toString();
      return api.get(`/employees${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const activos = employees.filter(e => e.is_active).length;
  const inactivos = employees.filter(e => !e.is_active).length;
  const conWhatsapp = employees.filter(e => e.whatsapp && e.whatsapp.trim()).length;
  const sectores = [...new Set(employees.map(e => e.sector).filter(Boolean))] as string[];

  return (
    <>
      <Header
        title="RRHH — Empleados"
        subtitle="Lista del personal — contactos y dotación"
        actions={
          isAdmin && (
            <button onClick={() => { setEditing(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dassa-red-deep text-white rounded-lg text-xs font-bold hover:bg-dassa-red">
              <Plus size={14} /> Nuevo Empleado
            </button>
          )
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Dotación Total" value={employees.length} sub="Registros" icon={<Users size={16} />} />
              <KPICard label="Activos" value={activos} sub="En servicio" icon={<UserCheck size={16} />} />
              <KPICard label="Inactivos" value={inactivos} sub="Sin servicio" icon={<UserX size={16} />} />
              <KPICard label="Con WhatsApp" value={conWhatsapp} sub="Para comunicaciones"
                icon={<MessageCircle size={16} />}
                alert={employees.length > 0 && conWhatsapp < employees.length} alertColor="#f59e0b" />
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los sectores</option>
                {sectores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
              {(search || filterSector || filterStatus) && (
                <button onClick={() => { setSearch(''); setFilterSector(''); setFilterStatus(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{employees.length} empleados</span>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell">Nombre Completo</th>
                    <th className="th-cell hidden md:table-cell">Puesto</th>
                    <th className="th-cell hidden lg:table-cell">Sector</th>
                    <th className="th-cell hidden xl:table-cell">Contacto</th>
                    <th className="th-cell w-24">Estado</th>
                    {isAdmin && <th className="th-cell w-28">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={emp.full_name} size={28} />
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{emp.full_name}</p>
                            {emp.position && <p className="text-[10px] text-gray-400 md:hidden">{emp.position}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-[11px] text-gray-500">{emp.position || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-[11px] text-gray-500">{emp.sector || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {emp.email && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Mail size={9} />{emp.email}
                            </span>
                          )}
                          {emp.phone && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Phone size={9} />{emp.phone}
                            </span>
                          )}
                          {emp.whatsapp
                            ? <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                <MessageCircle size={9} />{emp.whatsapp}
                              </span>
                            : <span className="text-[10px] text-amber-500 flex items-center gap-1">
                                <MessageCircle size={9} />Sin WhatsApp
                              </span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold
                          ${emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {emp.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditing(emp); setShowModal(true); }}
                              className="text-[10px] font-bold text-dassa-red hover:text-dassa-red-deep px-2 py-1">
                              Editar
                            </button>
                            <button onClick={() => { if (window.confirm(`¿Eliminar a ${emp.full_name}?`)) deleteMut.mutate(emp.id); }}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin empleados registrados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {showModal && <EmployeeModal employee={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}
