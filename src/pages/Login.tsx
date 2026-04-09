import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080d18] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">
            D
          </div>
          <h1 className="text-xl font-extrabold text-slate-200 tracking-tight">DASSA</h1>
          <p className="text-[11px] text-slate-500 tracking-[0.15em] uppercase mt-1">
            Sistema de Gestión Integrado
          </p>
          <div className="inline-block mt-3 px-3 py-1 bg-sky-500/10 rounded-full text-[10px] text-sky-400 font-medium">
            ISO 9001 · ISO 14001 · ISO 45001
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1a2235] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-[15px] font-bold text-slate-300 mb-6">Ingresá al sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="usuario@dassa.com.ar"
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 text-[12px] text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-[13px] hover:from-blue-600 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        {/* Register link */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-600">
            ¿No tenés acceso?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300 font-semibold hover:underline transition-colors">
              Solicitá tu acceso acá
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
