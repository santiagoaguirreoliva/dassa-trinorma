import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Dialog } from '../components/ui/Dialog';
import { api } from '../lib/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface Employee {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  status: string;
  email: string;
}

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    employee_number: '',
    first_name: '',
    last_name: '',
    position: '',
    department: '',
    status: 'activo',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadEmployees();
  }, [search, filterDept]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterDept) params.department = filterDept;

      const data = await api.getEmployees(params);
      setEmployees(data);
    } catch (error) {
      console.error('Error al cargar empleados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateEmployee(editingId, formData);
      } else {
        await api.createEmployee(formData);
      }
      setShowDialog(false);
      setFormData({
        employee_number: '',
        first_name: '',
        last_name: '',
        position: '',
        department: '',
        status: 'activo',
        email: '',
        phone: '',
      });
      setEditingId(null);
      loadEmployees();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Desconocido'));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Confirmar eliminación?')) {
      try {
        await api.deleteEmployee(id);
        loadEmployees();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const departments = [
    'Operaciones',
    'Administración',
    'RRHH',
    'Gerencia',
    'Ventas',
  ];

  return (
    <Layout title="Empleados">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <div className="flex gap-4 items-end">
            <Input
              label="Buscar"
              placeholder="Por nombre, apellido o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={() => { setShowDialog(true); setEditingId(null); setFormData({ employee_number: '', first_name: '', last_name: '', position: '', department: '', status: 'activo', email: '', phone: '' }); }}>
              <Plus size={18} /> Nuevo Empleado
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-gray-600">Total de Empleados</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {employees.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Empleados Activos</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {employees.filter(e => e.status === 'activo').length}
            </p>
          </Card>
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <p>Cargando...</p>
          ) : employees.length === 0 ? (
            <p className="text-gray-600">No hay empleados registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Número</TableHeaderCell>
                    <TableHeaderCell>Nombre</TableHeaderCell>
                    <TableHeaderCell>Puesto</TableHeaderCell>
                    <TableHeaderCell>Departamento</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>Acciones</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">{emp.employee_number}</TableCell>
                      <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell className="text-sm">{emp.email}</TableCell>
                      <TableCell>
                        <Badge variant={emp.status === 'activo' ? 'success' : 'warning'}>
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(emp.id);
                              setFormData({
                                employee_number: emp.employee_number,
                                first_name: emp.first_name,
                                last_name: emp.last_name,
                                position: emp.position || '',
                                department: emp.department || '',
                                status: emp.status,
                                email: emp.email || '',
                                phone: '',
                              });
                              setShowDialog(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Número de Empleado"
            value={formData.employee_number}
            onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
            required
          />
          <Input
            label="Nombre"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
          <Input
            label="Apellido"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
          <Input
            label="Puesto"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" variant="primary">Guardar</Button>
            <Button type="button" variant="secondary" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Dialog>
    </Layout>
  );
}
