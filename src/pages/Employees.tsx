import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Users, Search, UserCheck,
  UserX, Briefcase, Phone, Mail
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Avatar } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
interface Employee {
  id: string; employee_number: string;
  first_name: string; last_name: string;
  position?: string; department?: string;
  hire_date?: string; status: string;
  email?: string; phone?: string;
  created_at: string;
}

// ─── Constantes ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  activo:    { label: 'Activo',     bg: 'bg-emerald-100', color: 'text-emerald-700' },
  licencia:  { label: 'Licencia',   bg: 'bg-amber-100',   color: 'text-amber-700' },
  inactivo:  { label: 'Inactivo',   bg: 'bg-gray-100',   color: 'text-gray-500' },
  baja:      { label: 'Baja',       bg: 'bg-red-100',     color: 'text-red-700' },
};

const DEPARTMENTS = [
  'Dirección', 'Administración', 'Operaciones', 'Depósito Fiscal',
  'Comercio Exterior', 'Calidad', 'Seguridad e Higiene', 'Sistemas', 'RRHH'
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── New / Edit Employee Modal ───────────────────────────────
function EmployeeModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!employee;
  const [form, setForm] = useState({
    employee_number: employee?.employee_number ?? '',
    first_name: employee?.first_name ?? '',
    last_name: employee?.last_name ?? '',
    position: employee?.position ?? '',
    department: employee?.department ?? '',
    hire_date: employee?.hire_date?.substring(0, 10) ?? '',
    status: employee?.status ?? 'activo',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        hire_date: form.hire_date || null,
      };
      return isEdit
        ? api.patch(`/employees/${employee!.id}`, payload)
        : api.post('/employees', payload);
    },
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Legajo <span className="text-red-500">*</span></label>
              <input value={form.employee_number} onChange={e => set('employee_number', e.target.value)}
                placeholder="Ej: EMP-001" className="input-field" disabled={isEdit} />
            </div>
            <div>
              <label className="label-field">Nombre <span className="text-red-500">*</span></label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                placeholder="Nombre" className="input-field" />
            </div>
            <div>
              <label className="label-field">Apellido <span className="text-red-500">*</span></label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                placeholder="Apellido" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Puesto</label>
              <input value={form.position} onChange={e => set('position', e.target.value)}
                placeholder="Ej: Operario de playa" className="input-field" />
            </div>
            <div>
              <label className="label-field">Departamento</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} className="input-field">
                <option value="">Seleccionar...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@empresa.com" className="input-field" />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+54 11 ..." className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Fecha de Ingreso</label>
              <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => !mutation.isPending && mutation.mutate()}
            disabled={!form.employee_number || !form.first_name || !form.last_name || mutation.isPending}
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
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const qc = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees', search, filterDept, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterDept) params.set('department', filterDept);
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

  const activos = employees.filter(e => e.status === 'activo').length;
  const licencia = employees.filter(e => e.status === 'licencia').length;
  const bajas = employees.filter(e => e.status === 'baja').length;

  return (
    <>
      <Header
        title="RRHH — Empleados"
        subtitle="Legajos del personal — Control de dotación"
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
            <div className="grid grid-cols-4 gap-3">
              <KPICard label="Dotación Total" value={employees.length} sub="Registros totales" icon={<Users size={16} />} />
              <KPICard label="Activos" value={activos} sub="En servicio" icon={<UserCheck size={16} />} />
              <KPICard label="En Licencia" value={licencia} sub="Temporalmente ausentes" alert={licencia > 0} alertColor="#f59e0b" icon={<Briefcase size={16} />} />
              <KPICard label="Bajas" value={bajas} sub="Desvinculados" icon={<UserX size={16} />} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o legajo..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los departamentos</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(search || filterDept || filterStatus) && (
                <button onClick={() => { setSearch(''); setFilterDept(''); setFilterStatus(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <X size={12} /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">{employees.length} empleados</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th-cell w-24">Legajo</th>
                    <th className="th-cell">Nombre Completo</th>
                    <th className="th-cell hidden md:table-cell">Puesto</th>
                    <th className="th-cell hidden lg:table-cell">Departamento</th>
                    <th className="th-cell hidden lg:table-cell w-24">Ingreso</th>
                    <th className="th-cell hidden xl:table-cell">Contacto</th>
                    <th className="th-cell w-24">Estado</th>
                    {isAdmin && <th className="th-cell w-28">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const sc = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG.activo;
                    return (
                      <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-[10px] font-extrabold text-dassa-red-deep">{emp.employee_number}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={`${emp.first_name} ${emp.last_name}`} size={28} />
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{emp.first_name} {emp.last_name}</p>
                              {emp.position && <p className="text-[10px] text-gray-400">{emp.position}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-gray-500">{emp.position || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[10px] text-gray-500">{emp.department || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[10px] text-gray-400">{fmtDate(emp.hire_date)}</span>
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
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditing(emp); setShowModal(true); }}
                                className="text-[10px] font-bold text-dassa-red hover:text-blue-800 px-2 py-1">
                                Editar
                              </button>
                              <button onClick={() => { if (confirm('¿Eliminar empleado?')) deleteMut.mutate(emp.id); }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1">
                                Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
