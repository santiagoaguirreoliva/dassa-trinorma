import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Zap, Shield, FileText, Scale, Users, ShoppingCart,
  BookOpen, Leaf, AlertTriangle, BarChart3, Building2, Truck,
  CalendarDays, ChevronDown, ChevronRight, Star, Settings, X,
  Briefcase, Workflow, Target, GitMerge, BookOpen as BookOpen2,
  Megaphone, Inbox, Bot, ListChecks, FolderTree, Sparkles,
  ClipboardCheck, Map, Smartphone, GitBranch, Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem  { path: string; label: string; icon: React.ReactNode; badge?: number; admin?: boolean; external?: boolean; }
interface NavGroup { group: string; subtitle?: string; items: NavItem[]; emoji?: string; }

function buildNav(openFindings: number, legalAlerts: number, role?: string): NavGroup[] {
  const isAdmin = role === 'master_admin' || role === 'director';
  const isAuditor = role === 'auditor_externo';

  return [
    {
      group: 'Inicio',
      items: [
        { path: '/bienvenida',    label: 'Bienvenida',      icon: <Sparkles size={15} /> },
        { path: '/dashboard',     label: 'Dashboard',       icon: <LayoutDashboard size={15} /> },
        { path: '/mi-perfil',     label: 'Mi Perfil',       icon: <Briefcase size={15} /> },
        { path: '/mis-pendientes', label: 'Mis Pendientes', icon: <ListChecks size={15} /> },
        { path: '/calendar',      label: 'Calendario',      icon: <CalendarDays size={15} /> },
        { path: '/triny',         label: 'TRINY · Agente IA', icon: <Bot size={15} /> },
      ],
    },
    {
      group: 'Sistema TRINORMA',
      subtitle: 'Ciclo anual + procedimientos',
      items: [
        { path: '/ciclo/2026',     label: 'Ciclo 2026 · DAG',     icon: <Workflow size={15} /> },
        { path: '/revision-direccion', label: 'Revisión por la Dirección', icon: <ClipboardCheck size={15} /> },
        { path: '/mapa-procesos',  label: 'Mapa de Procesos',     icon: <Map size={15} /> },
        { path: '/procedimientos', label: 'Procedimientos',       icon: <BookOpen2 size={15} /> },
        { path: '/instructivos-app', label: 'Instructivos de la app', icon: <Smartphone size={15} /> },
        { path: '/calendario-nixa', label: 'Calendario NIXA',  icon: <CalendarDays size={15} /> },
        ...(isAdmin || isAuditor ? [{ path: '/inbox-nixa', label: 'Inbox NIXA', icon: <Inbox size={15} /> }] : []),
      ],
    },
    {
      group: 'Estrategia',
      subtitle: 'Objetivos · Proyectos · Inversiones',
      items: [
        { path: '/context',         label: 'FODA',                icon: <BarChart3 size={15} /> },
        { path: '/objetivos',       label: 'Objetivos',           icon: <Target size={15} /> },
        { path: '/proyectos',       label: 'Proyectos',           icon: <GitBranch size={15} /> },
        { path: '/inversiones',     label: 'Inversiones',         icon: <Wallet size={15} /> },
        { path: '/cambios',         label: 'Cambios',             icon: <GitMerge size={15} /> },
        { path: '/sistema-gestion', label: 'ISO NORMAS',          icon: <Settings size={15} /> },
        { path: '/committee',       label: 'Comité Mixto',        icon: <Building2 size={15} /> },
      ],
    },
    {
      group: 'ISO 9001 · Calidad',
      items: [
        { path: '/findings',     label: 'Hallazgos / NCs', icon: <Zap size={15} />, badge: openFindings || 0 },
        { path: '/documents',    label: 'Documentos',      icon: <FileText size={15} /> },
        { path: '/satisfaction', label: 'Satisfacción',    icon: <Star size={15} /> },
        { path: '/suppliers',    label: 'Proveedores',     icon: <Truck size={15} /> },
      ],
    },
    {
      group: 'ISO 14001 · Ambiente',
      items: [
        { path: '/environmental', label: 'Aspectos Ambientales', icon: <Leaf size={15} /> },
      ],
    },
    {
      group: 'ISO 45001 · Seguridad',
      items: [
        { path: '/riesgos-amfe', label: 'Matriz AMFE',     icon: <Shield size={15} /> },
        { path: '/incidents',    label: 'Incidentes',      icon: <AlertTriangle size={15} /> },
        { path: '/trainings',    label: 'Capacitaciones',  icon: <BookOpen size={15} /> },
        { path: '/rondas',       label: 'Rondas Insp.',    icon: <ClipboardCheck size={15} /> },
        { path: '/legal',        label: 'Req. Legales',    icon: <Scale size={15} />, badge: legalAlerts || 0 },
      ],
    },
    {
      group: 'Operativo',
      items: [
        { path: '/bi-operativo', label: 'BI Operativo',  icon: <BarChart3 size={15} /> },
        { path: '/purchases',   label: 'Compras',        icon: <ShoppingCart size={15} /> },
        { path: '/organigrama', label: 'Organigrama',    icon: <FolderTree size={15} /> },
        { path: '/puestos',     label: 'Puestos / Fichas', icon: <Briefcase size={15} /> },
        { path: '/employees',   label: 'Empleados',      icon: <Users size={15} /> },
        { path: '/contactos-externos', label: 'Contactos externos', icon: <Users size={15} /> },
      ],
    },
    {
      group: 'Comunicaciones',
      items: [
        { path: 'https://apps.dassa.com.ar/comunicaciones', label: 'Comunicaciones', icon: <Megaphone size={15} />, external: true },
      ],
    },
    ...(isAdmin ? [{
      group: 'Configuración',
      items: [
        { path: '/users',           label: 'Usuarios',     icon: <Users size={15} /> },
        { path: '/agent-settings',  label: 'Configurar IA', icon: <Bot size={15} /> },
      ],
    }] : []),

    ...(isAdmin || isAuditor ? [{
      group: 'Administracion',
      subtitle: 'Solo master_admin / auditor',
      items: [
        ...(isAdmin || isAuditor ? [{ path: '/admin/pactos', label: 'Pactos Trinorma', icon: <Sparkles size={15} /> }] : []),
        ...(isAdmin ? [{ path: '/admin/novedades', label: 'Novedades', icon: <Megaphone size={15} /> }] : []),
      ],
    }] : []),
  ];
}

interface SidebarProps {
  openFindings?: number;
  legalAlerts?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ openFindings = 0, legalAlerts = 0, isOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const nav = buildNav(openFindings, legalAlerts, user?.role);

  // Estado de grupos colapsables (todos abiertos por default)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (g: string) => setCollapsed(p => ({ ...p, [g]: !p[g] }));

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside
      className={`
        fixed top-14 md:top-16 bottom-0 left-0 z-40
        w-[260px] md:w-[220px]
        bg-dassa-ink text-white flex flex-col
        transform transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0 shadow-2xl shadow-black/40' : '-translate-x-full md:translate-x-0'}
      `}
      aria-label="Navegación lateral"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <img
            src="/ds/logos/dassa-isotipo.png"
            alt=""
            aria-hidden="true"
            className="w-8 h-8 select-none"
            draggable={false}
          />
          <div className="leading-tight">
            <div className="text-[13px] font-extrabold tracking-tight font-wordmark">DASSA SGI</div>
            <div className="text-[9px] text-dassa-celeste uppercase tracking-[0.18em] font-semibold mt-0.5">TRINORMA</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1.5 -mr-1 rounded-lg hover:bg-white/10 active:bg-white/20 text-white/70 hover:text-white touch-manipulation" aria-label="Cerrar menú"><X size={18} /></button>
        )}
      </div>

      {/* Nav scrollable */}
      <div className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'thin' }}>
        {nav.map((group) => (
          <div key={group.group} className="mb-1">
            <button
              onClick={() => toggle(group.group)}
              className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white/80"
            >
              <span className="flex items-center gap-2">
                {group.group}
              </span>
              {collapsed[group.group]
                ? <ChevronRight size={11} />
                : <ChevronDown size={11} />}
            </button>
            {!collapsed[group.group] && (
              <div>
                {group.subtitle && (
                  <div className="px-4 pb-1 text-[9px] text-white/30 italic">{group.subtitle}</div>
                )}
                {group.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (item.external) window.open(item.path, '_blank', 'noopener');
                      else navigate(item.path);
                      onClose?.();
                    }}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-[12px] font-medium transition
                      ${isActive(item.path)
                        ? 'bg-dassa-celeste/20 text-dassa-celeste border-l-2 border-dassa-celeste'
                        : 'text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent'}`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[9px] bg-dassa-red text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-7 h-7 bg-dassa-celeste rounded-full flex items-center justify-center text-[10px] font-bold text-dassa-ink">
            {(user?.full_name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="font-bold truncate">{user?.full_name || 'Usuario'}</div>
            <div className="text-[10px] opacity-60 truncate">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
