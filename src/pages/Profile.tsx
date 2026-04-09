import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, CheckCircle2, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/ui';

export default function Profile() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'perfil' | 'seguridad'>('perfil');

  // ─── Perfil ──────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    position: user?.position || '',
    department: user?.department || '',
  });
  const [profileOk, setProfileOk] = useState(false);
  const [profileError, setProfileError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/users/me', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setProfileOk(true);
      setProfileError('');
      setTimeout(() => setProfileOk(false), 3000);
    },
    onError: (e: any) => setProfileError(e.message),
  });

  // ─── Contraseña ──────────────────────────────────────────
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const setPwdField = (k: string, v: string) => setPwd(p => ({ ...p, [k]: v }));

  const changePwd = useMutation({
    mutationFn: () => {
      if (pwd.new !== pwd.confirm) throw new Error('Las contraseñas nuevas no coinciden');
      if (pwd.new.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      return api.post('/users/me/change-password', {
        currentPassword: pwd.current,
        newPassword: pwd.new,
      });
    },
    onSuccess: () => {
      setPwd({ current: '', new: '', confirm: '' });
      setPwdOk(true);
      setPwdError('');
      setTimeout(() => setPwdOk(false), 3000);
    },
    onError: (e: any) => setPwdError(e.message),
  });

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <>
      <Header title="Mi Perfil" subtitle="Editá tus datos personales y contraseña" />
      <PageContent>
        <div className="max-w-xl space-y-5">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{user?.full_name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-full uppercase tracking-wide">
                {user?.role ? ROLE_LABELS[user.role] : ''}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {[
              { key: 'perfil',    label: 'Datos personales', icon: <User size={13} /> },
              { key: 'seguridad', label: 'Contraseña',       icon: <Lock size={13} /> },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors
                  ${tab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ─── PERFIL ─── */}
          {tab === 'perfil' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div>
                <label className="label-field">Nombre completo</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label-field">Email</label>
                <input value={user?.email || ''} disabled
                  className="input-field bg-slate-50 text-slate-400 cursor-not-allowed" />
                <p className="text-[10px] text-slate-400 mt-1">El email no se puede cambiar desde acá</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Teléfono</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+54 11 ..." className="input-field" />
                </div>
                <div>
                  <label className="label-field">Puesto / Cargo</label>
                  <input value={form.position} onChange={e => set('position', e.target.value)}
                    placeholder="Ej: Responsable SGI" className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="label-field">Área / Departamento</label>
                  <input value={form.department} onChange={e => set('department', e.target.value)}
                    placeholder="Ej: Operaciones" className="input-field" />
                </div>
              </div>
              {profileError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{profileError}</p>
              )}
              {profileOk && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 size={14} /> Perfil actualizado correctamente
                </div>
              )}
              <button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}
                className="w-full py-3 bg-blue-700 text-white font-bold text-sm rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50">
                {saveProfile.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Guardar cambios
              </button>
            </div>
          )}

          {/* ─── CONTRASEÑA ─── */}
          {tab === 'seguridad' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 font-medium">
                  Si es tu primer ingreso al sistema, cambiá la contraseña provisoria <strong>Dassa2026x</strong> por una personal.
                </p>
              </div>
              <div>
                <label className="label-field">Contraseña actual</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={pwd.current}
                    onChange={e => setPwdField('current', e.target.value)}
                    placeholder="Tu contraseña actual"
                    className="input-field pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-field">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pwd.new}
                    onChange={e => setPwdField('new', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="input-field pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwd.new && pwd.new.length < 8 && (
                  <p className="text-[10px] text-red-500 mt-1">Mínimo 8 caracteres</p>
                )}
              </div>
              <div>
                <label className="label-field">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={pwd.confirm}
                  onChange={e => setPwdField('confirm', e.target.value)}
                  placeholder="Repetí la nueva contraseña"
                  className="input-field"
                />
                {pwd.confirm && pwd.new !== pwd.confirm && (
                  <p className="text-[10px] text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
              {pwdError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{pwdError}</p>
              )}
              {pwdOk && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 size={14} /> Contraseña actualizada correctamente
                </div>
              )}
              <button
                onClick={() => changePwd.mutate()}
                disabled={!pwd.current || !pwd.new || !pwd.confirm || changePwd.isPending}
                className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50">
                {changePwd.isPending ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                Cambiar contraseña
              </button>
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
}
