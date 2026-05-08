import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [reason, setReason] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }
    api.post('/auth/validate-reset-token', { token })
      .then(r => {
        setTokenValid(r.data.valid);
        setMaskedEmail(r.data.email || '');
        setReason(r.data.reason || '');
      })
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar contraseña');
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-dassa-red" />
      </div>
    );
  }

  if (!tokenValid) {
    const reasonText: Record<string, string> = {
      no_existe: 'El link no es válido.',
      usado: 'Este link ya fue usado.',
      expirado: 'El link expiró. Pedí uno nuevo.',
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-dassa-red mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-gray-600 mb-6">{reasonText[reason] || 'El link de recuperación no es válido.'}</p>
          <Link to="/forgot-password" className="inline-block bg-dassa-red text-white px-6 py-3 font-bold hover:bg-dassa-red-deep">
            Solicitar nuevo link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-dassa-celeste mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h1>
          <p className="text-gray-600 mb-6">Te redirigimos al login...</p>
          <Loader2 className="w-6 h-6 animate-spin text-dassa-red mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-dassa-red flex-col justify-center items-center p-12 text-white">
        <img src="/brand/dassa-logo-white.svg" alt="DASSA" className="h-20 w-auto mb-6" />
        <p className="text-center max-w-sm opacity-90">Depósito Aduanero y Servicios Especializados S.A.</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-16 lg:px-24 bg-white">
        <div className="max-w-md w-full mx-auto">
          <p className="text-[11px] font-bold text-dassa-red uppercase tracking-widest mb-2">Restablecer</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nueva contraseña</h1>
          <p className="text-gray-600 mb-6">
            Para <strong>{maskedEmail}</strong>. Elegí una contraseña de al menos 8 caracteres.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Confirmar contraseña
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:border-dassa-red focus:ring-2 focus:ring-dassa-red/10"
              />
            </div>

            {error && (
              <div className="bg-dassa-red-tint text-dassa-red-deep border border-dassa-red/20 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="w-full bg-dassa-red text-white py-3 font-bold hover:bg-dassa-red-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</> : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
