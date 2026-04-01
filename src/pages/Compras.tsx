import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Dialog } from '../components/ui/Dialog';
import { api } from '../lib/api';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronRight, Building2, BarChart2, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Purchase {
  id: number; code: string; supplier_name: string; description: string;
  amount: number; category: string; status: string; date: string;
  requested_by_name: string; approved_by: string; rejection_reason: string; notes: string;
}
interface Supplier {
  id: number; name: string; cuit: string; type: string;
  contact_name: string; email: string; phone: string; address: string; status: string; notes: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  solicitud: 'Solicitud', autorizada: 'Autorizada', rechazada: 'Rechazada',
  en_ejecucion: 'En Ejecución', recibida: 'Recibida', cerrada: 'Cerrada',
};
const STATUS_COLORS: Record<string, string> = {
  solicitud: 'bg-yellow-100 text-yellow-800', autorizada: 'bg-blue-100 text-blue-800',
  rechazada: 'bg-red-100 text-red-800', en_ejecucion: 'bg-purple-100 text-purple-800',
  recibida: 'bg-green-100 text-green-800', cerrada: 'bg-gray-100 text-gray-700',
};
const CAT_LABELS: Record<string, string> = {
  estandar: 'Estándar', servicios: 'Servicios', materiales: 'Materiales',
  equipamiento: 'Equipamiento', otros: 'Otros',
};
const CAT_COLORS: Record<string, string> = {
  estandar: '#2563EB', servicios: '#7C3AED', materiales: '#059669',
  equipamiento: '#D97706', otros: '#6B7280',
};
const NEXT_STATUS: Record<string, string[]> = {
  solicitud: ['autorizada', 'rechazada'],
  autorizada: ['en_ejecucion', 'rechazada'],
  en_ejecucion: ['recibida'],
  recibida: ['cerrada'],
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function Compras() {
  const [tab, setTab] = useState<'solicitudes' | 'proveedores' | 'reportes'>('solicitudes');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [form, setForm] = useState({
    supplier_id: '', supplier_name: '', description: '', amount: '',
    category: 'estandar', date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    name: '', cuit: '', type: '', contact_name: '', email: '', phone: '', address: '', status: 'activo', notes: '',
  });

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === 'solicitudes') loadPurchases(); }, [filterStatus, filterCat, search]);
  useEffect(() => { if (tab === 'reportes') loadReports(); }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPurchases(), loadSuppliers(), loadStats()]);
    setLoading(false);
  };

  const loadPurchases = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCat) params.category = filterCat;
      if (search) params.search = search;
      const data: any = await api.getPurchases(params);
      setPurchases(data);
    } catch (e) { console.error(e); }
  };

  const loadSuppliers = async () => {
    try {
      const data: any = await api.getSuppliers();
      setSuppliers(data);
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      const data: any = await api.getPurchaseStats();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const loadReports = async () => {
    try {
      const data: any = await api.getPurchaseReports();
      setReportData(data);
    } catch (e) { console.error(e); }
  };

  // ─── Chart data transform ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const byMonth: Record<string, any> = {};
    reportData.forEach(({ month_label, category, total }) => {
      if (!byMonth[month_label]) byMonth[month_label] = { month: month_label };
      byMonth[month_label][CAT_LABELS[category] || category] = parseFloat(total) || 0;
    });
    return Object.values(byMonth).reverse();
  }, [reportData]);

  const summaryByMonth = useMemo(() => {
    const byMonth: Record<string, any> = {};
    reportData.forEach(({ month_label, category, total }) => {
      if (!byMonth[month_label]) byMonth[month_label] = { month: month_label, total: 0 };
      byMonth[month_label][CAT_LABELS[category] || category] = parseFloat(total) || 0;
      byMonth[month_label].total += parseFloat(total) || 0;
    });
    return Object.values(byMonth).reverse();
  }, [reportData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSupplierSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sup = suppliers.find(s => s.id === parseInt(e.target.value));
    setForm(f => ({ ...f, supplier_id: e.target.value, supplier_name: sup ? sup.name : '' }));
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ supplier_id: '', supplier_name: '', description: '', amount: '', category: 'estandar', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowDialog(true);
  };

  const openEdit = (p: Purchase) => {
    setEditingId(p.id);
    setForm({ supplier_id: '', supplier_name: p.supplier_name, description: p.description||'', amount: String(p.amount||''), category: p.category, date: p.date?.split('T')[0]||'', notes: p.notes||'' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, amount: form.amount ? parseFloat(form.amount) : null, supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null };
      if (editingId) { await api.updatePurchase(editingId, payload); }
      else { await api.createPurchase(payload); }
      setShowDialog(false);
      loadPurchases(); loadStats();
    } catch (e: any) {
      const msg = e?.response?.detail || e?.detail || e.message || 'Error desconocido';
      alert('Error: ' + msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await api.deletePurchase(id);
    loadPurchases(); loadStats();
  };

  const openStatus = (p: Purchase) => {
    setSelectedPurchase(p);
    setNewStatus(NEXT_STATUS[p.status]?.[0] || '');
    setRejectionReason('');
    setShowStatusDialog(true);
  };

  const handleStatusChange = async () => {
    if (!selectedPurchase) return;
    try {
      await api.updatePurchaseStatus(selectedPurchase.id, { status: newStatus, rejection_reason: rejectionReason || null });
      setShowStatusDialog(false);
      loadPurchases(); loadStats();
    } catch (e: any) { alert(e.message); }
  };

  const openNewSupplier = () => {
    setEditingId(null);
    setSupplierForm({ name: '', cuit: '', type: '', contact_name: '', email: '', phone: '', address: '', status: 'activo', notes: '' });
    setShowSupplierDialog(true);
  };

  const handleSaveSupplier = async () => {
    try {
      if (editingId) { await api.updateSupplier(editingId, supplierForm); }
      else { await api.createSupplier(supplierForm); }
      setShowSupplierDialog(false);
      loadSuppliers();
    } catch (e: any) { alert(e.message); }
  };

  const fmt = (n: any) => n != null ? `$${parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '—';

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500">Gestión de órdenes de compra con flujo de aprobación</p>
        </div>
        <Button onClick={tab === 'proveedores' ? openNewSupplier : openNew}>
          <Plus className="h-4 w-4 mr-1" />
          {tab === 'proveedores' ? 'Nuevo Proveedor' : 'Nueva Solicitud'}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Solicitudes', value: stats.pendientes || 0, color: 'text-yellow-600' },
          { label: 'Autorizadas', value: stats.autorizadas || 0, color: 'text-blue-600' },
          { label: 'En Ejecución', value: stats.en_ejecucion || 0, color: 'text-purple-600' },
          { label: 'Total Comprometido', value: fmt(stats.total_amount), color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'solicitudes', label: 'Solicitudes', icon: <ChevronRight className="h-4 w-4" /> },
          { key: 'proveedores', label: 'Proveedores', icon: <Building2 className="h-4 w-4" /> },
          { key: 'reportes',    label: 'Reportes',    icon: <BarChart2 className="h-4 w-4" /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Tab: Solicitudes ────────────────────────────────────────────── */}
      {tab === 'solicitudes' && (
        <Card>
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-gray-100">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="">Todas las categorías</option>
              {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs text-sm" />
          </div>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Código</TableHeaderCell>
                <TableHeaderCell>Proveedor</TableHeaderCell>
                <TableHeaderCell>Descripción</TableHeaderCell>
                <TableHeaderCell>Monto</TableHeaderCell>
                <TableHeaderCell>Categoría</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Solicitante</TableHeaderCell>
                <TableHeaderCell>Fecha</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No hay solicitudes</TableCell></TableRow>
              ) : purchases.map(pur => (
                <TableRow key={pur.id}>
                  <TableCell className="font-mono text-xs text-blue-700 font-semibold">{pur.code}</TableCell>
                  <TableCell className="font-medium">{pur.supplier_name}</TableCell>
                  <TableCell className="text-gray-600 max-w-xs truncate">{pur.description || '—'}</TableCell>
                  <TableCell className="font-medium">{fmt(pur.amount)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {CAT_LABELS[pur.category] || pur.category}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={pur.status} /></TableCell>
                  <TableCell className="text-sm text-gray-600">{pur.requested_by_name || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{pur.date ? new Date(pur.date).toLocaleDateString('es-AR') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {NEXT_STATUS[pur.status] && (
                        <button onClick={() => openStatus(pur)} title="Cambiar estado"
                          className="p-1 text-blue-500 hover:text-blue-700">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {pur.status === 'solicitud' && (
                        <button onClick={() => openEdit(pur)} className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(pur.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Tab: Proveedores ─────────────────────────────────────────────── */}
      {tab === 'proveedores' && (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>CUIT</TableHeaderCell>
                <TableHeaderCell>Rubro</TableHeaderCell>
                <TableHeaderCell>Contacto</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Teléfono</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No hay proveedores</TableCell></TableRow>
              ) : suppliers.map(sup => (
                <TableRow key={sup.id}>
                  <TableCell className="font-medium">{sup.name}</TableCell>
                  <TableCell className="text-sm text-gray-500 font-mono">{sup.cuit || '—'}</TableCell>
                  <TableCell><span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{sup.type || '—'}</span></TableCell>
                  <TableCell className="text-sm text-gray-600">{sup.contact_name || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{sup.email || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{sup.phone || '—'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      sup.status === 'activo' ? 'bg-green-100 text-green-700' :
                      sup.status === 'suspendido' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {sup.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingId(sup.id); setSupplierForm({ name: sup.name, cuit: sup.cuit||'', type: sup.type||'', contact_name: sup.contact_name||'', email: sup.email||'', phone: sup.phone||'', address: sup.address||'', status: sup.status, notes: sup.notes||'' }); setShowSupplierDialog(true); }}
                        className="p-1 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={async () => { if (confirm('¿Eliminar proveedor?')) { await api.deleteSupplier(sup.id); loadSuppliers(); } }}
                        className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Tab: Reportes ────────────────────────────────────────────────── */}
      {tab === 'reportes' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Gasto Mensual por Categoría</h3>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No hay datos de gastos para mostrar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v.toLocaleString('es-AR')}`} />
                  <Tooltip formatter={(v: any) => `$${parseFloat(v).toLocaleString('es-AR')}`} />
                  <Legend />
                  {Object.entries(CAT_LABELS).map(([key, label]) => (
                    <Bar key={key} dataKey={label} fill={CAT_COLORS[key]} radius={[3,3,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">Resumen por Mes</h3>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Mes</TableHeaderCell>
                  {Object.values(CAT_LABELS).map(l => <TableHeaderCell key={l}>{l}</TableHeaderCell>)}
                  <TableHeaderCell>Total</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryByMonth.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-6">Sin datos</TableCell></TableRow>
                ) : summaryByMonth.map((row: any) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    {Object.values(CAT_LABELS).map(l => (
                      <TableCell key={l} className="text-gray-600">{row[l] ? fmt(row[l]) : '—'}</TableCell>
                    ))}
                    <TableCell className="font-bold">{fmt(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ── Dialog: Nueva / Editar Solicitud ─────────────────────────────── */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}
        title={editingId ? 'Editar Solicitud' : 'Nueva Solicitud de Compra'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
            <select value={form.supplier_id} onChange={handleSupplierSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar proveedor...</option>
              {suppliers.filter(s => s.status === 'activo').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__custom__">Otro (ingresar manualmente)</option>
            </select>
            {(form.supplier_id === '__custom__' || (!form.supplier_id && form.supplier_name)) && (
              <Input placeholder="Nombre del proveedor" value={form.supplier_name}
                onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} className="mt-2 text-sm" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
              <Input type="number" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Guardar' : 'Crear Solicitud'}</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: Cambiar Estado ────────────────────────────────────────── */}
      <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} title="Cambiar Estado">
        {selectedPurchase && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedPurchase.code} — {selectedPurchase.supplier_name}</p>
              <p className="text-gray-500 mt-0.5">Estado actual: <StatusBadge status={selectedPurchase.status} /></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Estado</label>
              <div className="flex gap-2 flex-wrap">
                {(NEXT_STATUS[selectedPurchase.status] || []).map(s => (
                  <button key={s} onClick={() => setNewStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      newStatus === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            {newStatus === 'rechazada' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de rechazo</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" rows={2} />
              </div>
            )}
            {newStatus === 'autorizada' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autorizado por</label>
                <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Nombre del autorizante" className="text-sm" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancelar</Button>
              <Button onClick={handleStatusChange} disabled={!newStatus}>Confirmar</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Dialog: Proveedor ─────────────────────────────────────────────── */}
      <Dialog open={showSupplierDialog} onClose={() => setShowSupplierDialog(false)}
        title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
              <Input value={supplierForm.cuit} onChange={e => setSupplierForm(f => ({ ...f, cuit: e.target.value }))} placeholder="20-12345678-9" className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
              <Input value={supplierForm.type} onChange={e => setSupplierForm(f => ({ ...f, type: e.target.value }))} placeholder="Transporte, Servicios..." className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <Input value={supplierForm.contact_name} onChange={e => setSupplierForm(f => ({ ...f, contact_name: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={supplierForm.status} onChange={e => setSupplierForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <Input value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} className="text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={supplierForm.notes} onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveSupplier}>{editingId ? 'Guardar' : 'Crear Proveedor'}</Button>
          </div>
        </div>
      </Dialog>
    </Layout>
  );
}
