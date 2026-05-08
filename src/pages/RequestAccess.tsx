import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

export default function RequestAccess() {
  const [form, setForm] = useState({
    full_name: '', email: '', position: '', department: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/users/access-requests', form);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  function update(k: string, v: string) {
    setForm(s => ({ ...s, [k]: v }));
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-dassa-red flex-col justify-center items-center p-12 text-white">
        <img src="/brand/dassa-logo-white.svg" alt="DASSA" className="h-20 w-auto mb-6" />
        <p className="text-center max-w-sm opacity-90 mb-6">Sistema de Gestión Integrado TRINORMA</p>
        <div className="flex gap-2 mb-8">
          <span className="px-4 py-1 border border-white/30 rounded-full text-xs">ISO 9001</span>
          <span className="px-4 py-1 border border-white/30 rounded-full text-xs">ISO 14001</span>
          <span className="px-4 py-1 border border-white/30 rounded-full text-xs">ISO 45001</span>
        </div>
        <p className="text-sm opacity-80 max-w-sm text-center">
          El acceso al SGI es exclusivo del personal autorizado. Tu solicitud va a ser revisada por el área de Calidad.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-16 lg:px-24 bg-white">
        <div className="max-w-md w-full mx-auto">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-dassa-red mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver al login
          </Link>

          <p className="text-[11px] font-bold text-dassa-red uppercase tracking-widest mb-2">Solicitud de acceso</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedir acceso al SGI</h1>
          <p className="text-gray-600 mb-8">
            Completá el formulario. Un administrador va a revisar tu solicitud y te avisamos por email.
          </p>

          {sent ? (
            <div className="bg-dassa-celeste-tint border border-dassa-celeste rounded p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-dassa-celeste-deep mx-auto mb-3" />
              <h2 className="font-bold text-dassa-celeste-deep mb-2">Solicitud enviada</h2>
              <p className="text-sm text-gray-700">
                Recibimos tu solicitud. Vas a recibir un email cuando sea aprobada.
              </p>
              <Link to="/login" className="inline-block mt-4 text-sm text-dassa-red font-bold hover:underline">
                Ir al login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Nombre completo *</label>
                <input
                  type="text" required value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Email *</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
                  placeholder="usuario@dassa.com.ar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Puesto</label>
                  <input
                    type="text" value={form.position}
                    onChange={e => update('position', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
                    placeholder="Operario"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Área</label>
                  <input
                    type="text" value={form.department}
                    onChange={e => update('department', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
                    placeholder="Operaciones"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Mensaje (opcional)</label>
                <textarea
                  value={form.message}
                  onChange={e => update('message', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10 resize-none"
                  placeholder="Contanos para qué necesitás el acceso..."
                />
              </div>

              {error && (
                <div className="bg-dassa-red-tint text-dassa-red-deep border border-dassa-red/20 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dassa-red text-white py-3 font-bold hover:bg-dassa-red-deep transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><UserPlus className="w-4 h-4" /> Solicitar acceso</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
