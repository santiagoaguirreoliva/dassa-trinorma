import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

const DEPARTAMENTOS = [
  'Operaciones', 'Coordinación', 'Administración', 'RRHH',
  'Seguridad e Higiene', 'Mantenimiento', 'Dirección', 'Externo'
];

export default function Register() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', position: '', department: '', message: ''
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-[#1a2235] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-200 mb-2">¡Solicitud enviada!</h2>
          <p className="text-sm text-slate-400 mb-6">
            Tu solicitud fue recibida. El administrador del sistema la revisará y recibirás tu acceso en breve.
          </p>
          <Link to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-700 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors">
            <ArrowLeft size={15} /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d18] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-xl mx-auto mb-3">
            D
          </div>
          <h1 className="text-lg font-extrabold text-slate-200">DASSA — Solicitar acceso</h1>
          <p className="text-[11px] text-slate-500 mt-1">Completá el formulario y el administrador te habilitará</p>
        </div>

        <div className="bg-[#111827] border border-[#1a2235] rounded-2xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <input
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                required
                placeholder="Tu nombre y apellido"
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Puesto / Cargo
                </label>
                <input
                  value={form.position}
                  onChange={e => set('position', e.target.value)}
                  placeholder="Ej: Apuntador"
                  className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Área
                </label>
                <select
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] focus:outline-none focus:border-blue-500"
                >
                  <option value="">Seleccioná</option>
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Mensaje (opcional)
              </label>
              <textarea
                value={form.message}
                onChange={e => set('message', e.target.value)}
                rows={2}
                placeholder="¿Por qué necesitás acceso al sistema?"
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e3a5f] rounded-lg text-slate-200 text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 text-[12px] text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-[13px] hover:from-blue-600 hover:to-blue-500 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar solicitud de acceso'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-4">
          ¿Ya tenés acceso?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-semibold">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
