import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Dialog } from '../components/ui/Dialog';
import { api } from '../lib/api';
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react';

interface Survey {
  id: number;
  customer_name: string;
  date: string;
  rating: number;
  comments: string;
  category: string;
}

interface SatisfactionData {
  surveys: Survey[];
  nps: number;
  total_surveys: number;
  average_rating: number;
}

export function CustomerSatisfaction() {
  const [data, setData] = useState<SatisfactionData>({
    surveys: [],
    nps: 0,
    total_surveys: 0,
    average_rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    date: new Date().toISOString().split('T')[0],
    rating: 8,
    comments: '',
    category: '',
  });

  useEffect(() => {
    loadSatisfaction();
  }, []);

  const loadSatisfaction = async () => {
    setLoading(true);
    try {
      const result = await api.getSatisfaction();
      setData(result);
    } catch (error) {
      console.error('Error al cargar satisfacción:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateSatisfactionSurvey(editingId, formData);
      } else {
        await api.createSatisfactionSurvey(formData);
      }
      setShowDialog(false);
      setFormData({
        customer_name: '',
        date: new Date().toISOString().split('T')[0],
        rating: 8,
        comments: '',
        category: '',
      });
      setEditingId(null);
      loadSatisfaction();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Confirmar eliminación?')) {
      try {
        await api.deleteSatisfactionSurvey(id);
        loadSatisfaction();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return 'success';
    if (rating >= 7) return 'info';
    if (rating >= 1) return 'danger';
    return 'neutral';
  };

  const npsStatus = data.nps >= 50 ? 'success' : data.nps >= 0 ? 'info' : 'danger';

  return (
    <Layout title="Satisfacción del Cliente">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50">
            <div>
              <p className="text-sm text-gray-600">Puntuación NPS</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{loading ? '...' : data.nps}</p>
              <p className="text-xs text-gray-600 mt-2">
                {data.nps >= 50 ? 'Excelente' : data.nps >= 0 ? 'Bueno' : 'Crítico'}
              </p>
            </div>
          </Card>
          <Card className="bg-green-50">
            <div>
              <p className="text-sm text-gray-600">Calificación Promedio</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {loading ? '...' : data.average_rating}
              </p>
              <p className="text-xs text-gray-600 mt-2">De 1 a 10</p>
            </div>
          </Card>
          <Card className="bg-purple-50">
            <div>
              <p className="text-sm text-gray-600">Total de Encuestas</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{loading ? '...' : data.total_surveys}</p>
              <p className="text-xs text-gray-600 mt-2">Clientes evaluados</p>
            </div>
          </Card>
        </div>

        {/* NPS Legend */}
        <Card>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <strong>Promotores (9-10):</strong> Clientes muy satisfechos
            </div>
            <div>
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              <strong>Pasivos (7-8):</strong> Clientes satisfechos
            </div>
            <div>
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              <strong>Detractores (0-6):</strong> Clientes insatisfechos
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => { setShowDialog(true); setEditingId(null); }}>
            <Plus size={18} /> Nueva Encuesta
          </Button>
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <p>Cargando...</p>
          ) : data.surveys.length === 0 ? (
            <p className="text-gray-600">No hay encuestas registradas.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Calificación</TableHeaderCell>
                  <TableHeaderCell>Categoría</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Comentarios</TableHeaderCell>
                  <TableHeaderCell>Acciones</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.surveys.map((survey) => {
                  let type = 'Pasivo';
                  if (survey.rating >= 9) type = 'Promotor';
                  if (survey.rating <= 6) type = 'Detractor';

                  return (
                    <TableRow key={survey.id}>
                      <TableCell className="font-medium">{survey.customer_name}</TableCell>
                      <TableCell>{new Date(survey.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>
                        <Badge variant={getRatingColor(survey.rating) as any}>
                          {survey.rating}/10
                        </Badge>
                      </TableCell>
                      <TableCell>{survey.category || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            survey.rating >= 9 ? 'success' : survey.rating >= 7 ? 'info' : 'danger'
                          }
                        >
                          {type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-xs">{survey.comments}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(survey.id);
                              setFormData({
                                customer_name: survey.customer_name,
                                date: survey.date,
                                rating: survey.rating,
                                comments: survey.comments,
                                category: survey.category,
                              });
                              setShowDialog(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(survey.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={editingId ? 'Editar Encuesta' : 'Nueva Encuesta de Satisfacción'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Cliente"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            required
          />
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calificación (1-10): {formData.rating}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Muy insatisfecho</span>
              <span>Muy satisfecho</span>
            </div>
          </div>
          <Input
            label="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Ej: Servicio, Personal, Calidad..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios</label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
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
