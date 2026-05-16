import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2, User, Sparkles, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Shield } from 'lucide-react';

interface Template { industry_code:string; industry_name:string; description:string; num_profiles:number; num_risks:number; num_foda:number; }

export default function SignupEmpresa() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    tenant_name: '', tenant_slug: '', industry: 'logistica-deposito-fiscal', plan_tier: 'free',
    admin_email: '', admin_name: '', admin_password: '', confirm_password: '',
  });
  const [result, setResult] = useState<any>(null);

  const { data: tpl } = useQuery<{templates:Template[]}>({
    queryKey: ['onb-templates'],
    queryFn: () => fetch('/api/onboarding/templates').then(r=>r.json()),
  });

  const slugFromName = (name: string) => name.toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);

  const signup = useMutation({
    mutationFn: () => fetch('/api/onboarding/signup', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(form),
    }).then(r=>r.json()),
    onSuccess: (r:any) => {
      if (r.ok) { setResult(r); setStep(4); }
      else alert(r.error || 'Error desconocido');
    },
  });

  const canNext1 = form.tenant_name.length >= 3 && form.tenant_slug.length >= 3;
  const canNext2 = form.admin_name.length >= 3 && form.admin_email.includes('@') && form.admin_password.length >= 8 && form.admin_password === form.confirm_password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dassa-navy via-dassa-navy-deep to-black p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">

        {/* HEADER MARCA DASSA */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <img src="/ds/logos/dassa-isotipo-red.png" alt="DASSA" className="w-14 h-14 rounded-2xl shadow-xl select-none" draggable={false} />
            <div className="text-left">
              <div className="text-3xl font-extrabold text-white" style={{letterSpacing: '-1px'}}>DASSA SGI</div>
              <div className="text-[10px] text-dassa-celeste uppercase tracking-[3px]">TRINORMA · Software Empresarial</div>
            </div>
          </div>
          <h2 className="text-xl text-white/80 font-light">Empezá tu Sistema de Gestión Integrado en 3 minutos</h2>
        </div>

        {/* STEPS INDICATOR */}
        <div className="flex justify-center items-center gap-2 mb-6">
          {[1,2,3,4].map(s => (
            <div key={s} className={`flex items-center ${s < 4 ? 'after:content-[""] after:w-12 after:h-0.5 after:mx-2 after:bg-white/20' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition
                ${step === s ? 'bg-dassa-red text-white scale-110 shadow-lg' :
                  step > s ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                {step > s ? <CheckCircle2 size={16}/> : s}
              </div>
            </div>
          ))}
        </div>

        {/* CARD CONTENT */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* PASO 1 · EMPRESA */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={20} className="text-dassa-red"/>
                <h3 className="text-xl font-extrabold text-gray-900">1 · Datos de la empresa</h3>
              </div>
              <p className="text-xs text-gray-500 mb-5">Información básica para identificar tu organización en el sistema</p>

              <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la empresa <span className="text-red-500">*</span></label>
              <input value={form.tenant_name}
                onChange={e=>{
                  setForm({...form, tenant_name: e.target.value, tenant_slug: slugFromName(e.target.value)});
                }}
                placeholder="ej. Logística XYZ SA"
                className="w-full px-4 py-2.5 mb-4 border-2 border-gray-200 rounded-lg text-sm focus:border-dassa-celeste focus:outline-none"/>

              <label className="block text-xs font-bold text-gray-700 mb-1">Identificador URL (slug) <span className="text-red-500">*</span></label>
              <div className="flex items-center mb-4">
                <span className="px-3 py-2.5 bg-gray-100 text-xs text-gray-500 border-2 border-r-0 border-gray-200 rounded-l-lg">trinorma.app/</span>
                <input value={form.tenant_slug}
                  onChange={e=>setForm({...form, tenant_slug: slugFromName(e.target.value)})}
                  placeholder="logistica-xyz"
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-r-lg text-sm focus:border-dassa-celeste focus:outline-none"/>
              </div>

              <label className="block text-xs font-bold text-gray-700 mb-1">Industria / Sector</label>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {(tpl?.templates || []).map(t => (
                  <button type="button" key={t.industry_code}
                    onClick={()=>setForm({...form, industry: t.industry_code})}
                    className={`text-left p-3 border-2 rounded-lg transition ${form.industry === t.industry_code ? 'border-dassa-red bg-dassa-red-tint' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold text-sm text-gray-900">{t.industry_name}</div>
                    <div className="text-[11px] text-gray-500 mb-1">{t.description}</div>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-dassa-celeste-deep">📋 {t.num_profiles} puestos</span>
                      <span className="text-amber-600">⚠ {t.num_risks} riesgos</span>
                      <span className="text-emerald-600">🎯 {t.num_foda} FODA</span>
                    </div>
                  </button>
                ))}
              </div>

              <label className="block text-xs font-bold text-gray-700 mb-1">Plan</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['free','pro','enterprise'].map(p => (
                  <button type="button" key={p} onClick={()=>setForm({...form, plan_tier: p})}
                    className={`p-3 border-2 rounded-lg text-center transition ${form.plan_tier === p ? 'border-dassa-red bg-dassa-red-tint' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold text-sm capitalize">{p}</div>
                    <div className="text-[10px] text-gray-500">{p==='free'?'5 usuarios':p==='pro'?'10 + IA':'∞ + WL'}</div>
                  </button>
                ))}
              </div>

              <button onClick={()=>setStep(2)} disabled={!canNext1}
                className="w-full mt-2 px-4 py-3 bg-dassa-red text-white font-bold rounded-lg hover:bg-dassa-red-deep disabled:opacity-50 flex items-center justify-center gap-2">
                Siguiente <ChevronRight size={16}/>
              </button>
            </div>
          )}

          {/* PASO 2 · ADMIN USER */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User size={20} className="text-dassa-red"/>
                <h3 className="text-xl font-extrabold text-gray-900">2 · Usuario administrador</h3>
              </div>
              <p className="text-xs text-gray-500 mb-5">Vas a ser el master admin de tu empresa en el sistema</p>

              <label className="block text-xs font-bold text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
              <input value={form.admin_name} onChange={e=>setForm({...form, admin_name: e.target.value})}
                placeholder="ej. Juan Pérez" className="w-full px-4 py-2.5 mb-3 border-2 border-gray-200 rounded-lg text-sm focus:border-dassa-celeste focus:outline-none"/>

              <label className="block text-xs font-bold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.admin_email} onChange={e=>setForm({...form, admin_email: e.target.value})}
                placeholder="juan@empresa.com" className="w-full px-4 py-2.5 mb-3 border-2 border-gray-200 rounded-lg text-sm focus:border-dassa-celeste focus:outline-none"/>

              <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
              <input type="password" value={form.admin_password} onChange={e=>setForm({...form, admin_password: e.target.value})}
                placeholder="mínimo 8 caracteres" className="w-full px-4 py-2.5 mb-3 border-2 border-gray-200 rounded-lg text-sm focus:border-dassa-celeste focus:outline-none"/>

              <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar contraseña <span className="text-red-500">*</span></label>
              <input type="password" value={form.confirm_password} onChange={e=>setForm({...form, confirm_password: e.target.value})}
                placeholder="repetir contraseña" className="w-full px-4 py-2.5 mb-2 border-2 border-gray-200 rounded-lg text-sm focus:border-dassa-celeste focus:outline-none"/>
              {form.admin_password && form.confirm_password && form.admin_password !== form.confirm_password && (
                <p className="text-[11px] text-red-500 mb-3">⚠ Las contraseñas no coinciden</p>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={()=>setStep(1)} className="px-4 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-lg flex items-center gap-1"><ChevronLeft size={16}/> Atrás</button>
                <button onClick={()=>setStep(3)} disabled={!canNext2}
                  className="flex-1 px-4 py-3 bg-dassa-red text-white font-bold rounded-lg hover:bg-dassa-red-deep disabled:opacity-50 flex items-center justify-center gap-2">
                  Siguiente <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* PASO 3 · CONFIRMAR */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={20} className="text-dassa-red"/>
                <h3 className="text-xl font-extrabold text-gray-900">3 · Revisar y confirmar</h3>
              </div>
              <p className="text-xs text-gray-500 mb-5">Revisá que todo esté bien · al confirmar te creamos el sistema completo</p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Empresa</div>
                <div className="font-bold text-gray-900">{form.tenant_name}</div>
                <div className="text-xs text-gray-500">{form.tenant_slug} · Plan {form.plan_tier}</div>
                <div className="text-xs text-gray-700 mt-1">Industria: {tpl?.templates?.find(t=>t.industry_code===form.industry)?.industry_name}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Administrador</div>
                <div className="font-bold text-gray-900">{form.admin_name}</div>
                <div className="text-xs text-gray-500">{form.admin_email}</div>
              </div>
              <div className="bg-dassa-celeste-tint border border-dassa-celeste/30 rounded-xl p-4 mb-4">
                <div className="text-[10px] text-dassa-celeste-deep uppercase font-bold mb-2">✨ Te vamos a pre-cargar:</div>
                {(() => {
                  const t = tpl?.templates?.find(x=>x.industry_code===form.industry);
                  return (
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>📋 {t?.num_profiles || 0} fichas de puesto con misión + competencias</li>
                      <li>⚠ {t?.num_risks || 0} riesgos AMFE típicos del rubro</li>
                      <li>🎯 {t?.num_foda || 0} elementos FODA de partida</li>
                      <li>📘 Procedimientos modelo del Sistema TRINORMA</li>
                      <li>🔄 Ciclo de revisiones anual abierto</li>
                      <li>🤖 Agente IA con 17 tools listo para usar</li>
                    </ul>
                  );
                })()}
              </div>

              <div className="flex gap-2">
                <button onClick={()=>setStep(2)} className="px-4 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-lg flex items-center gap-1"><ChevronLeft size={16}/></button>
                <button onClick={()=>signup.mutate()} disabled={signup.isPending}
                  className="flex-1 px-4 py-3 bg-dassa-red text-white font-bold rounded-lg hover:bg-dassa-red-deep disabled:opacity-50 flex items-center justify-center gap-2">
                  {signup.isPending ? <><Loader2 size={16} className="animate-spin"/> Creando...</> : <><Sparkles size={16}/> Crear mi empresa</>}
                </button>
              </div>
            </div>
          )}

          {/* PASO 4 · ÉXITO */}
          {step === 4 && result && (
            <div className="text-center">
              <CheckCircle2 size={72} className="text-emerald-600 mx-auto mb-4"/>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">¡Listo, {form.admin_name}!</h3>
              <p className="text-sm text-gray-600 mb-6">Tu empresa <strong>{form.tenant_name}</strong> está creada y lista para usar.</p>

              {result.provisioned && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                  <div className="text-[10px] text-emerald-700 uppercase font-bold mb-2">Sistema provisionado con:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-emerald-700">📋 {result.provisioned.job_profiles} puestos</div>
                    <div className="text-emerald-700">⚠ {result.provisioned.risks} riesgos</div>
                    <div className="text-emerald-700">🎯 {result.provisioned.foda} FODA</div>
                    <div className="text-emerald-700">📘 {result.provisioned.procedures} procedimientos</div>
                  </div>
                </div>
              )}

              <button onClick={()=>navigate('/login')}
                className="w-full px-4 py-3 bg-dassa-red text-white font-bold rounded-lg hover:bg-dassa-red-deep">
                Ir al login →
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center mt-6 text-[10px] text-white/40">
          <Shield size={10} className="inline mr-1"/> Sistema certificable ISO 9001 · 14001 · 45001 · powered by Anthropic Claude
        </div>
      </div>
    </div>
  );
}
