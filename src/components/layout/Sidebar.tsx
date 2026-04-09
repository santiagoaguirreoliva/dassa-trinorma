import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Zap, Shield, FileText, Scale, Users, ShoppingCart,
  BookOpen, Leaf, AlertTriangle, BarChart3, Building2, Truck,
  CalendarDays, ChevronDown, ChevronRight, LogOut, User
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

function buildNav(openFindings: number, legalAlerts: number): NavGroup[] {
  return [
    {
      group: 'Estrategia',
      items: [
        { path: '/dashboard',  label: 'Dashboard',          icon: <LayoutDashboard size={15} /> },
        { path: '/calendar',   label: 'Calendario',         icon: <CalendarDays size={15} /> },
        { path: '/context',    label: 'Contexto / FODA',    icon: <BarChart3 size={15} /> },
      ],
    },
    {
      group: 'SGI Trinorma',
      items: [
        { path: '/findings',   label: 'Hallazgos / NC',     icon: <Zap size={15} />,      badge: openFindings || 0 },
        { path: '/risks',      label: 'Matriz Riesgos',     icon: <Shield size={15} /> },
        { path: '/documents',  label: 'Documentos',         icon: <FileText size={15} /> },
        { path: '/legal',      label: 'Req. Legales',       icon: <Scale size={15} />,    badge: legalAlerts || 0 },
        { path: '/incidents',  label: 'Incidentes',         icon: <AlertTriangle size={15} /> },
        { path: '/environmental', label: 'Asp. Ambientales',icon: <Leaf size={15} /> },
      ],
    },
    {
      group: 'Operaciones',
      items: [
        { path: '/purchases',  label: 'Compras',            icon: <ShoppingCart size={15} /> },
        { path: '/suppliers',  label: 'Proveedores',        icon: <Truck size={15} /> },
      ],
    },
    {
      group: 'Capital Humano',
      items: [
        { path: '/trainings',  label: 'Capacitaciones',     icon: <BookOpen size={15} /> },
        { path: '/employees',  label: 'RRHH',               icon: <Users size={15} /> },
      ],
    },
    {
      group: 'Comité & Reuniones',
      items: [
        { path: '/committee',  label: 'Comité Mixto',       icon: <Building2 size={15} /> },
      ],
    },
  ];
}

interface Props {
  openFindings?: number;
  legalAlerts?: number;
}

export default function Sidebar({ openFindings = 0, legalAlerts = 0 }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = buildNav(openFindings, legalAlerts);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (group: string) =>
    setCollapsed(p => ({ ...p, [group]: !p[group] }));

  const initials = user?.full_name
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <aside className="flex flex-col h-screen w-[220px] flex-shrink-0 bg-sidebar border-r border-sidebar-border overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-sm">
            D
          </div>
          <div>
            <div className="text-[13px] font-extrabold text-slate-200 tracking-wide">DASSA</div>
            <div className="text-[10px] text-slate-500 tracking-widest">TRINORMA</div>
          </div>
        </div>
        <div className="px-2 py-1 bg-sky-500/10 rounded text-[10px] text-sky-400 font-medium text-center">
          ISO 9001 · 14001 · 45001
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2">
        {nav.map(g => (
          <div key={g.group} className="mb-1">
            <button
              onClick={() => toggle(g.group)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-400"
            >
              <span className="flex-1 text-left">{g.group}</span>
              {collapsed[g.group]
                ? <ChevronRight size={10} />
                : <ChevronDown size={10} />
              }
            </button>
            {!collapsed[g.group] && g.items.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-md text-[12.5px] mb-0.5 transition-all
                    ${active
                      ? 'bg-blue-900 text-white font-semibold'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                >
                  <span className="opacity-70 flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div
            onClick={() => navigate('/profile')}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 cursor-pointer"
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-300 truncate">{user?.full_name}</div>
            <div className="text-[10px] text-slate-500">{user?.role ? ROLE_LABELS[user.role] : ''}</div>
          </div>
          <button onClick={signOut} title="Cerrar sesión" className="text-slate-600 hover:text-slate-400 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-500">Conectado</span>
        </div>
      </div>
    </aside>
  );
}
