// /admin/pactos · Lista de users + estado del pacto (solo master_admin / auditor_externo)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle2, Clock, Mail, Send, Loader2, Eye, Users as UsersIcon, RefreshCw } from 'lucide-react';

interface PactoRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  accepted_at: string | null;
  landing_seen_count: number;
  last_seen_at: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  master_admin: 'Master Admin', director: 'Director', sgi_leader: 'SGI Leader',
  seguridad_higiene: 'SySO', operaciones: 'Operaciones', rrhh: 'RRHH',
  compras_approver: 'Compras', auditor_externo: 'Auditor Externo',
};

export default function PactosAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PactoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const canAccess = user && ['master_admin', 'auditor_externo'].includes(user.role);
  const canSendEmails = user?.role === 'master_admin';

  useEffect(() => {
    if (!canAccess) return;
    refresh();
  }, [canAccess]);

  function refresh() {
    setLoading(true);
    api.get<PactoRow[]>('/bienvenida/pacto-status')
      .then(setRows)
      .catch(e => setFeedback('Error: ' + e.message))
      .finally(() => setLoading(false));
  }

  async function sendEmail(email: string) {
    setSending(email);
    setFeedback('');
    try {
      const r: any = await api.post('/bienvenida/send-welcome-email', { target_email: email });
      setFeedback(`Enviado a ${email} (sent=${r.sent}, failed=${r.failed})`);
    } catch (e: any) {
      setFeedback('Error: ' + (e.message || 'desconocido'));
    } finally {
      setSending(null);
    }
  }

  async function sendAll() {
    if (!confirm('Vas a mandar el email de bienvenida a TODOS los usuarios activos (menos vos). ¿Confirmás?')) return;
    setSendingAll(true);
    setFeedback('');
    try {
      const r: any = await api.post('/bienvenida/send-welcome-email', { send_to_all: true });
      setFeedback(`Enviados: ${r.sent} · Fallidos: ${r.failed}`);
    } catch (e: any) {
      setFeedback('Error: ' + (e.message || 'desconocido'));
    } finally {
      setSendingAll(false);
    }
  }

  if (!canAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 max-w-md">
          <h2 className="font-bold text-red-900 mb-2">Acceso denegado</h2>
          <p className="text-red-700 text-sm">Esta pantalla es solo para master_admin y auditor_externo.</p>
        </div>
      </div>
    );
  }

  const total = rows.length;
  const firmados = rows.filter(r => r.accepted_at).length;
  const pendientes = total - firmados;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              <UsersIcon className="w-8 h-8 text-dassa-red" />
              Pactos Trinorma
            </h1>
            <p className="text-gray-600 mt-1">Estado del onboarding de cada usuario.</p>
          </div>
          <button onClick={refresh} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Refrescar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total usuarios</div>
            <div className="text-3xl font-black text-gray-900">{total}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <div className="text-sm text-emerald-700">Firmaron el pacto</div>
            <div className="text-3xl font-black text-emerald-900">{firmados}</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="text-sm text-amber-700">Pendientes</div>
            <div className="text-3xl font-black text-amber-900">{pendientes}</div>
          </div>
        </div>

        {canSendEmails && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-violet-900 flex items-center gap-2"><Mail className="w-5 h-5" />Email de bienvenida</h3>
                <p className="text-sm text-violet-700">Envía el email con instrucciones de login a todos los users activos (incluye contraseña inicial).</p>
              </div>
              <button onClick={sendAll} disabled={sendingAll} className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                {sendingAll ? (<><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>) : (<><Send className="w-4 h-4" />Enviar a todos</>)}
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div className="bg-blue-50 border border-blue-300 text-blue-900 rounded-lg p-3 mb-4 text-sm">{feedback}</div>
        )}

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-10 h-10 animate-spin text-dassa-red mx-auto" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Última vista</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.full_name}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{ROLE_LABEL[r.role] || r.role}</td>
                    <td className="px-4 py-3">
                      {r.accepted_at ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Firmó {new Date(r.accepted_at).toLocaleDateString('es-AR')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 rounded-full px-2.5 py-1 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.last_seen_at ? new Date(r.last_seen_at).toLocaleString('es-AR') : '—'}
                      <div className="text-gray-400">vistas: {r.landing_seen_count}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canSendEmails && (
                          <button onClick={() => sendEmail(r.email)} disabled={sending === r.email} className="text-xs bg-dassa-red hover:bg-dassa-red-deep disabled:bg-gray-300 text-white px-3 py-1.5 rounded font-medium inline-flex items-center gap-1">
                            {sending === r.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                            Email
                          </button>
                        )}
                        <button onClick={() => navigate('/bienvenida')} className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-900 px-3 py-1.5 rounded font-medium inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
