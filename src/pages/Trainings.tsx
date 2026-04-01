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

interface Training {
  id: number;
  title: string;
  type: string;
  date: string;
  duration_hours: number;
  instructor: string;
  status: string;
  department: string;
}

export function Trainings() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'capacitacion',
    date: new Date().toISOString().split('T')[0],
    duration_hours: 2,
    instructor: '',
    status: 'planificada',
    department: '',
    max_participants: 15,
  });

  useEffect(() => {
    loadTrainings();
  }, [search, filterStatus]);

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const data = await api.getTrainings(params);
      setTrainings(data);
    } catch (error) {
      console.error('Error al cargar capacitaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateTraining(editingId, formData);
      } else {
        await api.createTraining(formData);
      }
      setShowDialog(false);
      setFormData({
        title: '',
        description: '',
        type: 'capacitacion',
        date: new Date().toISOString().split('T')[0],
        duration_hours: 2,
        instructor: '',
        status: 'planificada',
        department: '',
        max_participants: 15,
      });
      setEditingId(null);
      loadTrainings();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Confirmar eliminación?')) {
      try {
        await api.deleteTraining(id);
        loadTrainings();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const statusColors = {
    planificada: 'warning',
    en_curso: 'info',
    completada: 'success',
    cancelada: 'danger',
  };

  const upcomingCount = trainings.filter(t => new Date(t.date) > new Date()).length;
  const completedCount = trainings.filter(t => t.status === 'completada').length;

  return (
    <Layout title="Capacitaciones">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-600">Total de Capacitaciones</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{trainings.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Próximas Capacitaciones</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{upcomingCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Completadas</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{completedCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Horas Totales</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {trainings.reduce((sum, t) => sum + (t.duration_hours || 0), 0).toFixed(1)}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex gap-4 items-end">
            <Input
              label="Buscar"
              placeholder="Por título o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="planificada">Planificada</option>
              <option value="en_curso">En Curso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <Button variant="primary" onClick={() => { setShowDialog(true); setEditingId(null); }}>
              <Plus size={18} /> Nueva Capacitación
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <p>Cargando...</p>
          ) : trainings.length === 0 ? (
            <p className="text-gray-600">No hay capacitaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Título</TableHeaderCell>
                    <TableHeaderCell>Tipo</TableHeaderCell>
                    <TableHeaderCell>Fecha</TableHeaderCell>
                    <TableHeaderCell>Duración (hs)</TableHeaderCell>
                    <TableHeaderCell>Instructor</TableHeaderCell>
                    <TableHeaderCell>Departamento</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>Acciones</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell className="font-medium">{training.title}</TableCell>
                      <TableCell className="text-sm">{training.type}</TableCell>
                      <TableCell>{new Date(training.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>{training.duration_hours}</TableCell>
                      <TableCell className="text-sm">{training.instructor}</TableCell>
                      <TableCell className="text-sm">{training.department}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[training.status as keyof typeof statusColors] as any}>
                          {training.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(training.id);
                              setFormData({
                                title: training.title,
                                description: '',
                                type: training.type,
                                date: training.date,
                                duration_hours: training.duration_hours,
                                instructor: training.instructor || '',
                                status: training.status,
                                department: training.department || '',
                                max_participants: 15,
                              });
                              setShowDialog(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(training.id)}
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
        title={editingId ? 'Editar Capacitación' : 'Nueva Capacitación'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="induccion">Inducción</option>
              <option value="capacitacion">Capacitación</option>
              <option value="simulacro">Simulacro</option>
              <option value="auditoria">Auditoría</option>
            </select>
          </div>
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duración (horas)"
              type="number"
              step="0.5"
              value={formData.duration_hours}
              onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
            />
            <Input
              label="Participantes Máximo"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
            />
          </div>
          <Input
            label="Instructor"
            value={formData.instructor}
            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
          />
          <Input
            label="Departamento"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="planificada">Planificada</option>
              <option value="en_curso">En Curso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
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
