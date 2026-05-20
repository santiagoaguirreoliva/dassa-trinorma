// /mi-puesto — Ficha del empleado logueado: datos personales, puestos
// asignados, supervisor, habilitaciones (con alerta de vencimiento).
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Briefcase, ArrowRight, Mail, Phone, MessageCircle, MapPin, Calendar,
  ListChecks, Target, GraduationCap, Star, Award, AlertTriangle,
  User, UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

interface Employee {
  id: string; full_name: string; email?: string; phone?: string; whatsapp?: string;
  address?: string; hire_date?: string;
  contract_type?: string; work_schedule?: string;
  supervisor_name?: string; supervisor_email?: string; supervisor_phone?: string;
  sector?: string; position?: string;
}
interface MyProfile {
  id: string; role_label: string; area: string; seniority?: string;
  mission?: string;
  responsibilities?: string[]; key_results?: string[];
  competencies?: string[]; training_required?: string[];
  is_primary: boolean; since?: string; notes?: string;
}
interface Cert {
  id: string; cert_name: string; cert_type?: string; issued_by?: string;
  issue_date?: string; expiry_date?: string; status?: string;
}
interface MiPuestoData { ok: boolean; employee: Employee | null; profiles: MyProfile[]; certifications: Cert[]; }

export default function MiPuesto() {
  const { data, isLoading } = useQuery<MiPuestoData>({
    queryKey: ['mi-puesto'],
    queryFn: () => api.get('/orgchart/mi-puesto'),
  });
  if (isLoading || !data) return <PageContent><Spinner /></PageContent>;

  if (!data.employee) {
    return (
      <PageContent>
        <Header title="📋 Mi Puesto" icon={<Briefcase size={20} />} />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>Tu usuario no está vinculado a un empleado.</strong>
            <p className="mt-1">Hablá con RRHH para que vinculen tu cuenta a tu ficha de empleado.</p>
          </div>
        </div>
      </PageContent>
    );
  }

  const emp = data.employee;
  const primary = data.profiles.find(p => p.is_primary);
  const cobertura = data.profiles.filter(p => !p.is_primary);

  function daysUntil(d?: string) {
    if (!d) return null;
    return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
  }

  const certVencidas = data.certifications.filter(c => {
    const d = daysUntil(c.expiry_date);
    return d !== null && d < 0;
  });
  const certPorVencer = data.certifications.filter(c => {
    const d = daysUntil(c.expiry_date);
    return d !== null && d >= 0 && d <= 60;
  });

  return (
    <PageContent>
      <Header title="📋 Mi Puesto" subtitle={emp.full_name} icon={<Briefcase size={20} />} />

      {/* Identidad + supervisor + contactos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-gradient-to-br from-dassa-celeste/10 to-blue-50 border border-dassa-celeste/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-dassa-celeste text-white flex items-center justify-center text-xl font-extrabold">
              {emp.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">{emp.full_name}</h3>
              {primary && (
                <p className="text-xs text-gray-600">{primary.role_label} · {primary.area}</p>
              )}
              {!primary && emp.position && (
                <p className="text-xs text-gray-600">{emp.position} · {emp.sector || '—'}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
            {emp.email && <div className="flex items-center gap-2"><Mail size={12} className="text-gray-400" /> {emp.email}</div>}
            {emp.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-gray-400" /> {emp.phone}</div>}
            {emp.whatsapp && <div className="flex items-center gap-2"><MessageCircle size={12} className="text-gray-400" /> {emp.whatsapp}</div>}
            {emp.address && <div className="flex items-center gap-2"><MapPin size={12} className="text-gray-400" /> {emp.address}</div>}
            {emp.hire_date && <div className="flex items-center gap-2"><Calendar size={12} className="text-gray-400" /> Ingreso {emp.hire_date.slice(0,10)}</div>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <UserCheck size={12} /> Tu supervisor
          </h3>
          {emp.supervisor_name ? (
            <div>
              <p className="text-sm font-bold text-gray-900">{emp.supervisor_name}</p>
              <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                {emp.supervisor_email && <div className="flex items-center gap-1"><Mail size={11} /> {emp.supervisor_email}</div>}
                {emp.supervisor_phone && <div className="flex items-center gap-1"><Phone size={11} /> {emp.supervisor_phone}</div>}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">No tenés supervisor asignado</p>
          )}
        </div>
      </div>

      {/* Alertas habilitaciones */}
      {(certVencidas.length > 0 || certPorVencer.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            {certVencidas.length > 0 && (
              <div className="font-bold">⚠ Habilitaciones vencidas: {certVencidas.map(c => c.cert_name).join(', ')}</div>
            )}
            {certPorVencer.length > 0 && (
              <div className="mt-0.5">Próximas a vencer ({certPorVencer.length}): {certPorVencer.map(c => `${c.cert_name} (${daysUntil(c.expiry_date)}d)`).join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {!data.profiles.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 mb-4">
          ⚠ No tenés ningún puesto asignado todavía. Hablá con RRHH.
        </div>
      )}

      {primary && <ProfileCard p={primary} title="Tu puesto principal" highlight />}
      {cobertura.map(p => <ProfileCard key={p.id} p={p} title="Cobertura / Polivalencia" />)}

      {/* Habilitaciones */}
      {data.certifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Award size={12} /> Habilitaciones / Certificaciones
            <span className="ml-auto text-[10px] text-gray-400">{data.certifications.length}</span>
          </h3>
          <div className="space-y-1.5">
            {data.certifications.map(c => {
              const days = daysUntil(c.expiry_date);
              const expired = days !== null && days < 0;
              const expSoon = days !== null && days >= 0 && days <= 60;
              return (
                <div key={c.id} className={`flex items-center justify-between p-2 rounded-lg border
                  ${expired ? 'border-red-300 bg-red-50' : expSoon ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900">{c.cert_name}</div>
                    <div className="text-[10px] text-gray-500">{c.cert_type || '—'}{c.issued_by && ` · ${c.issued_by}`}</div>
                  </div>
                  {c.expiry_date && (
                    <div className={`text-[10px] font-bold text-right
                      ${expired ? 'text-red-700' : expSoon ? 'text-amber-700' : 'text-gray-600'}`}>
                      {expired ? `Vencida hace ${-days!}d` : expSoon ? `Vence en ${days}d` : `Vigente`}
                      <div className="font-normal opacity-70">{c.expiry_date.slice(0,10)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageContent>
  );
}

function ProfileCard({ p, title, highlight }: { p: MyProfile; title: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 mb-4 border ${highlight ? 'bg-white border-dassa-red/40 shadow-md' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{title}</div>
          <h3 className="text-lg font-bold text-gray-900">{p.role_label}</h3>
        </div>
        {p.is_primary && (
          <span className="text-[10px] bg-dassa-red text-white px-2 py-1 rounded-full font-bold">PRINCIPAL</span>
        )}
      </div>
      {p.mission && <p className="text-sm text-gray-700 mb-4">{p.mission}</p>}

      {p.responsibilities && p.responsibilities.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 flex items-center gap-1">
            <ListChecks size={11} /> Responsabilidades principales
          </div>
          <ul className="space-y-1">
            {p.responsibilities.map((r, i) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2">
                <span className="text-dassa-celeste-deep font-bold">{String(i + 1).padStart(2, '0')}</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(p.key_results || []).length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Target size={11} /> Secundarias</div>
            <ul className="space-y-0.5">{p.key_results!.map((k, i) => <li key={i} className="text-xs text-gray-700">• {k}</li>)}</ul>
          </div>
        )}
        {(p.competencies || []).length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Star size={11} /> Competencias</div>
            <div className="flex flex-wrap gap-1">
              {p.competencies!.map((c, i) => (
                <span key={i} className="text-[10px] bg-dassa-celeste/10 text-dassa-celeste-deep px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          </div>
        )}
        {(p.training_required || []).length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><GraduationCap size={11} /> Capacitaciones</div>
            <ul className="space-y-0.5">{p.training_required!.map((t, i) => <li key={i} className="text-xs text-gray-700">• {t}</li>)}</ul>
          </div>
        )}
      </div>

      <Link to={`/puestos/${p.id}`} className="mt-4 inline-flex items-center gap-1 text-xs text-dassa-celeste-deep font-bold hover:underline">
        Ver ficha completa <ArrowRight size={12} />
      </Link>
    </div>
  );
}
