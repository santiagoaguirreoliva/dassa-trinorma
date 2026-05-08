import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel rojo izq */}
      <div className="hidden md:flex md:w-1/2 bg-dassa-red flex-col justify-center items-center p-12 text-white">
        <img src="/brand/dassa-logo-white.svg" alt="DASSA" className="h-20 w-auto mb-6" />
        <p className="text-center max-w-sm opacity-90 mb-6">
          Depósito Aduanero y Servicios Especializados S.A.
        </p>
        <div className="flex gap-2">
          <span className="px-4 py-1 border border-white/30 rounded-full text-xs">ISO 9001</span>
          <span className="px-4 py-1 border border-white/30 rounded-full text-xs">ISO 14001</span>
          <span className="px-4 py-1 border border-white/30 rounded-full text-xs">ISO 45001</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-16 lg:px-24 bg-white">
        <div className="max-w-md w-full mx-auto">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-dassa-red mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver al login
          </Link>

          <p className="text-[11px] font-bold text-dassa-red uppercase tracking-widest mb-2">
            Recuperar acceso
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h1>
          <p className="text-gray-600 mb-8">
            Ingresá tu email y te mandamos un link para restablecerla.
          </p>

          {sent ? (
            <div className="bg-dassa-celeste-tint border border-dassa-celeste rounded p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-dassa-celeste-deep mx-auto mb-3" />
              <h2 className="font-bold text-dassa-celeste-deep mb-2">Listo, revisá tu email</h2>
              <p className="text-sm text-gray-700">
                Si el email <strong>{email}</strong> está registrado, vas a recibir un link para restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="text-xs text-gray-500 mt-4">
                ¿No te llegó? Revisá la carpeta de spam o probá nuevamente en 15 minutos.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@dassa.com.ar"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-dassa-red-tint text-dassa-red-deep border border-dassa-red/20 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-dassa-red text-white py-3 font-bold hover:bg-dassa-red-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar link de recuperación'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
