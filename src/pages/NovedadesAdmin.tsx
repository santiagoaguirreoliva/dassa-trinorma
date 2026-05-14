// /admin/novedades · CRUD de anuncios del sistema (master_admin)
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Plus, Trash2, Edit3, Pin, X, Megaphone, Loader2, Save } from 'lucide-react';

interface News {
  id: string;
  title: string;
  body_md: string;
  category: 'novedad' | 'update' | 'aviso' | 'urgente';
  audience: string;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
}

const CAT_COLOR: Record<string, string> = {
  novedad: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  aviso: 'bg-amber-100 text-amber-800',
  urgente: 'bg-red-100 text-red-800',
};

export default function NovedadesAdmin() {
  const { user } = useAuth();
  const canAccess = user?.role === 'master_admin';
  const [rows, setRows] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<News> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (canAccess) refresh(); }, [canAccess]);

  function refresh() {
    setLoading(true);
    api.get<News[]>('/bienvenida/admin/news-all')
      .then(setRows)
      .catch(e => setError('Error: ' + e.message))
      .finally(() => setLoading(false));
  }

  function newItem() {
    setEditing({ title: '', body_md: '', category: 'novedad', audience: 'all', pinned: false });
    setError('');
  }

  function edit(n: News) {
    setEditing({ ...n });
    setError('');
  }

  async function save() {
    if (!editing?.title || !editing?.body_md) {
      setError('Título y cuerpo son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing.id) {
        await api.patch(`/bienvenida/admin/news/${editing.id}`, editing);
      } else {
        await api.post('/bienvenida/admin/news', editing);
      }
      setEditing(null);
      refresh();
    } catch (e: any) {
      setError('Error: ' + (e.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar esta novedad?')) return;
    try {
      await api.delete(`/bienvenida/admin/news/${id}`);
      refresh();
    } catch (e: any) {
      setError('Error: ' + e.message);
    }
  }

  if (!canAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 max-w-md">
          <h2 className="font-bold text-red-900 mb-2">Acceso denegado</h2>
          <p className="text-red-700 text-sm">Solo master_admin puede gestionar novedades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              <Megaphone className="w-8 h-8 text-dassa-red" />
              Novedades del sistema
            </h1>
            <p className="text-gray-600 mt-1">Anuncios que ven todos los users en su Bienvenida.</p>
          </div>
          <button onClick={newItem} className="flex items-center gap-2 bg-dassa-red hover:bg-dassa-red-deep text-white font-bold rounded-lg px-4 py-2.5">
            <Plus className="w-5 h-5" />Nueva
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-300 text-red-900 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        {editing && (
          <div className="bg-white rounded-xl border-2 border-dassa-red p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editing.id ? 'Editar' : 'Nueva'} novedad</h3>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Título</label>
                <input type="text" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-dassa-red focus:ring-1 focus:ring-[#BE1E2D] outline-none" placeholder="🚀 Nueva función disponible" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Categoría</label>
                <select value={editing.category || 'novedad'} onChange={e => setEditing({ ...editing, category: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none">
                  <option value="novedad">Novedad (verde)</option>
                  <option value="update">Update (azul)</option>
                  <option value="aviso">Aviso (amarillo)</option>
                  <option value="urgente">Urgente (rojo)</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">Cuerpo (markdown: **negrita**)</label>
              <textarea value={editing.body_md || ''} onChange={e => setEditing({ ...editing, body_md: e.target.value })} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none" placeholder="Texto del anuncio..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Audiencia</label>
                <select value={editing.audience || 'all'} onChange={e => setEditing({ ...editing, audience: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none">
                  <option value="all">Todos</option>
                  <option value="master_admin">Master Admin</option>
                  <option value="sgi_leader">SGI Leader</option>
                  <option value="rrhh">RRHH</option>
                  <option value="operaciones">Operaciones</option>
                  <option value="seguridad_higiene">SySO</option>
                  <option value="auditor_externo">Auditora</option>
                  <option value="compras_approver">Compras</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!editing.pinned} onChange={e => setEditing({ ...editing, pinned: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">📌 Fijado arriba (pinned)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 bg-dassa-red hover:bg-dassa-red-deep disabled:bg-gray-300 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
              <button onClick={() => setEditing(null)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold">Cancelar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-10 h-10 animate-spin text-dassa-red mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-200">Aún no hay novedades. Creá la primera.</div>
        ) : (
          <div className="space-y-3">
            {rows.map(n => (
              <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {n.pinned && <Pin className="w-3.5 h-3.5 text-gray-400" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CAT_COLOR[n.category] || ''}`}>{n.category}</span>
                    <span className="text-xs text-gray-500">audiencia: <strong>{n.audience}</strong></span>
                    <h3 className="font-bold text-gray-900">{n.title}</h3>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{n.body_md.replace(/\*\*(.+?)\*\*/g, '$1')}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    Publicado: {new Date(n.published_at).toLocaleString('es-AR')}
                    {n.expires_at && <> · Expira: {new Date(n.expires_at).toLocaleDateString('es-AR')}</>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => edit(n)} className="bg-blue-100 hover:bg-blue-200 text-blue-900 p-2 rounded"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => remove(n.id)} className="bg-red-100 hover:bg-red-200 text-red-900 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
