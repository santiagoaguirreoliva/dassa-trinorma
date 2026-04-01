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

interface EnvironmentalAspect {
  id: number;
  aspect: string;
  activity: string;
  frequency: number;
  severity: number;
  detection: number;
  significance: number;
  is_significant: boolean;
}

export function EnvironmentalAspects() {
  const [aspects, setAspects] = useState<EnvironmentalAspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    aspect: '',
    activity: '',
    impact: '',
    frequency: 3,
    severity: 3,
    detection: 3,
    control_measure: '',
  });

  useEffect(() => {
    loadAspects();
  }, []);

  const loadAspects = async () => {
    setLoading(true);
    try {
      const data = await api.getEnvironmentalAspects();
      setAspects(data);
    } catch (error) {
      console.error('Error al cargar aspectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateEnvironmentalAspect(editingId, formData);
      } else {
        await api.createEnvironmentalAspect(formData);
      }
      setShowDialog(false);
      setFormData({
        aspect: '',
        activity: '',
        impact: '',
        frequency: 3,
        severity: 3,
        detection: 3,
        control_measure: '',
      });
      setEditingId(null);
      loadAspects();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Confirmar eliminación?')) {
      try {
        await api.deleteEnvironmentalAspect(id);
        loadAspects();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const getSignificanceColor = (significance: number) => {
    if (significance > 36) return 'danger';
    if (significance > 20) return 'warning';
    return 'success';
  };

  const significantCount = aspects.filter(a => a.is_significant).length;

  return (
    <Layout title="Aspectos Ambientales">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div>
              <p className="text-sm text-gray-600">Total de Aspectos</p>
              <p className="text-3xl font-bold text-blue-600">{aspects.length}</p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-sm text-gray-600">Aspectos Significativos</p>
              <p className="text-3xl font-bold text-red-600">{significantCount}</p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-sm text-gray-600">Matriz F × S × D</p>
              <p className="text-sm text-gray-700 mt-2">Significancia &gt; 36 = Significativo</p>
            </div>
          </Card>
        </div>

        {/* Info */}
        <Card>
          <p className="text-sm text-gray-700">
            <strong>Matriz de Evaluación:</strong> Frecuencia (1-5) × Severidad (1-5) × Detección (1-5) = Significancia<br/>
            Los aspectos con significancia mayor a 36 se consideran significativos y requieren controles especiales.
          </p>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => { setShowDialog(true); setEditingId(null); }}>
            <Plus size={18} /> Nuevo Aspecto
          </Button>
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <p>Cargando...</p>
          ) : aspects.length === 0 ? (
            <p className="text-gray-600">No hay aspectos ambientales registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Aspecto</TableHeaderCell>
                    <TableHeaderCell>Actividad</TableHeaderCell>
                    <TableHeaderCell>F</TableHeaderCell>
                    <TableHeaderCell>S</TableHeaderCell>
                    <TableHeaderCell>D</TableHeaderCell>
                    <TableHeaderCell>Significancia</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>Acciones</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aspects.map((asp) => (
                    <TableRow key={asp.id}>
                      <TableCell className="font-medium">{asp.aspect}</TableCell>
                      <TableCell className="text-sm">{asp.activity}</TableCell>
                      <TableCell className="text-center font-semibold">{asp.frequency}</TableCell>
                      <TableCell className="text-center font-semibold">{asp.severity}</TableCell>
                      <TableCell className="text-center font-semibold">{asp.detection}</TableCell>
                      <TableCell className="font-mono font-semibold">{asp.significance.toFixed(0)}</TableCell>
                      <TableCell>
                        <Badge variant={asp.is_significant ? 'danger' : 'success'}>
                          {asp.is_significant ? 'Significativo' : 'No significativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(asp.id);
                              setFormData({
                                aspect: asp.aspect,
                                activity: asp.activity || '',
                                impact: '',
                                frequency: asp.frequency,
                                severity: asp.severity,
                                detection: asp.detection,
                                control_measure: '',
                              });
                              setShowDialog(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(asp.id)}
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
        title={editingId ? 'Editar Aspecto' : 'Nuevo Aspecto Ambiental'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Aspecto Ambiental"
            value={formData.aspect}
            onChange={(e) => setFormData({ ...formData, aspect: e.target.value })}
            required
          />
          <Input
            label="Actividad Asociada"
            value={formData.activity}
            onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
          />
          <Input
            label="Impacto Potencial"
            value={formData.impact}
            onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severidad (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detección (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.detection}
                onChange={(e) => setFormData({ ...formData, detection: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Significancia: {(formData.frequency * formData.severity * formData.detection).toFixed(0)}
            </label>
          </div>
          <Input
            label="Medida de Control"
            value={formData.control_measure}
            onChange={(e) => setFormData({ ...formData, control_measure: e.target.value })}
          />
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
