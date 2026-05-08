import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Zap, Shield, FileText, Scale, Users, ShoppingCart,
  BookOpen, Leaf, AlertTriangle, BarChart3, Building2, Truck,
  CalendarDays, ChevronDown, ChevronRight, Star, Settings, X,
} from 'lucide-react';

interface NavItem  { path: string; label: string; icon: React.ReactNode; badge?: number; }
interface NavGroup { group: string; items: NavItem[]; }

function buildNav(openFindings: number, legalAlerts: number): NavGroup[] {
  return [
    {
      group: 'Estrategia',
      items: [
        { path: '/dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={15} /> },
        { path: '/calendar',  label: 'Calendario',      icon: <CalendarDays size={15} /> },
        { path: '/context',   label: 'Contexto / FODA', icon: <BarChart3 size={15} /> },
      ],
    },
    {
      group: 'SGI Trinorma',
      items: [
        { path: '/findings',      label: 'Hallazgos / NC',   icon: <Zap size={15} />,         badge: openFindings || 0 },
        { path: '/risks',         label: 'Matriz Riesgos',   icon: <Shield size={15} /> },
        { path: '/documents',     label: 'Documentos',       icon: <FileText size={15} /> },
        { path: '/legal',         label: 'Req. Legales',     icon: <Scale size={15} />,        badge: legalAlerts || 0 },
        { path: '/incidents',     label: 'Incidentes',       icon: <AlertTriangle size={15} /> },
        { path: '/environmental', label: 'Asp. Ambientales', icon: <Leaf size={15} /> },
      ],
    },
    {
      group: 'Operaciones',
      items: [
        { path: '/purchases', label: 'Compras',     icon: <ShoppingCart size={15} /> },
        { path: '/suppliers', label: 'Proveedores', icon: <Truck size={15} /> },
      ],
    },
    {
      group: 'Capital Humano',
      items: [
        { path: '/trainings', label: 'Capacitaciones', icon: <BookOpen size={15} /> },
        { path: '/employees', label: 'RRHH',            icon: <Users size={15} /> },
      ],
    },
    {
      group: 'Satisfacción & SGI',
      items: [
        { path: '/satisfaction',    label: 'Enc. Satisfacción', icon: <Star size={15} /> },
        { path: '/sistema-gestion', label: 'Sistema Gestión',   icon: <Settings size={15} /> },
      ],
    },
    {
      group: 'Comité & Reuniones',
      items: [
        { path: '/committee', label: 'Comité Mixto', icon: <Building2 size={15} /> },
      ],
    },
  ];
}

interface Props {
  openFindings?: number;
  legalAlerts?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ openFindings = 0, legalAlerts = 0, isOpen = false, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const nav = buildNav(openFindings, legalAlerts);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (group: string) =>
    setCollapsed(p => ({ ...p, [group]: !p[group] }));

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose?.();   // close drawer on mobile after navigation
  };

  return (
    <aside
      className={[
        // Base layout
        'fixed top-14 md:top-16 left-0 z-50',
        'h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]',
        'w-72 md:w-[220px]',
        'flex flex-col',
        'bg-dassa-navy border-r border-dassa-navy-deep overflow-y-auto',
        // Drawer slide animation
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* Close button row — mobile only */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <span className="text-white/50 text-[11px] font-bold uppercase tracking-widest">
          Navegación
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center text-white/50
                     hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* ISO Strip */}
      <div className="px-3 py-2.5 border-b border-white/10 bg-dassa-navy-deep flex-shrink-0">
        <div className="flex items-center justify-center gap-1">
          {['9001', '14001', '45001'].map(n => (
            <span
              key={n}
              className="text-[9px] font-bold tracking-widest uppercase text-white/50
                         bg-white/5 border border-white/10 px-1.5 py-0.5 rounded"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {nav.map(g => (
          <div key={g.group} className="mb-1">
            <button
              onClick={() => toggle(g.group)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold
                         text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors"
            >
              <span className="flex-1 text-left">{g.group}</span>
              {collapsed[g.group]
                ? <ChevronRight size={10} />
                : <ChevronDown size={10} />}
            </button>

            {!collapsed[g.group] && g.items.map(item => {
              const active = location.pathname === item.path ||
                             location.pathname.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={[
                    'w-full flex items-center gap-2.5 px-2 rounded-md mb-0.5 transition-all relative',
                    'text-[13px] md:text-[12.5px]',
                    // Taller touch target on mobile
                    'min-h-[44px] md:min-h-0 md:py-[7px] py-2.5',
                    'touch-manipulation',
                    active
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                  ].join(' ')}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-dassa-celeste rounded-r" />
                  )}
                  <span className={`flex-shrink-0 ${active ? 'text-dassa-celeste' : 'opacity-60'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-auto bg-dassa-red text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-white/10 flex-shrink-0">
        <p className="text-[9px] text-white/20 text-center tracking-widest uppercase font-medium">
          SGI TRINORMA v2.0
        </p>
      </div>
    </aside>
  );
}
