import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Zap, Shield, FileText, Scale, Users, ShoppingCart,
  BookOpen, Leaf, AlertTriangle, BarChart3, Building2, Truck,
  CalendarDays, ChevronDown, ChevronRight, Star, Settings, X,
  Briefcase, Workflow, Target, GitMerge, BookOpen as BookOpen2,
  Megaphone, Inbox, Bot, AlertCircle, ListChecks, FolderTree, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem  { path: string; label: string; icon: React.ReactNode; badge?: number; admin?: boolean; }
interface NavGroup { group: string; subtitle?: string; items: NavItem[]; emoji?: string; }

function buildNav(openFindings: number, legalAlerts: number, role?: string): NavGroup[] {
  const isAdmin = role === 'master_admin' || role === 'director';
  const isAuditor = role === 'auditor_externo';

  return [
    {
      group: 'Inicio',
      emoji: '🏠',
      items: [
        { path: '/bienvenida',    label: 'Bienvenida',      icon: <Sparkles size={15} /> },
        { path: '/dashboard',     label: 'Dashboard',       icon: <LayoutDashboard size={15} /> },
        { path: '/mi-puesto',     label: 'Mi Puesto',       icon: <Briefcase size={15} /> },
        { path: '/mis-pendientes', label: 'Mis Pendientes', icon: <ListChecks size={15} /> },
        { path: '/calendar',      label: 'Calendario',      icon: <CalendarDays size={15} /> },
        { path: '/triny',         label: 'TRINY · Agente IA', icon: <Bot size={15} /> },
      ],
    },
    {
      group: 'Sistema TRINORMA',
      emoji: '🛡️',
      subtitle: 'Ciclo anual + procedimientos',
      items: [
        { path: '/ciclo/2026',     label: 'Ciclo 2026 · DAG',     icon: <Workflow size={15} /> },
        { path: '/procedimientos', label: 'Procedimientos',       icon: <BookOpen2 size={15} /> },
        { path: '/calendario-nixa', label: 'Calendario NIXA',  icon: <CalendarDays size={15} /> },
        ...(isAdmin || isAuditor ? [{ path: '/inbox-nixa', label: 'Inbox NIXA', icon: <Inbox size={15} /> }] : []),
      ],
    },
    {
      group: 'Estrategia',
      emoji: '🧭',
      subtitle: 'Contexto · Objetivos · Cambios',
      items: [
        { path: '/context',         label: 'Contexto / FODA',     icon: <BarChart3 size={15} /> },
        { path: '/objetivos',       label: 'Objetivos',           icon: <Target size={15} /> },
        { path: '/cambios',         label: 'Gestión de Cambios',  icon: <GitMerge size={15} /> },
        { path: '/sistema-gestion', label: 'Sistema de Gestión',  icon: <Settings size={15} /> },
        { path: '/committee',       label: 'Comité Mixto',        icon: <Building2 size={15} /> },
      ],
    },
    {
      group: 'ISO 9001 · Calidad',
      emoji: '✅',
      items: [
        { path: '/findings',     label: 'Hallazgos / NCs', icon: <Zap size={15} />, badge: openFindings || 0 },
        { path: '/documents',    label: 'Documentos',      icon: <FileText size={15} /> },
        { path: '/satisfaction', label: 'Satisfacción',    icon: <Star size={15} /> },
        { path: '/suppliers',    label: 'Proveedores',     icon: <Truck size={15} /> },
      ],
    },
    {
      group: 'ISO 14001 · Ambiente',
      emoji: '🌱',
      items: [
        { path: '/environmental', label: 'Aspectos Ambientales', icon: <Leaf size={15} /> },
      ],
    },
    {
      group: 'ISO 45001 · Seguridad',
      emoji: '⛑',
      items: [
        { path: '/riesgos-amfe', label: 'Matriz AMFE',     icon: <Shield size={15} /> },
        { path: '/incidents',    label: 'Incidentes',      icon: <AlertTriangle size={15} /> },
        { path: '/trainings',    label: 'Capacitaciones',  icon: <BookOpen size={15} /> },
        { path: '/legal',        label: 'Req. Legales',    icon: <Scale size={15} />, badge: legalAlerts || 0 },
      ],
    },
    {
      group: 'Operativo',
      emoji: '📦',
      items: [
        { path: '/bi-operativo', label: 'BI Operativo',  icon: <BarChart3 size={15} /> },
        { path: '/purchases',   label: 'Compras',        icon: <ShoppingCart size={15} /> },
        { path: '/organigrama', label: 'Organigrama',    icon: <FolderTree size={15} /> },
        { path: '/puestos',     label: 'Puestos / Fichas', icon: <Briefcase size={15} /> },
        { path: '/employees',   label: 'Empleados',      icon: <Users size={15} /> },
      ],
    },
    {
      group: 'Comunicaciones',
      emoji: '📢',
      items: [
        { path: '/comunicaciones', label: 'Comunicaciones', icon: <Megaphone size={15} /> },
      ],
    },
    ...(isAdmin ? [{
      group: 'Configuración',
      emoji: '⚙️',
      items: [
        { path: '/users',           label: 'Usuarios',     icon: <Users size={15} /> },
        { path: '/agent-settings',  label: 'Configurar IA', icon: <Bot size={15} /> },
      ],
    }] : []),

    ...(isAdmin || isAuditor ? [{
      group: 'Administracion',
      emoji: 'A',
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
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ openFindings = 0, legalAlerts = 0, mobile = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const nav = buildNav(openFindings, legalAlerts, user?.role);

  // Estado de grupos colapsables (todos abiertos por default)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (g: string) => setCollapsed(p => ({ ...p, [g]: !p[g] }));

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className={`
      ${mobile ? 'fixed inset-y-0 left-0 z-50 w-72' : 'hidden lg:flex lg:w-64 lg:flex-col'}
      bg-dassa-navy text-white flex-shrink-0
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-dassa-red rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">DASSA SGI</div>
            <div className="text-[9px] opacity-60 uppercase tracking-wider">TRINORMA</div>
          </div>
        </div>
        {mobile && onClose && (
          <button onClick={onClose}><X size={18} /></button>
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
                {group.emoji && <span>{group.emoji}</span>}
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
                    onClick={() => { navigate(item.path); onClose?.(); }}
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
          <div className="w-7 h-7 bg-dassa-celeste rounded-full flex items-center justify-center text-[10px] font-bold text-dassa-navy">
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
