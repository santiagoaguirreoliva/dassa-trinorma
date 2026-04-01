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

interface Incident {
  id: number;
  code: string;
  type: string;
  date: string;
  area: string;
  severity: string;
  status: string;
}

export function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: 'incidente',
    date: new Date().toISOString().split('T')[0],
    area: '',
    severity: 'leve',
    status: 'abierto',
    description: '',
  });

  useEffect(() => {
    loadIncidents();
  }, [search, filterType]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;

      const data = await api.getIncidents(params);
      setIncidents(data);
    } catch (error) {
      console.error('Error al cargar incidentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateIncident(editingId, formData);
      } else {
        await api.createIncident(formData);
      }
      setShowDialog(false);
      setFormData({
        type: 'incidente',
        date: new Date().toISOString().split('T')[0],
        area: '',
        severity: 'leve',
        status: 'abierto',
        description: '',
      });
      setEditingId(null);
      loadIncidents();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Confirmar eliminación?')) {
      try {
        await api.deleteIncident(id);
        loadIncidents();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const severityColors = {
    leve: 'warning',
    moderado: 'info',
    grave: 'danger',
    muy_grave: 'danger',
  };

  const statusColors = {
    abierto: 'danger',
    en_investigacion: 'warning',
    cerrado: 'success',
  };

  return (
    <Layout title="Incidentes y Accidentes">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div>
              <p className="text-sm text-gray-600">Incidentes Abiertos</p>
              <p className="text-3xl font-bold text-red-600">
                {incidents.filter(i => i.status === 'abierto').length}
              </p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-sm text-gray-600">Total de Accidentes</p>
              <p className="text-3xl font-bold text-orange-600">
                {incidents.filter(i => i.type === 'accidente').length}
              </p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-sm text-gray-600">Graves/Muy Graves</p>
              <p className="text-3xl font-bold text-red-700">
                {incidents.filter(i => ['grave', 'muy_grave'].includes(i.severity)).length}
              </p>
            </div>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <Input
                label="Buscar"
                placeholder="Por descripción o área..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="incidente">Incidente</option>
                <option value="accidente">Accidente</option>
              </select>
              <Button variant="primary" onClick={() => { setShowDialog(true); setEditingId(null); }}>
                <Plus size={18} /> Nuevo
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <p>Cargando...</p>
          ) : incidents.length === 0 ? (
            <p className="text-gray-600">No hay incidentes registrados.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Área</TableHeaderCell>
                  <TableHeaderCell>Severidad</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Acciones</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-mono text-sm">{inc.code}</TableCell>
                    <TableCell>{inc.type}</TableCell>
                    <TableCell>{new Date(inc.date).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>{inc.area}</TableCell>
                    <TableCell>
                      <Badge variant={severityColors[inc.severity as keyof typeof severityColors] as any}>
                        {inc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[inc.status as keyof typeof statusColors] as any}>
                        {inc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(inc.id);
                            setFormData({
                              type: inc.type,
                              date: inc.date,
                              area: inc.area,
                              severity: inc.severity,
                              status: inc.status,
                              description: '',
                            });
                            setShowDialog(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(inc.id)}
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
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={editingId ? 'Editar Incidente' : 'Nuevo Incidente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="incidente">Incidente</option>
              <option value="accidente">Accidente</option>
            </select>
          </div>
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Área"
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severidad</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="grave">Grave</option>
              <option value="muy_grave">Muy Grave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="abierto">Abierto</option>
              <option value="en_investigacion">En Investigación</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
