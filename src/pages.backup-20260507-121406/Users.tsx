import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Save, Loader2, Eye, EyeOff, CheckCircle2,
  UserCog, KeyRound, UserPlus, Clock, XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, ROLE_LABELS, AppRole } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Avatar, Spinner, PageContent } from '@/components/ui';

interface AppUser {
  id: string; email: string; full_name: string; role: AppRole;
  position?: string; department?: string; phone?: string;
  is_active: boolean; last_login?: string; created_at: string;
}
interface AccessRequest {
  id: string; full_name: string; email: string;
  position?: string; department?: string; message?: string;
  status: string; created_at: string;
}

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'master_admin',      label: 'Master Admin',        color: 'text-red-700 bg-red-100' },
  { value: 'director',          label: 'Director',            color: 'text-purple-700 bg-purple-100' },
  { value: 'sgi_leader',        label: 'SGI Leader',          color: 'text-blue-700 bg-blue-100' },
  { value: 'seguridad_higiene', label: 'Seguridad e Higiene', color: 'text-orange-700 bg-orange-100' },
  { value: 'operaciones',       label: 'Operaciones',         color: 'text-cyan-700 bg-cyan-100' },
  { value: 'rrhh',              label: 'RRHH',                color: 'text-pink-700 bg-pink-100' },
  { value: 'compras_approver',  label: 'Aprobador Compras',   color: 'text-amber-700 bg-amber-100' },
  { value: 'auditor_externo',   label: 'Auditor Externo',     color: 'text-slate-700 bg-slate-100' },
];

function RoleBadge({ role }: { role: AppRole }) {
  const r = ROLES.find(x => x.value === role);
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${r?.color || 'bg-slate-100 text-slate-600'}`}>
      {r?.label || role}
    </span>
  );
}

// ─── Modal Aprobar Solicitud ────────────────────────────────
function ApproveModal({ req, onClose }: { req: AccessRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<AppRole>('operaciones');
  const [error, setError] = useState('');

  const approve = useMutation({
    mutationFn: () => api.post(`/access-requests/${req.id}/approve`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-requests'] });
      qc.invalidateQueries({ queryKey: ['users-admin'] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const reject = useMutation({
    mutationFn: () => api.post(`/access-requests/${req.id}/reject`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-requests'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-slate-900">Revisar solicitud</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
            <p className="text-sm font-extrabold text-slate-900">{req.full_name}</p>
            <p className="text-xs text-slate-500">{req.email}</p>
            {req.position && <p className="text-xs text-slate-400">Puesto: {req.position}</p>}
            {req.department && <p className="text-xs text-slate-400">Área: {req.department}</p>}
            {req.message && (
              <p className="text-xs text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-200 mt-2 italic">
                "{req.message}"
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-2">
              Solicitado: {new Date(req.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
            </p>
          </div>

          <div>
            <label className="label-field">Asignar rol <span className="text-red-500">*</span></label>
            <select value={role} onChange={e => setRole(e.target.value as AppRole)} className="input-field">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">La contraseña inicial será <strong>Dassa2026x</strong></p>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => reject.mutate()}
              disabled={reject.isPending}
              className="flex-1 py-2.5 border border-red-200 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50">
              {reject.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Rechazar
            </button>
            <button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50">
              {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Aprobar y crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal nuevo usuario ────────────────────────────────────
function NewUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email:'', password:'Dassa2026x', full_name:'', role:'operaciones' as AppRole, position:'', department:'', phone:'' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users-admin'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-[15px] font-extrabold text-slate-900">Nuevo Usuario</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Nombre completo <span className="text-red-500">*</span></label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nombre y apellido" className="input-field" />
          </div>
          <div>
            <label className="label-field">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@dassa.com.ar" className="input-field" />
          </div>
          <div>
            <label className="label-field">Contraseña inicial</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)} className="input-field pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label-field">Rol <span className="text-red-500">*</span></label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="input-field">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Puesto</label>
              <input value={form.position} onChange={e => set('position', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Área</label>
              <input value={form.department} onChange={e => set('department', e.target.value)} className="input-field" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Cancelar</button>
            <button onClick={() => !create.isPending && create.mutate()} disabled={!form.full_name || !form.email || create.isPending}
              className="flex-1 py-2.5 bg-blue-700 text-white font-bold text-sm rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50">
              {create.isPending && <Loader2 size={14} className="animate-spin" />} Crear usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Panel ─────────────────────────────────────────────
function EditUserPanel({ user: u, onClose }: { user: AppUser; onClose: () => void }) {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [form, setForm] = useState({ full_name: u.full_name, role: u.role, position: u.position||'', department: u.department||'', phone: u.phone||'', is_active: u.is_active });
  const [resetPwd, setResetPwd] = useState('');
  const [pwdOk, setPwdOk] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => api.patch(`/users/${u.id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users-admin'] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: () => api.post(`/users/${u.id}/reset-password`, { newPassword: resetPwd }),
    onSuccess: () => { setPwdOk(true); setResetPwd(''); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="relative h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Avatar name={u.full_name} size={34} />
            <div>
              <p className="text-[13px] font-extrabold text-slate-900">{u.full_name}</p>
              <p className="text-[10px] text-slate-400">{u.email}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Nombre</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Rol</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} disabled={u.id === me?.id} className="input-field disabled:bg-slate-50 disabled:text-slate-400">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Puesto</label>
              <input value={form.position} onChange={e => set('position', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Área</label>
              <input value={form.department} onChange={e => set('department', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Cuenta {form.is_active ? 'activa' : 'inactiva'}</p>
            <button onClick={() => set('is_active', !form.is_active)} disabled={u.id === me?.id}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${form.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <div>
            <label className="label-field">Resetear contraseña</label>
            <div className="flex gap-2">
              <input type="text" value={resetPwd} onChange={e => setResetPwd(e.target.value)}
                placeholder="Nueva contraseña" className="input-field flex-1" />
              <button onClick={() => resetPwd.length >= 8 && resetPassword.mutate()}
                disabled={resetPwd.length < 8 || resetPassword.isPending}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex-shrink-0">
                <KeyRound size={13} />
              </button>
            </div>
            {pwdOk && <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 size={11} /> Reseteada</p>}
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Cancelar</button>
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="flex-1 py-2.5 bg-blue-700 text-white font-bold text-sm rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50">
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────
export default function UsersPage() {
  const { isAdmin, isMasterAdmin } = useAuth();
  const [tab, setTab] = useState<'usuarios' | 'solicitudes'>('usuarios');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [reviewing, setReviewing] = useState<AccessRequest | null>(null);

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ['users-admin'],
    queryFn: () => api.get('/users'),
  });

  const { data: requests = [] } = useQuery<AccessRequest[]>({
    queryKey: ['access-requests'],
    queryFn: () => api.get('/access-requests'),
    enabled: isAdmin,
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const active = users.filter(u => u.is_active);
  const inactive = users.filter(u => !u.is_active);

  return (
    <>
      <Header
        title="Gestión de Usuarios"
        subtitle={`${active.length} usuarios activos`}
        actions={isMasterAdmin && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-600">
            <Plus size={14} /> Nuevo usuario
          </button>
        )}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex">
        {[
          { key: 'usuarios',    label: `Usuarios (${active.length})` },
          { key: 'solicitudes', label: `Solicitudes${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors
              ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {t.label}
            {t.key === 'solicitudes' && pendingCount > 0 && (
              <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-extrabold inline-flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <PageContent>
        {/* ─── USUARIOS ─── */}
        {tab === 'usuarios' && (
          isLoading ? <div className="flex justify-center py-16"><Spinner size={32} /></div> : (
            <div className="max-w-4xl space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Usuarios activos ({active.length})</p>
                </div>
                <table className="w-full">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className="th-cell">Usuario</th>
                      <th className="th-cell hidden md:table-cell">Rol</th>
                      <th className="th-cell hidden lg:table-cell">Puesto</th>
                      <th className="th-cell hidden md:table-cell">Último acceso</th>
                      <th className="th-cell text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(u => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.full_name} size={32} />
                            <div>
                              <p className="text-xs font-bold text-slate-800">{u.full_name}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><span className="text-xs text-slate-500">{u.position || '—'}</span></td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] text-slate-400">
                            {u.last_login ? new Date(u.last_login).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' }) : 'Nunca'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isAdmin && (
                            <button onClick={() => setEditing(u)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 ml-auto">
                              <UserCog size={12} /> Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {inactive.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-60">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactivos ({inactive.length})</p>
                  </div>
                  {inactive.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0">
                      <Avatar name={u.full_name} size={28} />
                      <p className="text-xs text-slate-500 flex-1">{u.full_name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                      {isAdmin && <button onClick={() => setEditing(u)} className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold hover:bg-slate-200">Reactivar</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* ─── SOLICITUDES ─── */}
        {tab === 'solicitudes' && (
          <div className="max-w-3xl space-y-3">
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pendientes de revisión</p>
                {requests.filter(r => r.status === 'pending').map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-extrabold text-sm flex-shrink-0">
                      {r.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{r.full_name}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                      {r.position && <p className="text-[10px] text-slate-400">{r.position} · {r.department}</p>}
                      {r.message && <p className="text-xs text-slate-500 italic mt-1">"{r.message}"</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        <Clock size={9} className="inline mr-1" />
                        {new Date(r.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => setReviewing(r)}
                      className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-600 flex-shrink-0">
                      Revisar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {requests.filter(r => r.status !== 'pending').length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Historial</p>
                {requests.filter(r => r.status !== 'pending').map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 mb-2">
                    <Avatar name={r.full_name} size={30} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{r.full_name}</p>
                      <p className="text-[10px] text-slate-400">{r.email}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {requests.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <UserPlus size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin solicitudes de acceso</p>
              </div>
            )}
          </div>
        )}
      </PageContent>

      {showNew && <NewUserModal onClose={() => setShowNew(false)} />}
      {editing && <EditUserPanel user={editing} onClose={() => setEditing(null)} />}
      {reviewing && <ApproveModal req={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}
