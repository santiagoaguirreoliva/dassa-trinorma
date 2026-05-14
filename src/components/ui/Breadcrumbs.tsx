import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const LABELS: Record<string, string> = {
  bienvenida: 'Bienvenida',
  dashboard: 'Dashboard',
  hallazgos: 'Hallazgos',
  findings: 'Hallazgos',
  compras: 'Compras',
  purchases: 'Compras',
  comite: 'Comité',
  committee: 'Comité',
  capacitaciones: 'Capacitaciones',
  trainings: 'Capacitaciones',
  ambiente: 'Ambiente',
  environmental: 'Ambiente',
  'riesgos-amfe': 'Riesgos AMFE',
  riesgos: 'Riesgos',
  legal: 'Legal',
  calendario: 'Calendario NIXA',
  documentos: 'Documentos',
  documents: 'Documentos',
  empleados: 'Empleados',
  employees: 'Empleados',
  proveedores: 'Proveedores',
  suppliers: 'Proveedores',
  triny: 'TRINY',
  auditor: 'Auditor IA',
  'mis-pendientes': 'Mis Pendientes',
  perfil: 'Mi Perfil',
  profile: 'Mi Perfil',
  comunicaciones: 'Comunicaciones',
  organigrama: 'Organigrama',
  puestos: 'Puestos',
  ciclo: 'Ciclo SGI',
  objetivos: 'Objetivos',
  procedimientos: 'Procedimientos',
  cambios: 'Cambios',
  context: 'Contexto',
  satisfaction: 'Satisfacción cliente',
};

function label(seg: string) {
  if (LABELS[seg]) return LABELS[seg];
  if (/^[0-9a-f-]{8,}$/i.test(seg)) return '#…';
  return seg.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return null;
  return (
    <nav className="flex items-center gap-1 px-4 md:px-6 py-2 text-[11px] text-gray-500 bg-gray-50/50 border-b border-gray-100">
      <Link to="/" className="flex items-center gap-1 hover:text-dassa-red-deep transition-colors">
        <Home size={11} />
        <span className="hidden sm:inline">Inicio</span>
      </Link>
      {segs.map((seg, i) => {
        const href = '/' + segs.slice(0, i + 1).join('/');
        const isLast = i === segs.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight size={11} className="text-gray-300" />
            {isLast ? (
              <span className="font-semibold text-gray-700">{label(seg)}</span>
            ) : (
              <Link to={href} className="hover:text-dassa-red-deep transition-colors">{label(seg)}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
