import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/ui';

const PAGE_INFO: Record<string, [string, string, string]> = {
  findings:      ['Hallazgos / NC',        'Kanban 6 columnas + workflow completo',          '⚡'],
  risks:         ['Matriz de Riesgos',     'Evaluación P×S con los 30 riesgos reales de DASSA','⊛'],
  legal:         ['Requisitos Legales',    'Semáforos de vencimiento + alertas automáticas', '⊡'],
  trainings:     ['Capacitaciones',        'Calendario + asistencia + evidencias + emails',  '📚'],
  committee:     ['Comité Mixto',          'Actas mensuales + IA extrae tareas automáticamente','🏛'],
  employees:     ['RRHH — Super Módulo',  'Legajos + carnets + habilitaciones + apercibimientos','👥'],
  purchases:     ['Compras',              'Workflow solicitud → aprobación → ejecución',    '🛒'],
  incidents:     ['Incidentes',           'Registro INC/ACC + investigación + ART',         '△'],
  environmental: ['Aspectos Ambientales', 'Matriz F×S + significancia + residuos especiales','♻'],
  suppliers:     ['Proveedores',          'Evaluación + homologación + scoring',            '⊜'],
  context:       ['Análisis de Contexto', 'FODA interactivo + estrategias FO/FA/DO/DA',     '◎'],
  calendar:      ['Calendario Global',    'Todos los vencimientos, capacitaciones y comités','📅'],
  tasks:         ['Mis Tareas',           'Central de tareas asignadas desde todos los módulos','✓'],
  users:         ['Gestión de Usuarios',  'Roles, permisos y fichas de puesto',             '⚙'],
  profile:       ['Mi Perfil',            'Datos personales, ficha de puesto y tareas asignadas','👤'],
};

export default function Placeholder() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, desc, icon] = PAGE_INFO[slug] ?? ['Módulo', 'Próximamente', '⬡'];

  return (
    <>
      <Header title={title} subtitle={desc} />
      <PageContent>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-5">
          <div className="text-6xl opacity-20">{icon}</div>
          <div>
            <h2 className="text-lg font-bold text-gray-600 mb-2">{title}</h2>
            <p className="text-[13px] text-gray-400 max-w-sm">{desc}</p>
            <p className="text-[12px] text-gray-300 mt-2">Fase de desarrollo correspondiente en progreso</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-dassa-red text-white rounded-lg text-[13px] font-semibold hover:bg-dassa-red-deep transition-colors"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </PageContent>
    </>
  );
}

// Individual stub exports for each page
export function Findings()     { return <Placeholder />; }
export function Risks()        { return <Placeholder />; }
export function Legal()        { return <Placeholder />; }
export function Trainings()    { return <Placeholder />; }
export function Committee()    { return <Placeholder />; }
export function Employees()    { return <Placeholder />; }
export function Purchases()    { return <Placeholder />; }
export function Incidents()    { return <Placeholder />; }
export function Environmental(){ return <Placeholder />; }
export function Users()        { return <Placeholder />; }
export function Profile()      { return <Placeholder />; }
