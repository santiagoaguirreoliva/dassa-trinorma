import { useState, useEffect, FormEvent } from 'react';
import { useNavigate , Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const { signIn, user, isLoading } = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // auto-redirect-si-sesion: si ya hay token valido, saltar al dashboard
  useEffect(() => {
    if (!isLoading && user) navigate('/bienvenida', { replace: true });
  }, [isLoading, user, navigate]);


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/bienvenida');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — DASSA red brand ─────────────────── */}
      <div className="relative flex-none w-[45%] bg-dassa-red hidden md:flex flex-col items-center justify-center overflow-hidden px-12">

        {/* Decorative diagonal stripes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[200%] h-px bg-white/8 top-[22%] -left-1/2 rotate-[-15deg]" />
          <div className="absolute w-[200%] h-px bg-white/6 top-[52%] -left-1/2 rotate-[-15deg]" />
          <div className="absolute w-[200%] h-[2px] bg-white/4 top-[78%] -left-1/2 rotate-[-15deg]" />
          <div className="absolute w-[200%] h-px bg-white/5 top-[38%] -left-1/2 rotate-[-15deg]" />
        </div>

        {/* Brand content */}
        <div className="relative z-10 text-center">
          {/* Logo oficial DASSA 4.0 — isotipo sobre rojo (ds/logos/) */}
          <img
            src="/ds/logos/dassa-isotipo-red.png"
            alt="DASSA"
            className="h-28 w-auto mx-auto mb-6 select-none"
            draggable={false}
          />
          <p className="text-white/70 text-sm font-medium max-w-[260px] mx-auto mb-8 leading-relaxed">
            Depósito Aduanero y Servicios<br />Especializados S.A.
          </p>

          {/* ISO pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['ISO 9001', 'ISO 14001', 'ISO 45001'].map(n => (
              <span key={n}
                className="text-[11px] font-bold tracking-widest uppercase text-white bg-white/15 border border-white/25 px-3 py-1.5 rounded-full">
                {n}
              </span>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/15">
            <p className="text-white/40 text-[11px] tracking-widest uppercase font-semibold">
              Sistema de Gestión Integrado
            </p>
            <p className="text-white/25 text-[10px] mt-1">TRINORMA v2.0</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — white form ─────────────────────── */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo — lockup oficial DASSA 4.0 (ds/logos/) */}
          <div className="md:hidden text-center mb-8">
            <img
              src="/ds/logos/dassa-logo-horizontal.png"
              alt="DASSA"
              className="h-10 w-auto mx-auto mb-3 select-none"
              draggable={false}
            />
            <h1 className="text-xl font-extrabold text-dassa-ink">DASSA SGI</h1>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <p className="text-[11px] font-bold text-dassa-red uppercase tracking-widest mb-2">
              Sistema de Gestión Integrado
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Iniciar sesión
            </h2>
            <p className="text-gray-500 text-sm mt-1.5">
              Ingresá tus credenciales para acceder al SGI TRINORMA
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-dassa-red-tint border border-dassa-red/30 text-dassa-red-deep rounded-xl px-4 py-3 text-[13px] font-medium mb-5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="usuario@dassa.com.ar"
                className="w-full px-3.5 py-2.5 border border-gray-200 text-gray-800 text-[13.5px] placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10 transition-colors font-sans rounded-xl"
              />
            </div>

            <div>
              <label className="label-field">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 text-gray-800 text-[13.5px] placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10 transition-colors font-sans rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-dassa-red text-white font-bold text-[14px] rounded-full
                         hover:bg-dassa-red-deep transition-colors shadow-md shadow-dassa-red/25
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
        <div className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="text-dassa-red hover:underline font-medium">¿Olvidaste tu contraseña?</Link>
        </div>
        <div className="mt-2 text-center text-xs text-gray-500">
          ¿No tenés cuenta? <Link to="/request-access" className="text-dassa-red hover:underline font-medium">Solicitar acceso</Link>
        </div>
          </form>

          <p className="text-center text-[11px] text-gray-400 mt-8 font-secondary">
            SGI TRINORMA · DASSA v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
