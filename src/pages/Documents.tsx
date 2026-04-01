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

interface Document {
  id: number;
  code: string;
  title: string;
  type: string;
  norma: string;
  version: number;
  status: string;
  created_at: string;
}

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterNorma, setFilterNorma] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'procedimiento',
    norma: 'ISO 9001',
    status: 'borrador',
  });

  useEffect(() => {
    loadDocuments();
  }, [search, filterType, filterNorma]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterNorma) params.norma = filterNorma;

      const data = await api.getDocuments(params);
      setDocuments(data);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateDocument(editingId, formData);
      } else {
        await api.createDocument(formData);
      }
      setShowDialog(false);
      setFormData({ title: '', type: 'procedimiento', norma: 'ISO 9001', status: 'borrador' });
      setEditingId(null);
      loadDocuments();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Confirmar eliminación?')) {
      try {
        await api.deleteDocument(id);
        loadDocuments();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const statusColors = {
    vigente: 'success',
    borrador: 'warning',
    en_revision: 'info',
    obsoleto: 'danger',
  };

  return (
    <Layout title="Documentos ISO">
      <div className="space-y-6">
        {/* Filters and Actions */}
        <Card>
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <Input
                label="Buscar"
                placeholder="Por título o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="procedimiento">Procedimiento</option>
                <option value="instruccion">Instrucción</option>
                <option value="registro">Registro</option>
                <option value="manual">Manual</option>
              </select>
              <select
                value={filterNorma}
                onChange={(e) => setFilterNorma(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las normas</option>
                <option value="ISO 9001">ISO 9001</option>
                <option value="ISO 14001">ISO 14001</option>
                <option value="ISO 45001">ISO 45001</option>
                <option value="MIXTO">MIXTO</option>
              </select>
              <Button variant="primary" onClick={() => { setShowDialog(true); setEditingId(null); setFormData({ title: '', type: 'procedimiento', norma: 'ISO 9001', status: 'borrador' }); }}>
                <Plus size={18} /> Nuevo
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <p>Cargando...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-600">No hay documentos.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Título</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Norma</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Versión</TableHeaderCell>
                  <TableHeaderCell>Acciones</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm">{doc.code}</TableCell>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell className="text-sm">{doc.type}</TableCell>
                    <TableCell className="text-sm">{doc.norma}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[doc.status as keyof typeof statusColors] as any}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.version}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(doc.id);
                            setFormData({ title: doc.title, type: doc.type, norma: doc.norma, status: doc.status });
                            setShowDialog(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
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
        title={editingId ? 'Editar Documento' : 'Nuevo Documento'}
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
              <option value="procedimiento">Procedimiento</option>
              <option value="instruccion">Instrucción</option>
              <option value="registro">Registro</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Norma</label>
            <select
              value={formData.norma}
              onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ISO 9001">ISO 9001</option>
              <option value="ISO 14001">ISO 14001</option>
              <option value="ISO 45001">ISO 45001</option>
              <option value="MIXTO">MIXTO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="borrador">Borrador</option>
              <option value="en_revision">En Revisión</option>
              <option value="vigente">Vigente</option>
              <option value="obsoleto">Obsoleto</option>
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
